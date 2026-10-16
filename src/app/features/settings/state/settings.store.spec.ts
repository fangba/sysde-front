import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { firstValueFrom } from 'rxjs';

import { DemoSettingsApi, SettingsApi } from '../data/settings.api';
import { SettingsStore } from './settings.store';

function setup() {
  TestBed.configureTestingModule({
    providers: [SettingsStore, { provide: SettingsApi, useClass: DemoSettingsApi }],
  });
  return TestBed.inject(SettingsStore);
}

describe('SettingsStore', () => {
  it('charge toutes les listes', async () => {
    const store = setup();
    store.load();
    await new Promise((r) => setTimeout(r, 400));
    expect(store.status()).toBe('ready');
    expect(store.operators.items().length).toBe(9);
    expect(store.sectorLabel('sec-1')).toBe('S01 · Aboisso');
    expect(store.contractLabel('ct-1')).toBe('CT-SAPH-2024 (SAPH)');
  });

  it('ajoute puis modifie un élément dans la liste', async () => {
    const store = setup();
    const input = {
      code: 'NEW',
      name: 'Nouveau',
      type: 'TECHNIQUE',
      email: '',
      phone: '',
      active: true,
    } as const;
    const created = await firstValueFrom(store.operators.save(null, input));
    expect(store.operators.items()).toEqual([created]);
    await firstValueFrom(store.operators.save(created.id, { ...input, name: 'Renommé' }));
    expect(store.operators.items()[0].name).toBe('Renommé');
    expect(store.operators.items().length).toBe(1);
  });

  it('signale l’échec de la modification d’un élément inconnu', async () => {
    const store = setup();
    await expect(
      firstValueFrom(
        store.operators.save('absent', {
          code: 'X',
          name: 'X',
          type: 'TECHNIQUE',
          email: '',
          phone: '',
          active: true,
        }),
      ),
    ).rejects.toThrow();
  });
});
