# Django Helper pour VS Code

## Fonctionnalités

### Gestion de l'environnement virtuel
- Création automatique d'un environnement virtuel (`django-helper.createVenv`)
- Activation/désactivation de l'environnement (`django-helper.activateVenv`, `django-helper.deactivateVenv`)
- Détection automatique si aucun venv n'existe

### Serveur de développement
- Démarrage/arrêt du serveur Django (`django-helper.startServer`)
- Vérification automatique de l'environnement virtuel

⚠️ **Important : Sécurité et bonnes pratiques**

Il est fortement recommandé d'exécuter votre serveur Django uniquement dans un environnement virtuel pour les raisons suivantes :

1. **Isolation des dépendances** : Évite les conflits entre les versions des packages
2. **Sécurité** : Limite l'exposition des packages système
3. **Reproductibilité** : Garantit que votre projet fonctionnera de la même manière sur d'autres machines
4. **Gestion des versions** : Facilite la mise à jour et le rollback des dépendances

L'extension vérifiera automatiquement si un environnement virtuel est actif avant de lancer le serveur.

## Utilisation

1. Ouvrez votre projet Django dans VS Code
2. Si aucun environnement virtuel n'existe pas, l'extension vous proposera d'en créer un
3. Activez l'environnement virtuel via la commande dédiée
4. Lancez votre serveur en toute sécurité


## Contribuer

Les contributions sont les bienvenues ! Veuillez soumettre une demande de tirage pour toute amélioration ou correction de bogue.

## License

Ce projet est sous licence MIT. Voir le fichier LICENSE pour plus de détails.