import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Titre de page (unique `h1`) avec sous-titre et zone d'actions à droite. */
@Component({
  selector: 'ui-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-page-header' },
  template: `
    <div>
      <h1 class="title">{{ title() }}</h1>
      @if (subtitle()) {
        <p class="subtitle">{{ subtitle() }}</p>
      }
    </div>
    <div class="actions"><ng-content /></div>
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
    }
    .title {
      font-size: 28px;
      font-weight: 700;
      line-height: 1.15;
      letter-spacing: -0.02em;
    }
    .subtitle {
      margin-top: 6px;
      font-size: 14px;
      color: var(--ink-500);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
    }
    .actions:empty {
      display: none;
    }
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}
