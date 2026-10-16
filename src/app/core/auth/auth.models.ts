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
