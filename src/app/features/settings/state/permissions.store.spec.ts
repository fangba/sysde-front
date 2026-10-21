import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { DEFAULT_GRANTS, PERMISSIONS, withPermission } from '../data/permissions.catalog';
import { DemoSettingsApi, SettingsApi } from '../data/settings.api';
import { PermissionsStore } from './permissions.store';

async function setup() {
  TestBed.configureTestingModule({
    providers: [PermissionsStore, { provide: SettingsApi, useClass: DemoSettingsApi }],
  });
  const store = TestBed.inject(PermissionsStore);
  store.load();
  await new Promise((resolve) => setTimeout(resolve, 400));
  return store;
}

describe('catalogue des droits', () => {
  it("n'accorde par défaut que des droits qui existent", () => {
    const codes = new Set(PERMISSIONS.map((p) => p.code));
    for (const granted of Object.values(DEFAULT_GRANTS)) {
      expect(granted.every((code) => codes.has(code))).toBe(true);
    }
  });

  it('accorder une action accorde aussi son écran', () => {
    expect(withPermission([], 'taches.collaborateurs', true)).toEqual([
      'taches.voir',
      'taches.collaborateurs',
    ]);
  });

  it('retirer un écran retire ses actions, sans toucher aux autres sections', () => {
    const granted = [
      'dashboard.voir',
      'taches.voir',
      'taches.chefs-secteur',
      'taches.collaborateurs',
    ];
    expect(withPermission(granted, 'taches.voir', false)).toEqual(['dashboard.voir']);
  });
});

describe('PermissionsStore', () => {
  it('charge les droits et ne signale aucune modification', async () => {
    const store = await setup();
    expect(store.status()).toBe('ready');
    expect(store.dirty()).toBe(false);
    expect(store.has('CS', 'taches.collaborateurs')).toBe(true);
    expect(store.has('SU', 'taches.voir')).toBe(false);
  });

  it('compte les cases modifiées et les abandonne', async () => {
    const store = await setup();
    store.toggle('MO', 'reporting.voir');
    expect(store.has('MO', 'reporting.voir')).toBe(true);
    expect(store.isChanged('MO', 'reporting.voir')).toBe(true);
    expect(store.changeCount()).toBe(1);
    store.toggle('MO', 'reporting.voir');
    expect(store.dirty()).toBe(false);
    store.toggle('SU', 'taches.collaborateurs'); // accorde aussi « Voir les tâches »
    expect(store.changeCount()).toBe(2);
    store.discard();
    expect(store.dirty()).toBe(false);
    expect(store.has('SU', 'taches.collaborateurs')).toBe(false);
  });

  it('enregistre, puis garde les droits modifiés', async () => {
    const store = await setup();
    store.toggle('CF', 'reporting.voir');
    store.save();
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(store.dirty()).toBe(false);
    expect(store.has('CF', 'reporting.voir')).toBe(true);
    expect(store.counts().CF).toBe(DEFAULT_GRANTS.CF.length + 1);
  });
});
