"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const statusManager_1 = require("./utils/statusManager/statusManager");
const serverManager_1 = require("./utils/serverManager/serverManager");
const djangoTreeDataProvider_1 = require("./views/djangoTreeDataProvider");
const migrationsManager_1 = require("./utils/migrationsManager/migrationsManager");
const appsManager_1 = require("./utils/appsManager/appsManager");
const TERMINAL_NAME = 'Django Helper';
let djangoTerminal;
function getDjangoTerminal() {
    if (!djangoTerminal || djangoTerminal.exitStatus !== undefined) {
        djangoTerminal = vscode.window.createTerminal(TERMINAL_NAME);
    }
    return djangoTerminal;
}
let isActivatingVenv = false;
// Fonctions de gestion du venv
function createVirtualEnv() {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // 1. Vérifier si un venv existe déjà
            const existingVenv = checkVenvExists();
            if (existingVenv) {
                vscode.window.showInformationMessage('Un environnement virtuel existe déjà. Utilisez la commande "Activer Venv" pour l\'activer.');
                return;
            }
            // 2. Créer et configurer le terminal
            const terminal = vscode.window.createTerminal('Django Venv Setup');
            terminal.show();
            // 3. Créer le venv avec un nom standardisé
            terminal.sendText('python -m venv .venv');
            // 4. Attendre la création
            yield new Promise(resolve => setTimeout(resolve, 3000));
            // 5. Activer le venv avec le bon chemin selon la plateforme
            const activateCommand = process.platform === 'win32'
                ? '.venv\\Scripts\\activate'
                : 'source .venv/bin/activate';
            terminal.sendText(activateCommand);
            // 6. Attendre l'activation
            yield new Promise(resolve => setTimeout(resolve, 2000));
            // 7. Vérifier et installer requirements.txt
            const workspacePath = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0].uri.fsPath;
            if (workspacePath) {
                const requirementsPath = path.join(workspacePath, 'requirements.txt');
                if (fs.existsSync(requirementsPath)) {
                    const installDeps = yield vscode.window.showInformationMessage('requirements.txt détecté. Installer les dépendances ?', 'Oui', 'Non');
                    if (installDeps === 'Oui') {
                        terminal.sendText('pip install -r requirements.txt');
                        vscode.window.showInformationMessage('Installation des dépendances en cours...');
                    }
                }
            }
            // 8. Mettre à jour le statut
            statusManager_1.StatusManager.getInstance().setVenvStatus(true);
            vscode.window.showInformationMessage('Environnement virtuel créé et activé avec succès');
        }
        catch (error) {
            vscode.window.showErrorMessage(`Erreur lors de la création du venv: ${error}`);
        }
    });
}
function checkVenvExists() {
    const workspacePath = vscode.workspace.rootPath;
    if (!workspacePath)
        return null;
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
function activateVirtualEnv() {
    return __awaiter(this, void 0, void 0, function* () {
        const venvPath = checkVenvExists();
        if (venvPath) {
            const terminal = getDjangoTerminal();
            const activateCommand = process.platform === 'win32'
                ? `${path.basename(venvPath)}\\Scripts\\activate`
                : `source "${path.join(venvPath, 'bin', 'activate')}"`;
            terminal.show();
            terminal.sendText(activateCommand);
            // Réduire le temps d'attente
            yield new Promise(resolve => setTimeout(resolve, 500));
            statusManager_1.StatusManager.getInstance().setVenvStatus(true);
            vscode.window.setStatusBarMessage('Environnement virtuel activé', 3000);
            if (isActivatingVenv) {
                vscode.window.showInformationMessage('Environnement virtuel activé. Veuillez cliquer à nouveau sur le bouton pour lancer le serveur Django.');
            }
        }
        else {
            const create = yield vscode.window.showInformationMessage('Aucun environnement virtuel trouvé. Voulez-vous en créer un ?', 'Oui', 'Non');
            if (create === 'Oui') {
                yield createVirtualEnv();
            }
        }
    });
}
function deactivateVirtualEnv() {
    return __awaiter(this, void 0, void 0, function* () {
        const terminal = getDjangoTerminal();
        const serverManager = serverManager_1.ServerManager.getInstance();
        if (terminal) {
            // Arrêter le serveur Django s'il est en cours d'exécution
            if (serverManager.isServerRunning()) {
                yield serverManager.stopServer();
            }
            terminal.show();
            terminal.sendText('deactivate');
            // Mettre à jour les statuts
            statusManager_1.StatusManager.getInstance().setVenvStatus(false);
            statusManager_1.StatusManager.getInstance().setServerStatus(false);
            const choice = yield vscode.window.showInformationMessage('Environnement virtuel désactivé et serveur Django arrêté. Voulez-vous fermer le terminal ?', 'Oui', 'Non');
            if (choice === 'Oui') {
                terminal.dispose();
                djangoTerminal = undefined;
            }
        }
        else {
            vscode.window.showInformationMessage('Aucun terminal Django Helper actif trouvé.');
        }
    });
}
function toggleVenv() {
    return __awaiter(this, void 0, void 0, function* () {
        const statusManager = statusManager_1.StatusManager.getInstance();
        if (statusManager.isVenvActive()) {
            yield deactivateVirtualEnv();
        }
        else {
            yield activateVirtualEnv();
        }
        // Rafraîchir l'affichage après la bascule
        vscode.commands.executeCommand('django-helper.refreshVenvStatus');
    });
}
// Ajouter cette fonction de vérification
function isVenvActive() {
    return statusManager_1.StatusManager.getInstance().getVenvStatus();
}
function checkAndInstallRequirements(terminal) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const workspacePath = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0].uri.fsPath;
        if (!workspacePath) {
            return false;
        }
        const requirementsPath = path.join(workspacePath, 'requirements.txt');
        if (!fs.existsSync(requirementsPath)) {
            // Si pas de requirements.txt, proposer de faire un pip freeze
            const shouldFreeze = yield vscode.window.showInformationMessage('Aucun fichier requirements.txt trouvé. Voulez-vous créer un fichier avec les dépendances actuelles ?', 'Oui', 'Non');
            if (shouldFreeze === 'Oui') {
                terminal.sendText('pip freeze > requirements.txt');
                yield new Promise(resolve => setTimeout(resolve, 2000));
            }
            return true;
        }
        // Vérifier si toutes les dépendances sont installées
        terminal.sendText('pip install -r requirements.txt');
        yield new Promise(resolve => setTimeout(resolve, 3000));
        return true;
    });
}
function ensureVenvActive() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!isVenvActive()) {
            const message = yield vscode.window.showErrorMessage('L\'environnement virtuel n\'est pas activé. Vous devez l\'activer avant d\'exécuter des commandes Django.', 'Activer l\'environnement', 'Annuler');
            if (message === 'Activer l\'environnement') {
                yield activateVirtualEnv();
                // Vérifier à nouveau après l'activation
                yield new Promise(resolve => setTimeout(resolve, 2000)); // Attendre que l'activation soit complète
                return isVenvActive();
            }
            return false;
        }
        return true;
    });
}
function getVenvActivatedTerminal(name) {
    return __awaiter(this, void 0, void 0, function* () {
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
        yield new Promise(resolve => setTimeout(resolve, 1000));
        return terminal;
    });
}
function startServer(context) {
    return __awaiter(this, void 0, void 0, function* () {
        if (isActivatingVenv) {
            isActivatingVenv = false;
            vscode.window.showInformationMessage('Environnement virtuel activé. Veuillez cliquer à nouveau pour lancer le serveur Django.');
            return;
        }
        if (!isVenvActive()) {
            isActivatingVenv = true;
            const message = yield vscode.window.showErrorMessage('L\'environnement virtuel n\'est pas activé. Vous devez l\'activer avant de lancer le serveur.', 'Activer l\'environnement', 'Annuler');
            if (message === 'Activer l\'environnement') {
                yield activateVirtualEnv();
                return;
            }
            else {
                isActivatingVenv = false;
                return;
            }
        }
        const terminal = getDjangoTerminal();
        terminal.show();
        // Vérifier les dépendances avant de démarrer le serveur
        const depsOk = yield checkAndInstallRequirements(terminal);
        if (!depsOk) {
            vscode.window.showErrorMessage('Erreur lors de la vérification des dépendances');
            return;
        }
        // Lancer le serveur
        terminal.sendText('python manage.py runserver 8000');
        // Mettre à jour le statut du serveur
        statusManager_1.StatusManager.getInstance().setServerStatus(true);
        const message = vscode.window.setStatusBarMessage('Serveur Django démarré', 3000);
        context.subscriptions.push(message);
    });
}
function makeMigrations(appName) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(yield ensureVenvActive())) {
            vscode.window.showErrorMessage('Les migrations ne peuvent pas être créées sans un environnement virtuel actif.');
            return;
        }
        // ...rest of existing makeMigrations code...
    });
}
function migrate(appName, migrationName) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(yield ensureVenvActive())) {
            vscode.window.showErrorMessage('Les migrations ne peuvent pas être appliquées sans un environnement virtuel actif.');
            return;
        }
        // ...rest of existing migrate code...
    });
}
function showMigrations() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(yield ensureVenvActive())) {
            vscode.window.showErrorMessage('Impossible d\'afficher les migrations sans un environnement virtuel actif.');
            return;
        }
        // ...rest of existing showMigrations code...
    });
}
function activate(context) {
    console.log('Extension "Django Helper" est maintenant active!');
    // Initialiser les gestionnaires
    const statusManager = statusManager_1.StatusManager.getInstance();
    const serverManager = serverManager_1.ServerManager.getInstance();
    const migrationsManager = migrationsManager_1.MigrationsManager.getInstance();
    const appsManager = appsManager_1.AppsManager.getInstance();
    // Initialiser le fournisseur de données pour la vue Django
    const djangoTreeDataProvider = new djangoTreeDataProvider_1.DjangoTreeDataProvider();
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
        vscode.commands.registerCommand('django-helper.startServer', () => __awaiter(this, void 0, void 0, function* () {
            yield startServer(context);
            djangoTreeDataProvider.refresh();
        })),
        vscode.commands.registerCommand('django-helper.stopServer', () => __awaiter(this, void 0, void 0, function* () {
            if (yield ensureVenvActive()) {
                yield serverManager.stopServer();
                djangoTreeDataProvider.refresh();
            }
        })),
        vscode.commands.registerCommand('django-helper.toggleVenv', () => {
            toggleVenv();
            djangoTreeDataProvider.refresh();
        }),
        vscode.commands.registerCommand('django-helper.toggleServer', () => __awaiter(this, void 0, void 0, function* () {
            if (yield ensureVenvActive()) {
                yield serverManager.toggleServer();
                djangoTreeDataProvider.refresh();
            }
        })),
        vscode.commands.registerCommand('django-helper.makemigrations', () => __awaiter(this, void 0, void 0, function* () {
            if (!(yield ensureVenvActive()))
                return;
            const appName = yield vscode.window.showInputBox({
                prompt: 'Nom de l\'application (laissez vide pour toutes les applications)',
                placeHolder: 'nom_app',
                value: ''
            });
            yield migrationsManager.makeMigrations(appName || undefined);
            djangoTreeDataProvider.refresh();
        })),
        vscode.commands.registerCommand('django-helper.migrate', () => __awaiter(this, void 0, void 0, function* () {
            if (!(yield ensureVenvActive()))
                return;
            const appName = yield vscode.window.showInputBox({
                prompt: 'Nom de l\'application (laissez vide pour toutes les applications)',
                placeHolder: 'nom_app',
                value: ''
            });
            let migrationName;
            if (appName) {
                migrationName = yield vscode.window.showInputBox({
                    prompt: 'Nom de la migration (laissez vide pour la dernière)',
                    placeHolder: '0001',
                    value: ''
                });
            }
            yield migrationsManager.migrate(appName || undefined, migrationName || undefined);
            djangoTreeDataProvider.refresh();
        })),
        vscode.commands.registerCommand('django-helper.showmigrations', () => __awaiter(this, void 0, void 0, function* () {
            if (!(yield ensureVenvActive()))
                return;
            migrationsManager.showMigrations();
            djangoTreeDataProvider.refresh();
        })),
        vscode.commands.registerCommand('django-helper.createApp', () => __awaiter(this, void 0, void 0, function* () {
            if (!(yield ensureVenvActive()))
                return;
            const appName = yield vscode.window.showInputBox({
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
                yield appsManager.createApp(appName);
                djangoTreeDataProvider.refresh();
            }
        })),
        vscode.commands.registerCommand('django-helper.refreshVenvStatus', () => {
            statusManager_1.StatusManager.getInstance().checkVenvStatus();
            djangoTreeDataProvider.refresh();
        }),
    ];
    context.subscriptions.push(...disposables);
    context.subscriptions.push(vscode.window.onDidCloseTerminal(terminal => {
        if (terminal === djangoTerminal) {
            djangoTerminal = undefined;
        }
    }));
    // Vérifier l'état initial de l'environnement virtuel
    statusManager.checkVenvStatus();
    djangoTreeDataProvider.refresh();
}
exports.activate = activate;
function deactivate() {
    if (djangoTerminal) {
        djangoTerminal.dispose();
    }
}
exports.deactivate = deactivate;
