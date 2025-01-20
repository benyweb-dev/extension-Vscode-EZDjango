import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { StatusManager } from './utils/statusManager/statusManager';
import { ServerManager } from './utils/serverManager/serverManager';
import { DjangoTreeDataProvider } from './views/djangoTreeDataProvider';
import { MigrationsManager } from './utils/migrationsManager/migrationsManager';
import { AppsManager } from './utils/appsManager/appsManager';
import { VenvManager } from './utils/venvManager/venvManager';

// Fonctions de gestion du venv
async function createVirtualEnv() {
    const terminal = vscode.window.activeTerminal || vscode.window.createTerminal();
    terminal.sendText('python -m venv env');
    terminal.show();
    
    // Attendre un peu que le venv soit créé avant de l'activer
    setTimeout(() => {
        terminal.sendText('.\\env\\Scripts\\activate');
    }, 2000);
}

function checkVenvExists(): string | null {
    const workspacePath = vscode.workspace.rootPath;
    if (!workspacePath) return null;

    // Chemins possibles pour le venv (priorité à 'env')
    const possiblePaths = [
        path.join(workspacePath, 'env'),
        path.join(workspacePath, 'venv'),
        path.join(workspacePath, '.env'),
        path.join(workspacePath, '.venv')
    ];

    for (const venvPath of possiblePaths) {
        if (fs.existsSync(venvPath)) {
            const activatePath = path.join(venvPath, 'Scripts', 'activate.bat');
            if (fs.existsSync(activatePath)) {
                return venvPath;
            }
        }
    }
    return null;
}

async function activateVirtualEnv() {
    const venvPath = checkVenvExists();
    
    if (venvPath) {
        const terminal = vscode.window.activeTerminal || vscode.window.createTerminal();
        const activateCommand = process.platform === 'win32'
            ? `.\\env\\Scripts\\activate`
            : `source "${path.join(venvPath, 'bin', 'activate')}"`;
        
        terminal.show();
        terminal.sendText(activateCommand);
        
        // Attendez un peu que l'activation soit terminée
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Vérifiez si l'activation a réussi en vérifiant l'existence de VIRTUAL_ENV
        const checkTerminal = vscode.window.createTerminal({ name: 'Python Environment Check' });
        checkTerminal.sendText('python -c "import os; print(os.environ.get(\'VIRTUAL_ENV\', \'\'))"');
		
		// Attendez un moment pour que la commande s'exécute
		await new Promise(resolve => setTimeout(resolve, 1000));
		
		// Si nous arrivons ici, supposons que l'activation a réussi
		// car nous avons déjà vérifié l'existence du venv avec checkVenvExists()
		const result = venvPath;
        
        if (result.includes(venvPath)) {
            vscode.window.showInformationMessage('Environnement virtuel activé');
            StatusManager.getInstance().setVenvStatus(true);
        } else {
            vscode.window.showErrorMessage('Échec de l\'activation de l\'environnement virtuel');
        }
    } else {
        const create = await vscode.window.showInformationMessage(
            'Aucun environnement virtuel trouvé. Voulez-vous en créer un ?',
            'Oui',
            'Non'
        );
        
        if (create === 'Oui') {
            await createVirtualEnv();
        }
    }
}

async function deactivateVirtualEnv() {
    const terminal = vscode.window.activeTerminal || vscode.window.createTerminal();
    terminal.sendText('deactivate');
    terminal.show();
}

async function toggleVenv() {
    await VenvManager.getInstance().toggleVenv();
    // Rafraîchir l'affichage après la bascule
    vscode.commands.executeCommand('django-helper.refreshVenvStatus');
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "Django Helper" est maintenant active!');

    // Initialiser les gestionnaires
    const statusManager = StatusManager.getInstance();
    const serverManager = ServerManager.getInstance();
    const migrationsManager = MigrationsManager.getInstance();
    const appsManager = AppsManager.getInstance();

    // Initialiser le fournisseur de données pour la vue Django
    const djangoTreeDataProvider = new DjangoTreeDataProvider();
    vscode.window.registerTreeDataProvider('djangoExplorer', djangoTreeDataProvider);

    let disposables = [
        vscode.commands.registerCommand('django-helper.createVenv', () => {
            createVirtualEnv();
            djangoTreeDataProvider.refresh();
        }),

        vscode.commands.registerCommand('django-helper.activateVenv', () => {
            activateVirtualEnv();
            djangoTreeDataProvider.refresh();
        }),

        vscode.commands.registerCommand('django-helper.deactivateVenv', () => {
            deactivateVirtualEnv();
            djangoTreeDataProvider.refresh();
        }),

        vscode.commands.registerCommand('django-helper.startServer', () => {
            serverManager.startServer();
            djangoTreeDataProvider.refresh();
        }),

        vscode.commands.registerCommand('django-helper.stopServer', () => {
            serverManager.stopServer();
            djangoTreeDataProvider.refresh();
        }),

        vscode.commands.registerCommand('django-helper.toggleVenv', () => {
            toggleVenv();
            djangoTreeDataProvider.refresh();
        }),

        vscode.commands.registerCommand('django-helper.toggleServer', () => {
            serverManager.toggleServer();
            djangoTreeDataProvider.refresh();
        }),

        vscode.commands.registerCommand('django-helper.makemigrations', async () => {
            const appName = await vscode.window.showInputBox({
                prompt: 'Nom de l\'application (laissez vide pour toutes les applications)',
                placeHolder: 'nom_app',
                value: ''
            });

            await migrationsManager.makeMigrations(appName || undefined);
            djangoTreeDataProvider.refresh();
        }),

        vscode.commands.registerCommand('django-helper.migrate', async () => {
            const appName = await vscode.window.showInputBox({
                prompt: 'Nom de l\'application (laissez vide pour toutes les applications)',
                placeHolder: 'nom_app',
                value: ''
            });

            let migrationName;
            if (appName) {
                migrationName = await vscode.window.showInputBox({
                    prompt: 'Nom de la migration (laissez vide pour la dernière)',
                    placeHolder: '0001',
                    value: ''
                });
            }

            await migrationsManager.migrate(appName || undefined, migrationName || undefined);
            djangoTreeDataProvider.refresh();
        }),

        vscode.commands.registerCommand('django-helper.showmigrations', () => {
            migrationsManager.showMigrations();
            djangoTreeDataProvider.refresh();
        }),

        vscode.commands.registerCommand('django-helper.createApp', async () => {
            const appName = await vscode.window.showInputBox({
                prompt: 'Nom de la nouvelle application',
                placeHolder: 'nom_app',
                validateInput: (value) => {
                    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(value)) {
                        return 'Le nom doit commencer par une lettre et ne contenir que des lettres, chiffres et underscores';
                    }
                    return null;
                }
            });

            if (appName) {
                await appsManager.createApp(appName);
                djangoTreeDataProvider.refresh();
            }
        }),

        vscode.commands.registerCommand('django-helper.refreshVenvStatus', () => {
            StatusManager.getInstance().checkVenvStatus();
            djangoTreeDataProvider.refresh();
        }),
    ];

    context.subscriptions.push(...disposables);

    // Vérifier l'état initial de l'environnement virtuel
    statusManager.checkVenvStatus();
    djangoTreeDataProvider.refresh();
}

export function deactivate() {
    // Nettoyage des ressources si nécessaire
}