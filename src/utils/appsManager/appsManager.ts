import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { TERMINAL_NAME } from '../constants';
import { StatusManager } from '../statusManager/statusManager';

export interface AppStructure {
    name: string;
    path: string;
    hasModels: boolean;
    hasViews: boolean;
    hasUrls: boolean;
    hasAdmin: boolean;
    hasTemplates: boolean;
    hasStatic: boolean;
}

export class AppsManager {
    private static _instance: AppsManager;
    private statusManager: StatusManager;
    private _onDidChangeApps: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    readonly onDidChangeApps: vscode.Event<void> = this._onDidChangeApps.event;

    private constructor() {
        this.statusManager = StatusManager.getInstance();
    }

    public static getInstance(): AppsManager {
        if (!AppsManager._instance) {
            AppsManager._instance = new AppsManager();
        }
        return AppsManager._instance;
    }

    private getOrCreateTerminal(): vscode.Terminal {
        const existingTerminal = vscode.window.terminals.find(t => t.name === TERMINAL_NAME);
        return existingTerminal || vscode.window.createTerminal(TERMINAL_NAME);
    }

    public async createApp(appName: string): Promise<void> {
        if (!this.statusManager.isVenvActive()) {
            const choice = await vscode.window.showWarningMessage(
                'L\'environnement virtuel doit être actif pour créer une application.',
                'Activer l\'environnement virtuel',
                'Annuler'
            );

            if (choice === 'Activer l\'environnement virtuel') {
                await vscode.commands.executeCommand('django-helper.activateVenv');
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                return;
            }
        }

        // Vérifier que le nom est valide
        if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(appName)) {
            vscode.window.showErrorMessage('Le nom de l\'application n\'est pas valide. Utilisez uniquement des lettres, des chiffres et des underscores.');
            return;
        }

        const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspacePath) {
            vscode.window.showErrorMessage('Aucun workspace ouvert');
            return;
        }

        const terminal = this.getOrCreateTerminal();
        terminal.show();
        terminal.sendText(`python manage.py startapp ${appName}`);

        // Attendre que l'application soit créée
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Créer la structure de base des dossiers
        const appPath = path.join(workspacePath, appName);
        if (fs.existsSync(appPath)) {
            // Créer le dossier templates si non existant
            const templatesPath = path.join(appPath, 'templates', appName);
            if (!fs.existsSync(templatesPath)) {
                fs.mkdirSync(templatesPath, { recursive: true });
            }

            // Créer le dossier static si non existant
            const staticPath = path.join(appPath, 'static', appName);
            if (!fs.existsSync(staticPath)) {
                fs.mkdirSync(staticPath, { recursive: true });
            }

            // Créer urls.py si non existant
            const urlsPath = path.join(appPath, 'urls.py');
            if (!fs.existsSync(urlsPath)) {
                const urlsContent = `from django.urls import path
from . import views

app_name = '${appName}'

urlpatterns = [
    # Ajoutez vos URLs ici
]`;
                fs.writeFileSync(urlsPath, urlsContent);
            }
        }

        this._onDidChangeApps.fire();
        vscode.window.showInformationMessage(`Application '${appName}' créée avec succès.`);
    }

    public getAppStructure(appName: string): AppStructure {
        const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspacePath) {
            throw new Error('Aucun workspace ouvert');
        }

        const appPath = path.join(workspacePath, appName);
        return {
            name: appName,
            path: appPath,
            hasModels: fs.existsSync(path.join(appPath, 'models.py')),
            hasViews: fs.existsSync(path.join(appPath, 'views.py')),
            hasUrls: fs.existsSync(path.join(appPath, 'urls.py')),
            hasAdmin: fs.existsSync(path.join(appPath, 'admin.py')),
            hasTemplates: fs.existsSync(path.join(appPath, 'templates')),
            hasStatic: fs.existsSync(path.join(appPath, 'static'))
        };
    }

    public async openFile(filePath: string): Promise<void> {
        const document = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(document);
    }

    public getModels(appName: string): string[] {
        const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspacePath) {
            return [];
        }

        const modelsPath = path.join(workspacePath, appName, 'models.py');
        if (!fs.existsSync(modelsPath)) {
            return [];
        }

        // Lire le fichier models.py et extraire les noms des modèles
        const content = fs.readFileSync(modelsPath, 'utf8');
        const modelRegex = /class\s+(\w+)\(.*\):/g;
        const models: string[] = [];
        let match;

        while ((match = modelRegex.exec(content)) !== null) {
            models.push(match[1]);
        }

        return models;
    }
}