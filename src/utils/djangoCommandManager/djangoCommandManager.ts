import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Gestionnaire des commandes Django avancées
 * Gère la création de superutilisateur et la collecte des fichiers statiques
 */
export class DjangoCommandManager {
    private static instance: DjangoCommandManager;
    private terminal: vscode.Terminal | undefined;
    
    private constructor() {
        this.terminal = undefined;
    }

    public static getInstance(): DjangoCommandManager {
        if (!DjangoCommandManager.instance) {
            DjangoCommandManager.instance = new DjangoCommandManager();
        }
        return DjangoCommandManager.instance;
    }

    /**
     * Obtient ou crée un terminal dédié aux commandes Django
     */
    private getTerminal(): vscode.Terminal {
        if (!this.terminal || this.terminal.exitStatus !== undefined) {
            this.terminal = vscode.window.createTerminal('Django Commands');
        }
        return this.terminal;
    }

    /**
     * Vérifie la présence d'un projet Django valide
     */
    private checkDjangoProject(): boolean {
        const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspacePath) return false;
        return fs.existsSync(path.join(workspacePath, 'manage.py'));
    }

    /**
     * Crée un superutilisateur Django avec interface graphique
     */
    public async createSuperuser(): Promise<void> {
        if (!this.checkDjangoProject()) {
            vscode.window.showErrorMessage('Aucun projet Django détecté (manage.py non trouvé)');
            return;
        }

        // Interface utilisateur pour la saisie des informations
        const username = await vscode.window.showInputBox({
            prompt: 'Nom d\'utilisateur pour le superutilisateur',
            placeHolder: 'admin'
        });

        if (!username) return;

        const email = await vscode.window.showInputBox({
            prompt: 'Email pour le superutilisateur',
            placeHolder: 'admin@example.com'
        });

        if (!email) return;

        const password = await vscode.window.showInputBox({
            prompt: 'Mot de passe pour le superutilisateur',
            password: true
        });

        if (!password) return;

        // Exécution de la commande
        const terminal = this.getTerminal();
        terminal.show();
        
        // Configuration du mot de passe via variable d'environnement
        if (process.platform === 'win32') {
            terminal.sendText(`$env:DJANGO_SUPERUSER_PASSWORD="${password}"`);
        } else {
            terminal.sendText(`export DJANGO_SUPERUSER_PASSWORD="${password}"`);
        }
        
        terminal.sendText(`python manage.py createsuperuser --noinput --username ${username} --email ${email}`);
        
        vscode.window.showInformationMessage(`Superutilisateur "${username}" créé avec succès!`);
    }

    /**
     * Gère la collecte des fichiers statiques
     */
    public async collectStatic(): Promise<void> {
        if (!this.checkDjangoProject()) {
            vscode.window.showErrorMessage('Aucun projet Django détecté (manage.py non trouvé)');
            return;
        }

        const answer = await vscode.window.showWarningMessage(
            'Voulez-vous collecter tous les fichiers statiques? Cela peut écraser les fichiers existants.',
            'Oui', 'Non'
        );

        if (answer !== 'Oui') return;

        const terminal = this.getTerminal();
        terminal.show();
        terminal.sendText('python manage.py collectstatic --noinput');

        vscode.window.showInformationMessage('Fichiers statiques collectés avec succès!');
    }

    /**
     * Nettoie les ressources utilisées
     */
    public dispose(): void {
        if (this.terminal) {
            this.terminal.dispose();
            this.terminal = undefined;
        }
    }
}