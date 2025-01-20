import * as vscode from 'vscode';
import { TERMINAL_NAME } from '../constants';
import { StatusManager } from '../statusManager/statusManager';

export interface MigrationStatus {
    app: string;
    status: 'applied' | 'pending' | 'no_migrations';
    lastMigration?: string;
}

export class MigrationsManager {
    private static _instance: MigrationsManager;
    private statusManager: StatusManager;
    private _onDidChangeMigrations: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    readonly onDidChangeMigrations: vscode.Event<void> = this._onDidChangeMigrations.event;

    private constructor() {
        this.statusManager = StatusManager.getInstance();
    }

    public static getInstance(): MigrationsManager {
        if (!MigrationsManager._instance) {
            MigrationsManager._instance = new MigrationsManager();
        }
        return MigrationsManager._instance;
    }

    private async ensureVenvActive(): Promise<boolean> {
        if (!this.statusManager.isVenvActive()) {
            const choice = await vscode.window.showWarningMessage(
                'L\'environnement virtuel doit être actif pour gérer les migrations.',
                'Activer l\'environnement virtuel',
                'Annuler'
            );

            if (choice === 'Activer l\'environnement virtuel') {
                await vscode.commands.executeCommand('django-helper.activateVenv');
                // Attendre l'activation et vérifier le statut
                await new Promise(resolve => setTimeout(resolve, 2000));
                return this.statusManager.isVenvActive();
            }
            return false;
        }
        return true;
    }

    public async makeMigrations(appName?: string): Promise<void> {
        if (!await this.ensureVenvActive()) {
            vscode.window.showErrorMessage('Les migrations ne peuvent pas être créées sans un environnement virtuel actif.');
            return;
        }

        const terminal = this.getOrCreateTerminal();
        terminal.show();

        const command = appName 
            ? `python manage.py makemigrations ${appName}`
            : 'python manage.py makemigrations';

        terminal.sendText(command);
        this._onDidChangeMigrations.fire();
    }

    public async migrate(appName?: string, migrationName?: string): Promise<void> {
        if (!await this.ensureVenvActive()) {
            vscode.window.showErrorMessage('Les migrations ne peuvent pas être appliquées sans un environnement virtuel actif.');
            return;
        }

        const terminal = this.getOrCreateTerminal();
        terminal.show();

        let command = 'python manage.py migrate';
        if (appName) {
            command += ` ${appName}`;
            if (migrationName) {
                command += ` ${migrationName}`;
            }
        }

        terminal.sendText(command);
        this._onDidChangeMigrations.fire();
    }

    public async showMigrations(): Promise<void> {
        if (!await this.ensureVenvActive()) {
            vscode.window.showErrorMessage('Impossible d\'afficher les migrations sans un environnement virtuel actif.');
            return;
        }

        const terminal = this.getOrCreateTerminal();
        terminal.show();
        terminal.sendText('python manage.py showmigrations');
    }

    private getOrCreateTerminal(): vscode.Terminal {
        const existingTerminal = vscode.window.terminals.find(t => t.name === TERMINAL_NAME);
        return existingTerminal || vscode.window.createTerminal(TERMINAL_NAME);
    }
}