import { InjectionToken } from '@angular/core';

/** Configuration d'exécution de l'application, fournie par les fichiers `src/environments`. */
export interface AppConfig {
  /** `true` pour un build de production. */
  readonly production: boolean;
  /** Préfixe des appels HTTP relatifs (passerelle API Spring Boot). */
  readonly apiBaseUrl: string;
  /**
   * Utilise les données de démonstration au lieu de l'API.
   * À passer à `false` dès que les services du back sont disponibles.
   */
  readonly useDemoData: boolean;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');
