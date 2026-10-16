import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

import { formatInteger } from '@shared/util/format';
import { pageItems } from '@shared/util/pagination';

import { IconComponent } from '../icon/icon.component';

/**
 * Pagination : résumé de la plage, choix du nombre de lignes, boutons première / précédente /
 * numéros / suivante / dernière. La page courante est en base 0.
 */
@Component({
  selector: 'ui-pagination',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-pagination' },
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss',
})
export class PaginationComponent {
  readonly total = input.required<number>();
  readonly page = model(0);
  readonly pageSize = model(10);
  readonly pageSizeOptions = input<readonly number[]>([5, 10, 25, 50]);

  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );
  protected readonly current = computed(() => Math.min(this.page(), this.pageCount() - 1));
  protected readonly items = computed(() => pageItems(this.current(), this.pageCount()));

  protected readonly summary = computed(() => {
    const total = this.total();
    const start = this.current() * this.pageSize();
    const from = total === 0 ? 0 : start + 1;
    const to = Math.min(start + this.pageSize(), total);
    return { from, to, total: formatInteger(total) };
  });

  protected goTo(index: number): void {
    this.page.set(Math.min(Math.max(0, index), this.pageCount() - 1));
  }

  protected onSize(event: Event): void {
    this.pageSize.set(Number((event.target as HTMLSelectElement).value));
    this.page.set(0);
  }
}
