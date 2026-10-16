import {
  CdkConnectedOverlay,
  CdkOverlayOrigin,
  type ConnectedPosition,
} from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { AuthService } from '@core/auth/auth.service';
import { CurrentUser } from '@core/auth/current-user';
import { IconComponent } from '@shared/ui/icon/icon.component';

const POSITIONS: ConnectedPosition[] = [
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
];

/** Bouton rond (initiales) ouvrant une fiche avec les informations de l'utilisateur connecté. */
@Component({
  selector: 'sysde-user-menu',
  imports: [CdkConnectedOverlay, CdkOverlayOrigin, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'user-menu' },
  template: `
    <button
      type="button"
      class="trigger"
      cdkOverlayOrigin
      #origin="cdkOverlayOrigin"
      aria-haspopup="dialog"
      [attr.aria-expanded]="open()"
      [attr.aria-label]="'Compte de ' + currentUser.fullName()"
      (click)="open.set(!open())"
    >
      {{ currentUser.initials() }}
    </button>

    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="origin"
      [cdkConnectedOverlayOpen]="open()"
      [cdkConnectedOverlayPositions]="positions"
      (overlayOutsideClick)="onOutside($event, origin)"
      (overlayKeydown)="onKey($event)"
      (detach)="open.set(false)"
    >
      <section class="panel" role="dialog" aria-label="Informations du compte">
        <div class="identity">
          <span class="avatar" aria-hidden="true">{{ currentUser.initials() }}</span>
          <div>
            <strong>{{ currentUser.fullName() }}</strong>
            <span class="role">{{ currentUser.user().role }}</span>
          </div>
        </div>
        <dl>
          <div>
            <dt>E-mail</dt>
            <dd>{{ currentUser.user().email }}</dd>
          </div>
          <div>
            <dt>Opérateur</dt>
            <dd>{{ currentUser.user().operator.name }}</dd>
          </div>
          @if (currentUser.sectorLabel(); as sector) {
            <div>
              <dt>Secteur</dt>
              <dd>{{ sector }}</dd>
            </div>
          }
        </dl>
        <button type="button" class="logout" (click)="logout()">
          <ui-icon name="logout" /> Se déconnecter
        </button>
      </section>
    </ng-template>
  `,
  styleUrl: './user-menu.component.scss',
})
export class UserMenuComponent {
  protected readonly currentUser = inject(CurrentUser);
  private readonly auth = inject(AuthService);
  protected readonly positions = POSITIONS;
  protected readonly open = signal(false);

  protected logout(): void {
    this.open.set(false);
    this.auth.logout();
  }

  protected onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.open.set(false);
    }
  }

  /** Un clic sur le bouton lui-même est géré par le bouton (bascule). */
  protected onOutside(event: MouseEvent, origin: CdkOverlayOrigin): void {
    if (!origin.elementRef.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}
