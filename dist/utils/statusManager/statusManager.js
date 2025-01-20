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
exports.toggleVenv = exports.deactivateVirtualEnv = exports.activateVirtualEnv = exports.createVirtualEnv = exports.StatusManager = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const constants_1 = require("../constants");
const fs = __importStar(require("fs"));
class StatusManager {
    constructor() {
        this.venvActive = false;
        this.serverActive = false;
        this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.statusBar.command = 'django-helper.toggleVenv';
        this.updateStatusBar();
        this.statusBar.show();
    }
    static getInstance() {
        if (!StatusManager.instance) {
            StatusManager.instance = new StatusManager();
        }
        return StatusManager.instance;
    }
    checkVenvStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.venvActive;
        });
    }
    updateStatusBar() {
        let text = '$(tools) Django: ';
        text += this.venvActive ? '$(check) Env actif' : '$(x) Env inactif';
        this.statusBar.text = text;
        // Mettre en évidence quand l'environnement est actif
        if (this.venvActive) {
            this.statusBar.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            this.statusBar.tooltip = 'Cliquez pour désactiver l\'environnement virtuel';
        }
        else {
            this.statusBar.backgroundColor = undefined;
            this.statusBar.tooltip = 'Cliquez pour activer l\'environnement virtuel';
        }
        this.statusBar.show();
    }
    setVenvStatus(active) {
        this.venvActive = active;
        this.updateStatusBar();
    }
    getVenvStatus() {
        return this.venvActive;
    }
    setServerStatus(active) {
        this.serverActive = active;
        this.updateStatusBar();
    }
    getServerStatus() {
        return this.serverActive;
    }
    isVenvActive() {
        return this.venvActive;
    }
    getTerminal() {
        if (!this.terminal || this.terminal.exitStatus !== undefined) {
            this.terminal = vscode.window.createTerminal(constants_1.TERMINAL_NAME);
        }
        return this.terminal;
    }
    dispose() {
        this.statusBar.dispose();
        if (this.terminal) {
            this.terminal.dispose();
        }
    }
}
exports.StatusManager = StatusManager;
function createVirtualEnv() {
    return __awaiter(this, void 0, void 0, function* () {
        const terminal = vscode.window.createTerminal(constants_1.TERMINAL_NAME);
        terminal.show();
        terminal.sendText('python -m venv .venv');
        vscode.window.showInformationMessage('Création de l\'environnement virtuel...');
    });
}
exports.createVirtualEnv = createVirtualEnv;
function activateVirtualEnv() {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const workspacePath = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0].uri.fsPath;
        if (!workspacePath) {
            vscode.window.showErrorMessage('Aucun workspace ouvert');
            return;
        }
        const terminal = vscode.window.createTerminal(constants_1.TERMINAL_NAME);
        const venvPath = path.join(workspacePath, '.venv');
        if (!fs.existsSync(venvPath)) {
            const createNew = yield vscode.window.showInformationMessage('Aucun environnement virtuel trouvé. Voulez-vous en créer un ?', 'Oui', 'Non');
            if (createNew === 'Oui') {
                yield createVirtualEnv();
            }
            return;
        }
        terminal.show();
        // Utiliser les guillemets pour gérer les espaces dans les chemins
        if (process.platform === 'win32') {
            terminal.sendText(`"${path.join(venvPath, 'Scripts', 'Activate.ps1')}"`);
        }
        else {
            terminal.sendText(`source "${path.join(venvPath, 'bin', 'activate')}"`);
        }
        StatusManager.getInstance().setVenvStatus(true);
        vscode.window.showInformationMessage('Environnement virtuel activé');
    });
}
exports.activateVirtualEnv = activateVirtualEnv;
function deactivateVirtualEnv() {
    return __awaiter(this, void 0, void 0, function* () {
        const terminal = vscode.window.createTerminal(constants_1.TERMINAL_NAME);
        terminal.show();
        terminal.sendText('deactivate');
        StatusManager.getInstance().setVenvStatus(false);
        vscode.window.showInformationMessage('Environnement virtuel désactivé');
    });
}
exports.deactivateVirtualEnv = deactivateVirtualEnv;
function toggleVenv() {
    return __awaiter(this, void 0, void 0, function* () {
        const statusManager = StatusManager.getInstance();
        if (statusManager.isVenvActive()) {
            yield deactivateVirtualEnv();
        }
        else {
            yield activateVirtualEnv();
        }
    });
}
exports.toggleVenv = toggleVenv;
