import { index, layout, route, type RouteConfig } from '@react-router/dev/routes';

export default [
  layout('routes/_root.tsx', [
    layout('routes/_protected.tsx', [
      layout('routes/_app.tsx', [
        index('routes/home.tsx'),
        route('comptes', 'routes/accounts.tsx'),
        route('evenements', 'routes/events.tsx'),
        route('categories', 'routes/categories.tsx'),
        route('parametres', 'routes/settings.tsx'),
      ]),
    ]),
    layout('routes/_guest.tsx', [route('login', 'routes/login.tsx')]),
  ]),
] satisfies RouteConfig;
