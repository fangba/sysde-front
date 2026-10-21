import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { toApiError } from '@core/http/api-error';
import { ToastService } from '@core/notifications/toast.service';

import { SettingsApi } from '../data/settings.api';
import {
  GRANTABLE_POSTES,
  PERMISSIONS,
  withPermission,
  type PermissionGrants,
} from '../data/permissions.catalog';
import type { Poste } from '../data/settings.models';

export type PermissionsStatus = 'loading' | 'ready' | 'error';

/** Droits par poste : version enregistrée, version en cours d'édition et enregistrement. */
@Injectable()
export class PermissionsStore {
  private readonly api = inject(SettingsApi).permissions;
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _saved = signal<PermissionGrants | null>(null);
  private readonly _draft = signal<PermissionGrants | null>(null);
  private readonly _status = signal<PermissionsStatus>('loading');
  private readonly _error = signal('');
  private readonly _saving = signal(false);

  readonly status = this._status.asReadonly();
  readonly error = this._error.asReadonly();
  readonly saving = this._saving.asReadonly();

  /** Cases modifiées depuis le dernier enregistrement, au format « poste|code ». */
  readonly changed = computed(() => {
    const saved = this._saved();
    const draft = this._draft();
    const cells = new Set<string>();
    if (!saved || !draft) {
      return cells;
    }
    for (const poste of GRANTABLE_POSTES) {
      const before = new Set(saved[poste]);
      const after = new Set(draft[poste]);
      for (const { code } of PERMISSIONS) {
        if (before.has(code) !== after.has(code)) {
          cells.add(key(poste, code));
        }
      }
    }
    return cells;
  });
  readonly changeCount = computed(() => this.changed().size);
  readonly dirty = computed(() => this.changeCount() > 0);

  /** Nombre de droits accordés à chaque poste (en-têtes de colonnes). */
  readonly counts = computed(() => {
    const draft = this._draft();
    return Object.fromEntries(
      GRANTABLE_POSTES.map((poste) => [poste, draft?.[poste].length ?? 0]),
    ) as Record<Poste, number>;
  });

  has(poste: Poste, code: string): boolean {
    return this._draft()?.[poste].includes(code) ?? false;
  }

  isChanged(poste: Poste, code: string): boolean {
    return this.changed().has(key(poste, code));
  }

  toggle(poste: Poste, code: string): void {
    const draft = this._draft();
    if (!draft) {
      return;
    }
    this._draft.set({
      ...draft,
      [poste]: withPermission(draft[poste], code, !this.has(poste, code)),
    });
  }

  /** Abandonne les modifications non enregistrées. */
  discard(): void {
    this._draft.set(this._saved());
  }

  load(): void {
    this._status.set('loading');
    this.api
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (grants) => {
          this._saved.set(grants);
          this._draft.set(grants);
          this._status.set('ready');
        },
        error: (error: unknown) => {
          this._error.set(toApiError(error).message);
          this._status.set('error');
        },
      });
  }

  save(): void {
    const draft = this._draft();
    if (!draft || !this.dirty() || this._saving()) {
      return;
    }
    this._saving.set(true);
    this.api
      .save(draft)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (grants) => {
          this._saved.set(grants);
          this._draft.set(grants);
          this._saving.set(false);
          this.toast.show('Les droits ont été enregistrés.', 'success');
        },
        error: (error: unknown) => {
          this._saving.set(false);
          this.toast.show(toApiError(error).message, 'error');
        },
      });
  }
}

function key(poste: Poste, code: string): string {
  return `${poste}|${code}`;
}
