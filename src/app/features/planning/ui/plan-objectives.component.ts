import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';

import type { Objective } from '../data/planning.rules';

/** Avancement des objectifs annuels : séances prévues face à l'objectif de chaque activité. */
@Component({
  selector: 'sysde-plan-objectives',
  imports: [StatusPillComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-label="Objectifs annuels">
      <h3>Objectifs annuels</h3>
      <ul>
        @for (o of objectives(); track o.activity.id) {
          <li>
            <span class="name">{{ o.activity.label }}</span>
            <span class="meter" aria-hidden="true">
              <i [style.width.%]="progress(o)"></i>
            </span>
            <ui-status-pill [tone]="o.planned >= o.target ? 'green' : 'amber'">
              {{ o.planned }} / {{ o.target }}
            </ui-status-pill>
          </li>
        }
      </ul>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    section {
      padding: 14px 16px;
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      background: var(--green-50);
    }
    h3 {
      margin: 0 0 10px;
      font-size: 13.5px;
      font-weight: 600;
    }
    ul {
      display: grid;
      gap: 8px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(60px, 160px) auto;
      align-items: center;
      gap: 12px;
      font-size: 13.5px;
    }
    .meter {
      height: 6px;
      border-radius: 999px;
      background: var(--line);
      overflow: hidden;
    }
    .meter i {
      display: block;
      height: 100%;
      background: var(--chart-green);
    }
  `,
})
export class PlanObjectives {
  readonly objectives = input.required<readonly Objective[]>();

  protected progress(o: Objective): number {
    return Math.min(100, Math.round((o.planned / o.target) * 100));
  }
}
