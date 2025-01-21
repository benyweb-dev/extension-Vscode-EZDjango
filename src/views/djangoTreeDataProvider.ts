import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { StatusManager } from '../utils/statusManager/statusManager';
import { ServerManager } from '../utils/serverManager/serverManager';
import { AppsManager } from '../utils/appsManager/appsManager';

export class DjangoTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue?: string,
        public readonly command?: vscode.Command,
        public readonly iconPath?: string | vscode.ThemeIcon,
        public readonly parent?: DjangoTreeItem
    ) {
        super(label, collapsibleState);
        this.contextValue = contextValue;
        this.command = command;
        this.iconPath = iconPath;
    }
}

export class DjangoTreeDataProvider implements vscode.TreeDataProvider<DjangoTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<DjangoTreeItem | undefined | void> = new vscode.EventEmitter<DjangoTreeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<DjangoTreeItem | undefined | void> = this._onDidChangeTreeData.event;

    private statusManager: StatusManager;
    private serverManager: ServerManager;
    private appsManager: AppsManager;
    private disposables: vscode.Disposable[] = [];
    private refreshInterval: NodeJS.Timeout;

    constructor() {
        this.statusManager = StatusManager.getInstance();
        this.serverManager = ServerManager.getInstance();
        this.appsManager = AppsManager.getInstance();

        // Actualiser la vue quand l'état change
        this.disposables.push(
            vscode.window.onDidCloseTerminal(() => this.refresh())
        );

        // Rafraîchir périodiquement pour maintenir la vue à jour
        this.refreshInterval = setInterval(() => this.refresh(), 2000);
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: DjangoTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: DjangoTreeItem): Promise<DjangoTreeItem[]> {
        if (!element) {
            return this.getRootItems();
        }

        switch (element.contextValue) {
            case 'apps':
                return this.getDjangoApps();
            case 'app':
                return this.getAppDetails(element);
            case 'models':
                return this.getAppModels(element);
            case 'templates':
                return this.getAppTemplates(element);
            case 'static':
                return this.getAppStatic(element);
            case 'settings':
                return this.getSettingsFiles();
            case 'environment':
                return this.getEnvironmentInfo();
            case 'server':
                return this.getServerInfo();
            case 'migrations':
                return this.getMigrationsInfo();
            case 'administration':
                return this.getAdministrationInfo();
            case 'dependencies':
                return this.getDependenciesInfo();
            default:
                return [];
        }
    }

    private async getRootItems(): Promise<DjangoTreeItem[]> {
        return [
            new DjangoTreeItem(
                'Environnement',
                vscode.TreeItemCollapsibleState.Expanded,
                'environment',
                undefined,
                new vscode.ThemeIcon('gear')
            ),
            new DjangoTreeItem(
                'Serveur Django',
                vscode.TreeItemCollapsibleState.Expanded,
                'server',
                undefined,
                new vscode.ThemeIcon('radio-tower')
            ),
            new DjangoTreeItem(
                'Migrations',
                vscode.TreeItemCollapsibleState.Expanded,
                'migrations',
                undefined,
                new vscode.ThemeIcon('database')
            ),
            new DjangoTreeItem(
                'Applications',
                vscode.TreeItemCollapsibleState.Expanded,
                'apps',
                undefined,
                new vscode.ThemeIcon('package')
            ),
            new DjangoTreeItem(
                'Administration',
                vscode.TreeItemCollapsibleState.Expanded,
                'administration',
                undefined,
                new vscode.ThemeIcon('account')
            ),
            new DjangoTreeItem(
                'Gestion des dépendances',
                vscode.TreeItemCollapsibleState.Expanded,
                'dependencies',
                undefined,
                new vscode.ThemeIcon('package')
            )
        ];
    }

    private async getDjangoApps(): Promise<DjangoTreeItem[]> {
        const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspacePath) return [];

        const items: DjangoTreeItem[] = [];
        const files = fs.readdirSync(workspacePath);

        for (const file of files) {
            const filePath = path.join(workspacePath, file);
            if (fs.statSync(filePath).isDirectory() && 
                fs.existsSync(path.join(filePath, 'apps.py'))) {
                
                const appItem = new DjangoTreeItem(
                    file,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'app',
                    undefined,
                    new vscode.ThemeIcon('package')
                );
                items.push(appItem);
            }
        }

        items.push(new DjangoTreeItem(
            'Nouvelle application',
            vscode.TreeItemCollapsibleState.None,
            'newApp',
            {
                command: 'django-helper.createApp',
                title: 'Créer une nouvelle application'
            },
            new vscode.ThemeIcon('add')
        ));

        return items;
    }

    private async getAppDetails(element: DjangoTreeItem): Promise<DjangoTreeItem[]> {
        const appName = element.label as string;
        const appStructure = this.appsManager.getAppStructure(appName);
        const items: DjangoTreeItem[] = [];

        if (appStructure.hasModels) {
            items.push(new DjangoTreeItem(
                'Models',
                vscode.TreeItemCollapsibleState.Collapsed,
                'models',
                undefined,
                new vscode.ThemeIcon('database'),
                element
            ));
        }

        if (appStructure.hasViews) {
            items.push(new DjangoTreeItem(
                'Views',
                vscode.TreeItemCollapsibleState.None,
                'views',
                {
                    command: 'vscode.open',
                    title: 'Ouvrir views.py',
                    arguments: [vscode.Uri.file(path.join(appStructure.path, 'views.py'))]
                },
                new vscode.ThemeIcon('preview')
            ));
        }

        if (appStructure.hasUrls) {
            items.push(new DjangoTreeItem(
                'URLs',
                vscode.TreeItemCollapsibleState.None,
                'urls',
                {
                    command: 'vscode.open',
                    title: 'Ouvrir urls.py',
                    arguments: [vscode.Uri.file(path.join(appStructure.path, 'urls.py'))]
                },
                new vscode.ThemeIcon('link')
            ));
        }

        if (appStructure.hasAdmin) {
            items.push(new DjangoTreeItem(
                'Admin',
                vscode.TreeItemCollapsibleState.None,
                'admin',
                {
                    command: 'vscode.open',
                    title: 'Ouvrir admin.py',
                    arguments: [vscode.Uri.file(path.join(appStructure.path, 'admin.py'))]
                },
                new vscode.ThemeIcon('person')
            ));
        }

        if (appStructure.hasTemplates) {
            items.push(new DjangoTreeItem(
                'Templates',
                vscode.TreeItemCollapsibleState.Collapsed,
                'templates',
                undefined,
                new vscode.ThemeIcon('file-code'),
                element
            ));
        }

        if (appStructure.hasStatic) {
            items.push(new DjangoTreeItem(
                'Static',
                vscode.TreeItemCollapsibleState.Collapsed,
                'static',
                undefined,
                new vscode.ThemeIcon('file-media'),
                element
            ));
        }

        return items;
    }

    private async getAppModels(element: DjangoTreeItem): Promise<DjangoTreeItem[]> {
        if (!element.parent) return [];
        const appName = element.parent.label as string;
        const models = this.appsManager.getModels(appName);

        return models.map(model => new DjangoTreeItem(
            model,
            vscode.TreeItemCollapsibleState.None,
            'model',
            undefined,
            new vscode.ThemeIcon('symbol-class')
        ));
    }

    private async getAppTemplates(element: DjangoTreeItem): Promise<DjangoTreeItem[]> {
        if (!element.parent) return [];
        const appName = element.parent.label as string;
        const templatesPath = path.join(this.getWorkspacePath(), appName, 'templates', appName);
        
        return this.getFilesInDirectory(templatesPath, 'template');
    }

    private async getAppStatic(element: DjangoTreeItem): Promise<DjangoTreeItem[]> {
        if (!element.parent) return [];
        const appName = element.parent.label as string;
        const staticPath = path.join(this.getWorkspacePath(), appName, 'static', appName);
        
        return this.getFilesInDirectory(staticPath, 'static');
    }

    private getFilesInDirectory(dirPath: string, contextValue: string): DjangoTreeItem[] {
        if (!fs.existsSync(dirPath)) return [];

        const items: DjangoTreeItem[] = [];
        const files = fs.readdirSync(dirPath);

        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stat = fs.statSync(filePath);

            items.push(new DjangoTreeItem(
                file,
                stat.isDirectory() ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                contextValue,
                {
                    command: 'vscode.open',
                    title: 'Ouvrir le fichier',
                    arguments: [vscode.Uri.file(filePath)]
                },
                stat.isDirectory() ? new vscode.ThemeIcon('folder') : new vscode.ThemeIcon('file')
            ));
        }

        return items;
    }

    private getWorkspacePath(): string {
        const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspacePath) {
            throw new Error('Aucun workspace ouvert');
        }
        return workspacePath;
    }

    // Garder les méthodes existantes
    private async getSettingsFiles(): Promise<DjangoTreeItem[]> {
        const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspacePath) return [];

        const items: DjangoTreeItem[] = [];
        const settingsPath = path.join(workspacePath, 'myproject', 'settings.py');
        const urlsPath = path.join(workspacePath, 'myproject', 'urls.py');

        if (fs.existsSync(settingsPath)) {
            items.push(new DjangoTreeItem(
                'settings.py',
                vscode.TreeItemCollapsibleState.None,
                'settingsFile',
                {
                    command: 'vscode.open',
                    title: 'Ouvrir settings.py',
                    arguments: [vscode.Uri.file(settingsPath)]
                },
                new vscode.ThemeIcon('settings-gear')
            ));
        }

        if (fs.existsSync(urlsPath)) {
            items.push(new DjangoTreeItem(
                'urls.py',
                vscode.TreeItemCollapsibleState.None,
                'urlsFile',
                {
                    command: 'vscode.open',
                    title: 'Ouvrir urls.py',
                    arguments: [vscode.Uri.file(urlsPath)]
                },
                new vscode.ThemeIcon('link')
            ));
        }

        return items;
    }

    private async getEnvironmentInfo(): Promise<DjangoTreeItem[]> {
        const items: DjangoTreeItem[] = [];
        const isActive = this.statusManager.isVenvActive();

        items.push(new DjangoTreeItem(
            `Environnement virtuel: ${isActive ? 'Actif' : 'Inactif'}`,
            vscode.TreeItemCollapsibleState.None,
            'venvStatus',
            {
                command: 'django-helper.toggleVenv',
                title: 'Basculer l\'environnement virtuel'
            },
            isActive ? new vscode.ThemeIcon('check') : new vscode.ThemeIcon('x')
        ));

        return items;
    }

    private async getServerInfo(): Promise<DjangoTreeItem[]> {
        const items: DjangoTreeItem[] = [];
        const isRunning = this.serverManager.isServerRunning();

        items.push(new DjangoTreeItem(
            `Serveur: ${isRunning ? 'En cours' : 'Arrêté'}`,
            vscode.TreeItemCollapsibleState.None,
            'serverStatus',
            {
                command: 'django-helper.toggleServer',
                title: 'Basculer le serveur'
            },
            isRunning ? new vscode.ThemeIcon('broadcast') : new vscode.ThemeIcon('stop-circle')
        ));

        return items;
    }

    private async getMigrationsInfo(): Promise<DjangoTreeItem[]> {
        const items: DjangoTreeItem[] = [];

        items.push(new DjangoTreeItem(
            'Make Migrations',
            vscode.TreeItemCollapsibleState.None,
            'makemigrations',
            {
                command: 'django-helper.makemigrations',
                title: 'Make Migrations'
            },
            new vscode.ThemeIcon('diff-added')
        ));

        items.push(new DjangoTreeItem(
            'Migrate',
            vscode.TreeItemCollapsibleState.None,
            'migrate',
            {
                command: 'django-helper.migrate',
                title: 'Migrate'
            },
            new vscode.ThemeIcon('arrow-up')
        ));

        items.push(new DjangoTreeItem(
            'Voir l\'état des migrations',
            vscode.TreeItemCollapsibleState.None,
            'showmigrations',
            {
                command: 'django-helper.showmigrations',
                title: 'Show Migrations'
            },
            new vscode.ThemeIcon('list-tree')
        ));

        return items;
    }

    private async getAdministrationInfo(): Promise<DjangoTreeItem[]> {
        return [
            new DjangoTreeItem(
                'Créer un superutilisateur',
                vscode.TreeItemCollapsibleState.None,
                'createSuperuser',
                {
                    command: 'django-helper.createSuperuser',
                    title: 'Créer un superutilisateur Django'
                },
                new vscode.ThemeIcon('account')
            ),
            new DjangoTreeItem(
                'Collecter les fichiers statiques',
                vscode.TreeItemCollapsibleState.None,
                'collectStatic',
                {
                    command: 'django-helper.collectStatic',
                    title: 'Collecter les fichiers statiques'
                },
                new vscode.ThemeIcon('file-binary')
            )
        ];
    }

    private async getDependenciesInfo(): Promise<DjangoTreeItem[]> {
        const isVenvActive = this.statusManager.isVenvActive();
        const items = [
            new DjangoTreeItem(
                'Vérifier les dépendances',
                vscode.TreeItemCollapsibleState.None,
                'checkDependencies',
                {
                    command: 'django-helper.checkDependencies',
                    title: 'Vérifier les dépendances Django'
                },
                new vscode.ThemeIcon('verify')
            )
        ];

        if (isVenvActive) {
            items.push(
                new DjangoTreeItem(
                    'Lister toutes les dépendances',
                    vscode.TreeItemCollapsibleState.None,
                    'listDependencies',
                    {
                        command: 'django-helper.listDependencies',
                        title: 'Lister toutes les dépendances'
                    },
                    new vscode.ThemeIcon('list-tree')
                )
            );
        } else {
            items.push(
                new DjangoTreeItem(
                    'Activer l\'environnement virtuel du projet pour lister ses dépendances',
                    vscode.TreeItemCollapsibleState.None,
                    'activateVenvForDependencies',
                    {
                        command: 'django-helper.activateVenvForDependencies',
                        title: 'Activer l\'environnement virtuel'
                    },
                    new vscode.ThemeIcon('activate')
                )
            );
        }

        return items;
    }

    dispose() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        this.disposables.forEach(d => d.dispose());
    }
}