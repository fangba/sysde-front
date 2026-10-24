import { NgTemplateOutlet } from '@angular/common';
import type { TemplateRef } from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import type { Tone } from '@shared/models/tone';

import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { IconComponent } from '../icon/icon.component';
import type { IconName } from '../icon/icon.registry';
import { PaginationComponent } from '../pagination/pagination.component';
import { SkeletonComponent } from '../skeleton/skeleton.component';
import { StatusPillComponent } from '../status-pill/status-pill.component';

export interface TableColumn<T> {
  readonly id: string;
  readonly header: string;
  /** Texte de la cellule (également utilisé par la recherche). */
  readonly text: (row: T) => string;
  /** Seconde ligne, plus discrète. */
  readonly sub?: (row: T) => string;
  /** Affiche la cellule sous forme de pastille (remplace `text` à l'écran). */
  /** Garde le texte de la cellule sur une seule ligne (matricule, numéro…). */
  readonly nowrap?: boolean;
  /**
   * Zone de filtre sous l'en-tête : `'text'` (contient) ou une liste de valeurs exactes
   * (liste déroulante). Utilisée seulement si le tableau active `columnFilters`.
   */
  readonly filter?: 'text' | readonly string[];
  readonly pill?: (row: T) => { readonly label: string; readonly tone: Tone };
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Tableau de données : recherche, pagination, états vide et chargement.
 * Le bouton de création est projeté dans `[tableActions]`.
 */
@Component({
  selector: 'ui-data-table',
  imports: [
    EmptyStateComponent,
    IconComponent,
    NgTemplateOutlet,
    PaginationComponent,
    SkeletonComponent,
    StatusPillComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-data-table' },
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
})
export class DataTableComponent<T extends { readonly id: string }> {
  readonly columns = input.required<readonly TableColumn<T>[]>();
  readonly rows = input.required<readonly T[]>();
  /** Intitulé accessible du tableau. */
  readonly caption = input.required<string>();
  /** Nom d'une ligne, pour le bouton « Modifier … ». */
  readonly rowLabel = input.required<(row: T) => string>();
  readonly loading = input(false);
  /**
   * Contenu de la dernière colonne, par ligne (ex. un menu « Options ») ; remplace le bouton
   * « Modifier ». Le modèle reçoit la ligne en `let-row`.
   */
  readonly rowActions = input<TemplateRef<{ $implicit: T }> | null>(null);
  /** En-tête de la dernière colonne quand `rowActions` est fourni. */
  readonly actionsHeader = input('Action');
  /** Affiche, sous l'en-tête, une zone de filtre pour chaque colonne qui en déclare une. */
  readonly columnFilters = input(false);
  /** Affiche le bouton « Modifier » de chaque ligne. */
  readonly editable = input(true);
  /** Début de l'intitulé du bouton de chaque ligne (« Modifier », « Examiner »…). */
  readonly editLabel = input('Modifier');
  readonly editIcon = input<IconName>('edit');
  readonly searchPlaceholder = input('Rechercher…');
  readonly emptyTitle = input('Aucun élément');
  readonly emptyDescription = input("Rien n'a encore été enregistré.");

  readonly rowEdit = output<T>();

  protected readonly query = signal('');
  protected readonly requestedPage = signal(0);
  protected readonly pageSize = signal(10);
  protected readonly skeletons = [0, 1, 2, 3, 4];

  /** Valeur saisie dans la zone de filtre de chaque colonne (par identifiant de colonne). */
  protected readonly columnQuery = signal<Readonly<Record<string, string>>>({});

  protected readonly hasColumnFilter = computed(() =>
    Object.values(this.columnQuery()).some((value) => value.trim() !== ''),
  );

  protected readonly filtered = computed(() => {
    const term = normalize(this.query().trim());
    const columns = this.columns();
    const perColumn = this.columnFilters()
      ? columns
          .map((column) => ({ column, value: (this.columnQuery()[column.id] ?? '').trim() }))
          .filter(({ column, value }) => column.filter && value !== '')
      : [];
    if (!term && perColumn.length === 0) {
      return this.rows();
    }
    return this.rows().filter(
      (row) =>
        (!term ||
          columns.some((column) =>
            normalize(`${column.text(row)} ${column.sub?.(row) ?? ''}`).includes(term),
          )) &&
        perColumn.every(({ column, value }) =>
          Array.isArray(column.filter)
            ? column.text(row) === value
            : normalize(`${column.text(row)} ${column.sub?.(row) ?? ''}`).includes(
                normalize(value),
              ),
        ),
    );
  });

  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / this.pageSize())),
  );

  protected readonly page = computed(() => Math.min(this.requestedPage(), this.pageCount() - 1));

  protected readonly visible = computed(() => {
    const start = this.page() * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  protected onColumnFilter(id: string, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.columnQuery.update((current) => ({ ...current, [id]: value }));
    this.requestedPage.set(0);
  }

  protected clearColumnFilters(): void {
    this.columnQuery.set({});
    this.requestedPage.set(0);
  }

  protected listOf(column: TableColumn<T>): readonly string[] {
    return Array.isArray(column.filter) ? column.filter : [];
  }

  protected onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.requestedPage.set(0);
  }
}
