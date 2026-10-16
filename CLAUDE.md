# SysDE — front Angular

Contexte repris d'une longue session de travail. À lire avant toute modification.

## Le projet

SysDE : plateforme web de gestion de l'encadrement technique de l'hévéa (Côte d'Ivoire).
- Front : ce dépôt (Angular 22, `D:\projet_sysde\sysde-front`).
- Back : Spring Boot, dossier voisin `D:\projet_sysde\sysde-back`.
- Un mobile fonctionnant hors ligne se connectera à la même plateforme (non commencé).
- Langue de l'interface et des échanges : français.

## Stack et commandes

Angular 22.2, sans zone (zoneless), composants autonomes, signaux, `OnPush`, nouveau flux de contrôle (`@if`, `@for`).
TypeScript 6.0, ESLint 10, Vitest, Prettier, pnpm 10. Node 22.22.3+ ou 24.15+ obligatoire (voir `.nvmrc`).

```
pnpm install
pnpm start        # http://localhost:4200
pnpm verify       # format, lint, tests, build de production
```

pnpm refuse les imports de paquets non déclarés : ajouter toute dépendance utilisée dans `package.json`.
Les scripts d'installation autorisés sont listés dans `package.json` (`pnpm.onlyBuiltDependencies`).

## Structure

```
src/app/core/      services transverses (config, HTTP, thème, toasts, titres)
src/app/shared/    design system (ui/), modèles, utilitaires sans logique métier
src/app/layout/    coque, barre latérale, configuration du menu (nav.config.ts)
src/app/features/  un dossier par domaine, chargé à la demande
src/styles/        jetons de design, mixins, base
```
Alias : `@core`, `@shared`, `@layout`, `@features`, `@env`.
Un nouveau module = un dossier dans `features/`, une route dans `app.routes.ts`, une entrée dans `layout/nav.config.ts`.

## Design (obligatoire)

- Vert et blanc, police Montserrat (auto-hébergée via `@fontsource`), rendu sobre, sans codes visuels « IA ».
- Toutes les couleurs, rayons et ombres passent par les variables CSS de `src/styles/_tokens.scss`. Jamais de valeur en dur.
- Le violet est réservé aux données (séries de graphiques), jamais à la décoration.
- Clair et sombre : attribut `data-theme` sur `<html>`.
- Accessibilité : focus visible, contraste AA, graphiques doublés d'un tableau pour lecteurs d'écran.
- Réutiliser les composants de `shared/ui/` avant d'en créer. Graphiques en SVG maison, sans bibliothèque.
- Le skill `ui-vert-expert` (compte Claude de l'utilisateur) détaille ces règles.

## État actuel

Menu : Dashboard, Tâches, Carte, Paramètres.
- Dashboard : terminé (KPI, production mensuelle, visites, échéances), sur données de démonstration (`useDemoData: true` dans `src/environments`).
- Paramètres : terminé sur données de démonstration (`features/settings/`) — quatre onglets Opérateurs, Contrats, Attribution, Exercice (liste, création, modification, panneau latéral à droite). Règles métier dans `data/settings.rules.ts` (testées). API : `SettingsApi` (démo ou HTTP : `/operateurs`, `/contrats`, `/attributions`, `/exercices`, `/utilisateurs`, `/secteurs`). Composants communs : `ui-data-table`, `ui-field`, `ui-dialog-shell`.
- Tâches : page à onglets (`features/tasks/`), onglet Utilisateur (comptes ; réutilise le store et l'API de `features/settings`). D'autres onglets viendront.
- Carte : terminée (`features/map/`) — carte Leaflet plein écran, fonds de plan Plan (OpenStreetMap), Satellite, Hybride (Esri), Relief (OpenTopoMap). Prochaine étape : couches de données (secteurs, lots, parcelles).
- Brancher le back : passer `useDemoData` à `false` et exposer `GET {apiBaseUrl}/dashboard` au format `DashboardData` (`features/dashboard/data/dashboard.models.ts`).

## Règles métier utiles (cahier des charges)

- Opérateurs : SAPH, SOGB, TRCI, EXAT, CCP, IDH, CHC.
- Postes : CD, CS, CF, CO, FO, MO, ES, SE, SU, DI.
- Un secteur compte 3 lots ; le lot est l'unité d'affectation contractuelle.
- Un contrat par opérateur, d'une durée de 3 ans, avec 3 exercices annuels.

## Points d'attention

- `.github/workflows/ci.yml` doit être créé à la main (l'outil précédent ne pouvait pas écrire ce fichier). Il lance format, lint, tests et build avec pnpm.
- Dépôt GitHub : `fangba/sysde-front`, branche `main`.
- Avant de livrer une modification : `pnpm verify` doit passer sans avertissement.
