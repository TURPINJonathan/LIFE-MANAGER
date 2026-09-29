# Sécurité

## API

Authentification stateless par JWT (LexikJWTAuthenticationBundle).

- `POST /api/login` avec `{ "email", "password" }` renvoie `{ "token" }`.
- `GET /api/me` avec `Authorization: Bearer <token>` renvoie le profil.
- Mot de passe hashé en argon2id.
- Le login est limité à 5 tentatives par 15 minutes.
- Rôles : `ROLE_USER` (toujours présent) et `ROLE_ADMIN`.
- Tout chemin `/api` autre que le login et la documentation exige un JWT valide.
- Durée de vie du JWT : **14 jours** (`token_ttl: 1209600`). Pas de refresh token ni de liste de révocation pour l’instant.

Création d'un compte en développement :

```bash
make user EMAIL=turpin.j@hotmail.fr PASSWORD='ChangeMe123!'
```

Le mot de passe fait au moins 12 caractères et contient une lettre et un chiffre.

Les clés RSA vivent dans `api/config/jwt/` et ne sont pas versionnées. `make jwt-keys` les génère. La passphrase de développement est dans `.env` ; une production doit la remplacer par une variable d'environnement.

La documentation OpenAPI (`/api`, `/api/docs`) est publique pour le développement. Il faudra la fermer avant une mise en production.

Chaque nouvelle opération API Platform doit déclarer `security`. Une ressource sans règle d'accès est un trou.

## Front

Au chargement, le shell lit le JWT dans `localStorage` (`lm.accessToken`), appelle `/api/me`, puis fixe le statut de session.

- Les routes sous `_protected` exigent une session. Sinon, redirection vers `/login`.
- `/login` est une route invitée. Une session déjà ouverte retourne à l'accueil.
- La déconnexion efface le token local. Le JWT reste valable jusqu'à son expiration (14 jours) : il n'y a pas encore de liste de révocation.

Le token dans `localStorage` est lisible par le JavaScript de la page. C'est le fonctionnement retenu pour ce JWT. Un cookie HttpOnly pourra le remplacer plus tard si on ajoute un canal serveur.
