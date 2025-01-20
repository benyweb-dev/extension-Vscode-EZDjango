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
exports.DjangoCommandManager = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
/**
 * Gestionnaire des commandes Django avancées
 * Gère la création de superutilisateur et la collecte des fichiers statiques
 */
class DjangoCommandManager {
    constructor() {
        this.terminal = undefined;
    }
    static getInstance() {
        if (!DjangoCommandManager.instance) {
            DjangoCommandManager.instance = new DjangoCommandManager();
        }
        return DjangoCommandManager.instance;
    }
    /**
     * Obtient ou crée un terminal dédié aux commandes Django
     */
    getTerminal() {
        if (!this.terminal || this.terminal.exitStatus !== undefined) {
            this.terminal = vscode.window.createTerminal('Django Commands');
        }
        return this.terminal;
    }
    /**
     * Vérifie la présence d'un projet Django valide
     */
    checkDjangoProject() {
        var _a;
        const workspacePath = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0].uri.fsPath;
        if (!workspacePath)
            return false;
        return fs.existsSync(path.join(workspacePath, 'manage.py'));
    }
    /**
     * Crée un superutilisateur Django avec interface graphique
     */
    createSuperuser() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.checkDjangoProject()) {
                vscode.window.showErrorMessage('Aucun projet Django détecté (manage.py non trouvé)');
                return;
            }
            // Interface utilisateur pour la saisie des informations
            const username = yield vscode.window.showInputBox({
                prompt: 'Nom d\'utilisateur pour le superutilisateur',
                placeHolder: 'admin'
            });
            if (!username)
                return;
            const email = yield vscode.window.showInputBox({
                prompt: 'Email pour le superutilisateur',
                placeHolder: 'admin@example.com'
            });
            if (!email)
                return;
            const password = yield vscode.window.showInputBox({
                prompt: 'Mot de passe pour le superutilisateur',
                password: true
            });
            if (!password)
                return;
            // Exécution de la commande
            const terminal = this.getTerminal();
            terminal.show();
            // Configuration du mot de passe via variable d'environnement
            if (process.platform === 'win32') {
                terminal.sendText(`$env:DJANGO_SUPERUSER_PASSWORD="${password}"`);
            }
            else {
                terminal.sendText(`export DJANGO_SUPERUSER_PASSWORD="${password}"`);
            }
            terminal.sendText(`python manage.py createsuperuser --noinput --username ${username} --email ${email}`);
            vscode.window.showInformationMessage(`Superutilisateur "${username}" créé avec succès!`);
        });
    }
    /**
     * Gère la collecte des fichiers statiques
     */
    collectStatic() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.checkDjangoProject()) {
                vscode.window.showErrorMessage('Aucun projet Django détecté (manage.py non trouvé)');
                return;
            }
            const answer = yield vscode.window.showWarningMessage('Voulez-vous collecter tous les fichiers statiques? Cela peut écraser les fichiers existants.', 'Oui', 'Non');
            if (answer !== 'Oui')
                return;
            const terminal = this.getTerminal();
            terminal.show();
            terminal.sendText('python manage.py collectstatic --noinput');
            vscode.window.showInformationMessage('Fichiers statiques collectés avec succès!');
        });
    }
    /**
     * Nettoie les ressources utilisées
     */
    dispose() {
        if (this.terminal) {
            this.terminal.dispose();
            this.terminal = undefined;
        }
    }
}
exports.DjangoCommandManager = DjangoCommandManager;
