import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap, type Observable } from 'rxjs';

import { AuthApi } from './auth.api';
import type { Credentials, Session } from './auth.models';

const STORAGE_KEY = 'sysde-session';

function isSession(value: unknown): value is Session {
  const candidate = value as Partial<Session> | null;
  return !!candidate && typeof candidate.token === 'string' && !!candidate.user;
}

function readStored(): Session | null {
  for (const storage of [safeStorage('local'), safeStorage('session')]) {
    try {
      const raw = storage?.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      if (isSession(parsed)) {
        return parsed;
      }
    } catch {
      // Contenu illisible : on l'ignore.
    }
  }
  return null;
}

function safeStorage(kind: 'local' | 'session'): Storage | null {
  try {
    return kind === 'local' ? localStorage : sessionStorage;
  } catch {
    return null;
  }
}

/** Session de l'utilisateur : connexion, déconnexion et conservation entre deux visites. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(AuthApi);
  private readonly router = inject(Router);

  private readonly _session = signal<Session | null>(readStored());
  readonly session = this._session.asReadonly();
  readonly isAuthenticated = computed(() => this._session() !== null);

  /**
   * Ouvre une session. Avec « Rester connecté », elle survit à la fermeture du navigateur ;
   * sinon elle s'arrête avec l'onglet.
   */
  login(credentials: Credentials, remember: boolean): Observable<Session> {
    return this.api.login(credentials).pipe(
      tap((session) => {
        this.clearStorage();
        try {
          safeStorage(remember ? 'local' : 'session')?.setItem(
            STORAGE_KEY,
            JSON.stringify(session),
          );
        } catch {
          // Stockage indisponible : la session reste en mémoire pour cette visite.
        }
        this._session.set(session);
      }),
    );
  }

  /** Change le mot de passe du compte connecté ; la session reste ouverte. */
  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    const email = this._session()?.user.email ?? '';
    return this.api.changePassword({ currentPassword, newPassword, email });
  }

  logout(): void {
    this.clearStorage();
    this._session.set(null);
    void this.router.navigate(['/connexion']);
  }

  private clearStorage(): void {
    for (const storage of [safeStorage('local'), safeStorage('session')]) {
      try {
        storage?.removeItem(STORAGE_KEY);
      } catch {
        // Rien à nettoyer.
      }
    }
  }
}
