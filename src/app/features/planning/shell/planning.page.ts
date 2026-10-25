import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { CurrentUser } from '@core/auth/current-user';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { TabNavComponent } from '@shared/ui/tab-nav/tab-nav.component';

import { SettingsStore } from '../../settings/state/settings.store';
import { planningTabsFor } from '../planning.access';
import { PlanningStore } from '../state/planning.store';
import { ReviewStore } from '../state/review.store';

/** Coque de l'écran Planning : choix de l'année, onglets et contenu de l'onglet actif. */
@Component({
  selector: 'sysde-planning-page',
  imports: [RouterOutlet, PageHeaderComponent, TabNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header title="Planning" [subtitle]="subtitle()">
      <label class="year">
        <span>Année</span>
        <select
          class="ui-input"
          [value]="store.year()"
          [disabled]="store.dirty() || store.saving()"
          [title]="
            store.dirty() ? 'Enregistrez ou annulez vos modifications pour changer d’année.' : ''
          "
          (change)="changeYear($event)"
        >
          @for (year of years; track year) {
            <option [value]="year" [selected]="year === store.year()">{{ year }}</option>
          }
        </select>
      </label>
    </ui-page-header>

    <ui-tab-nav [tabs]="tabs()" label="Sections du planning" />
    <router-outlet />
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 12px;
      --sticky-top: var(--app-bar-height, 0px);
      --tabs-height: 49px;
    }
    .year {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 600;
      color: var(--ink-500);
    }
    .year .ui-input {
      width: 96px;
    }
    router-outlet {
      display: none;
    }
  `,
})
export class PlanningPage {
  protected readonly store = inject(PlanningStore);
  private readonly settings = inject(SettingsStore);
  private readonly currentUser = inject(CurrentUser);

  private readonly review = inject(ReviewStore);

  protected readonly tabs = computed(() =>
    planningTabsFor({
      sectorHead: this.currentUser.isSectorHead(),
      secretary: this.currentUser.isSecretary(),
    }).map((tab) =>
      tab.path === 'validation' ? { ...tab, badge: this.review.pendingTotal() } : tab,
    ),
  );
  protected readonly subtitle = computed(() =>
    this.currentUser.isSecretary()
      ? 'Plannings annuels d’activités de votre secteur : saisie et import pour toute l’équipe.'
      : 'Planning annuel d’activités : élaboration puis validation.',
  );
  protected readonly years = (() => {
    const year = new Date().getFullYear();
    return [year - 1, year, year + 1];
  })();

  constructor() {
    this.settings.load();
    // La secrétaire n'a pas de planning à elle : seule l'année est utilisée.
    if (!this.currentUser.isSecretary()) {
      this.store.load();
    }
    // Le chef secteur voit tout de suite, sur l'onglet Validation, combien d'éléments l'attendent.
    if (this.currentUser.isSectorHead()) {
      this.review.load();
    }
  }

  protected changeYear(event: Event): void {
    const year = Number((event.target as HTMLSelectElement).value);
    if (this.currentUser.isSecretary()) {
      this.store.year.set(year);
    } else {
      this.store.load(year);
    }
  }
}
