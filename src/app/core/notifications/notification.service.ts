import { Injectable, computed, effect, inject, signal } from '@angular/core';

import { CurrentUser } from '@core/auth/current-user';

import { ToastService, type ToastTone } from './toast.service';

export interface AppNotification {
  readonly id: string;
  /** E-mail du destinataire. */
  readonly to: string;
  readonly title: string;
  readonly message: string;
  readonly tone: ToastTone;
  readonly createdAt: string;
  readonly read: boolean;
}

const KEY = 'sysde.notifications';

function load(): readonly AppNotification[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AppNotification[]) : [];
  } catch {
    return [];
  }
}

/**
 * Notifications de l'application. En démo elles sont gardées dans le navigateur ; avec le back
 * réel elles viendront de `GET /notifications` (le destinataire est alors déduit du jeton).
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly currentUser = inject(CurrentUser);
  private readonly toast = inject(ToastService);
  private readonly all = signal<readonly AppNotification[]>(load());
  private announcedFor = '';

  /** Notifications du collaborateur connecté, les plus récentes d'abord. */
  readonly mine = computed(() =>
    this.all()
      .filter((n) => n.to === this.currentUser.user().email)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
  readonly unread = computed(() => this.mine().filter((n) => !n.read).length);

  constructor() {
    // À la connexion, prévient une fois si des notifications attendent.
    effect(() => {
      const email = this.currentUser.user().email;
      const count = this.unread();
      if (email && email !== this.announcedFor && count > 0) {
        this.announcedFor = email;
        this.toast.show(
          count === 1
            ? 'Vous avez une nouvelle notification.'
            : `Vous avez ${count} nouvelles notifications.`,
          'info',
          6000,
        );
      }
    });
  }

  /** Envoie une notification au destinataire (identifié par son e-mail). */
  notify(to: string, title: string, message: string, tone: ToastTone = 'info'): void {
    if (!to) {
      return;
    }
    const item: AppNotification = {
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      to,
      title,
      message,
      tone,
      createdAt: new Date().toISOString(),
      read: false,
    };
    this.save([item, ...this.all()].slice(0, 200));
  }

  markAllRead(): void {
    const email = this.currentUser.user().email;
    this.save(this.all().map((n) => (n.to === email ? { ...n, read: true } : n)));
  }

  markRead(id: string): void {
    this.save(this.all().map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  private save(list: readonly AppNotification[]): void {
    this.all.set(list);
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      // Stockage indisponible : les notifications valent pour cette session seulement.
    }
  }
}
