import { Injectable, computed, signal } from '@angular/core';

export interface SessionUser {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly role: string;
  /** Opérateur (organisation) auquel appartient l'utilisateur. */
  readonly operator: { readonly acronym: string; readonly name: string };
  /** Secteur de rattachement, s'il en a un (absent pour les administrateurs). */
  readonly sector?: { readonly code: string; readonly name: string };
}

/**
 * Utilisateur connecté. Les informations sont fixes tant que l'authentification
 * (Spring Security) n'est pas branchée ; ce service sera alors alimenté par le back.
 */
@Injectable({ providedIn: 'root' })
export class CurrentUser {
  private readonly _user = signal<SessionUser>({
    firstName: 'Franck',
    lastName: 'Angba',
    email: 'franck.angba@yahoo.fr',
    role: 'Administrateur',
    operator: {
      acronym: 'APROMAC',
      name: 'Association professionnelle des producteurs de caoutchouc naturel',
    },
  });

  readonly user = this._user.asReadonly();
  readonly fullName = computed(() => `${this.user().firstName} ${this.user().lastName}`);
  /** Libellé de rattachement : « Secteur S01 · Aboisso », ou vide sans secteur. */
  readonly sectorLabel = computed(() => {
    const sector = this.user().sector;
    return sector ? `Secteur ${sector.code} · ${sector.name}` : '';
  });
  readonly initials = computed(() =>
    `${this.user().firstName.charAt(0)}${this.user().lastName.charAt(0)}`.toUpperCase(),
  );
}
