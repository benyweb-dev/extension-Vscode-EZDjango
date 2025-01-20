import * as vscode from 'vscode';
import { StatusManager } from '../statusManager/statusManager';
import { ServerManager } from '../serverManager/serverManager';
import { TERMINAL_NAME } from '../constants';
import * as path from 'path';
import * as fs from 'fs';

export class VenvManager {
    private static instance: VenvManager;
    private terminal: vscode.Terminal | undefined;
    private isVenvActive: boolean = false;

    private constructor() {}

    public static getInstance(): VenvManager {
        if (!VenvManager.instance) {
            VenvManager.instance = new VenvManager();
        }
        return VenvManager.instance;
    }

    private getTerminal(): vscode.Terminal {
        if (!this.terminal || this.terminal.exitStatus !== undefined) {
            this.terminal = vscode.window.createTerminal(TERMINAL_NAME);
        }
        return this.terminal;
    }

    private detectVenvFolder(): string | null {
        const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspacePath) {
            return null;
        }

        // Liste des noms communs pour les environnements virtuels
        const venvFolders = ['.venv', 'venv', '.env', 'env'];

        for (const folder of venvFolders) {
            const venvPath = path.join(workspacePath, folder);
            if (fs.existsSync(venvPath)) {
                // Vérifier si c'est un dossier d'environnement virtuel valide
                const hasActivateScript = process.platform === 'win32'
                    ? fs.existsSync(path.join(venvPath, 'Scripts', 'activate.bat'))
                    : fs.existsSync(path.join(venvPath, 'bin', 'activate'));
                
                if (hasActivateScript) {
                    return venvPath;
                }
            }
        }

        return null;
    }

    public async createVirtualEnv(): Promise<void> {
        const terminal = this.getTerminal();
        terminal.show();
        terminal.sendText('python -m venv .venv');
        
        // Attendre un peu pour la création
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Activer après création
        await this.activateVirtualEnv();
        
        vscode.window.showInformationMessage('Environnement virtuel créé et activé');
    }

    public async activateVirtualEnv(): Promise<void> {
        if (this.isVenvActive) {
            vscode.window.showInformationMessage('L\'environnement virtuel est déjà activé');
            return;
        }

        const terminal = this.getTerminal();
        const venvPath = this.detectVenvFolder();
        
        if (!venvPath) {
            const createNew = await vscode.window.showInformationMessage(
                'Aucun environnement virtuel trouvé. Voulez-vous en créer un ?',
                'Oui', 
                'Non'
            );
            
            if (createNew === 'Oui') {
                await this.createVirtualEnv();
            }
            return;
        }

        const activateCommand = process.platform === 'win32'
            ? `.\\${path.basename(venvPath)}\\Scripts\\activate`
            : `source "${path.join(venvPath, 'bin', 'activate')}"`;

        terminal.show();
        terminal.sendText(activateCommand);
        
        // Attendre un peu que l'activation soit terminée
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        this.isVenvActive = true;
        StatusManager.getInstance().setVenvStatus(true);
        vscode.window.showInformationMessage('Environnement virtuel activé');
    }

    public async deactivateVirtualEnv(): Promise<void> {
        if (!this.isVenvActive) {
            vscode.window.showInformationMessage('Aucun environnement virtuel n\'est actuellement activé');
            return;
        }

        // Vérifier si le serveur est actif
        const serverManager = ServerManager.getInstance();
        if (serverManager.isServerRunning()) {
            const choice = await vscode.window.showWarningMessage(
                'Le serveur Django est en cours d\'exécution. Il est recommandé de l\'arrêter avant de désactiver l\'environnement virtuel.',
                'Arrêter le serveur et désactiver',
                'Annuler'
            );

            if (choice === 'Arrêter le serveur et désactiver') {
                await serverManager.stopServer();
            } else {
                return;
            }
        }

        const terminal = this.getTerminal();
        terminal.show();
        terminal.sendText('deactivate');
        
        this.isVenvActive = false;
        StatusManager.getInstance().setVenvStatus(false);
        vscode.window.showInformationMessage('Environnement virtuel désactivé');
    }

    public async toggleVenv(): Promise<void> {
        if (this.isVenvActive) {
            await this.deactivateVirtualEnv();
        } else {
            await this.activateVirtualEnv();
        }
        StatusManager.getInstance().setVenvStatus(this.isVenvActive);
    }

    public dispose(): void {
        if (this.terminal) {
            this.terminal.dispose();
            this.terminal = undefined;
        }
    }
}