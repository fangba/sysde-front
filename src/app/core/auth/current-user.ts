import { Injectable, computed, inject } from '@angular/core';

import { AuthService } from './auth.service';

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

const ANONYMOUS: SessionUser = {
  firstName: '',
  lastName: '',
  email: '',
  role: '',
  operator: { acronym: '', name: '' },
};

/** Utilisateur connecté, tel que renvoyé par le back à la connexion. */
@Injectable({ providedIn: 'root' })
export class CurrentUser {
  private readonly auth = inject(AuthService);

  readonly user = computed(() => this.auth.session()?.user ?? ANONYMOUS);
  readonly fullName = computed(() => `${this.user().firstName} ${this.user().lastName}`.trim());

  /** Libellé de rattachement : « Secteur S01 · Aboisso », ou vide sans secteur. */
  readonly sectorLabel = computed(() => {
    const sector = this.user().sector;
    return sector ? `Secteur ${sector.code} · ${sector.name}` : '';
  });
  readonly initials = computed(() =>
    `${this.user().firstName.charAt(0)}${this.user().lastName.charAt(0)}`.toUpperCase(),
  );
}
