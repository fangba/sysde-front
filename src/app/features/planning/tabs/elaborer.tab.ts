import { Dialog } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  computed,
  inject,
  signal,
} from '@angular/core';

import { CurrentUser } from '@core/auth/current-user';
import { ToastService } from '@core/notifications/toast.service';
import { formatDate } from '@shared/util/format';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';

import { downloadPlanTemplate, readPlanFile } from '../data/planning.excel';
import type { PlanLine } from '../data/planning.models';
import { parsePlanRows, planStatusView } from '../data/planning.rules';
import { SettingsStore } from '../../settings/state/settings.store';
import { PlanningStore } from '../state/planning.store';
import { PlanImportDialog, type ImportChoice } from './import.dialog';
import { PlanObjectives } from '../ui/plan-objectives.component';
import { PlanCheckDialog } from './plan-check.dialog';
import { PlanLineDialog } from './line.dialog';
import { ActivityPlan } from '../ui/activity-plan.component';
import { PlanCalendar } from '../ui/plan-calendar.component';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const DRAWER = {
  panelClass: 'ui-drawer-panel',
  width: 'min(520px, 100vw)',
  height: '100%',
  maxHeight: '100vh',
  backdropClass: 'ui-dialog-backdrop',
} as const;

/** Élaboration du planning annuel : saisie ligne par ligne ou import d'un fichier Excel. */
@Component({
  selector: 'sysde-elaborer-tab',
  imports: [
    ActivityPlan,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    IconComponent,
    PlanCalendar,
    StatusPillComponent,
    PlanObjectives,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.status() === 'error' || settings.status() === 'error') {
      <ui-card>
        <ui-empty-state
          icon="alert"
          tone="red"
          title="Chargement impossible"
          [description]="store.status() === 'error' ? store.error() : settings.error()"
        >
          <button ui-button variant="primary" type="button" (click)="reload()">Réessayer</button>
        </ui-empty-state>
      </ui-card>
    } @else {
      <ui-card [heading]="'Planning ' + store.year()" [subheading]="subheading()">
        <div cardActions class="bar">
          @if (!ownPlanOfSectorHead()) {
            @let view = statusView();
            <ui-status-pill [tone]="view.tone">{{ view.label }}</ui-status-pill>
          }
          @if (store.editable()) {
            @if (store.dirty()) {
              <button
                ui-button
                variant="ghost"
                type="button"
                [disabled]="store.saving()"
                (click)="store.discard()"
              >
                Annuler
              </button>
              <button
                ui-button
                variant="secondary"
                type="button"
                [loading]="store.saving()"
                (click)="store.save()"
              >
                Enregistrer
              </button>
            }
            @if (!ownPlanOfSectorHead()) {
              <button
                ui-button
                variant="primary"
                type="button"
                [disabled]="store.summary().count === 0 || store.saving()"
                (click)="confirming.set(true)"
              >
                {{ submitLabel() }}
              </button>
            }
          }
        </div>

        @if (confirming()) {
          <div class="notice" data-tone="amber" role="alert">
            <p>
              <strong>{{ submitLabel() }} ?</strong> Le planning ne sera plus modifiable
              @if (isSectorHead()) {
                une fois validé.
              } @else {
                tant que votre chef secteur ne l'a pas rejeté.
              }
            </p>
            <div class="bar">
              <button ui-button variant="secondary" type="button" (click)="confirming.set(false)">
                Retour
              </button>
              <button
                ui-button
                variant="primary"
                type="button"
                [loading]="store.saving()"
                (click)="submit()"
              >
                Confirmer
              </button>
            </div>
          </div>
        }

        @if (settings.status() === 'ready' && store.activities().length === 0) {
          <div class="notice" data-tone="amber" role="status">
            <p>
              Aucune activité n'est configurée pour {{ store.proxy() ? 'son' : 'votre' }} poste : le
              planning ne peut pas encore être élaboré. Demandez à un administrateur d'en ajouter
              dans Paramètres, onglet Activités.
            </p>
          </div>
        }

        @if (store.plan(); as plan) {
          @if (plan.rejection && plan.status === 'BROUILLON') {
            <div class="notice" data-tone="red" role="status">
              <p>
                <strong>Planning rejeté le {{ formatDate(plan.rejection.date) }}.</strong>
                {{ plan.rejection.reason }} Corrigez-le puis soumettez-le à nouveau.
              </p>
            </div>
          } @else if (plan.status === 'SOUMIS') {
            <div class="notice" data-tone="amber" role="status">
              <p>
                Planning soumis : il attend la validation
                {{ store.proxy() ? 'du' : 'de votre' }} chef secteur et n'est plus modifiable.
              </p>
            </div>
          } @else if (plan.status === 'VALIDE') {
            <div class="notice" data-tone="green" role="status">
              <p>
                @if (isSectorHead()) {
                  Planning validé d'office : le planning d'un chef secteur n'a pas de validateur.
                } @else {
                  Planning validé par {{ store.proxy() ? 'le' : 'votre' }} chef secteur.
                }
              </p>
            </div>
          } @else {
            <div class="notice" data-tone="neutral">
              <p>
                @if (store.proxy()) {
                  Ajoutez les activités une à une, ou importez un fichier Excel pour cette personne
                  (le modèle est téléchargeable ci-dessous).
                } @else {
                  Ajoutez vos activités une à une, ou importez un fichier Excel (le modèle est
                  téléchargeable ci-dessous).
                }
                @if (isSectorHead()) {
                  {{ store.proxy() ? 'Ce planning' : 'Votre planning' }} sera validé d'office.
                } @else {
                  Soumettez-le ensuite {{ store.proxy() ? 'au' : 'à votre' }} chef secteur.
                }
              </p>
            </div>
          }
        }

        @if (store.overview().length > 0 && display() !== 'activities') {
          <sysde-plan-objectives [objectives]="store.overview()" />
        }

        <div class="toolbar">
          <div class="seg" role="group" aria-label="Affichage du planning">
            <button
              type="button"
              [attr.aria-pressed]="display() === 'activities'"
              (click)="display.set('activities')"
            >
              Activités
            </button>
            <button
              type="button"
              [attr.aria-pressed]="display() === 'calendar'"
              (click)="display.set('calendar')"
            >
              Calendrier
            </button>
          </div>
          <div class="bar">
            <button
              ui-button
              variant="secondary"
              type="button"
              [disabled]="store.activities().length === 0"
              (click)="verifyPlan()"
            >
              <ui-icon name="check" />
              {{ store.proxy() ? 'Vérifier ce planning' : 'Vérifier mon planning' }}
            </button>
            <button
              ui-button
              variant="secondary"
              type="button"
              [loading]="downloading()"
              (click)="downloadTemplate()"
            >
              <ui-icon name="download" /> Modèle Excel
            </button>
            <button
              ui-button
              variant="secondary"
              type="button"
              [disabled]="!store.editable() || store.activities().length === 0"
              [attr.title]="store.editable() ? null : 'Le planning n’est plus modifiable.'"
              (click)="file.click()"
            >
              <ui-icon name="upload" /> Importer un fichier
            </button>
          </div>
        </div>

        @if (display() === 'activities') {
          <sysde-activity-plan />
        } @else {
          <sysde-plan-calendar
            [year]="store.year()"
            [lines]="store.draft()"
            [pinDetail]="true"
            [categoryOf]="categoryOf"
            [labelOf]="labelOf"
            [editable]="store.editable()"
            (lineEdit)="openLine($event)"
            (dayAdd)="openLine(null, $event)"
          />
        }
        <input
          #file
          type="file"
          class="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          aria-label="Choisir un fichier Excel de planning"
          tabindex="-1"
          (change)="onFile($event)"
        />
      </ui-card>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
    }
    .notice {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin: 16px 0 4px;
      padding: 12px 14px;
      border-radius: var(--radius-md);
      background: var(--green-50);
      color: var(--ink-700);
      font-size: 13px;
      line-height: 1.5;
    }
    .notice[data-tone='amber'] {
      background: var(--amber-100);
      color: var(--amber-700);
    }
    .notice[data-tone='red'] {
      background: var(--red-100);
      color: var(--red-700);
    }
    .notice[data-tone='green'] {
      background: var(--ok-100);
      color: var(--ok-700);
    }
    .notice[data-tone='neutral'] {
      background: var(--neutral-100);
      color: var(--neutral-700);
    }
    .file {
      display: none;
    }
    sysde-plan-objectives {
      margin-top: 16px;
    }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin: 16px 0 12px;
    }
    .seg {
      display: inline-flex;
      padding: 3px;
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      background: var(--neutral-100);
    }
    .seg button {
      height: 32px;
      padding: 0 14px;
      border: 0;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--ink-700);
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .seg button[aria-pressed='true'] {
      background: var(--paper);
      color: var(--green-800);
      box-shadow: var(--shadow-sm);
    }
    .seg button:focus-visible {
      outline: 2px solid var(--spark-green);
      outline-offset: 1px;
    }
  `,
})
export class ElaborerTab {
  protected readonly store = inject(PlanningStore);
  protected readonly settings = inject(SettingsStore);
  private readonly dialog = inject(Dialog);
  private readonly injector = inject(Injector);
  private readonly toast = inject(ToastService);
  private readonly currentUser = inject(CurrentUser);
  /** Le titulaire du planning affiché est chef secteur (soi-même ou, pour la secrétaire, lui). */
  protected readonly isSectorHead = this.store.ownerIsSectorHead;
  /** Le chef secteur devant son propre planning : validé d'office, rien à soumettre. */
  protected readonly ownPlanOfSectorHead = computed(
    () => !this.store.proxy() && this.currentUser.isSectorHead(),
  );

  protected readonly formatDate = formatDate;
  protected readonly display = signal<'activities' | 'calendar'>('activities');
  protected readonly confirming = signal(false);
  protected readonly downloading = signal(false);

  protected readonly statusView = computed(() => {
    const plan = this.store.plan();
    return planStatusView(plan ?? { status: 'BROUILLON' });
  });
  protected readonly submitLabel = computed(() => {
    if (this.store.proxy()) {
      return this.isSectorHead() ? 'Valider le planning' : 'Soumettre au chef secteur';
    }
    return this.isSectorHead() ? 'Valider mon planning' : 'Soumettre';
  });
  protected readonly subheading = computed(() => {
    const { count, days } = this.store.summary();
    if (count === 0) {
      return 'Aucune activité prévue.';
    }
    const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;
    return `${plural(count, 'activité')} · ${plural(days, 'jour')}`;
  });

  protected readonly categoryOf = (id: string) => this.store.categoryOf(id);
  protected readonly labelOf = (id: string) => this.store.activityLabel(id);

  /** Ouvre la fenêtre d'une ligne ; `date` propose le jour choisi dans le calendrier. */
  protected verifyPlan(): void {
    this.dialog.open(PlanCheckDialog, {
      panelClass: 'ui-dialog-panel',
      width: 'min(560px, calc(100vw - 32px))',
      backdropClass: 'ui-dialog-backdrop',
      injector: this.injector,
    });
  }

  protected openLine(line: PlanLine | null, date?: string): void {
    this.dialog.open(PlanLineDialog, {
      ...DRAWER,
      data: { item: line, date },
      injector: this.injector,
    });
  }

  protected reload(): void {
    if (this.settings.status() === 'error') {
      this.settings.load();
    }
    this.store.load();
  }

  protected submit(): void {
    this.confirming.set(false);
    this.store.submit();
  }

  protected async downloadTemplate(): Promise<void> {
    this.downloading.set(true);
    try {
      await downloadPlanTemplate(this.store.year(), this.store.activities());
    } catch {
      this.toast.show("Le modèle n'a pas pu être généré. Réessayez.", 'error');
    } finally {
      this.downloading.set(false);
    }
  }

  protected async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      this.toast.show('Choisissez un fichier Excel au format .xlsx.', 'error');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      this.toast.show('Le fichier dépasse 5 Mo.', 'error');
      return;
    }
    try {
      const rows = await readPlanFile(file);
      const result = parsePlanRows(rows, this.store.year(), this.store.activities());
      this.dialog
        .open<ImportChoice>(PlanImportDialog, {
          ...DRAWER,
          data: { fileName: file.name, result, existing: this.store.draft().length },
          injector: this.injector,
        })
        .closed.subscribe((choice) => {
          if (choice) {
            const message = this.store.importLines(result.lines, choice);
            this.toast.show(
              message ?? 'Les activités ont été ajoutées. Pensez à enregistrer.',
              message ? 'error' : 'success',
            );
          }
        });
    } catch {
      this.toast.show(
        "Ce fichier n'a pas pu être lu. Utilisez le modèle Excel au format .xlsx.",
        'error',
      );
    }
  }
}
