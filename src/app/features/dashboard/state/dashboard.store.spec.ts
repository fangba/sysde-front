import { TestBed } from '@angular/core/testing';
import type { Observable } from 'rxjs';
import { of, throwError } from 'rxjs';

import { signal } from '@angular/core';
import { CurrentUser } from '@core/auth/current-user';
import { Clock } from '@core/time/clock';
import { ApiError } from '@core/http/api-error';

import { DashboardApi } from '../data/dashboard.api';
import { DEMO_DASHBOARD } from '../data/dashboard.demo';
import type { DashboardData } from '../data/dashboard.models';
import { DashboardStore } from './dashboard.store';

function setup(
  result: Observable<DashboardData>,
  role: 'admin' | 'cd' | 'cs' | 'su' = 'admin',
): DashboardStore {
  const user = {
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    administrator: role === 'admin',
    operator: { acronym: 'SAPH', name: 'SAPH' },
    sector: role === 'cs' ? { code: 'S01', name: 'Aboisso' } : undefined,
  };
  TestBed.configureTestingModule({
    providers: [
      DashboardStore,
      { provide: DashboardApi, useValue: { load: () => result } },
      {
        provide: CurrentUser,
        useValue: {
          user: signal(user),
          isAdministrator: signal(role === 'admin'),
          hasGlobalView: signal(role === 'admin'),
          isDepartmentHead: signal(role === 'cd'),
          isSectorHead: signal(role === 'cs'),
        },
      },
      { provide: Clock, useValue: { now: () => new Date(2026, 9, 15) } },
    ],
  });
  return TestBed.inject(DashboardStore);
}

describe('DashboardStore', () => {
  it('démarre en chargement', () => {
    expect(setup(of(DEMO_DASHBOARD)).status()).toBe('loading');
  });

  it('expose les indicateurs une fois chargé', () => {
    const store = setup(of(DEMO_DASHBOARD));
    store.load();
    expect(store.status()).toBe('ready');
    expect(store.kpis()).toHaveLength(4);
    expect(store.kpis()[0]?.value).toContain('1');
  });

  it('limite le graphique à la période choisie', () => {
    const store = setup(of(DEMO_DASHBOARD));
    store.load();
    expect(store.chartLabels()).toHaveLength(12);
    store.setPeriod('3m');
    expect(store.chartLabels()).toHaveLength(3);
    expect(store.chartSeries()[0]?.values).toHaveLength(3);
  });

  it('trie les échéances, les retards en premier', () => {
    const store = setup(of(DEMO_DASHBOARD));
    store.load();
    const days = store.deadlines().map((d) => d.daysLeft);
    expect(days).toEqual([...days].sort((a, b) => a - b));
    expect(days[0]).toBeLessThan(0);
  });

  it('passe en erreur avec un message lisible, puis peut réessayer', () => {
    const store = setup(throwError(() => new ApiError(0, 'Le serveur est injoignable.')));
    store.load();
    expect(store.status()).toBe('error');
    expect(store.error()).toContain('injoignable');
  });

  it('adapte les libellés et le périmètre au profil', () => {
    const store = setup(of(DEMO_DASHBOARD), 'cs');
    store.load();
    expect(store.profile().id).toBe('secteur');
    expect(store.kpis()[0]?.label).toBe('Production du secteur');
  });
});
