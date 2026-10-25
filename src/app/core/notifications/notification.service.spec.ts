import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';

import { CurrentUser } from '@core/auth/current-user';

import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [{ provide: CurrentUser, useValue: { user: () => ({ email: 'a@sysde.ci' }) } }],
    });
  });

  it('ne montre que les notifications du destinataire et compte les non lues', () => {
    const service = TestBed.inject(NotificationService);
    service.notify('a@sysde.ci', 'Planning validé', 'Message', 'success');
    service.notify('b@sysde.ci', 'Autre', 'Message');
    expect(service.mine().length).toBe(1);
    expect(service.unread()).toBe(1);
    service.markAllRead();
    expect(service.unread()).toBe(0);
  });
});
