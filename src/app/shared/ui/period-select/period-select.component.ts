import { CdkMenu, CdkMenuGroup, CdkMenuItemRadio, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

import { ButtonComponent } from '../button/button.component';
import { IconComponent } from '../icon/icon.component';

export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

/** Liste déroulante à choix unique, basée sur le menu du CDK (clavier et ARIA inclus). */
@Component({
  selector: 'ui-period-select',
  imports: [
    ButtonComponent,
    IconComponent,
    CdkMenuTrigger,
    CdkMenu,
    CdkMenuGroup,
    CdkMenuItemRadio,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-period-select' },
  template: `
    <button
      ui-button
      type="button"
      variant="secondary"
      [cdkMenuTriggerFor]="menu"
      [attr.aria-label]="label() + ' : ' + currentLabel()"
    >
      <ui-icon name="calendar" />
      {{ currentLabel() }}
      <ui-icon name="chevronDown" />
    </button>

    <ng-template #menu>
      <div class="ui-menu" cdkMenu>
        <div cdkMenuGroup>
          @for (option of options(); track option.value) {
            <button
              type="button"
              class="ui-menu__item"
              cdkMenuItemRadio
              [cdkMenuItemChecked]="option.value === value()"
              (cdkMenuItemTriggered)="value.set(option.value)"
            >
              {{ option.label }}
              @if (option.value === value()) {
                <ui-icon name="check" />
              }
            </button>
          }
        </div>
      </div>
    </ng-template>
  `,
})
export class PeriodSelectComponent {
  readonly options = input.required<readonly SelectOption[]>();
  /** Nom du champ, annoncé par les lecteurs d'écran. */
  readonly label = input('Période');
  readonly value = model.required<string>();

  protected readonly currentLabel = computed(
    () => this.options().find((o) => o.value === this.value())?.label ?? '',
  );
}
