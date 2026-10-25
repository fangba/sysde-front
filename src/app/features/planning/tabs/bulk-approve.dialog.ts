import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { ButtonComponent } from '@shared/ui/button/button.component';
import { DialogShellComponent } from '@shared/ui/dialog-shell/dialog-shell.component';

import { POSTE_LABEL } from '../../settings/data/settings.constants';
import type { Poste } from '../../settings/data/settings.models';
import { ReviewStore } from '../state/review.store';

export interface BulkApproveData {
  /** Identifiants des éléments à valider (voir `ReviewItem.id`). */
  readonly ids: readonly string[];
}

/** Récapitulatif et confirmation de la validation en lot des éléments prêts. */
@Component({
  selector: 'sysde-bulk-approve-dialog',
  imports: [ButtonComponent, DialogShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog-shell [title]="title()" [subtitle]="subtitle()">
      <ul class="byposte">
        @for (row of byPoste(); track row.poste) {
          <li>
            <span class="label">{{ row.label }}</span>
            <span class="bar" aria-hidden="true"><i [style.width.%]="row.percent"></i></span>
            <strong>{{ row.count }}</strong>
          </li>
        }
      </ul>
      <p class="ui-form__note">
        Le contrôle des fréquences est refait au moment de la validation. Les éléments avec une
        anomalie ne sont jamais validés en lot.
      </p>
      <div dialogActions>
        <button ui-button variant="secondary" type="button" (click)="ref.close()">Annuler</button>
        <button
          ui-button
          variant="primary"
          type="button"
          [loading]="store.deciding()"
          (click)="confirm()"
        >
          Valider {{ items().length }}
        </button>
      </div>
    </ui-dialog-shell>
  `,
  styles: `
    .byposte {
      display: grid;
      gap: 12px;
      margin: 0 0 18px;
      padding: 0;
      list-style: none;
    }
    li {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 13px;
    }
    .label {
      width: 160px;
      flex: none;
      font-weight: 600;
    }
    .bar {
      flex: 1;
      height: 12px;
      overflow: hidden;
      border-radius: 999px;
      background: var(--neutral-100);
    }
    .bar i {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: var(--green-600);
    }
    strong {
      width: 28px;
      text-align: right;
    }
  `,
})
export class BulkApproveDialog {
  protected readonly store = inject(ReviewStore);
  protected readonly ref = inject<DialogRef<void>>(DialogRef);
  private readonly data = inject<BulkApproveData>(DIALOG_DATA);

  /** Éléments encore prêts (un contrôle refait ici écarte ceux devenus incohérents). */
  protected readonly items = computed(() =>
    this.store
      .items()
      .filter((item) => this.data.ids.includes(item.id))
      .filter((item) => this.store.assessments().get(item.id)?.ready),
  );

  protected readonly title = computed(
    () => `Valider ${this.items().length} élément${this.items().length > 1 ? 's' : ''}`,
  );
  protected readonly subtitle = computed(() => {
    const plans = this.items().filter((i) => i.kind === 'PLAN').length;
    const activities = this.items().length - plans;
    return `${plans} planning${plans > 1 ? 's' : ''} complet${plans > 1 ? 's' : ''} et ${activities} activité${activities > 1 ? 's' : ''} soumise${activities > 1 ? 's' : ''} seule${activities > 1 ? 's' : ''}.`;
  });

  protected readonly byPoste = computed(() => {
    const counts = new Map<Poste, number>();
    for (const item of this.items()) {
      const poste = this.store.userOf(item.plan)?.poste;
      if (poste) {
        counts.set(poste, (counts.get(poste) ?? 0) + 1);
      }
    }
    const max = Math.max(1, ...counts.values());
    return [...counts.entries()].map(([poste, count]) => ({
      poste,
      label: POSTE_LABEL[poste],
      count,
      percent: Math.round((count / max) * 100),
    }));
  });

  protected confirm(): void {
    this.store.approveMany(this.items(), () => this.ref.close());
  }
}
