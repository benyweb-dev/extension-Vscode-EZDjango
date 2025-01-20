import * as vscode from 'vscode';
import * as path from 'path';
import { TERMINAL_NAME } from '../constants';
import * as fs from 'fs';

export class StatusManager {
    private terminal: vscode.Terminal | undefined;
    private statusBar: vscode.StatusBarItem;
    private static instance: StatusManager;
    private venvActive: boolean = false;

    private constructor() {
        this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.statusBar.command = 'django-helper.toggleVenv';
        this.updateStatusBar();
        this.statusBar.show();
    }

    public static getInstance(): StatusManager {
        if (!StatusManager.instance) {
            StatusManager.instance = new StatusManager();
        }
        return StatusManager.instance;
    }

    public async checkVenvStatus(): Promise<boolean> {
        return this.venvActive;
    }

    private updateStatusBar() {
        if (this.venvActive) {
            this.statusBar.text = '$(check) Venv Actif';
            this.statusBar.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        } else {
            this.statusBar.text = '$(x) Venv Inactif';
            this.statusBar.backgroundColor = undefined;
        }
        this.statusBar.show();
    }

    public setVenvStatus(active: boolean) {
        this.venvActive = active;
        this.updateStatusBar();
    }

    public isVenvActive(): boolean {
        return this.venvActive;
    }

    private getTerminal(): vscode.Terminal {
        if (!this.terminal || this.terminal.exitStatus !== undefined) {
            this.terminal = vscode.window.createTerminal(TERMINAL_NAME);
        }
        return this.terminal;
    }

    public dispose() {
        this.statusBar.dispose();
        if (this.terminal) {
            this.terminal.dispose();
        }
    }
}

export async function createVirtualEnv(): Promise<void> {
    const terminal = vscode.window.createTerminal(TERMINAL_NAME);
    terminal.show();
    terminal.sendText('python -m venv .venv');
    vscode.window.showInformationMessage('Création de l\'environnement virtuel...');
}

export async function activateVirtualEnv(): Promise<void> {
    const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!workspacePath) {
        vscode.window.showErrorMessage('Aucun workspace ouvert');
        return;
    }

    const terminal = vscode.window.createTerminal(TERMINAL_NAME);
    const venvPath = path.join(workspacePath, '.venv');
    
    if (!fs.existsSync(venvPath)) {
        const createNew = await vscode.window.showInformationMessage(
            'Aucun environnement virtuel trouvé. Voulez-vous en créer un ?',
            'Oui', 
            'Non'
        );
        
        if (createNew === 'Oui') {
            await createVirtualEnv();
        }
        return;
    }

    terminal.show();
    
    // Utiliser les guillemets pour gérer les espaces dans les chemins
    if (process.platform === 'win32') {
        terminal.sendText(`"${path.join(venvPath, 'Scripts', 'Activate.ps1')}"`);
    } else {
        terminal.sendText(`source "${path.join(venvPath, 'bin', 'activate')}"`);
    }

    StatusManager.getInstance().setVenvStatus(true);
    vscode.window.showInformationMessage('Environnement virtuel activé');
}

export async function deactivateVirtualEnv(): Promise<void> {
    const terminal = vscode.window.createTerminal(TERMINAL_NAME);
    terminal.show();
    terminal.sendText('deactivate');
    StatusManager.getInstance().setVenvStatus(false);
    vscode.window.showInformationMessage('Environnement virtuel désactivé');
}

export async function toggleVenv(): Promise<void> {
    const statusManager = StatusManager.getInstance();
    if (statusManager.isVenvActive()) {
        await deactivateVirtualEnv();
    } else {
        await activateVirtualEnv();
    }
}