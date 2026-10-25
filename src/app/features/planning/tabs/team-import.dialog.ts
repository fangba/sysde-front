import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { ButtonComponent } from '@shared/ui/button/button.component';
import { DialogShellComponent } from '@shared/ui/dialog-shell/dialog-shell.component';

import type { TeamImportPerson, TeamImportResult } from '../data/planning.rules';

export interface TeamImportData {
  readonly fileName: string;
  readonly result: TeamImportResult;
  /** Identifiants des personnes dont le planning est soumis ou validé (non modifiable). */
  readonly locked: ReadonlySet<string>;
  /** Identifiants des personnes qui ont déjà un brouillon avec des lignes. */
  readonly withDraft: ReadonlySet<string>;
}

export type TeamImportMode = 'append' | 'replace' | 'skip';

export interface TeamImportChoice {
  readonly mode: TeamImportMode;
  readonly people: readonly TeamImportPerson[];
}

const MAX_SHOWN = 12;

const MODES: readonly {
  readonly code: TeamImportMode;
  readonly label: string;
  readonly hint: string;
}[] = [
  {
    code: 'append',
    label: 'Ajouter les nouvelles lignes',
    hint: 'Les dates déjà présentes ne sont pas dupliquées.',
  },
  { code: 'replace', label: 'Remplacer le brouillon', hint: '' },
  { code: 'skip', label: 'Ne pas toucher à cette personne', hint: '' },
];

/** Contrôle d'un fichier d'équipe avant import : prêts, erreurs, ignorés. */
@Component({
  selector: 'sysde-team-import-dialog',
  imports: [ButtonComponent, DialogShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog-shell title="Importer plusieurs plannings" [subtitle]="data.fileName">
      @if (data.result.fileError; as fileError) {
        <p class="ui-form__error" role="alert">{{ fileError }}</p>
      } @else {
        <div class="kpis">
          <div class="ok">
            <strong>{{ ready().length }}</strong>
            <span
              >planning{{ ready().length > 1 ? 's' : '' }} prêt{{ ready().length > 1 ? 's' : '' }} à
              importer</span
            >
          </div>
          <div class="warn">
            <strong>{{ failing().length + data.result.unknown.length }}</strong>
            <span>avec une erreur à corriger</span>
          </div>
          <div class="muted">
            <strong>{{ ignored().length }}</strong>
            <span>ignoré{{ ignored().length > 1 ? 's' : '' }} : soumis ou validés</span>
          </div>
        </div>

        @if (problems().length > 0) {
          <h3>À corriger dans le fichier</h3>
          <ul class="problems">
            @for (p of shownProblems(); track $index) {
              <li>
                <strong>{{ p.who }}</strong>
                <span>{{ p.text }}</span>
              </li>
            }
          </ul>
          @if (problems().length > shownProblems().length) {
            <p class="hint">… et {{ problems().length - shownProblems().length }} autre(s).</p>
          }
          <p class="hint">
            Les personnes avec une erreur ne sont pas importées ; les autres le sont.
          </p>
        }

        @if (draftCount() > 0) {
          <fieldset>
            <legend>Si la personne a déjà un brouillon ({{ draftCount() }})</legend>
            @for (m of modes; track m.code) {
              <label>
                <input
                  type="radio"
                  name="mode"
                  [checked]="mode() === m.code"
                  (change)="mode.set(m.code)"
                />
                <span>
                  <strong>{{ m.label }}</strong>
                  @if (m.hint) {
                    <small>{{ m.hint }}</small>
                  }
                </span>
              </label>
            }
          </fieldset>
        }
        <p class="note">
          Les plannings importés restent <strong>en brouillon</strong> : relisez-les, puis
          soumettez-les au chef secteur depuis la liste.
        </p>
      }
      <div dialogActions>
        <button ui-button variant="secondary" type="button" (click)="ref.close()">Annuler</button>
        @if (!data.result.fileError) {
          <button
            ui-button
            variant="primary"
            type="button"
            [disabled]="ready().length === 0"
            (click)="confirm()"
          >
            Importer {{ ready().length }} planning{{ ready().length > 1 ? 's' : '' }}
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
    fieldset {
      display: grid;
      gap: 10px;
      margin: 12px 0;
      padding: 14px;
      border: 0;
      border-radius: var(--radius-md);
      background: var(--neutral-100);
    }
    legend {
      float: left;
      width: 100%;
      margin-bottom: 4px;
      padding: 0;
      font-size: 13.5px;
      font-weight: 700;
    }
    fieldset label {
      display: flex;
      gap: 10px;
      font-size: 13px;
    }
    fieldset small {
      display: block;
      color: var(--ink-500);
    }
    input[type='radio'] {
      accent-color: var(--green-700);
    }
    .note {
      margin: 8px 0 0;
      font-size: 12.5px;
      line-height: 1.55;
      color: var(--ink-700);
    }
  `,
})
export class TeamImportDialog {
  protected readonly data = inject<TeamImportData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<TeamImportChoice>>(DialogRef);
  protected readonly modes = MODES;
  protected readonly mode = signal<TeamImportMode>('append');

  protected readonly ignored = computed(() =>
    this.data.result.people.filter((p) => this.data.locked.has(p.member.userId)),
  );
  protected readonly failing = computed(() =>
    this.data.result.people.filter(
      (p) => !this.data.locked.has(p.member.userId) && p.errors.length > 0,
    ),
  );
  protected readonly ready = computed(() =>
    this.data.result.people.filter(
      (p) => !this.data.locked.has(p.member.userId) && p.errors.length === 0 && p.lines.length > 0,
    ),
  );
  protected readonly draftCount = computed(
    () => this.ready().filter((p) => this.data.withDraft.has(p.member.userId)).length,
  );

  protected readonly problems = computed(() => [
    ...this.failing().flatMap((p) =>
      p.errors.map((e) => ({
        who: p.member.matricule,
        text: `ligne ${e.row} : ${e.message}`,
      })),
    ),
    ...this.data.result.unknown.map((u) => ({
      who: u.matricule,
      text: `${u.rows} ligne${u.rows > 1 ? 's' : ''} : matricule inconnu dans votre secteur.`,
    })),
  ]);
  protected readonly shownProblems = computed(() => this.problems().slice(0, MAX_SHOWN));

  protected confirm(): void {
    this.ref.close({ mode: this.mode(), people: this.ready() });
  }
}
