import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'sysde-theme';

/**
 * Thème clair ou sombre de l'application.
 * Le choix est mémorisé ; sans choix, la préférence du système s'applique.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly mode = signal<ThemeMode>(this.resolveInitialMode());

  readonly theme = this.mode.asReadonly();
  readonly isDark = computed(() => this.mode() === 'dark');

  constructor() {
    effect(() => {
      this.document.documentElement.setAttribute('data-theme', this.mode());
    });
  }

  toggle(): void {
    this.set(this.isDark() ? 'light' : 'dark');
  }

  set(mode: ThemeMode): void {
    this.mode.set(mode);
    try {
      this.document.defaultView?.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Stockage indisponible (navigation privée, accès bloqué) : le choix vaut pour la session.
    }
  }

  private resolveInitialMode(): ThemeMode {
    const view = this.document.defaultView;
    try {
      const saved = view?.localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    } catch {
      // Stockage indisponible : on retombe sur la préférence du système.
    }
    return view?.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
