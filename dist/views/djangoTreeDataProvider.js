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
exports.DjangoTreeDataProvider = exports.DjangoTreeItem = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const statusManager_1 = require("../utils/statusManager/statusManager");
const serverManager_1 = require("../utils/serverManager/serverManager");
const appsManager_1 = require("../utils/appsManager/appsManager");
class DjangoTreeItem extends vscode.TreeItem {
    constructor(label, collapsibleState, contextValue, command, iconPath, parent) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.contextValue = contextValue;
        this.command = command;
        this.iconPath = iconPath;
        this.parent = parent;
        this.contextValue = contextValue;
        this.command = command;
        this.iconPath = iconPath;
    }
}
exports.DjangoTreeItem = DjangoTreeItem;
class DjangoTreeDataProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.disposables = [];
        this.statusManager = statusManager_1.StatusManager.getInstance();
        this.serverManager = serverManager_1.ServerManager.getInstance();
        this.appsManager = appsManager_1.AppsManager.getInstance();
        // Actualiser la vue quand l'état change
        this.disposables.push(vscode.window.onDidCloseTerminal(() => this.refresh()));
        // Rafraîchir périodiquement pour maintenir la vue à jour
        this.refreshInterval = setInterval(() => this.refresh(), 2000);
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        return __awaiter(this, void 0, void 0, function* () {
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
                default:
                    return [];
            }
        });
    }
    getRootItems() {
        return __awaiter(this, void 0, void 0, function* () {
            return [
                new DjangoTreeItem('Environnement', vscode.TreeItemCollapsibleState.Expanded, 'environment', undefined, new vscode.ThemeIcon('gear')),
                new DjangoTreeItem('Serveur Django', vscode.TreeItemCollapsibleState.Expanded, 'server', undefined, new vscode.ThemeIcon('radio-tower')),
                new DjangoTreeItem('Migrations', vscode.TreeItemCollapsibleState.Expanded, 'migrations', undefined, new vscode.ThemeIcon('database')),
                new DjangoTreeItem('Applications', vscode.TreeItemCollapsibleState.Expanded, 'apps', undefined, new vscode.ThemeIcon('package')),
                new DjangoTreeItem('Configuration', vscode.TreeItemCollapsibleState.Collapsed, 'settings', undefined, new vscode.ThemeIcon('settings'))
            ];
        });
    }
    getDjangoApps() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const workspacePath = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0].uri.fsPath;
            if (!workspacePath)
                return [];
            const items = [];
            const files = fs.readdirSync(workspacePath);
            for (const file of files) {
                const filePath = path.join(workspacePath, file);
                if (fs.statSync(filePath).isDirectory() &&
                    fs.existsSync(path.join(filePath, 'apps.py'))) {
                    const appItem = new DjangoTreeItem(file, vscode.TreeItemCollapsibleState.Collapsed, 'app', undefined, new vscode.ThemeIcon('package'));
                    items.push(appItem);
                }
            }
            items.push(new DjangoTreeItem('Nouvelle application', vscode.TreeItemCollapsibleState.None, 'newApp', {
                command: 'django-helper.createApp',
                title: 'Créer une nouvelle application'
            }, new vscode.ThemeIcon('add')));
            return items;
        });
    }
    getAppDetails(element) {
        return __awaiter(this, void 0, void 0, function* () {
            const appName = element.label;
            const appStructure = this.appsManager.getAppStructure(appName);
            const items = [];
            if (appStructure.hasModels) {
                items.push(new DjangoTreeItem('Models', vscode.TreeItemCollapsibleState.Collapsed, 'models', undefined, new vscode.ThemeIcon('database'), element));
            }
            if (appStructure.hasViews) {
                items.push(new DjangoTreeItem('Views', vscode.TreeItemCollapsibleState.None, 'views', {
                    command: 'vscode.open',
                    title: 'Ouvrir views.py',
                    arguments: [vscode.Uri.file(path.join(appStructure.path, 'views.py'))]
                }, new vscode.ThemeIcon('preview')));
            }
            if (appStructure.hasUrls) {
                items.push(new DjangoTreeItem('URLs', vscode.TreeItemCollapsibleState.None, 'urls', {
                    command: 'vscode.open',
                    title: 'Ouvrir urls.py',
                    arguments: [vscode.Uri.file(path.join(appStructure.path, 'urls.py'))]
                }, new vscode.ThemeIcon('link')));
            }
            if (appStructure.hasAdmin) {
                items.push(new DjangoTreeItem('Admin', vscode.TreeItemCollapsibleState.None, 'admin', {
                    command: 'vscode.open',
                    title: 'Ouvrir admin.py',
                    arguments: [vscode.Uri.file(path.join(appStructure.path, 'admin.py'))]
                }, new vscode.ThemeIcon('person')));
            }
            if (appStructure.hasTemplates) {
                items.push(new DjangoTreeItem('Templates', vscode.TreeItemCollapsibleState.Collapsed, 'templates', undefined, new vscode.ThemeIcon('file-code'), element));
            }
            if (appStructure.hasStatic) {
                items.push(new DjangoTreeItem('Static', vscode.TreeItemCollapsibleState.Collapsed, 'static', undefined, new vscode.ThemeIcon('file-media'), element));
            }
            return items;
        });
    }
    getAppModels(element) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!element.parent)
                return [];
            const appName = element.parent.label;
            const models = this.appsManager.getModels(appName);
            return models.map(model => new DjangoTreeItem(model, vscode.TreeItemCollapsibleState.None, 'model', undefined, new vscode.ThemeIcon('symbol-class')));
        });
    }
    getAppTemplates(element) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!element.parent)
                return [];
            const appName = element.parent.label;
            const templatesPath = path.join(this.getWorkspacePath(), appName, 'templates', appName);
            return this.getFilesInDirectory(templatesPath, 'template');
        });
    }
    getAppStatic(element) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!element.parent)
                return [];
            const appName = element.parent.label;
            const staticPath = path.join(this.getWorkspacePath(), appName, 'static', appName);
            return this.getFilesInDirectory(staticPath, 'static');
        });
    }
    getFilesInDirectory(dirPath, contextValue) {
        if (!fs.existsSync(dirPath))
            return [];
        const items = [];
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stat = fs.statSync(filePath);
            items.push(new DjangoTreeItem(file, stat.isDirectory() ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None, contextValue, {
                command: 'vscode.open',
                title: 'Ouvrir le fichier',
                arguments: [vscode.Uri.file(filePath)]
            }, stat.isDirectory() ? new vscode.ThemeIcon('folder') : new vscode.ThemeIcon('file')));
        }
        return items;
    }
    getWorkspacePath() {
        var _a;
        const workspacePath = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0].uri.fsPath;
        if (!workspacePath) {
            throw new Error('Aucun workspace ouvert');
        }
        return workspacePath;
    }
    // Garder les méthodes existantes
    getSettingsFiles() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const workspacePath = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0].uri.fsPath;
            if (!workspacePath)
                return [];
            const items = [];
            const settingsPath = path.join(workspacePath, 'myproject', 'settings.py');
            const urlsPath = path.join(workspacePath, 'myproject', 'urls.py');
            if (fs.existsSync(settingsPath)) {
                items.push(new DjangoTreeItem('settings.py', vscode.TreeItemCollapsibleState.None, 'settingsFile', {
                    command: 'vscode.open',
                    title: 'Ouvrir settings.py',
                    arguments: [vscode.Uri.file(settingsPath)]
                }, new vscode.ThemeIcon('settings-gear')));
            }
            if (fs.existsSync(urlsPath)) {
                items.push(new DjangoTreeItem('urls.py', vscode.TreeItemCollapsibleState.None, 'urlsFile', {
                    command: 'vscode.open',
                    title: 'Ouvrir urls.py',
                    arguments: [vscode.Uri.file(urlsPath)]
                }, new vscode.ThemeIcon('link')));
            }
            return items;
        });
    }
    getEnvironmentInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            const items = [];
            const isActive = this.statusManager.isVenvActive();
            items.push(new DjangoTreeItem(`Environnement virtuel: ${isActive ? 'Actif' : 'Inactif'}`, vscode.TreeItemCollapsibleState.None, 'venvStatus', {
                command: 'django-helper.toggleVenv',
                title: 'Basculer l\'environnement virtuel'
            }, isActive ? new vscode.ThemeIcon('check') : new vscode.ThemeIcon('x')));
            return items;
        });
    }
    getServerInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            const items = [];
            const isRunning = this.serverManager.isServerRunning();
            items.push(new DjangoTreeItem(`Serveur: ${isRunning ? 'En cours' : 'Arrêté'}`, vscode.TreeItemCollapsibleState.None, 'serverStatus', {
                command: 'django-helper.toggleServer',
                title: 'Basculer le serveur'
            }, isRunning ? new vscode.ThemeIcon('broadcast') : new vscode.ThemeIcon('stop-circle')));
            return items;
        });
    }
    getMigrationsInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            const items = [];
            items.push(new DjangoTreeItem('Make Migrations', vscode.TreeItemCollapsibleState.None, 'makemigrations', {
                command: 'django-helper.makemigrations',
                title: 'Make Migrations'
            }, new vscode.ThemeIcon('diff-added')));
            items.push(new DjangoTreeItem('Migrate', vscode.TreeItemCollapsibleState.None, 'migrate', {
                command: 'django-helper.migrate',
                title: 'Migrate'
            }, new vscode.ThemeIcon('arrow-up')));
            items.push(new DjangoTreeItem('Voir l\'état des migrations', vscode.TreeItemCollapsibleState.None, 'showmigrations', {
                command: 'django-helper.showmigrations',
                title: 'Show Migrations'
            }, new vscode.ThemeIcon('list-tree')));
            return items;
        });
    }
    dispose() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        this.disposables.forEach(d => d.dispose());
    }
}
exports.DjangoTreeDataProvider = DjangoTreeDataProvider;
