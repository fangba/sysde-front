/**
 * Comptes de connexion du mode démonstration (`useDemoData`). Chacun correspond à un compte
 * de la liste des utilisateurs (même e-mail) ; le mot de passe est commun et n'a de valeur
 * qu'en démonstration : le vrai contrôle est fait par le back Spring Boot.
 */
export interface DemoAccount {
  readonly label: string;
  readonly detail: string;
  readonly email: string;
  readonly password: string;
  /** Intitulé affiché à la place du libellé du poste. */
  readonly role?: string;
}

/** Intitulé du rôle donnant accès à toutes les sections de l'application. */
export const ADMINISTRATOR_ROLE = 'Administrateur';

export const DEMO_PASSWORD = 'Sysde2026!';

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    label: 'Administrateur FIRCA',
    detail: 'FIRCA',
    email: 'admin.firca@sysde.ci',
    password: DEMO_PASSWORD,
    role: ADMINISTRATOR_ROLE,
  },
  {
    label: 'Administrateur APROMAC',
    detail: 'APROMAC',
    email: 'admin.apromac@sysde.ci',
    password: DEMO_PASSWORD,
    role: ADMINISTRATOR_ROLE,
  },
  {
    label: 'Chef de département',
    detail: 'SAPH',
    email: 'chef.departement@sysde.ci',
    password: DEMO_PASSWORD,
  },
  {
    label: 'Chef secteur',
    detail: 'SAPH · S01',
    email: 'chef.secteur@sysde.ci',
    password: DEMO_PASSWORD,
  },
  {
    label: 'Contrôleur de saignée',
    detail: 'SAPH · S01 · CF',
    email: 'collaborateur@sysde.ci',
    password: DEMO_PASSWORD,
  },
  {
    label: 'Formateur de saignée',
    detail: 'SAPH · S01 · FS',
    email: 'formateur@sysde.ci',
    password: DEMO_PASSWORD,
  },
  {
    label: 'Contrôleur ordinaire',
    detail: 'SAPH · S01 · CO',
    email: 'controleur.ordinaire@sysde.ci',
    password: DEMO_PASSWORD,
  },
  {
    label: 'Moniteur',
    detail: 'SAPH · S01 · MO',
    email: 'moniteur@sysde.ci',
    password: DEMO_PASSWORD,
  },
  {
    label: 'Équipe spéciale',
    detail: 'SAPH · S01 · ES',
    email: 'equipe.speciale@sysde.ci',
    password: DEMO_PASSWORD,
  },
  {
    label: 'Secrétaire',
    detail: 'SAPH · S01 · SE',
    email: 'secretaire@sysde.ci',
    password: DEMO_PASSWORD,
  },
  {
    label: 'Superviseur',
    detail: 'APROMAC',
    email: 'superviseur@sysde.ci',
    password: DEMO_PASSWORD,
  },
];
