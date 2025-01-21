# Django-ENV Helper pour VS Code

Une extension VS Code pour simplifier la gestion des projets Django avec environnement virtuel.

## Prérequis

- [Visual Studio Code](https://code.visualstudio.com/) version 1.80.0 ou supérieure
- [Python](https://www.python.org/) (3.8 ou supérieur recommandé)
- [Git](https://git-scm.com/) pour le développement

## Installation

1. Ouvrez VS Code
2. Accédez à la vue Extensions (Ctrl+Shift+X)
3. Recherchez "Django-ENV Helper"
4. Cliquez sur Installer

## Fonctionnalités

### Gestion de l'environnement virtuel
- Création automatique d'environnement virtuel (`django-helper.createVenv`)
- Activation/désactivation de l'environnement (`django-helper.activateVenv`, `django-helper.deactivateVenv`)
- Détection automatique des environnements existants

### Serveur de développement
- Démarrage/arrêt du serveur Django (`django-helper.startServer`)
- Vérification automatique de l'environnement virtuel
- Gestion du port de développement

### Administration Django
- Création de superutilisateur via interface graphique
- Gestion des fichiers statiques
- Gestion des migrations de base de données

## Sécurité et bonnes pratiques

L'extension applique automatiquement les bonnes pratiques :
- Isolation des dépendances dans un environnement virtuel
- Vérification des prérequis avant chaque commande
- Gestion sécurisée des mots de passe

## Utilisation 

1. Ouvrez votre projet Django dans VS Code
2. Utilisez la barre d'activité Django pour accéder aux commandes
3. Suivez les assistants pour configurer votre environnement

## Développement

Pour contribuer au développement :

```bash
# Cloner le dépôt
git clone https://github.com/votre-compte/django-env-helper

# Installer les dépendances
npm install

# Compiler l'extension
npm run compile

# Lancer les tests
npm test
```

## Licence

Ce projet est sous licence MIT. Voir le fichier LICENSE pour plus de détails.

## Contribuer

Les contributions sont les bienvenues ! N'hésitez pas à :

1. Forker le projet
2. Créer une branche pour votre fonctionnalité
3. Commiter vos changements
4. Pousser vers votre fork
5. Ouvrir une Pull Request

## Support

Pour tout problème ou suggestion :
- Ouvrez une issue sur GitHub
- Consultez la documentation en ligne