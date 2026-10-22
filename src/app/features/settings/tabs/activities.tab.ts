import { Dialog } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  computed,
  inject,
  signal,
} from '@angular/core';

import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';

import { ACTIVITY_CATEGORIES, PLANNING_POSTE_LIST, POSTE_LABEL } from '../data/settings.constants';
import type { Activity, ActivityCategory, PlanningPoste } from '../data/settings.models';
import { SettingsStore } from '../state/settings.store';
import { ActivityDialog } from './activity.dialog';

/** Activités que chaque poste peut inscrire à son planning, par catégorie. */
@Component({
  selector: 'sysde-activities-tab',
  imports: [ButtonComponent, CardComponent, IconComponent, SkeletonComponent, StatusPillComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-card
      heading="Activités des plannings"
      subheading="Ce que chaque poste peut inscrire à son planning, par catégorie."
    >
      <div class="postes" role="group" aria-label="Poste">
        @for (poste of postes; track poste) {
          <button
            type="button"
            class="poste"
            [attr.aria-pressed]="poste === selected()"
            (click)="selected.set(poste)"
          >
            <span class="code">{{ poste }}</span>
            <span class="count">{{ countOf(poste) }}</span>
          </button>
        }
      </div>

      <h3 class="poste-title">{{ posteLabel() }}</h3>

      @if (store.status() === 'loading') {
        <div class="columns">
          @for (c of categories; track c.code) {
            <ui-skeleton height="140px" />
          }
        </div>
      } @else {
        <div class="columns">
          @for (category of categories; track category.code) {
            @let list = activitiesOf(category.code);
            <section class="category" [attr.aria-label]="category.label">
              <header>
                <h4>
                  {{ category.label }}
                  <span class="n">{{ list.length }}</span>
                </h4>
                <button
                  ui-button
                  variant="secondary"
                  type="button"
                  [attr.aria-label]="'Ajouter une activité ' + category.label.toLowerCase()"
                  (click)="open(null, category.code)"
                >
                  <ui-icon name="plus" /> Ajouter
                </button>
              </header>
              @if (list.length === 0) {
                <p class="none">Aucune activité.</p>
              } @else {
                <ul>
                  @for (activity of list; track activity.id) {
                    <li [class.off]="!activity.active">
                      <span class="label">
                        {{ activity.label }}
                        <span class="meta">{{ meta(activity) }}</span>
                      </span>
                      @if (!activity.active) {
                        <ui-status-pill tone="neutral">Désactivée</ui-status-pill>
                      }
                      <button
                        type="button"
                        class="edit"
                        [attr.aria-label]="'Modifier ' + activity.label"
                        (click)="open(activity, category.code)"
                      >
                        <ui-icon name="edit" />
                      </button>
                    </li>
                  }
                </ul>
              }
            </section>
          }
        </div>
      }
    </ui-card>
  `,
  styleUrl: './activities.tab.scss',
})
export class ActivitiesTab {
  protected readonly store = inject(SettingsStore);
  private readonly dialog = inject(Dialog);
  private readonly injector = inject(Injector);

  protected readonly postes = PLANNING_POSTE_LIST;
  protected readonly categories = ACTIVITY_CATEGORIES;
  protected readonly selected = signal<PlanningPoste>('CS');
  protected readonly posteLabel = computed(() => POSTE_LABEL[this.selected()]);

  /** Nombre d'activités proposées (actives) d'un poste. */
  protected countOf(poste: PlanningPoste): number {
    return this.store.activities.items().filter((a) => a.poste === poste && a.active).length;
  }

  protected activitiesOf(category: ActivityCategory): readonly Activity[] {
    return this.store.activities
      .items()
      .filter((a) => a.poste === this.selected() && a.category === category);
  }

  /** « 12 séances/an · 20 jours » */
  protected meta(a: Activity): string {
    const days = `${a.durationDays} jour${a.durationDays > 1 ? 's' : ''}`;
    return a.annualTarget === null ? days : `${a.annualTarget}/an · ${days}`;
  }

  protected open(item: Activity | null, category: ActivityCategory): void {
    this.dialog.open(ActivityDialog, {
      data: { item, poste: this.selected(), category },
      injector: this.injector,
      panelClass: 'ui-drawer-panel',
      width: 'min(520px, 100vw)',
      height: '100%',
      maxHeight: '100vh',
      backdropClass: 'ui-dialog-backdrop',
    });
  }
}
