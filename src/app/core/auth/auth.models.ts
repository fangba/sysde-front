import type { SessionUser } from './current-user';

export interface Credentials {
  readonly email: string;
  readonly password: string;
}

/** Session ouverte : jeton d'accès (envoyé au back) et profil de l'utilisateur. */
export interface Session {
  readonly token: string;
  readonly user: SessionUser;
}

/** Demande de changement de mot de passe de l'utilisateur connecté. */
export interface PasswordChange {
  readonly currentPassword: string;
  readonly newPassword: string;
  /** Adresse du compte : n'est utilisée que par le mode démonstration (le back identifie par le jeton). */
  readonly email: string;
}
