import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { forkJoin } from 'rxjs';

import { CurrentUser } from '@core/auth/current-user';
import { ToastService } from '@core/notifications/toast.service';

import { SettingsApi } from '../../settings/data/settings.api';
import { PlantationsApi, type SectionAssignment } from '../data/plantations.api';
import type { Plantation } from '../data/plantations.models';
import {
  sectionsFor,
  type LotRef,
  type SectionRef,
  type SectorRef,
} from '../data/plantations.rules';

/** Plantations visibles par l'utilisateur ; fourni au niveau de la route. */
@Injectable()
export class PlantationsStore {
  private readonly api = inject(PlantationsApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly settings = inject(SettingsApi);
  private readonly currentUser = inject(CurrentUser);
  private readonly toast = inject(ToastService);

  private readonly _rows = signal<readonly Plantation[]>([]);
  private readonly _loading = signal(false);
  private readonly _failed = signal(false);
  private readonly _saving = signal(false);
  private readonly _sections = signal<readonly SectionRef[]>([]);
  private readonly _lots = signal<readonly LotRef[]>([]);
  private readonly _sectors = signal<readonly SectorRef[]>([]);

  readonly rows = this._rows.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly failed = this._failed.asReadonly();
  readonly saving = this._saving.asReadonly();
  /** Seul le chef secteur affecte les plantations aux sections. */
  readonly canAssign = computed(() => this.currentUser.isSectorHead());
  readonly sections = this._sections.asReadonly();
  readonly lots = this._lots.asReadonly();
  readonly sectorRefs = this._sectors.asReadonly();
  readonly sectionNames = computed(() =>
    [...new Set(this._sections().map((s) => s.name))].sort((a, b) => a.localeCompare(b, 'fr')),
  );

  readonly operators = computed(() => [...new Set(this._rows().map((p) => p.operator))].sort());
  readonly sectors = computed(() => {
    const seen = new Map<string, { operator: string; code: string; name: string }>();
    for (const p of this._rows()) {
      seen.set(`${p.operator}/${p.sectorCode}`, {
        operator: p.operator,
        code: p.sectorCode,
        name: p.sectorName,
      });
    }
    return [...seen.entries()]
      .map(([key, s]) => ({ key, ...s }))
      .sort((a, b) => a.key.localeCompare(b.key));
  });

  load(): void {
    this._loading.set(true);
    this._failed.set(false);
    this.api
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this._rows.set(rows);
          this._loading.set(false);
        },
        error: () => {
          this._rows.set([]);
          this._failed.set(true);
          this._loading.set(false);
        },
      });
  }

  /** Sections où la plantation peut être affectée (celles de son lot). */
  sectionsOf(plantation: Plantation): readonly SectionRef[] {
    return sectionsFor(plantation, this._sections(), this._lots(), this._sectors());
  }

  /** Charge les sections, lots et secteurs (chef secteur seulement). */
  loadSections(): void {
    if (!this.canAssign()) {
      return;
    }
    forkJoin({
      sections: this.settings.sections.list(),
      lots: this.settings.lots.list(),
      sectors: this.settings.sectors.list(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this._sections.set(data.sections);
          this._lots.set(data.lots);
          this._sectors.set(data.sectors);
        },
        error: () => this.toast.show('Les sections n’ont pas pu être chargées.', 'error'),
      });
  }

  /** Affecte (ou retire) une plantation d'une section ; `done` est appelé en cas de succès. */
  assign(plantation: Plantation, sectionId: string | null, done: () => void): void {
    this.save(
      [{ plantationId: plantation.id, sectionId }],
      sectionId ? 'Plantation affectée.' : 'Affectation retirée.',
      done,
    );
  }

  /** Affecte plusieurs plantations (import Excel). */
  assignMany(items: readonly SectionAssignment[], done: () => void): void {
    const n = items.length;
    this.save(items, `${n} plantation${n > 1 ? 's' : ''} affectée${n > 1 ? 's' : ''}.`, done);
  }

  private save(items: readonly SectionAssignment[], message: string, done: () => void): void {
    this._saving.set(true);
    this.api
      .assignMany(items)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (changed) => {
          const byId = new Map(changed.map((p) => [p.id, p]));
          this._rows.update((rows) => rows.map((p) => byId.get(p.id) ?? p));
          this._saving.set(false);
          this.toast.show(message, 'success');
          done();
        },
        error: () => {
          this._saving.set(false);
          this.toast.show('L’affectation n’a pas pu être enregistrée. Réessayez.', 'error');
        },
      });
  }
}
