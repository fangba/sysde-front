import {
  CdkConnectedOverlay,
  CdkOverlayOrigin,
  type ConnectedPosition,
} from '@angular/cdk/overlay';
import type { ElementRef } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
  viewChildren,
} from '@angular/core';

import { IconComponent } from '../icon/icon.component';
import type { IconName } from '../icon/icon.registry';

export interface OptionItem {
  readonly id: string;
  readonly label: string;
  readonly icon: IconName;
}

const POSITIONS: ConnectedPosition[] = [
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 6 },
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -6 },
];

/** Bouton « Options » ouvrant un petit menu d'actions (navigation au clavier : ↑ ↓ Échap). */
@Component({
  selector: 'ui-options-menu',
  imports: [CdkConnectedOverlay, CdkOverlayOrigin, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="trigger"
      cdkOverlayOrigin
      #origin="cdkOverlayOrigin"
      aria-haspopup="menu"
      [attr.aria-expanded]="open()"
      [attr.aria-label]="ariaLabel() || label()"
      (click)="open.set(!open())"
    >
      {{ label() }}
      <ui-icon name="chevronDown" />
    </button>

    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="origin"
      [cdkConnectedOverlayOpen]="open()"
      [cdkConnectedOverlayPositions]="positions"
      (overlayOutsideClick)="onOutside($event, origin)"
      (overlayKeydown)="onKey($event)"
      (attach)="focusFirst()"
      (detach)="open.set(false)"
    >
      <div class="ui-menu" role="menu" [attr.aria-label]="label()">
        @for (item of items(); track item.id) {
          <button
            #entry
            type="button"
            role="menuitem"
            class="ui-menu__item"
            (click)="choose(item.id)"
          >
            <span class="item"><ui-icon [name]="item.icon" /> {{ item.label }}</span>
          </button>
        }
      </div>
    </ng-template>
  `,
  styles: `
    :host {
      display: inline-block;
    }
    .trigger {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 34px;
      padding: 0 10px 0 12px;
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      background: var(--paper);
      color: var(--ink-900);
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      --ui-icon-size: 14px;
    }
    .trigger:hover {
      border-color: var(--green-300);
      background: var(--green-50);
    }
    .trigger:focus-visible {
      outline: 2px solid var(--spark-green);
      outline-offset: 1px;
    }
    .item {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      --ui-icon-size: 16px;
    }
  `,
})
export class OptionsMenuComponent {
  readonly items = input.required<readonly OptionItem[]>();
  readonly label = input('Options');
  /** Intitulé accessible du bouton, par exemple « Options de Conférence thématique ». */
  readonly ariaLabel = input('');
  readonly chosen = output<string>();

  protected readonly open = signal(false);
  protected readonly positions = POSITIONS;
  private readonly entries = viewChildren<ElementRef<HTMLButtonElement>>('entry');

  protected choose(id: string): void {
    this.open.set(false);
    this.chosen.emit(id);
  }

  protected onOutside(event: MouseEvent, origin: CdkOverlayOrigin): void {
    if (!origin.elementRef.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  protected focusFirst(): void {
    queueMicrotask(() => this.entries()[0]?.nativeElement.focus());
  }

  protected onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.open.set(false);
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }
    event.preventDefault();
    const buttons = this.entries().map((e) => e.nativeElement);
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const step = event.key === 'ArrowDown' ? 1 : -1;
    buttons[(at + step + buttons.length) % buttons.length]?.focus();
  }
}
