# Front

React 19, React Router 8, Tailwind 4, Zustand, React Hook Form et Zod.

Le shell, la nav et les tokens de design reprennent le modèle FYNX : rail desktop, barre d’onglets mobile avec bouton Créer au centre, top-bar avec titre contextuel et menu compte, Material Symbols, typographie `display` / `title` / `body`, surfaces `bg-page` / `bg-card`.

Les utilities de marque (`bg-accent`, `text-brand`, …) sont les mêmes partout ; seule la **dominance** (valeurs CSS derrière ces tokens) change selon la page.

## Dominance de couleur

### Principe

- Surfaces de base : **neutres** (slate), pas de vert par défaut.
- Chaque section majeure a une teinte (`data-accent` sur `<html>`).
- Les composants ne connaissent que les tokens (`accent`, `brand`, `accent-tint`, …). Ils ne choisissent pas la teinte.

| Clé | Usage | Teinte |
| --- | --- | --- |
| `neutral` | Accueil, login, fallback | Slate |
| `accounts` | `/comptes` (+ sous-routes) | Orangé |
| `events` | `/evenements` | Cyan / pétrole clair |
| `categories` | `/categories` | Prune |
| `settings` | `/parametres` | Bleu |

### Fichiers

| Fichier | Rôle |
| --- | --- |
| `front/app/constants/accent.constants.ts` | `APP_ACCENT`, `ROUTE_ACCENT`, `resolveAccent()` |
| `front/app/hooks/use-route-accent.hook.ts` | Pose `document.documentElement.dataset.accent` |
| `front/app/routes/_root.tsx` | Appelle le hook (app + login) |
| `front/app/app.css` | Packs `[data-accent='…']` et variantes dark |

### Ajouter une dominance

1. Ajouter la clé dans `APP_ACCENT`.
2. Mapper le préfixe de route dans `ROUTE_ACCENT`.
3. Copier un bloc `[data-accent='…']` dans `app.css` et ajuster `--accent`, `--brand`, `--accent-tint`, `--bg-page`, alphas, puis le bloc `html.dark[data-accent='…']`.

Modifier une teinte = éditer uniquement le bloc CSS correspondant. Changer la page associée = éditer `ROUTE_ACCENT`.

### Règles

- Pas de hex / classes Tailwind couleur-nommées (`bg-orange-500`) pour la marque dans les composants.
- Le plus long préfixe gagne (`/comptes/nouveau` → `accounts`).
- `/` ne match que l’accueil exact (pas toutes les routes).

## Layout

`AppShell` compose `TopBar`, `Nav` (rail + tab), le menu compte (`Dialog`) et la surface principale `APP_MAIN_SURFACE_CLASSES`.

Les entrées de navigation sont dans `NAV_ITEMS` / `MENU_ITEMS` / `CREATE_ENTRIES`.

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement (port 9200) |
| `npm run build` | Build de production |
| `npm run typecheck` | Types React Router + `tsc` |
| `npm run lint` | ESLint (contrôle) |
| `npm run lint:fix` | ESLint (corrige ce qui est auto-fixable) |
| `npm run format` | Prettier (écrit) |
| `npm run format:check` | Prettier (contrôle) |
| `npm run fix` | `format` + `lint:fix` |
| `npm run check` | `format:check` + `lint` |
| `npm test` | Vitest |
| `npm run ci` | check + typecheck + tests |
