import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MapApi } from '../data/map.api';
import type { MapFilter, MapOperatorOption, MapPlantation } from '../data/map.models';

/** Filtre de la carte et plantations affichées ; fourni au niveau de la route. */
@Injectable()
export class MapStore {
  private readonly api = inject(MapApi);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _catalog = signal<readonly MapOperatorOption[]>([]);
  private readonly _filter = signal<MapFilter | null>(null);
  private readonly _plantations = signal<readonly MapPlantation[]>([]);
  private readonly _loading = signal(false);

  readonly catalog = this._catalog.asReadonly();
  readonly filter = this._filter.asReadonly();
  readonly plantations = this._plantations.asReadonly();
  readonly loading = this._loading.asReadonly();

  /** Libellé du filtre actif : « SAPH · S01 · Lot 2 ». */
  readonly summary = computed(() => {
    const filter = this._filter();
    if (!filter) {
      return '';
    }
    const operator = this._catalog().find((o) => o.id === filter.operatorId);
    const sector = operator?.sectors.find((s) => s.id === filter.sectorId);
    return [
      operator?.acronym,
      sector?.code,
      filter.lot === undefined ? undefined : `Lot ${filter.lot}`,
      filter.section ? `Section ${filter.section}` : undefined,
    ]
      .filter(Boolean)
      .join(' · ');
  });

  /** Nombre de critères choisis, pour le badge du bouton. */
  readonly activeCount = computed(() => {
    const filter = this._filter();
    return filter
      ? 1 +
          (filter.sectorId ? 1 : 0) +
          (filter.lot === undefined ? 0 : 1) +
          (filter.section ? 1 : 0)
      : 0;
  });

  loadCatalog(): void {
    this.api
      .catalog()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((catalog) => this._catalog.set(catalog));
  }

  apply(filter: MapFilter): void {
    this._filter.set(filter);
    this._loading.set(true);
    this.api
      .plantations(filter)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (plantations) => {
          this._plantations.set(plantations);
          this._loading.set(false);
        },
        error: () => {
          this._plantations.set([]);
          this._loading.set(false);
        },
      });
  }

  reset(): void {
    this._filter.set(null);
    this._plantations.set([]);
  }
}
