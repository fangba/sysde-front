import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { ButtonComponent } from '@shared/ui/button/button.component';
import { DialogShellComponent } from '@shared/ui/dialog-shell/dialog-shell.component';

import type { ImportResult } from '../data/planning.rules';
import { formatHours, summarize } from '../data/planning.rules';

export interface ImportDialogData {
  readonly fileName: string;
  readonly result: ImportResult;
  /** Nombre de lignes déjà présentes dans le brouillon. */
  readonly existing: number;
}

export type ImportChoice = 'replace' | 'append';

const MAX_SHOWN = 30;

/** Aperçu d'un fichier Excel avant import : tout ou rien, les erreurs sont listées. */
@Component({
  selector: 'sysde-plan-import-dialog',
  imports: [ButtonComponent, DialogShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog-shell title="Importer un fichier Excel" [subtitle]="data.fileName">
      @if (errors().length === 0) {
        <p class="ui-form__note">
          {{ summary().count }} activité{{ summary().count > 1 ? 's' : '' }} prête{{
            summary().count > 1 ? 's' : ''
          }}
          à importer · {{ summary().days }} jour{{ summary().days > 1 ? 's' : '' }} ·
          {{ hours() }} h.
        </p>
        @if (data.existing > 0) {
          <p class="hint">
            Votre brouillon contient déjà {{ data.existing }} ligne{{
              data.existing > 1 ? 's' : ''
            }}. Remplacez-les par celles du fichier ou ajoutez le fichier à la suite.
          </p>
        }
      } @else {
        <p class="ui-form__error" role="alert">
          Le fichier contient {{ errors().length }} erreur{{ errors().length > 1 ? 's' : '' }}.
          Corrigez-le puis importez-le à nouveau : aucune ligne n'est reprise tant qu'il en reste.
        </p>
        <ol class="errors">
          @for (e of shown(); track $index) {
            <li>
              <span class="row">Ligne {{ e.row }}</span> {{ e.message }}
            </li>
          }
        </ol>
        @if (errors().length > shown().length) {
          <p class="hint">… et {{ errors().length - shown().length }} autre(s) erreur(s).</p>
        }
      }
      <div dialogActions>
        <button ui-button variant="secondary" type="button" (click)="ref.close()">Annuler</button>
        @if (errors().length === 0) {
          @if (data.existing > 0) {
            <button ui-button variant="secondary" type="button" (click)="ref.close('append')">
              Ajouter à la suite
            </button>
            <button ui-button variant="primary" type="button" (click)="ref.close('replace')">
              Remplacer le brouillon
            </button>
          } @else {
            <button ui-button variant="primary" type="button" (click)="ref.close('replace')">
              Importer
            </button>
          }
        }
      </div>
    </ui-dialog-shell>
  `,
  styles: `
    .hint {
      margin-top: 12px;
      font-size: 13px;
      color: var(--ink-500);
    }
    .errors {
      display: grid;
      gap: 6px;
      margin: 14px 0 0;
      padding: 0;
      list-style: none;
      font-size: 13px;
    }
    .errors li {
      padding: 8px 10px;
      border-radius: var(--radius-md);
      background: var(--neutral-100);
    }
    .row {
      margin-right: 6px;
      font-weight: 700;
      color: var(--red-700);
    }
  `,
})
export class PlanImportDialog {
  protected readonly ref = inject<DialogRef<ImportChoice>>(DialogRef);
  protected readonly data = inject<ImportDialogData>(DIALOG_DATA);

  protected readonly errors = computed(() => this.data.result.errors);
  protected readonly shown = computed(() => this.data.result.errors.slice(0, MAX_SHOWN));
  protected readonly summary = computed(() => summarize(this.data.result.lines));
  protected readonly hours = computed(() => formatHours(this.summary().hours));
}
