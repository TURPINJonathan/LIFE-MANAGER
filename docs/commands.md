# Commandes

Tout se lance depuis WSL. `make` s'utilise dans `api/`. npm s'utilise dans `front/`.

## API

| Commande | Rôle |
| --- | --- |
| `make up` | Construit et démarre PHP, nginx, PostgreSQL |
| `make down` | Arrête la stack |
| `make ps` | État des conteneurs |
| `make logs` | Logs |
| `make shell` | Shell dans PHP |
| `make install` | `composer install` |
| `make jwt-keys` | Paire de clés Lexik |
| `make migrate` | Migrations |
| `make migration` | Génère une migration |
| `make user EMAIL=… PASSWORD=…` | Crée un administrateur |
| `make cache` | Vide et réchauffe le cache |
| `make cs` / `make cs-fix` | php-cs-fixer |
| `make stan` | PHPStan |
| `make qa` | style + PHPStan |
| `make test` | Base de test, migrations, PHPUnit |
| `make db-reset` | Supprime la base applicative puis migre |

`make test` et `make migrate` ont besoin de la stack (`make up`).

Premier lancement : `make up`, `make install`, `make jwt-keys`, `make migrate`, `make user`.

## Front

Lancer depuis `front/`.

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Dev server (port 9200) |
| `npm run typecheck` | Génération RR + `tsc` |
| `npm run lint` / `npm run lint:fix` | ESLint |
| `npm run format` / `npm run format:check` | Prettier |
| `npm run fix` | Prettier write + ESLint fix |
| `npm run check` | Contrôles sans écriture |
| `npm test` | Vitest |
| `npm run ci` | check + typecheck + tests |
| `npm run build` | Build production |

Détail layout / accents : `docs/frontend.md`.
