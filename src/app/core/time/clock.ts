import { Injectable } from '@angular/core';

/** Source de l'heure courante, remplaçable dans les tests. */
@Injectable({ providedIn: 'root' })
export class Clock {
  now(): Date {
    return new Date();
  }
}
