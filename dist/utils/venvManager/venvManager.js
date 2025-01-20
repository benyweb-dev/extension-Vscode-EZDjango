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
exports.VenvManager = void 0;
const vscode = __importStar(require("vscode"));
const statusManager_1 = require("../statusManager/statusManager");
const serverManager_1 = require("../serverManager/serverManager");
const constants_1 = require("../constants");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class VenvManager {
    constructor() {
        this.isVenvActive = false;
    }
    static getInstance() {
        if (!VenvManager.instance) {
            VenvManager.instance = new VenvManager();
        }
        return VenvManager.instance;
    }
    getTerminal() {
        if (!this.terminal || this.terminal.exitStatus !== undefined) {
            this.terminal = vscode.window.createTerminal(constants_1.TERMINAL_NAME);
        }
        return this.terminal;
    }
    detectVenvFolder() {
        var _a;
        const workspacePath = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0].uri.fsPath;
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
    createVirtualEnv() {
        return __awaiter(this, void 0, void 0, function* () {
            const terminal = this.getTerminal();
            terminal.show();
            terminal.sendText('python -m venv .venv');
            // Attendre un peu pour la création
            yield new Promise(resolve => setTimeout(resolve, 2000));
            // Activer après création
            yield this.activateVirtualEnv();
            vscode.window.showInformationMessage('Environnement virtuel créé et activé');
        });
    }
    activateVirtualEnv() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isVenvActive) {
                vscode.window.showInformationMessage('L\'environnement virtuel est déjà activé');
                return;
            }
            const terminal = this.getTerminal();
            const venvPath = this.detectVenvFolder();
            if (!venvPath) {
                const createNew = yield vscode.window.showInformationMessage('Aucun environnement virtuel trouvé. Voulez-vous en créer un ?', 'Oui', 'Non');
                if (createNew === 'Oui') {
                    yield this.createVirtualEnv();
                }
                return;
            }
            const activateCommand = process.platform === 'win32'
                ? `.\\${path.basename(venvPath)}\\Scripts\\activate`
                : `source "${path.join(venvPath, 'bin', 'activate')}"`;
            terminal.show();
            terminal.sendText(activateCommand);
            // Attendre un peu que l'activation soit terminée
            yield new Promise(resolve => setTimeout(resolve, 1000));
            this.isVenvActive = true;
            statusManager_1.StatusManager.getInstance().setVenvStatus(true);
            vscode.window.showInformationMessage('Environnement virtuel activé');
        });
    }
    deactivateVirtualEnv() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isVenvActive) {
                vscode.window.showInformationMessage('Aucun environnement virtuel n\'est actuellement activé');
                return;
            }
            // Vérifier si le serveur est actif
            const serverManager = serverManager_1.ServerManager.getInstance();
            if (serverManager.isServerRunning()) {
                const choice = yield vscode.window.showWarningMessage('Le serveur Django est en cours d\'exécution. Il est recommandé de l\'arrêter avant de désactiver l\'environnement virtuel.', 'Arrêter le serveur et désactiver', 'Annuler');
                if (choice === 'Arrêter le serveur et désactiver') {
                    yield serverManager.stopServer();
                }
                else {
                    return;
                }
            }
            const terminal = this.getTerminal();
            terminal.show();
            terminal.sendText('deactivate');
            this.isVenvActive = false;
            statusManager_1.StatusManager.getInstance().setVenvStatus(false);
            vscode.window.showInformationMessage('Environnement virtuel désactivé');
        });
    }
    toggleVenv() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isVenvActive) {
                yield this.deactivateVirtualEnv();
            }
            else {
                yield this.activateVirtualEnv();
            }
            statusManager_1.StatusManager.getInstance().setVenvStatus(this.isVenvActive);
        });
    }
    dispose() {
        if (this.terminal) {
            this.terminal.dispose();
            this.terminal = undefined;
        }
    }
}
exports.VenvManager = VenvManager;
