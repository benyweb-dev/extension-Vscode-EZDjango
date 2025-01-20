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
exports.AppsManager = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const constants_1 = require("../constants");
const statusManager_1 = require("../statusManager/statusManager");
class AppsManager {
    constructor() {
        this._onDidChangeApps = new vscode.EventEmitter();
        this.onDidChangeApps = this._onDidChangeApps.event;
        this.statusManager = statusManager_1.StatusManager.getInstance();
    }
    static getInstance() {
        if (!AppsManager._instance) {
            AppsManager._instance = new AppsManager();
        }
        return AppsManager._instance;
    }
    getOrCreateTerminal() {
        const existingTerminal = vscode.window.terminals.find(t => t.name === constants_1.TERMINAL_NAME);
        return existingTerminal || vscode.window.createTerminal(constants_1.TERMINAL_NAME);
    }
    createApp(appName) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.statusManager.isVenvActive()) {
                const choice = yield vscode.window.showWarningMessage('L\'environnement virtuel doit être actif pour créer une application.', 'Activer l\'environnement virtuel', 'Annuler');
                if (choice === 'Activer l\'environnement virtuel') {
                    yield vscode.commands.executeCommand('django-helper.activateVenv');
                    yield new Promise(resolve => setTimeout(resolve, 1000));
                }
                else {
                    return;
                }
            }
            // Vérifier que le nom est valide
            if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(appName)) {
                vscode.window.showErrorMessage('Le nom de l\'application n\'est pas valide. Utilisez uniquement des lettres, des chiffres et des underscores.');
                return;
            }
            const workspacePath = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0].uri.fsPath;
            if (!workspacePath) {
                vscode.window.showErrorMessage('Aucun workspace ouvert');
                return;
            }
            const terminal = this.getOrCreateTerminal();
            terminal.show();
            terminal.sendText(`python manage.py startapp ${appName}`);
            // Attendre que l'application soit créée
            yield new Promise(resolve => setTimeout(resolve, 2000));
            // Créer la structure de base des dossiers
            const appPath = path.join(workspacePath, appName);
            if (fs.existsSync(appPath)) {
                // Créer le dossier templates si non existant
                const templatesPath = path.join(appPath, 'templates', appName);
                if (!fs.existsSync(templatesPath)) {
                    fs.mkdirSync(templatesPath, { recursive: true });
                }
                // Créer le dossier static si non existant
                const staticPath = path.join(appPath, 'static', appName);
                if (!fs.existsSync(staticPath)) {
                    fs.mkdirSync(staticPath, { recursive: true });
                }
                // Créer urls.py si non existant
                const urlsPath = path.join(appPath, 'urls.py');
                if (!fs.existsSync(urlsPath)) {
                    const urlsContent = `from django.urls import path
from . import views

app_name = '${appName}'

urlpatterns = [
    # Ajoutez vos URLs ici
]`;
                    fs.writeFileSync(urlsPath, urlsContent);
                }
            }
            this._onDidChangeApps.fire();
            vscode.window.showInformationMessage(`Application '${appName}' créée avec succès.`);
        });
    }
    getAppStructure(appName) {
        var _a;
        const workspacePath = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0].uri.fsPath;
        if (!workspacePath) {
            throw new Error('Aucun workspace ouvert');
        }
        const appPath = path.join(workspacePath, appName);
        return {
            name: appName,
            path: appPath,
            hasModels: fs.existsSync(path.join(appPath, 'models.py')),
            hasViews: fs.existsSync(path.join(appPath, 'views.py')),
            hasUrls: fs.existsSync(path.join(appPath, 'urls.py')),
            hasAdmin: fs.existsSync(path.join(appPath, 'admin.py')),
            hasTemplates: fs.existsSync(path.join(appPath, 'templates')),
            hasStatic: fs.existsSync(path.join(appPath, 'static'))
        };
    }
    openFile(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            const document = yield vscode.workspace.openTextDocument(filePath);
            yield vscode.window.showTextDocument(document);
        });
    }
    getModels(appName) {
        var _a;
        const workspacePath = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0].uri.fsPath;
        if (!workspacePath) {
            return [];
        }
        const modelsPath = path.join(workspacePath, appName, 'models.py');
        if (!fs.existsSync(modelsPath)) {
            return [];
        }
        // Lire le fichier models.py et extraire les noms des modèles
        const content = fs.readFileSync(modelsPath, 'utf8');
        const modelRegex = /class\s+(\w+)\(.*\):/g;
        const models = [];
        let match;
        while ((match = modelRegex.exec(content)) !== null) {
            models.push(match[1]);
        }
        return models;
    }
}
exports.AppsManager = AppsManager;
