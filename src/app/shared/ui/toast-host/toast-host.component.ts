import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ToastService } from '@core/notifications/toast.service';

import { IconComponent } from '../icon/icon.component';

/** Zone d'affichage des toasts ; `aria-live` annonce les nouveaux messages. */
@Component({
  selector: 'ui-toast-host',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-toast-host' },
  template: `
    <div class="stack" role="status" aria-live="polite">
      @for (toast of toasts.toasts(); track toast.id) {
        <div class="toast" [attr.data-tone]="toast.tone">
          <span class="message">{{ toast.message }}</span>
          <button
            type="button"
            class="close"
            aria-label="Fermer la notification"
            (click)="toasts.dismiss(toast.id)"
          >
            <ui-icon name="close" />
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .stack {
      position: fixed;
      right: 20px;
      bottom: 20px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: min(380px, calc(100vw - 40px));
    }
    .toast {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: var(--radius-md);
      border: 1px solid var(--line);
      border-left-width: 4px;
      background: var(--paper);
      box-shadow: var(--shadow-pop);
      font-size: 14px;
    }
    .toast[data-tone='success'] {
      border-left-color: var(--green-600);
    }
    .toast[data-tone='warning'] {
      border-left-color: var(--amber-700);
    }
    .toast[data-tone='error'] {
      border-left-color: var(--red-700);
    }
    .toast[data-tone='info'] {
      border-left-color: var(--violet-ink);
    }
    .message {
      flex: 1;
    }
    .close {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: var(--ink-500);
      cursor: pointer;
      --ui-icon-size: 14px;
    }
    .close:hover {
      background: var(--green-50);
    }
    .close:focus-visible {
      outline: 2px solid var(--green-600);
      outline-offset: 1px;
    }
  `,
})
export class ToastHostComponent {
  protected readonly toasts = inject(ToastService);
}
