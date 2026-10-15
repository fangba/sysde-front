# SysDE — Front Angular

Interface web de SysDE, la plateforme de gestion de l'encadrement technique de l'hévéa.
Angular 22 (sans zone, composants autonomes, signaux), design vert et blanc en Montserrat.

## Démarrage

Prérequis : Node 22.22.3+, 24.15+ ou 26+ (voir `.nvmrc`) et [pnpm](https://pnpm.io) 10+ (`corepack enable` suffit).

```bash
pnpm install
pnpm start          # http://localhost:4200
```

| Commande          | Rôle                                         |
| ----------------- | -------------------------------------------- |
| `pnpm start`      | Serveur de développement                     |
| `pnpm build:prod` | Build de production dans `dist/`             |
| `pnpm test`       | Tests unitaires (Vitest), en mode watch      |
| `pnpm test:ci`    | Tests unitaires, une seule passe             |
| `pnpm lint`       | ESLint (code et accessibilité des templates) |
| `pnpm format`     | Prettier                                     |
| `pnpm verify`     | Format, lint, tests et build de production   |

## Données et API

`src/environments` contient la configuration. Tant que `useDemoData` vaut `true`, le tableau de bord
utilise des données locales (`features/dashboard/data/dashboard.demo.ts`). Pour brancher le back
Spring Boot : passer `useDemoData` à `false` et exposer `GET {apiBaseUrl}/dashboard` avec le format de
`DashboardData` (`dashboard.models.ts`). `apiBaseUrl` vaut `http://localhost:8080/api` en développement.

## Structure

```
src/app/
  core/        services transverses : configuration, HTTP, thème, notifications, titres
  shared/      design system (ui/), modèles et utilitaires sans dépendance métier
  layout/      coque de l'application : barre latérale, tiroir mobile
  features/    un dossier par domaine, chargé à la demande
    dashboard/   vue d'ensemble (data/, state/, page)
    placeholder/ pages des modules à venir
src/styles/    jetons (couleurs, rayons, ombres), mixins, base
```

Alias TypeScript : `@core`, `@shared`, `@layout`, `@features`, `@env`.

## Conventions

- Composants `OnPush`, entrées en `input()`, flux de contrôle `@if` / `@for`.
- Couleurs, rayons et ombres via les variables CSS de `styles/_tokens.scss`, jamais en dur.
- Thème clair et sombre : attribut `data-theme` sur `<html>`, préférence système par défaut.
- Un nouveau module = un dossier dans `features/`, une route chargée à la demande dans `app.routes.ts`,
  une entrée dans `layout/nav.config.ts`.
- Accessibilité : focus visible, graphiques doublés d'un tableau pour lecteurs d'écran, contraste AA.

## Déploiement

`Dockerfile` : build Node 24 avec pnpm puis service par nginx (repli SPA, en-têtes de sécurité, `/healthz`).
`.github/workflows/ci.yml` exécute format, lint, tests et build à chaque push.
