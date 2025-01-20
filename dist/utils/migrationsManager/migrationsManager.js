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
exports.MigrationsManager = void 0;
const vscode = __importStar(require("vscode"));
const constants_1 = require("../constants");
const statusManager_1 = require("../statusManager/statusManager");
class MigrationsManager {
    constructor() {
        this._onDidChangeMigrations = new vscode.EventEmitter();
        this.onDidChangeMigrations = this._onDidChangeMigrations.event;
        this.statusManager = statusManager_1.StatusManager.getInstance();
    }
    static getInstance() {
        if (!MigrationsManager._instance) {
            MigrationsManager._instance = new MigrationsManager();
        }
        return MigrationsManager._instance;
    }
    ensureVenvActive() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.statusManager.isVenvActive()) {
                const choice = yield vscode.window.showWarningMessage('L\'environnement virtuel doit être actif pour gérer les migrations.', 'Activer l\'environnement virtuel', 'Annuler');
                if (choice === 'Activer l\'environnement virtuel') {
                    yield vscode.commands.executeCommand('django-helper.activateVenv');
                    // Attendre l'activation et vérifier le statut
                    yield new Promise(resolve => setTimeout(resolve, 2000));
                    return this.statusManager.isVenvActive();
                }
                return false;
            }
            return true;
        });
    }
    makeMigrations(appName) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(yield this.ensureVenvActive())) {
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
        });
    }
    migrate(appName, migrationName) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(yield this.ensureVenvActive())) {
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
        });
    }
    showMigrations() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(yield this.ensureVenvActive())) {
                vscode.window.showErrorMessage('Impossible d\'afficher les migrations sans un environnement virtuel actif.');
                return;
            }
            const terminal = this.getOrCreateTerminal();
            terminal.show();
            terminal.sendText('python manage.py showmigrations');
        });
    }
    getOrCreateTerminal() {
        const existingTerminal = vscode.window.terminals.find(t => t.name === constants_1.TERMINAL_NAME);
        return existingTerminal || vscode.window.createTerminal(constants_1.TERMINAL_NAME);
    }
}
exports.MigrationsManager = MigrationsManager;
