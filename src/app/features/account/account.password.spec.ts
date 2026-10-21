import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthApi } from '@core/auth/auth.api';
import { AuthService } from '@core/auth/auth.service';

import { DEMO_ACCOUNTS } from '../auth/data/demo-accounts';
import { DemoAuthApi } from '../auth/data/demo-auth.api';

describe('changement de mot de passe (démo)', () => {
  let auth: AuthService;
  const account = DEMO_ACCOUNTS[2];

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthApi, useClass: DemoAuthApi }],
    });
    auth = TestBed.inject(AuthService);
    await firstValueFrom(auth.login({ email: account.email, password: account.password }, false));
  });

  it("refuse un mot de passe actuel incorrect et garde l'ancien", async () => {
    await expect(firstValueFrom(auth.changePassword('mauvais', 'Nouveau2026!'))).rejects.toThrow(
      'incorrect',
    );
    await firstValueFrom(auth.login({ email: account.email, password: account.password }, false));
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('applique le nouveau mot de passe à la connexion suivante', async () => {
    await firstValueFrom(auth.changePassword(account.password, 'Nouveau2026!'));
    await expect(
      firstValueFrom(auth.login({ email: account.email, password: account.password }, false)),
    ).rejects.toThrow();
    await firstValueFrom(auth.login({ email: account.email, password: 'Nouveau2026!' }, false));
    expect(auth.isAuthenticated()).toBe(true);
    // On remet le mot de passe d'origine pour ne pas gêner les autres tests du même fichier.
    await firstValueFrom(auth.changePassword('Nouveau2026!', account.password));
  });
});
