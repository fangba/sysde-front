import { Injectable, computed, inject } from '@angular/core';

import { AuthService } from './auth.service';

export interface SessionUser {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly role: string;
  /** Administrateur (APROMAC, FIRCA) : accède à toutes les sections de l'application. */
  readonly administrator: boolean;
  /** Code du poste (CD, CS, SU…), absent pour un administrateur sans poste. */
  readonly poste?: string;
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
  administrator: false,
  operator: { acronym: '', name: '' },
};

/** Utilisateur connecté, tel que renvoyé par le back à la connexion. */
@Injectable({ providedIn: 'root' })
export class CurrentUser {
  private readonly auth = inject(AuthService);

  readonly user = computed(() => this.auth.session()?.user ?? ANONYMOUS);
  readonly isAdministrator = computed(() => this.user().administrator);
  /** Chef de département : gère les chefs de secteur de son opérateur. */
  /** Chef de secteur : gère les collaborateurs de son secteur. */
  readonly isSectorHead = computed(() => !this.user().administrator && this.user().poste === 'CS');
  readonly isDepartmentHead = computed(
    () => !this.user().administrator && this.user().poste === 'CD',
  );
  /** Superviseur (SU) : même vue nationale que l'administrateur, limitée au Dashboard, au Reporting et à la Carte. */
  readonly isSupervisor = computed(() => !this.user().administrator && this.user().poste === 'SU');
  /** Voit les données de tous les opérateurs : administrateur ou superviseur. */
  readonly hasGlobalView = computed(() => this.isAdministrator() || this.isSupervisor());
  /** Reporting : vue nationale (administrateur, superviseur), chef de département et chef de secteur. */
  readonly canReport = computed(
    () => this.hasGlobalView() || this.isDepartmentHead() || this.isSectorHead(),
  );
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
