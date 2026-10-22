import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PlantationsApi } from '../data/plantations.api';
import type { Plantation } from '../data/plantations.models';

/** Plantations visibles par l'utilisateur ; fourni au niveau de la route. */
@Injectable()
export class PlantationsStore {
  private readonly api = inject(PlantationsApi);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _rows = signal<readonly Plantation[]>([]);
  private readonly _loading = signal(false);
  private readonly _failed = signal(false);

  readonly rows = this._rows.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly failed = this._failed.asReadonly();

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
}
