import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { IconComponent } from '../icon/icon.component';

/** Cadre d'une fenêtre modale : titre, bouton de fermeture, corps et zone d'actions. */
@Component({
  selector: 'ui-dialog-shell',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-dialog-shell' },
  template: `
    <header class="head">
      <div>
        <h2 class="title">{{ title() }}</h2>
        @if (subtitle()) {
          <p class="subtitle">{{ subtitle() }}</p>
        }
      </div>
      <button type="button" class="close" aria-label="Fermer la fenêtre" (click)="close()">
        <ui-icon name="close" />
      </button>
    </header>
    <div class="body"><ng-content /></div>
    <footer class="foot"><ng-content select="[dialogActions]" /></footer>
  `,
  styleUrl: './dialog-shell.component.scss',
})
export class DialogShellComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();

  private readonly ref = inject(DialogRef, { optional: true });

  protected close(): void {
    this.ref?.close();
  }
}
