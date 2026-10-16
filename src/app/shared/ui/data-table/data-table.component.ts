import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import type { Tone } from '@shared/models/tone';

import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { IconComponent } from '../icon/icon.component';
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
  readonly pill?: (row: T) => { readonly label: string; readonly tone: Tone };
}

const PAGE_SIZE = 10;

function normalize(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Tableau de données : recherche, pagination, états vide et chargement.
 * Le bouton de création est projeté dans `[tableActions]`.
 */
@Component({
  selector: 'ui-data-table',
  imports: [EmptyStateComponent, IconComponent, SkeletonComponent, StatusPillComponent],
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
  readonly searchPlaceholder = input('Rechercher…');
  readonly emptyTitle = input('Aucun élément');
  readonly emptyDescription = input("Rien n'a encore été enregistré.");

  readonly rowEdit = output<T>();

  protected readonly query = signal('');
  private readonly requestedPage = signal(0);
  protected readonly skeletons = [0, 1, 2, 3, 4];

  protected readonly filtered = computed(() => {
    const term = normalize(this.query().trim());
    if (!term) {
      return this.rows();
    }
    const columns = this.columns();
    return this.rows().filter((row) =>
      columns.some((column) =>
        normalize(`${column.text(row)} ${column.sub?.(row) ?? ''}`).includes(term),
      ),
    );
  });

  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)),
  );

  protected readonly page = computed(() => Math.min(this.requestedPage(), this.pageCount() - 1));

  protected readonly visible = computed(() => {
    const start = this.page() * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });

  protected readonly range = computed(() => {
    const total = this.filtered().length;
    const start = this.page() * PAGE_SIZE;
    return `${total === 0 ? 0 : start + 1}–${Math.min(start + PAGE_SIZE, total)} sur ${total}`;
  });

  protected onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.requestedPage.set(0);
  }

  protected goTo(page: number): void {
    this.requestedPage.set(Math.min(Math.max(0, page), this.pageCount() - 1));
  }
}
