import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { DEMO_ACCOUNTS } from '../../features/auth/data/demo-accounts';
import { DemoAuthApi } from '../../features/auth/data/demo-auth.api';

import { AuthApi } from './auth.api';
import { safeReturnUrl } from './auth.guard';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user';

describe('AuthService (démo)', () => {
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'connexion', children: [] }]),
        { provide: AuthApi, useClass: DemoAuthApi },
      ],
    });
    auth = TestBed.inject(AuthService);
  });

  it('ouvre une session avec un e-mail valide', async () => {
    await firstValueFrom(auth.login({ email: 'jean.kouame@exemple.ci', password: 'abcd' }, false));
    expect(auth.isAuthenticated()).toBe(true);
    expect(TestBed.inject(CurrentUser).fullName()).toBe('Jean Kouame');
  });

  it('donne au superviseur la vue nationale, sans le menu Tâches', async () => {
    const supervisor = DEMO_ACCOUNTS.find((a) => a.email === 'superviseur@sysde.ci');
    expect(supervisor).toBeDefined();
    await firstValueFrom(
      auth.login({ email: supervisor?.email ?? '', password: supervisor?.password ?? '' }, false),
    );
    const user = TestBed.inject(CurrentUser);
    expect(user.isSupervisor()).toBe(true);
    expect(user.isAdministrator()).toBe(false);
    expect(user.hasGlobalView()).toBe(true);
    expect(user.canReport()).toBe(true);
  });

  it('exige le mot de passe des comptes de démonstration', async () => {
    const [admin] = DEMO_ACCOUNTS;
    await expect(
      firstValueFrom(auth.login({ email: admin.email, password: 'mauvais' }, false)),
    ).rejects.toThrow();
    await firstValueFrom(auth.login({ email: admin.email, password: admin.password }, false));
    expect(TestBed.inject(CurrentUser).user().role).toBe('Administrateur');
    expect(TestBed.inject(CurrentUser).user().operator.acronym).toBe('FIRCA');
  });

  it('rattache chaque compte de démonstration à son organisation et à son poste', async () => {
    const expected: Record<string, [string, string, string]> = {
      'admin.firca@sysde.ci': ['FIRCA', 'Administrateur', ''],
      'admin.apromac@sysde.ci': ['APROMAC', 'Administrateur', ''],
      'chef.departement@sysde.ci': ['SAPH', 'Chef de département', ''],
      'chef.secteur@sysde.ci': ['SAPH', 'Chef de secteur', 'S01'],
      'superviseur@sysde.ci': ['APROMAC', 'Superviseur', ''],
    };
    expect(DEMO_ACCOUNTS.map((a) => a.email).sort()).toEqual(Object.keys(expected).sort());
    for (const account of DEMO_ACCOUNTS) {
      const session = await firstValueFrom(
        TestBed.inject(AuthApi).login({ email: account.email, password: account.password }),
      );
      expect(session.user.administrator).toBe(account.role === 'Administrateur');
      const [operator, role, sector] = expected[account.email];
      expect([
        session.user.operator.acronym,
        session.user.role,
        session.user.sector?.code ?? '',
      ]).toEqual([operator, role, sector]);
    }
  });

  it('refuse un mot de passe trop court', async () => {
    await expect(
      firstValueFrom(auth.login({ email: 'a@b.ci', password: 'abc' }, false)),
    ).rejects.toThrow();
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('garde la session selon « rester connecté »', async () => {
    await firstValueFrom(auth.login({ email: 'a.b@c.ci', password: 'abcd' }, true));
    expect(localStorage.getItem('sysde-session')).not.toBeNull();
    expect(sessionStorage.getItem('sysde-session')).toBeNull();
  });

  it('ferme la session à la déconnexion', async () => {
    await firstValueFrom(auth.login({ email: 'a.b@c.ci', password: 'abcd' }, true));
    auth.logout();
    expect(auth.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('sysde-session')).toBeNull();
  });
});

describe('safeReturnUrl', () => {
  it('accepte uniquement les chemins internes', () => {
    expect(safeReturnUrl('/carte')).toBe('/carte');
    expect(safeReturnUrl('//evil.com')).toBe('/');
    expect(safeReturnUrl('https://evil.com')).toBe('/');
    expect(safeReturnUrl(null)).toBe('/');
  });
});
