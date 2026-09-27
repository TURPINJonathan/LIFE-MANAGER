# Architecture

Life Manager est un monorepo. L'API et le front se parlent en JSON, sur HTTP, avec un JWT.

## API

Le code métier vit dans `api/src/Module/<Nom>/`. API Platform 5 sert les ressources ; les points techniques restent des contrôleurs.

```
Module/Security/
  Contract/          interfaces injectées
  Domain/Entity      entités Doctrine
  Domain/Enum
  Dto
  Repository         implémentations Doctrine
  Service            cas d'usage
  Provider           lecture pour un endpoint
  Controller         routes HTTP hors ressource API Platform
  Infrastructure     commandes, détails techniques
  Exception
```

Un nouveau sujet (comptes, événements) devient un nouveau dossier `Module/`, avec le même découpage, seulement les couches utiles. On n'ajoute pas d'interface s'il n'y a qu'un appelant local et pas de seconde implémentation prévue.

Doctrine mappe explicitement `Domain/Entity`. Les DTO ne sont pas des entités.

API Platform sert les ressources et la doc OpenAPI. Les points d'entrée techniques (`/api/login`, `/api/me`) restent des contrôleurs Symfony.

## Front

```
front/app/
  components/     pièces visuelles réutilisables
  constants/      routes, statuts, clés
  hooks/
  layouts/        shell, barre, navigation
  modules/        un dossier par domaine (comptes, événements)
  pages/          écrans transverses (accueil, connexion, paramètres)
  routes/         fichiers minces, sans logique
  security/       gardes
  services/       appels HTTP
  store/          état de session
  types/
```

Les routes déclarées dans `app/routes.ts` rendent une page ou un layout. La logique d'accès est dans `security/`, l'appel réseau dans `services/`.

## Données

Chaque personne a son compte. Les données d'un module futur appartiennent à l'utilisateur connecté. Un foyer ou un espace partagé n'est pas dans ce socle.
