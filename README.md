# Life Manager

Outil pour organiser le quotidien : comptes et pronostics, événements, et d'autres modules ensuite.

Monorepo :

- `api/` — Symfony 8.1, API Platform, PostgreSQL, JWT Lexik
- `front/` — React Router, Tailwind, gardes de session et shell applicatif
- `docs/` — conventions détaillées
- `.cursor/rules/` — règles courtes pour l'agent

## Démarrage

Depuis WSL, à la racine :

```bash
cd api
make up
make install
make jwt-keys
make migrate
make user EMAIL=turpin.j@hotmail.fr PASSWORD='ChangeMe123!'
```

Le front écoute sur le port **9200** (volontairement éloigné de FYNX : 5173 / 5174) :

```bash
cd front
npm install
npm run dev
```

| Service | URL |
| --- | --- |
| API | http://localhost:9100 |
| OpenAPI | http://localhost:9100/api |
| Front | http://localhost:9200 |
| PostgreSQL | localhost:9432 (`lm` / `lm`, base `life_manager`) |

Node 22 est installé dans WSL sous `~/.local/node`. Ouvre un nouveau terminal si `node` n'est pas dans le `PATH`.

Les commandes `make` se lancent dans `api/`. Les commandes npm se lancent dans `front/`.
