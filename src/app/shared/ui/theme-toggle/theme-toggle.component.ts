import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ThemeService } from '@core/theme/theme.service';

import { IconComponent } from '../icon/icon.component';

/** Bascule clair/sombre. L'état est annoncé par `aria-pressed`. */
@Component({
  selector: 'ui-theme-toggle',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-theme-toggle' },
  template: `
    <button
      type="button"
      class="btn"
      aria-label="Mode sombre"
      [attr.aria-pressed]="isDark()"
      (click)="theme.toggle()"
    >
      <ui-icon [name]="isDark() ? 'sun' : 'moon'" />
    </button>
  `,
  styles: `
    .btn {
      display: grid;
      place-items: center;
      width: 42px;
      height: 42px;
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      background: var(--paper);
      color: var(--ink-700);
      cursor: pointer;
      transition: background var(--duration) var(--ease);
    }
    .btn:hover {
      background: var(--green-50);
    }
    .btn:focus-visible {
      outline: 2px solid var(--green-600);
      outline-offset: 2px;
    }
  `,
})
export class ThemeToggleComponent {
  protected readonly theme = inject(ThemeService);
  protected readonly isDark = this.theme.isDark;
}
