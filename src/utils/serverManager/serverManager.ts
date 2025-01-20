import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { StatusManager } from '../statusManager/statusManager';
import { TERMINAL_NAME } from '../constants';

export class ServerManager {
    private statusBar: vscode.StatusBarItem;
    private static _instance: ServerManager;
    private isRunning: boolean = false;
    private lastPort: string = '8000';
    private disposables: vscode.Disposable[] = [];
    private statusManager: StatusManager;

    public onServerStateChange: vscode.EventEmitter<boolean> = new vscode.EventEmitter<boolean>();

    private constructor() {
        this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
        this.statusBar.command = 'django-helper.toggleServer';
        this.statusManager = StatusManager.getInstance();
        this.updateStatusBar();
        this.statusBar.show();
    }

    public static getInstance(): ServerManager {
        if (!ServerManager._instance) {
            ServerManager._instance = new ServerManager();
        }
        return ServerManager._instance;
    }

    private updateStatusBar() {
        if (this.isRunning) {
            this.statusBar.text = `$(radio-tower) Django Server (Port ${this.lastPort})`;
            this.statusBar.tooltip = 'Cliquez pour arrêter le serveur Django';
            this.statusBar.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        } else {
            this.statusBar.text = '$(stop-circle) Django Server (Arrêté)';
            this.statusBar.tooltip = 'Cliquez pour démarrer le serveur Django';
            this.statusBar.backgroundColor = undefined;
        }
    }

    private getTerminal(): vscode.Terminal | undefined {
        return vscode.window.terminals.find(t => t.name === TERMINAL_NAME);
    }

    private createTerminal(): vscode.Terminal {
        return vscode.window.createTerminal(TERMINAL_NAME);
    }

    private getOrCreateTerminal(): vscode.Terminal {
        return this.getTerminal() || this.createTerminal();
    }

    private setServerState(running: boolean) {
        this.isRunning = running;
        this.updateStatusBar();
        this.onServerStateChange.fire(running);
    }

    public async startServer(customPort?: string) {
        try {
            if (this.isRunning) {
                vscode.window.showInformationMessage('Le serveur Django est déjà en cours d\'exécution');
                return;
            }

            const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
            if (!workspacePath) {
                throw new Error('Aucun workspace ouvert');
            }

            if (!fs.existsSync(path.join(workspacePath, 'manage.py'))) {
                throw new Error('Aucun projet Django détecté (manage.py non trouvé)');
            }

            const port = customPort || await this.getPort();
            if (!port) return;

            this.lastPort = port;
            const terminal = this.getOrCreateTerminal();
            terminal.show();
            terminal.sendText(`python manage.py runserver ${port}`);
            
            this.setServerState(true);

            setTimeout(() => {
                vscode.env.openExternal(vscode.Uri.parse(`http://localhost:${port}/`));
            }, 2000);

        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(error.message);
            }
        }
    }

    private async getPort(): Promise<string | undefined> {
        const port = await vscode.window.showInputBox({
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
    }

    public async stopServer() {
        const terminal = this.getTerminal();
        if (this.isRunning && terminal) {
            if (process.platform === 'win32') {
                terminal.sendText('\x03');
            } else {
                terminal.sendText('kill -SIGINT $$');
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
            this.setServerState(false);
            vscode.window.showInformationMessage('Serveur Django arrêté');
        }
    }

    public toggleServer() {
        if (this.isRunning) {
            this.stopServer();
        } else {
            this.startServer(this.lastPort);
        }
    }

    public isServerRunning(): boolean {
        return this.isRunning;
    }

    public dispose() {
        this.statusBar.dispose();
        this.disposables.forEach(d => d.dispose());
        this.onServerStateChange.dispose();
    }
}