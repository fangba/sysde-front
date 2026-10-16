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

export const DEMO_PASSWORD = 'Sysde2026!';

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    label: 'Administrateur FIRCA',
    detail: 'FIRCA',
    email: 'admin.firca@sysde.ci',
    password: DEMO_PASSWORD,
    role: 'Administrateur',
  },
  {
    label: 'Administrateur APROMAC',
    detail: 'APROMAC',
    email: 'admin.apromac@sysde.ci',
    password: DEMO_PASSWORD,
    role: 'Administrateur',
  },
  {
    label: 'Chef de département',
    detail: 'SAPH',
    email: 'chef.departement@sysde.ci',
    password: DEMO_PASSWORD,
  },
  {
    label: 'Chef de secteur',
    detail: 'SAPH · S01',
    email: 'chef.secteur@sysde.ci',
    password: DEMO_PASSWORD,
  },
  {
    label: 'Superviseur',
    detail: 'APROMAC',
    email: 'superviseur@sysde.ci',
    password: DEMO_PASSWORD,
  },
];
