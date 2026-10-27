import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Observable } from 'rxjs';
import { forkJoin, tap } from 'rxjs';

import { toApiError } from '@core/http/api-error';

import { SettingsApi, type Crud } from '../data/settings.api';
import { lotsOfOperatorInSector } from '../data/settings.rules';

export type LoadStatus = 'loading' | 'ready' | 'error';

/** Liste d'une ressource, mise à jour au fil des créations et modifications. */
export class EntityState<T extends { readonly id: string }, I> {
  private readonly _items = signal<readonly T[]>([]);
  readonly items = this._items.asReadonly();

  constructor(private readonly crud: Crud<T, I>) {}

  setAll(items: readonly T[]): void {
    this._items.set(items);
  }

  /** Crée (`id` nul) ou modifie une ressource et répercute le résultat dans la liste. */
  save(id: string | null, input: I): Observable<T> {
    const request = id === null ? this.crud.create(input) : this.crud.update(id, input);
    return request.pipe(
      tap((saved) =>
        this._items.update((list) =>
          id === null
            ? [...list, saved]
            : list.map((item) => (item.id === saved.id ? saved : item)),
        ),
      ),
    );
  }
}

/** État de l'écran Paramètres : toutes les listes sont chargées ensemble car elles se référencent. */
@Injectable()
export class SettingsStore {
  private readonly api = inject(SettingsApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly operators = new EntityState(this.api.operators);
  readonly contracts = new EntityState(this.api.contracts);
  readonly attributions = new EntityState(this.api.attributions);
  readonly exercises = new EntityState(this.api.exercises);
  readonly users = new EntityState(this.api.users);

  readonly sectorList = new EntityState(this.api.sectors);
  readonly lots = new EntityState(this.api.lots);
  readonly sections = new EntityState(this.api.sections);
  readonly groups = new EntityState(this.api.groups);
  readonly activities = new EntityState(this.api.activities);
  readonly sectors = computed(() => this.sectorList.items());

  private readonly _status = signal<LoadStatus>('loading');
  private readonly _error = signal('');
  readonly status = this._status.asReadonly();
  readonly error = this._error.asReadonly();

  private readonly operatorById = computed(
    () => new Map(this.operators.items().map((o) => [o.id, o])),
  );
  private readonly contractById = computed(
    () => new Map(this.contracts.items().map((c) => [c.id, c])),
  );
  private readonly activityById = computed(
    () => new Map(this.activities.items().map((a) => [a.id, a])),
  );
  private readonly sectorById = computed(
    () => new Map(this.sectorList.items().map((s) => [s.id, s])),
  );

  operatorOf(id: string) {
    return this.operatorById().get(id);
  }

  /** Retrouve un opérateur par son acronyme (insensible à la casse), ex. celui de l'utilisateur connecté. */
  operatorByAcronym(acronym: string) {
    const wanted = acronym.trim().toUpperCase();
    return this.operators.items().find((o) => o.acronym.toUpperCase() === wanted);
  }

  contractOf(id: string) {
    return this.contractById().get(id);
  }

  sectorOf(id: string) {
    return this.sectorById().get(id);
  }

  /** Nom d'une section, ou « — » si elle n'existe plus. */
  sectionName(id: string): string {
    return this.sections.items().find((s) => s.id === id)?.name ?? '—';
  }

  /** « Nom Prénom » d'un utilisateur, ou « — » s'il n'existe plus. */
  userName(id: string): string {
    const u = this.users.items().find((x) => x.id === id);
    return u ? `${u.lastName} ${u.firstName}` : '—';
  }

  /** Libellé d'un lot : « S01 · Aboisso — lot 2 ». */
  lotLabel(id: string): string {
    const lot = this.lots.items().find((l) => l.id === id);
    return lot ? `${this.sectorLabel(lot.sectorId)} — lot ${lot.number}` : '—';
  }

  /**
   * Lots d'un secteur confiés à un opérateur par ses contrats (attributions) ; sans opérateur
   * connu, tous les lots du secteur.
   */
  lotsOfOperator(sectorId: string, operatorId: string | undefined) {
    const lots = this.lots.items().filter((l) => l.sectorId === sectorId);
    if (!operatorId) {
      return lots;
    }
    const numbers = new Set(
      lotsOfOperatorInSector(
        operatorId,
        sectorId,
        this.contracts.items(),
        this.attributions.items(),
      ),
    );
    return lots.filter((l) => numbers.has(l.number));
  }

  /** Numéros des lots d'un secteur, par ordre croissant. */
  lotNumbersOf(sectorId: string): readonly number[] {
    return this.lots
      .items()
      .filter((l) => l.sectorId === sectorId)
      .map((l) => l.number)
      .sort((a, b) => a - b);
  }

  activityOf(id: string) {
    return this.activityById().get(id);
  }

  /** Libellé d'une activité de planning, y compris si elle est désactivée. */
  activityLabel(id: string): string {
    return this.activityById().get(id)?.label ?? 'Activité supprimée';
  }

  operatorLabel(id: string): string {
    return this.operatorById().get(id)?.acronym ?? '—';
  }

  sectorLabel(id: string): string {
    const sector = this.sectorById().get(id);
    return sector ? `${sector.code} · ${sector.name}` : '—';
  }

  contractLabel(id: string): string {
    const contract = this.contractById().get(id);
    return contract ? `${contract.reference} (${this.operatorLabel(contract.operatorId)})` : '—';
  }

  load(): void {
    this._status.set('loading');
    forkJoin({
      operators: this.api.operators.list(),
      contracts: this.api.contracts.list(),
      attributions: this.api.attributions.list(),
      exercises: this.api.exercises.list(),
      users: this.api.users.list(),
      sectors: this.api.sectors.list(),
      lots: this.api.lots.list(),
      sections: this.api.sections.list(),
      groups: this.api.groups.list(),
      activities: this.api.activities.list(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.operators.setAll(data.operators);
          this.contracts.setAll(data.contracts);
          this.attributions.setAll(data.attributions);
          this.exercises.setAll(data.exercises);
          this.users.setAll(data.users);
          this.sectorList.setAll(data.sectors);
          this.lots.setAll(data.lots);
          this.sections.setAll(data.sections);
          this.groups.setAll(data.groups);
          this.activities.setAll(data.activities);
          this._status.set('ready');
        },
        error: (error: unknown) => {
          this._error.set(toApiError(error).message);
          this._status.set('error');
        },
      });
  }
}
