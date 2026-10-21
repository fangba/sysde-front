import { Injectable } from '@angular/core';
import { delay, of, throwError, type Observable } from 'rxjs';

import { AuthApi } from '@core/auth/auth.api';
import type { Credentials, PasswordChange, Session } from '@core/auth/auth.models';
import type { SessionUser } from '@core/auth/current-user';
import { ApiError } from '@core/http/api-error';

import { POSTE_LABEL } from '../../settings/data/settings.constants';
import { ADMINISTRATOR_ROLE, DEMO_ACCOUNTS } from './demo-accounts';
import { DEMO_OPERATORS, DEMO_SECTORS, DEMO_USERS } from '../../settings/data/settings.demo';

const MIN_PASSWORD = 4;

/** Mots de passe modifiés pendant la visite (clé : adresse e-mail en minuscules). */
const changedPasswords = new Map<string, string>();

function nameFromEmail(email: string): { firstName: string; lastName: string } {
  const [first = '', last = ''] = email.split('@')[0].split(/[._-]/);
  const cap = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
  return { firstName: cap(first), lastName: cap(last) };
}

/**
 * Connexion de démonstration. Les comptes de `DEMO_ACCOUNTS` exigent leur mot de passe et
 * retrouvent leur opérateur, leur poste et leur secteur. Toute autre adresse valide avec un mot
 * de passe d'au moins quatre caractères est acceptée et reçoit le profil d'un administrateur.
 */
@Injectable()
export class DemoAuthApi extends AuthApi {
  login({ email, password }: Credentials): Observable<Session> {
    const account = DEMO_ACCOUNTS.find((a) => a.email === email.trim().toLowerCase());
    // Un compte de démonstration exige son mot de passe ; les autres adresses restent libres.
    const expected = changedPasswords.get(email.trim().toLowerCase()) ?? account?.password;
    if (expected !== undefined ? expected !== password : password.length < MIN_PASSWORD) {
      return throwError(() => new ApiError(401, 'Adresse e-mail ou mot de passe incorrect.')).pipe(
        delay(500),
      );
    }
    const known = DEMO_USERS.find((u) => u.email === email.trim().toLowerCase() && u.active);
    const operator = known && DEMO_OPERATORS.find((o) => o.id === known.operatorId);
    const sector = known?.sectorId ? DEMO_SECTORS.find((s) => s.id === known.sectorId) : undefined;
    const user: SessionUser =
      known && operator
        ? {
            firstName: known.firstName,
            lastName: known.lastName,
            email: known.email,
            role: account?.role ?? POSTE_LABEL[known.poste],
            administrator: account?.role === ADMINISTRATOR_ROLE,
            poste: known.poste,
            operator: { acronym: operator.acronym, name: operator.name },
            ...(sector ? { sector: { code: sector.code, name: sector.name } } : {}),
          }
        : {
            ...nameFromEmail(email),
            email,
            role: ADMINISTRATOR_ROLE,
            administrator: true,
            operator: DEMO_OPERATORS[0]
              ? { acronym: DEMO_OPERATORS[0].acronym, name: DEMO_OPERATORS[0].name }
              : { acronym: 'SysDE', name: 'SysDE' },
          };
    return of({ token: `demo-${Date.now()}`, user }).pipe(delay(700));
  }

  changePassword({ email, currentPassword, newPassword }: PasswordChange): Observable<void> {
    const key = email.trim().toLowerCase();
    const expected =
      changedPasswords.get(key) ?? DEMO_ACCOUNTS.find((a) => a.email === key)?.password;
    const wrong =
      expected !== undefined ? expected !== currentPassword : currentPassword.length < MIN_PASSWORD;
    if (wrong) {
      return throwError(() => new ApiError(403, 'Le mot de passe actuel est incorrect.')).pipe(
        delay(500),
      );
    }
    changedPasswords.set(key, newPassword);
    return of(undefined).pipe(delay(600));
  }
}
