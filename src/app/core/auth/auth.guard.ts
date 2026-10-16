import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import { AuthService } from './auth.service';
import { CurrentUser } from './current-user';

/** Réserve une route aux utilisateurs connectés ; sinon renvoie vers la connexion. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated()
    ? true
    : router.createUrlTree(['/connexion'], { queryParams: { retour: state.url } });
};

/** Évite d'afficher la connexion à quelqu'un qui est déjà connecté. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() ? router.createUrlTree(['/']) : true;
};

/** Réserve une route aux administrateurs ; les autres sont renvoyés à l'accueil. */
export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(CurrentUser).isAdministrator() ? true : router.createUrlTree(['/']);
};

/** Réserve le reporting aux administrateurs et aux chefs de département et de secteur. */
export const reportingGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(CurrentUser).canReport() ? true : router.createUrlTree(['/']);
};

/** N'accepte que des chemins internes pour la redirection après connexion. */
export function safeReturnUrl(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : '/';
}
