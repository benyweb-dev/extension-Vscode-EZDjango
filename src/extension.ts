import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { StatusManager } from './utils/statusManager/statusManager';
import { ServerManager } from './utils/serverManager/serverManager';
import { DjangoTreeDataProvider } from './views/djangoTreeDataProvider';
import { MigrationsManager } from './utils/migrationsManager/migrationsManager';
import { AppsManager } from './utils/appsManager/appsManager';
import { VenvManager } from './utils/venvManager/venvManager';

const TERMINAL_NAME = 'Django-ENV Helper';
let djangoTerminal: vscode.Terminal | undefined;

function getDjangoTerminal(): vscode.Terminal {
    if (!djangoTerminal || djangoTerminal.exitStatus !== undefined) {
        djangoTerminal = vscode.window.createTerminal(TERMINAL_NAME);
    }
    return djangoTerminal;
}

let isActivatingVenv = false;

// Fonctions de gestion du venv
async function createVirtualEnv(): Promise<void> {
    try {
        // 1. Vérifier si un venv existe déjà
        const existingVenv = checkVenvExists();
        if (existingVenv) {
            vscode.window.showInformationMessage(
                'Un environnement virtuel existe déjà. Utilisez la commande "Activer Venv" pour l\'activer.'
            );
            return;
        }

        // 2. Créer et configurer le terminal
        const terminal = vscode.window.createTerminal('Django Venv Setup');
        terminal.show();

        // 3. Créer le venv avec un nom standardisé
        terminal.sendText('python -m venv .venv');
        
        // 4. Attendre la création
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 5. Activer le venv avec le bon chemin selon la plateforme
        const activateCommand = process.platform === 'win32' 
            ? '.venv\\Scripts\\activate'
            : 'source .venv/bin/activate';
        terminal.sendText(activateCommand);

        // 6. Attendre l'activation
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 7. Vérifier et installer requirements.txt
        const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (workspacePath) {
            const requirementsPath = path.join(workspacePath, 'requirements.txt');
            if (fs.existsSync(requirementsPath)) {
                const installDeps = await vscode.window.showInformationMessage(
                    'requirements.txt détecté. Installer les dépendances ?',
                    'Oui', 'Non'
                );
                
                if (installDeps === 'Oui') {
                    terminal.sendText('pip install -r requirements.txt');
                    vscode.window.showInformationMessage('Installation des dépendances en cours...');
                }
            }
        }

        // 8. Mettre à jour le statut
        StatusManager.getInstance().setVenvStatus(true);
        vscode.window.showInformationMessage('Environnement virtuel créé et activé avec succès');

    } catch (error) {
        vscode.window.showErrorMessage(`Erreur lors de la création du venv: ${error}`);
    }
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
        const terminal = getDjangoTerminal();
        const activateCommand = process.platform === 'win32'
            ? `${path.basename(venvPath)}\\Scripts\\activate`
            : `source "${path.join(venvPath, 'bin', 'activate')}"`;
        
        terminal.show();
        terminal.sendText(activateCommand);
        
        // Réduire le temps d'attente
        await new Promise(resolve => setTimeout(resolve, 500));
        
        StatusManager.getInstance().setVenvStatus(true);
        vscode.window.setStatusBarMessage('Environnement virtuel activé', 3000);

        if (isActivatingVenv) {
            vscode.window.showInformationMessage('Environnement virtuel activé. Veuillez cliquer à nouveau sur le bouton pour lancer le serveur Django.');
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
    const terminal = getDjangoTerminal();
    const serverManager = ServerManager.getInstance();
    
    if (terminal) {
        // Arrêter le serveur Django s'il est en cours d'exécution
        if (serverManager.isServerRunning()) {
            await serverManager.stopServer();
        }

        terminal.show();
        terminal.sendText('deactivate');
        
        // Mettre à jour les statuts
        StatusManager.getInstance().setVenvStatus(false);
        StatusManager.getInstance().setServerStatus(false);
        
        const choice = await vscode.window.showInformationMessage(
            'Environnement virtuel désactivé et serveur Django arrêté. Voulez-vous fermer le terminal ?',
            'Oui',
            'Non'
        );
        
        if (choice === 'Oui') {
            terminal.dispose();
            djangoTerminal = undefined;
        }
    } else {
        vscode.window.showInformationMessage('Aucun terminal Django Helper actif trouvé.');
    }
}

async function toggleVenv() {
    const statusManager = StatusManager.getInstance();
    if (statusManager.isVenvActive()) {
        await deactivateVirtualEnv();
    } else {
        await activateVirtualEnv();
    }
    // Rafraîchir l'affichage après la bascule
    vscode.commands.executeCommand('django-helper.refreshVenvStatus');
}

// Ajouter cette fonction de vérification
function isVenvActive(): boolean {
    return StatusManager.getInstance().getVenvStatus();
}

async function checkAndInstallRequirements(terminal: vscode.Terminal): Promise<boolean> {
    const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!workspacePath) {
        return false;
    }

    const requirementsPath = path.join(workspacePath, 'requirements.txt');
    if (!fs.existsSync(requirementsPath)) {
        // Si pas de requirements.txt, proposer de faire un pip freeze
        const shouldFreeze = await vscode.window.showInformationMessage(
            'Aucun fichier requirements.txt trouvé. Voulez-vous créer un fichier avec les dépendances actuelles ?',
            'Oui',
            'Non'
        );

        if (shouldFreeze === 'Oui') {
            terminal.sendText('pip freeze > requirements.txt');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        return true;
    }

    // Vérifier si toutes les dépendances sont installées
    terminal.sendText('pip install -r requirements.txt');
    await new Promise(resolve => setTimeout(resolve, 3000));
    return true;
}

async function ensureVenvActive(): Promise<boolean> {
    if (!isVenvActive()) {
        const message = await vscode.window.showErrorMessage(
            'L\'environnement virtuel n\'est pas activé. Vous devez l\'activer avant d\'exécuter des commandes Django.',
            'Activer l\'environnement',
            'Annuler'
        );
        
        if (message === 'Activer l\'environnement') {
            await activateVirtualEnv();
            // Vérifier à nouveau après l'activation
            await new Promise(resolve => setTimeout(resolve, 2000)); // Attendre que l'activation soit complète
            return isVenvActive();
        }
        return false;
    }
    return true;
}

async function getVenvActivatedTerminal(name: string): Promise<vscode.Terminal | undefined> {
    const venvPath = checkVenvExists();
    if (!venvPath) {
        vscode.window.showErrorMessage('Aucun environnement virtuel trouvé.');
        return undefined;
    }

    const terminal = vscode.window.createTerminal(name);
    const activateCommand = process.platform === 'win32'
        ? `.\\${path.basename(venvPath)}\\Scripts\\activate.bat && `
        : `source "${path.join(venvPath, 'bin', 'activate')}"; `;

    // Attendre que l'activation soit terminée
    await new Promise(resolve => setTimeout(resolve, 1000));

    return terminal;
}

async function startServer(context: vscode.ExtensionContext): Promise<void> {
    if (isActivatingVenv) {
        isActivatingVenv = false;
        vscode.window.showInformationMessage('Environnement virtuel activé. Veuillez cliquer à nouveau pour lancer le serveur Django.');
        return;
    }

    if (!isVenvActive()) {
        isActivatingVenv = true;
        const message = await vscode.window.showErrorMessage(
            'L\'environnement virtuel n\'est pas activé. Vous devez l\'activer avant de lancer le serveur.',
            'Activer l\'environnement',
            'Annuler'
        );
        
        if (message === 'Activer l\'environnement') {
            await activateVirtualEnv();
            return;
        } else {
            isActivatingVenv = false;
            return;
        }
    }

    const terminal = getDjangoTerminal();
    terminal.show();

    // Vérifier les dépendances avant de démarrer le serveur
    const depsOk = await checkAndInstallRequirements(terminal);
    if (!depsOk) {
        vscode.window.showErrorMessage('Erreur lors de la vérification des dépendances');
        return;
    }

    // Lancer le serveur
    terminal.sendText('python manage.py runserver 8000');
    
    // Mettre à jour le statut du serveur
    StatusManager.getInstance().setServerStatus(true);
    const message = vscode.window.setStatusBarMessage('Serveur Django démarré', 3000);
    context.subscriptions.push(message);
}

async function makeMigrations(appName?: string): Promise<void> {
    if (!await ensureVenvActive()) {
        vscode.window.showErrorMessage('Les migrations ne peuvent pas être créées sans un environnement virtuel actif.');
        return;
    }
    
    // ...rest of existing makeMigrations code...
}

async function migrate(appName?: string, migrationName?: string): Promise<void> {
    if (!await ensureVenvActive()) {
        vscode.window.showErrorMessage('Les migrations ne peuvent pas être appliquées sans un environnement virtuel actif.');
        return;
    }
    
    // ...rest of existing migrate code...
}

async function showMigrations(): Promise<void> {
    if (!await ensureVenvActive()) {
        vscode.window.showErrorMessage('Impossible d\'afficher les migrations sans un environnement virtuel actif.');
        return;
    }
    
    // ...rest of existing showMigrations code...
}

// Ajouter cette nouvelle fonction
async function createSuperuser(): Promise<void> {
    if (!await ensureVenvActive()) {
        vscode.window.showErrorMessage('L\'environnement virtuel doit être actif pour créer un superutilisateur.');
        return;
    }

    const username = await vscode.window.showInputBox({
        prompt: 'Entrez le nom d\'utilisateur du superutilisateur',
        placeHolder: 'admin'
    });

    if (!username) return;

    const email = await vscode.window.showInputBox({
        prompt: 'Entrez l\'adresse email du superutilisateur',
        placeHolder: 'admin@example.com'
    });

    if (!email) return;

    const password = await vscode.window.showInputBox({
        prompt: 'Entrez le mot de passe du superutilisateur',
        password: true
    });

    if (!password) return;

    const terminal = getDjangoTerminal();
    terminal.show();

    // Utiliser une variable d'environnement pour le mot de passe
    if (process.platform === 'win32') {
        terminal.sendText(`$env:DJANGO_SUPERUSER_PASSWORD="${password}"`);
    } else {
        terminal.sendText(`export DJANGO_SUPERUSER_PASSWORD="${password}"`);
    }

    terminal.sendText(`python manage.py createsuperuser --noinput --username ${username} --email ${email}`);

    vscode.window.showInformationMessage(`Superutilisateur "${username}" créé avec succès.`);
}

// Ajouter cette nouvelle fonction
async function collectStatic(): Promise<void> {
    if (!await ensureVenvActive()) {
        vscode.window.showErrorMessage('L\'environnement virtuel doit être actif pour collecter les fichiers statiques.');
        return;
    }

    const terminal = getDjangoTerminal();
    terminal.show();

    const confirmation = await vscode.window.showWarningMessage(
        'Êtes-vous sûr de vouloir collecter les fichiers statiques ? Cette action peut écraser des fichiers existants.',
        'Oui', 'Non'
    );

    if (confirmation === 'Oui') {
        terminal.sendText('python manage.py collectstatic --noinput');
        vscode.window.showInformationMessage('Collecte des fichiers statiques en cours...');
    }
}

// Ajouter cette nouvelle fonction
async function checkDjangoDependencies(): Promise<void> {
    if (!await ensureVenvActive()) {
        vscode.window.showErrorMessage('L\'environnement virtuel doit être actif pour vérifier les dépendances.');
        return;
    }

    const terminal = getDjangoTerminal();
    terminal.show();

    // Lister les dépendances installées
    terminal.sendText('pip list');

    // Vérifier si Django est installé
    terminal.sendText('pip show django');

    const regenerateRequirements = await vscode.window.showInformationMessage(
        'Voulez-vous régénérer le fichier requirements.txt ?',
        'Oui',
        'Non'
    );

    if (regenerateRequirements === 'Oui') {
        terminal.sendText('pip freeze > requirements.txt');
        vscode.window.showInformationMessage('Le fichier requirements.txt a été mis à jour.');
    }
}

// Ajouter cette nouvelle fonction
async function listAllDependencies(): Promise<void> {
    if (!await ensureVenvActive()) {
        vscode.window.showErrorMessage('L\'environnement virtuel doit être actif pour lister les dépendances.');
        return;
    }

    const terminal = getDjangoTerminal();
    terminal.show();

    // Lister toutes les dépendances installées
    terminal.sendText('pip list');
}

// Ajouter cette nouvelle fonction
async function activateVenvForDependencies(): Promise<void> {
    await activateVirtualEnv();
    vscode.commands.executeCommand('django-helper.refreshVenvStatus');
    const djangoTreeDataProvider = new DjangoTreeDataProvider();
    djangoTreeDataProvider.refresh();
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

        vscode.commands.registerCommand('django-helper.startServer', async () => {
            await startServer(context);
            djangoTreeDataProvider.refresh();
        }),

        vscode.commands.registerCommand('django-helper.stopServer', async () => {
            if (await ensureVenvActive()) {
                await serverManager.stopServer();
                djangoTreeDataProvider.refresh();
            }
        }),

        vscode.commands.registerCommand('django-helper.toggleVenv', () => {
            toggleVenv();
            djangoTreeDataProvider.refresh();
        }),

        vscode.commands.registerCommand('django-helper.toggleServer', async () => {
            if (await ensureVenvActive()) {
                await serverManager.toggleServer();
                djangoTreeDataProvider.refresh();
            }
        }),

        vscode.commands.registerCommand('django-helper.makemigrations', async () => {
            if (!await ensureVenvActive()) return;
            const appName = await vscode.window.showInputBox({
                prompt: 'Nom de l\'application (laissez vide pour toutes les applications)',
                placeHolder: 'nom_app',
                value: ''
            });

            await migrationsManager.makeMigrations(appName || undefined);
            djangoTreeDataProvider.refresh();
        }),

        vscode.commands.registerCommand('django-helper.migrate', async () => {
            if (!await ensureVenvActive()) return;
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

        vscode.commands.registerCommand('django-helper.showmigrations', async () => {
            if (!await ensureVenvActive()) return;
            migrationsManager.showMigrations();
            djangoTreeDataProvider.refresh();
        }),

        vscode.commands.registerCommand('django-helper.createApp', async () => {
            if (!await ensureVenvActive()) return;
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

        vscode.commands.registerCommand('django-helper.createSuperuser', async () => {
            await createSuperuser();
            djangoTreeDataProvider.refresh();
        }),

        vscode.commands.registerCommand('django-helper.collectStatic', async () => {
            await collectStatic();
            djangoTreeDataProvider.refresh();
        }),

        vscode.commands.registerCommand('django-helper.checkDependencies', async () => {
            await checkDjangoDependencies();
            djangoTreeDataProvider.refresh();
        }),

        vscode.commands.registerCommand('django-helper.listDependencies', async () => {
            await listAllDependencies();
            djangoTreeDataProvider.refresh();
        }),

        vscode.commands.registerCommand('django-helper.activateVenvForDependencies', async () => {
            await activateVenvForDependencies();
        }),
    ];

    context.subscriptions.push(...disposables);

    context.subscriptions.push(
        vscode.window.onDidCloseTerminal(terminal => {
            if (terminal === djangoTerminal) {
                djangoTerminal = undefined;
            }
        })
    );

    // Vérifier l'état initial de l'environnement virtuel
    statusManager.checkVenvStatus();
    djangoTreeDataProvider.refresh();
}

export function deactivate() {
    if (djangoTerminal) {
        djangoTerminal.dispose();
    }
}