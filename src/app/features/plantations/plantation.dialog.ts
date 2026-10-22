import { DIALOG_DATA } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { DialogShellComponent } from '@shared/ui/dialog-shell/dialog-shell.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { formatInteger } from '@shared/util/format';

import { STAGE_LABEL, type Plantation } from './data/plantations.models';

/** Fiche d'une plantation, en lecture seule. */
@Component({
  selector: 'sysde-plantation-dialog',
  imports: [DialogShellComponent, StatusPillComponent],
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
          <dt>Lot · Section</dt>
          <dd>Lot {{ p.lot }} · Section {{ p.section }}</dd>
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
    .source {
      margin-top: 24px;
      font-size: 12px;
      color: var(--ink-500);
    }
  `,
})
export class PlantationDialog {
  protected readonly p = inject<Plantation>(DIALOG_DATA);
  protected readonly stageLabel = STAGE_LABEL[this.p.stage];
  protected readonly hectares = formatInteger(this.p.hectares);
}
