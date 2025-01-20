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
exports.ServerManager = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const statusManager_1 = require("../statusManager/statusManager");
const constants_1 = require("../constants");
class ServerManager {
    constructor() {
        this.isRunning = false;
        this.lastPort = '8000';
        this.disposables = [];
        this.onServerStateChange = new vscode.EventEmitter();
        this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
        this.statusBar.command = 'django-helper.toggleServer';
        this.statusManager = statusManager_1.StatusManager.getInstance();
        this.updateStatusBar();
        this.statusBar.show();
    }
    static getInstance() {
        if (!ServerManager._instance) {
            ServerManager._instance = new ServerManager();
        }
        return ServerManager._instance;
    }
    updateStatusBar() {
        if (this.isRunning) {
            this.statusBar.text = `$(radio-tower) Django Server (Port ${this.lastPort})`;
            this.statusBar.tooltip = 'Cliquez pour arrêter le serveur Django';
            this.statusBar.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        }
        else {
            this.statusBar.text = '$(stop-circle) Django Server (Arrêté)';
            this.statusBar.tooltip = 'Cliquez pour démarrer le serveur Django';
            this.statusBar.backgroundColor = undefined;
        }
    }
    getTerminal() {
        return vscode.window.terminals.find(t => t.name === constants_1.TERMINAL_NAME);
    }
    createTerminal() {
        return vscode.window.createTerminal(constants_1.TERMINAL_NAME);
    }
    getOrCreateTerminal() {
        return this.getTerminal() || this.createTerminal();
    }
    setServerState(running) {
        this.isRunning = running;
        this.updateStatusBar();
        this.onServerStateChange.fire(running);
    }
    startServer(customPort) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this.isRunning) {
                    vscode.window.showInformationMessage('Le serveur Django est déjà en cours d\'exécution');
                    return;
                }
                const workspacePath = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0].uri.fsPath;
                if (!workspacePath) {
                    throw new Error('Aucun workspace ouvert');
                }
                if (!fs.existsSync(path.join(workspacePath, 'manage.py'))) {
                    throw new Error('Aucun projet Django détecté (manage.py non trouvé)');
                }
                const port = customPort || (yield this.getPort());
                if (!port)
                    return;
                this.lastPort = port;
                const terminal = this.getOrCreateTerminal();
                terminal.show();
                terminal.sendText(`python manage.py runserver ${port}`);
                this.setServerState(true);
                setTimeout(() => {
                    vscode.env.openExternal(vscode.Uri.parse(`http://localhost:${port}/`));
                }, 2000);
            }
            catch (error) {
                if (error instanceof Error) {
                    vscode.window.showErrorMessage(error.message);
                }
            }
        });
    }
    getPort() {
        return __awaiter(this, void 0, void 0, function* () {
            const port = yield vscode.window.showInputBox({
                title: 'Port du serveur Django',
                prompt: 'Entrez le numéro de port (par défaut: 8000)',
                value: this.lastPort,
                validateInput: (value) => {
                    const port = parseInt(value);
                    if (isNaN(port) || port < 1 || port > 65535) {
                        return 'Veuillez entrer un numéro de port valide (1-65535)';
                    }
                    return null;
                }
            });
            return port || undefined;
        });
    }
    stopServer() {
        return __awaiter(this, void 0, void 0, function* () {
            const terminal = this.getTerminal();
            if (this.isRunning && terminal) {
                if (process.platform === 'win32') {
                    terminal.sendText('\x03');
                }
                else {
                    terminal.sendText('kill -SIGINT $$');
                }
                yield new Promise(resolve => setTimeout(resolve, 500));
                this.setServerState(false);
                vscode.window.showInformationMessage('Serveur Django arrêté');
            }
        });
    }
    toggleServer() {
        if (this.isRunning) {
            this.stopServer();
        }
        else {
            this.startServer(this.lastPort);
        }
    }
    isServerRunning() {
        return this.isRunning;
    }
    dispose() {
        this.statusBar.dispose();
        this.disposables.forEach(d => d.dispose());
        this.onServerStateChange.dispose();
    }
}
exports.ServerManager = ServerManager;
