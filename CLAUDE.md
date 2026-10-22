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

Menu : Dashboard, Tâches, Planning, Plantations, Reporting, Carte, Paramètres, Compte.
- Planning (`features/planning/`) : menu placé après Tâches, réservé aux postes CS, CF, CO, FS, MO, ES et SE (`core/auth/access.ts`, `planningGuard`, `NavItem.planningOnly`) ; ni les administrateurs ni CD, SU ne le voient. La secrétaire (SE) n'a qu'un onglet **Équipe**, en lecture seule (mêmes plannings que Valider, sans décision ; `GET /plannings/equipe`), et pas d'Élaborer. Pour les autres, deux onglets : Élaborer (tous ces postes : saisie ligne par ligne ou import d'un fichier Excel `.xlsx` avec modèle téléchargeable, bibliothèques `read-excel-file` et `write-excel-file` chargées à la demande ; enregistrement du brouillon puis soumission) et Valider (chef secteur seulement : valide ou rejette avec motif obligatoire les plannings de ses collaborateurs ; un rejet remet le planning en brouillon). Le planning du chef secteur est validé d'office. Chaque planning s'affiche en liste ou en calendrier annuel (bascule Liste/Calendrier ; composant `ui/plan-calendar.component.ts`, 12 mois, couleur par catégorie, clic sur un jour = détail, jour vide = ajout ; lecture seule dans la fenêtre de validation). Une ligne = période (date de début et de fin, bornes incluses, une seule ligne même pour une formation de 20 jours), activité, lot/section, heures par jour ; la fin est proposée d'après la durée de l'activité (jours calendaires) et l'Excel accepte une colonne « Date fin » facultative ; un bloc « Objectifs annuels » compare les séances prévues à l'objectif de chaque activité ; l'activité d'une ligne vient du référentiel Paramètres > Activités, limité aux activités actives du poste de l'utilisateur (un poste sans activité configurée ne peut pas élaborer de planning). API (`PlanningApi`, démo ou HTTP) : `GET /plannings/mon-planning?annee=`, `PUT /plannings/mon-planning/lignes?annee=`, `POST /plannings/mon-planning/soumission?annee=`, `GET /plannings/a-valider?annee=`, `POST /plannings/{id}/validation`, `POST /plannings/{id}/rejet` `{motif}`. Compte de démonstration : `collaborateur@sysde.ci`.
- Dashboard : terminé (KPI, production mensuelle, visites, échéances), sur données de démonstration (`useDemoData: true` dans `src/environments`). Le choix du dashboard se fait à l'affichage (`dashboard.host.ts`, `dashboardKind` dans `core/auth/access.ts`) : standard pour administrateur, CD, CS, SU ; **dashboard de terrain** pour CF, CO, FS, MO et ES (`team/field-dashboard.page.ts` : statut du planning, activités du mois, prochaine activité, objectifs annuels, jours d'activité par mois, répartition par catégorie, prochaines activités, règles d'encadrement du poste dans `team/field.data.ts`) ; **dashboard de la secrétaire** pour SE (`team/staff-dashboard.page.ts` : personnel du secteur et plannings de l'équipe en lecture seule, `GET /plannings/equipe?annee=`). Ils ne montrent que le planifié : le réalisé viendra du mobile. Comptes de démonstration : `collaborateur@` (CF), `formateur@` (FS), `controleur.ordinaire@` (CO), `moniteur@` (MO), `equipe.speciale@` (ES), `secretaire@` (SE), tous en `@sysde.ci`.
- Paramètres : terminé sur données de démonstration (`features/settings/`) — sept onglets Opérateurs, Contrats, Attributions, Exercices, Activités, Permissions, Références (liste, création, modification, panneau latéral à droite). Règles métier dans `data/settings.rules.ts` (testées). API : `SettingsApi` (démo ou HTTP : `/operateurs`, `/contrats`, `/attributions`, `/exercices`, `/utilisateurs`, `/secteurs`, `/activites`, `/permissions` en GET/PUT). Onglet Activités (avant Permissions) : l'administrateur configure, pour chaque poste du planning (CS, CF, CO, FS, MO, ES) et chaque catégorie (Formation, Visite, Rencontre), les activités qu'il peut inscrire à son planning, avec pour chacune un objectif annuel (séances par an, facultatif) et une durée en jours ; une activité se désactive (jamais supprimée) ; libellé unique par poste ; référentiel initial dans `DEMO_ACTIVITIES`. Onglet Permissions (entre Exercices et Références) : matrice droits × postes (Voir / Faire), catalogue dans `data/permissions.catalog.ts`, état dans `PermissionsStore`. Les droits sont enregistrés mais pas encore appliqués aux menus, routes et guards (ils restent codés en dur dans `CurrentUser`). Composants communs : `ui-data-table`, `ui-field`, `ui-dialog-shell`.
- Tâches : page à onglets (`features/tasks/`), menu réservé aux administrateurs et aux postes CD et CS (masqué pour SU, CF, CO, FS, MO, ES et SE) (`canTask`, `NO_TASKS_POSTES` dans `core/auth/access.ts`, `tasksGuard`), onglet Utilisateur (comptes ; réutilise le store et l'API de `features/settings`). D'autres onglets viendront.
- Compte : page « Mon compte » (`features/account/`), visible par tous : identité de l'utilisateur connecté, changement de mot de passe (`AuthService.changePassword`, back réel : `POST /auth/mot-de-passe` avec `{currentPassword,newPassword}` → 204 ; règles dans `account.rules.ts`, minimum 8 caractères), thème clair/sombre, déconnexion.
- Plantations : `features/plantations/`, ouvert à tous les postes, lecture seule (liste filtrable + fiche). Les plantations viennent d'une base externe, via une API fournie par un tiers : port `PlantationsApi` (démo + HTTP `GET /plantations`, étendue appliquée côté serveur), DTO provisoire isolé dans `plantations.mapper.ts` à aligner sur la doc de l'API. Démo : dérivée des plantations de la carte.
- Carte : terminée (`features/map/`) — carte Leaflet plein écran, fonds de plan Plan (OpenStreetMap), Satellite, Hybride (Esri), Relief (OpenTopoMap). Prochaine étape : couches de données (secteurs, lots, parcelles).
- Brancher le back : passer `useDemoData` à `false` et exposer `GET {apiBaseUrl}/dashboard` au format `DashboardData` (`features/dashboard/data/dashboard.models.ts`).

## Règles métier utiles (cahier des charges)

- Opérateurs : SAPH, SOGB, TRCI, EXAT, CCP, IDH, CHC.
- Postes : CD, CS, CF, CO, FS, MO, ES, SE, SU, DI.
- Un secteur compte 3 lots ; le lot est l'unité d'affectation contractuelle.
- Un contrat par opérateur, d'une durée de 3 ans, avec 3 exercices annuels.

## Points d'attention

- `.github/workflows/ci.yml` doit être créé à la main (l'outil précédent ne pouvait pas écrire ce fichier). Il lance format, lint, tests et build avec pnpm.
- Dépôt GitHub : `fangba/sysde-front`, branche `main`.
- Avant de livrer une modification : `pnpm verify` doit passer sans avertissement.

- Connexion : page `/connexion` (hors shell), `AuthService` + `authGuard`/`guestGuard` + intercepteur Bearer ; mode démo = e-mail valide + mot de passe ≥ 4 car. ; back réel : `POST /auth/login` → `{token,user}`.
- Tâches : onglets Utilisateur (personnel de l'organisme connecté uniquement), Chef département, Chef secteur (secteur obligatoire, parmi ceux attribués à l'opérateur), Collaborateur (postes CF/CO/FS/MO/ES/SE, secteur facultatif) ; `User.sectorId` ajouté.
