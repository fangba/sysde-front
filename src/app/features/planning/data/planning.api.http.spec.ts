import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { HttpPlanningApi } from './planning.api';

function setup() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return { api: TestBed.inject(HttpPlanningApi), http: TestBed.inject(HttpTestingController) };
}

describe('HttpPlanningApi', () => {
  it('cible le planning de l’utilisateur connecté sans userId', () => {
    const { api, http } = setup();
    api.mine(2026).subscribe();
    api.submit(2026).subscribe();
    expect(http.expectOne((r) => r.url === '/plannings/mon-planning').request.method).toBe('GET');
    expect(http.expectOne('/plannings/mon-planning/soumission?annee=2026').request.method).toBe(
      'POST',
    );
  });

  it('cible le planning d’un collaborateur quand la secrétaire passe un userId', () => {
    const { api, http } = setup();
    api.mine(2026, 'u7').subscribe();
    api.saveLines(2026, [], 'u7').subscribe();
    api.submit(2026, 'u7').subscribe();
    expect(http.expectOne('/plannings/collaborateurs/u7?annee=2026').request.method).toBe('GET');
    expect(http.expectOne('/plannings/collaborateurs/u7/lignes?annee=2026').request.method).toBe(
      'PUT',
    );
    expect(
      http.expectOne('/plannings/collaborateurs/u7/soumission?annee=2026').request.method,
    ).toBe('POST');
  });
});
