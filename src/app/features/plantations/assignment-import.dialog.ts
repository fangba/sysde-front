import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { ButtonComponent } from '@shared/ui/button/button.component';
import { DialogShellComponent } from '@shared/ui/dialog-shell/dialog-shell.component';

import type { AssignmentImport, AssignmentItem } from './data/plantations.rules';

export interface AssignmentImportData {
  readonly fileName: string;
  readonly result: AssignmentImport;
}

const MAX_SHOWN = 12;

/** Contrôle d'un fichier d'affectations avant enregistrement : prêtes, erreurs, inchangées. */
@Component({
  selector: 'sysde-assignment-import-dialog',
  imports: [ButtonComponent, DialogShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog-shell title="Importer des affectations" [subtitle]="data.fileName">
      @if (data.result.fileError; as fileError) {
        <p class="ui-form__error" role="alert">{{ fileError }}</p>
      } @else {
        <div class="kpis">
          <div class="ok">
            <strong>{{ ready().length }}</strong>
            <span>à affecter</span>
          </div>
          <div class="warn">
            <strong>{{ data.result.errors.length }}</strong>
            <span>avec une erreur</span>
          </div>
          <div class="muted">
            <strong>{{ data.result.unchanged }}</strong>
            <span>inchangée{{ data.result.unchanged > 1 ? 's' : '' }}</span>
          </div>
        </div>

        @if (data.result.errors.length > 0) {
          <h3>À corriger dans le fichier</h3>
          <ul class="problems">
            @for (e of shownErrors(); track e.row) {
              <li>
                <strong>Ligne {{ e.row }}</strong>
                <span>{{ e.message }}</span>
              </li>
            }
          </ul>
          @if (data.result.errors.length > shownErrors().length) {
            <p class="hint">
              … et {{ data.result.errors.length - shownErrors().length }} autre(s).
            </p>
          }
          <p class="hint">Les lignes en erreur sont ignorées ; les autres sont enregistrées.</p>
        }
      }
      <div dialogActions>
        <button ui-button variant="secondary" type="button" (click)="ref.close()">Annuler</button>
        @if (!data.result.fileError) {
          <button
            ui-button
            variant="primary"
            type="button"
            [disabled]="ready().length === 0"
            (click)="ref.close(ready())"
          >
            Affecter {{ ready().length }} plantation{{ ready().length > 1 ? 's' : '' }}
          </button>
        }
      </div>
    </ui-dialog-shell>
  `,
  styles: `
    .kpis {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 16px;
    }
    .kpis div {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 12px 14px;
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      font-size: 12px;
    }
    .kpis strong {
      font-size: 24px;
      line-height: 1.1;
    }
    .kpis .ok {
      border-color: var(--green-600);
      background: var(--ok-100);
      color: var(--ok-700);
    }
    .kpis .warn {
      border-color: var(--amber-700);
      background: var(--amber-100);
      color: var(--amber-700);
    }
    .kpis .muted {
      background: var(--neutral-100);
      color: var(--neutral-700);
    }
    h3 {
      margin: 0 0 8px;
      font-size: 13.5px;
    }
    .problems {
      display: grid;
      gap: 6px;
      margin: 0 0 8px;
      padding: 0;
      list-style: none;
    }
    .problems li {
      display: flex;
      gap: 12px;
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      background: var(--red-100);
      color: var(--red-700);
      font-size: 12.5px;
      line-height: 1.45;
    }
    .problems strong {
      flex: none;
      min-width: 64px;
    }
    .hint {
      margin: 0 0 12px;
      color: var(--ink-500);
      font-size: 12px;
    }
  `,
})
export class AssignmentImportDialog {
  protected readonly data = inject<AssignmentImportData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<readonly AssignmentItem[]>>(DialogRef);
  protected readonly ready = computed(() => this.data.result.ready);
  protected readonly shownErrors = computed(() => this.data.result.errors.slice(0, MAX_SHOWN));
}
