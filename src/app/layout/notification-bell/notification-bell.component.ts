import {
  CdkConnectedOverlay,
  CdkOverlayOrigin,
  type ConnectedPosition,
} from '@angular/cdk/overlay';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { NotificationService } from '@core/notifications/notification.service';
import { IconComponent } from '@shared/ui/icon/icon.component';

const POSITIONS: ConnectedPosition[] = [
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
];

/** Cloche de la barre d'outils : pastille des notifications non lues et liste déroulante. */
@Component({
  selector: 'sysde-notification-bell',
  imports: [CdkConnectedOverlay, CdkOverlayOrigin, DatePipe, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'notification-bell' },
  template: `
    <button
      type="button"
      class="trigger"
      cdkOverlayOrigin
      #origin="cdkOverlayOrigin"
      aria-haspopup="dialog"
      [attr.aria-expanded]="open()"
      [attr.aria-label]="
        service.unread() > 0
          ? 'Notifications, ' + service.unread() + ' non lue(s)'
          : 'Notifications'
      "
      (click)="open.set(!open())"
    >
      <ui-icon name="bell" />
      @if (service.unread() > 0) {
        <span class="badge" aria-hidden="true">{{ service.unread() }}</span>
      }
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
      <section class="panel" role="dialog" aria-label="Notifications">
        <header>
          <strong>Notifications</strong>
          @if (service.unread() > 0) {
            <button type="button" class="link" (click)="service.markAllRead()">
              Tout marquer comme lu
            </button>
          }
        </header>
        <ul>
          @for (n of service.mine(); track n.id) {
            <li>
              <button type="button" [class.unread]="!n.read" (click)="service.markRead(n.id)">
                <span class="dot" [attr.data-tone]="n.tone" aria-hidden="true"></span>
                <span class="text">
                  <strong>{{ n.title }}</strong>
                  <span>{{ n.message }}</span>
                  <time [attr.datetime]="n.createdAt">{{
                    n.createdAt | date: 'dd/MM/yyyy HH:mm'
                  }}</time>
                </span>
              </button>
            </li>
          } @empty {
            <li class="none">Aucune notification pour le moment.</li>
          }
        </ul>
      </section>
    </ng-template>
  `,
  styleUrl: './notification-bell.component.scss',
})
export class NotificationBellComponent {
  protected readonly service = inject(NotificationService);
  protected readonly positions = POSITIONS;
  protected readonly open = signal(false);

  protected onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.open.set(false);
    }
  }

  protected onOutside(event: MouseEvent, origin: CdkOverlayOrigin): void {
    if (!origin.elementRef.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}
