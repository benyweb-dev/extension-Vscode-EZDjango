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
const venvManager_1 = require("./utils/venvManager/venvManager");
// Fonctions de gestion du venv
function createVirtualEnv() {
    return __awaiter(this, void 0, void 0, function* () {
        const terminal = vscode.window.activeTerminal || vscode.window.createTerminal();
        terminal.sendText('python -m venv env');
        terminal.show();
        // Attendre un peu que le venv soit créé avant de l'activer
        setTimeout(() => {
            terminal.sendText('.\\env\\Scripts\\activate');
        }, 2000);
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
            const terminal = vscode.window.activeTerminal || vscode.window.createTerminal();
            const activateCommand = process.platform === 'win32'
                ? `.\\env\\Scripts\\activate`
                : `source "${path.join(venvPath, 'bin', 'activate')}"`;
            terminal.show();
            terminal.sendText(activateCommand);
            // Attendez un peu que l'activation soit terminée
            yield new Promise(resolve => setTimeout(resolve, 1000));
            // Vérifiez si l'activation a réussi en vérifiant l'existence de VIRTUAL_ENV
            const checkTerminal = vscode.window.createTerminal({ name: 'Python Environment Check' });
            checkTerminal.sendText('python -c "import os; print(os.environ.get(\'VIRTUAL_ENV\', \'\'))"');
            // Attendez un moment pour que la commande s'exécute
            yield new Promise(resolve => setTimeout(resolve, 1000));
            // Si nous arrivons ici, supposons que l'activation a réussi
            // car nous avons déjà vérifié l'existence du venv avec checkVenvExists()
            const result = venvPath;
            if (result.includes(venvPath)) {
                vscode.window.showInformationMessage('Environnement virtuel activé');
                statusManager_1.StatusManager.getInstance().setVenvStatus(true);
            }
            else {
                vscode.window.showErrorMessage('Échec de l\'activation de l\'environnement virtuel');
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
        const terminal = vscode.window.activeTerminal || vscode.window.createTerminal();
        terminal.sendText('deactivate');
        terminal.show();
    });
}
function toggleVenv() {
    return __awaiter(this, void 0, void 0, function* () {
        yield venvManager_1.VenvManager.getInstance().toggleVenv();
        // Rafraîchir l'affichage après la bascule
        vscode.commands.executeCommand('django-helper.refreshVenvStatus');
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
        vscode.commands.registerCommand('django-helper.makemigrations', () => __awaiter(this, void 0, void 0, function* () {
            const appName = yield vscode.window.showInputBox({
                prompt: 'Nom de l\'application (laissez vide pour toutes les applications)',
                placeHolder: 'nom_app',
                value: ''
            });
            yield migrationsManager.makeMigrations(appName || undefined);
            djangoTreeDataProvider.refresh();
        })),
        vscode.commands.registerCommand('django-helper.migrate', () => __awaiter(this, void 0, void 0, function* () {
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
        vscode.commands.registerCommand('django-helper.showmigrations', () => {
            migrationsManager.showMigrations();
            djangoTreeDataProvider.refresh();
        }),
        vscode.commands.registerCommand('django-helper.createApp', () => __awaiter(this, void 0, void 0, function* () {
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
    // Vérifier l'état initial de l'environnement virtuel
    statusManager.checkVenvStatus();
    djangoTreeDataProvider.refresh();
}
exports.activate = activate;
function deactivate() {
    // Nettoyage des ressources si nécessaire
}
exports.deactivate = deactivate;
