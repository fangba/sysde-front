import { DIALOG_DATA } from '@angular/cdk/dialog';
import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { ButtonComponent } from '@shared/ui/button/button.component';
import { DialogShellComponent } from '@shared/ui/dialog-shell/dialog-shell.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { formatInteger } from '@shared/util/format';

import { STAGE_LABEL, type Plantation } from './data/plantations.models';
import { PlantationsStore } from './state/plantations.store';

/** Fiche d'une plantation, en lecture seule. */
@Component({
  selector: 'sysde-plantation-dialog',
  imports: [ButtonComponent, DialogShellComponent, StatusPillComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog-shell
      [title]="p.code"
      [subtitle]="p.operator + ' · ' + p.sectorCode + ' ' + p.sectorName"
    >
      <div class="pills">
        <ui-status-pill [tone]="p.stage === 'SAIGNEE' ? 'green' : 'amber'">{{
          stageLabel
        }}</ui-status-pill>
        <ui-status-pill [tone]="p.geolocated ? 'green' : 'neutral'">{{
          p.geolocated ? 'Géolocalisée' : 'Non géolocalisée'
        }}</ui-status-pill>
      </div>
      <dl>
        <div>
          <dt>Planteur</dt>
          <dd>{{ p.planter.name }}</dd>
        </div>
        <div>
          <dt>Téléphone</dt>
          <dd>{{ p.planter.phone }}</dd>
        </div>
        <div>
          <dt>Village</dt>
          <dd>{{ p.village }}</dd>
        </div>
        <div>
          <dt>Lot</dt>
          <dd>Lot {{ p.lot }}</dd>
        </div>
        <div>
          <dt>Section</dt>
          <dd>{{ p.sectionName ?? 'Non affectée' }}</dd>
        </div>
        <div>
          <dt>Superficie</dt>
          <dd>{{ hectares }} ha</dd>
        </div>
        <div>
          <dt>Année de plantation</dt>
          <dd>{{ p.plantedYear || '—' }}</dd>
        </div>
        <div>
          <dt>Clone</dt>
          <dd>{{ p.clone }}</dd>
        </div>
      </dl>
      @if (store.canAssign()) {
        <section class="assign" aria-label="Affectation à une section">
          <label for="assign-section">Affecter à une section</label>
          <select
            id="assign-section"
            class="ui-input"
            [value]="choice()"
            (change)="choice.set($any($event.target).value)"
          >
            <option value="">Non affectée</option>
            @for (s of sections(); track s.id) {
              <option [value]="s.id">{{ s.name }}</option>
            }
          </select>
          @if (sections().length === 0) {
            <small>Aucune section dans le lot {{ p.lot }} : créez-en une dans Paramètres.</small>
          }
          <button
            ui-button
            variant="primary"
            type="button"
            [disabled]="choice() === (p.sectionId ?? '')"
            [loading]="store.saving()"
            (click)="save()"
          >
            Enregistrer
          </button>
        </section>
      }
      <p class="source">
        Données fournies par la base des plantations ; elles ne sont pas modifiables dans SysDE.
      </p>
    </ui-dialog-shell>
  `,
  styles: `
    .pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 20px;
    }
    dl {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px 20px;
    }
    dt {
      font-size: 12px;
      font-weight: 500;
      color: var(--ink-500);
    }
    dd {
      margin-top: 2px;
      font-size: 14px;
      font-weight: 600;
    }
    .assign {
      display: grid;
      gap: 8px;
      margin-top: 24px;
      padding: 16px;
      border-radius: var(--radius-md);
      background: var(--neutral-100);
    }
    .assign label {
      font-size: 13.5px;
      font-weight: 700;
    }
    .assign small {
      color: var(--ink-500);
      font-size: 12px;
    }
    .assign button {
      justify-self: start;
    }
    .source {
      margin-top: 24px;
      font-size: 12px;
      color: var(--ink-500);
    }
  `,
})
export class PlantationDialog {
  protected readonly p = inject<Plantation>(DIALOG_DATA);
  protected readonly store = inject(PlantationsStore);
  private readonly ref = inject(DialogRef);
  protected readonly sections = computed(() => this.store.sectionsOf(this.p));
  protected readonly choice = signal(this.p.sectionId ?? '');
  protected readonly stageLabel = STAGE_LABEL[this.p.stage];
  protected readonly hectares = formatInteger(this.p.hectares);

  protected save(): void {
    this.store.assign(this.p, this.choice() || null, () => this.ref.close());
  }
}
