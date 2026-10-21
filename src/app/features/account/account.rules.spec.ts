import { FormControl, FormGroup } from '@angular/forms';
import { describe, expect, it } from 'vitest';

import {
  MIN_PASSWORD_LENGTH,
  differsFromCurrent,
  matchesNewPassword,
  minPasswordLength,
  passwordChecks,
} from './account.rules';

function form(current: string, next: string, confirm: string) {
  const group = new FormGroup({
    currentPassword: new FormControl(current),
    newPassword: new FormControl(next, [differsFromCurrent, minPasswordLength]),
    confirmation: new FormControl(confirm, [matchesNewPassword]),
  });
  // Les validateurs lisent leurs frères : on les relance une fois le groupe constitué.
  group.updateValueAndValidity({ onlySelf: false });
  Object.values(group.controls).forEach((c) => c.updateValueAndValidity());
  return group;
}

describe('règles du mot de passe', () => {
  it('refuse un mot de passe trop court, mais pas un champ vide (déjà signalé comme obligatoire)', () => {
    expect(minPasswordLength(new FormControl('a'.repeat(MIN_PASSWORD_LENGTH - 1)))).toEqual({
      minlength: expect.any(String),
    });
    expect(minPasswordLength(new FormControl('a'.repeat(MIN_PASSWORD_LENGTH)))).toBeNull();
    expect(minPasswordLength(new FormControl(''))).toBeNull();
  });

  it("refuse un nouveau mot de passe identique à l'actuel", () => {
    expect(form('Ancien2026!', 'Ancien2026!', '').controls.newPassword.errors).toHaveProperty(
      'same',
    );
    expect(form('Ancien2026!', 'Nouveau2026!', '').controls.newPassword.errors).toBeNull();
  });

  it('exige une confirmation identique au nouveau mot de passe', () => {
    expect(form('a', 'Nouveau2026!', 'Autre2026!').controls.confirmation.errors).toHaveProperty(
      'mismatch',
    );
    expect(form('a', 'Nouveau2026!', 'Nouveau2026!').controls.confirmation.errors).toBeNull();
  });

  it('indique en direct les conditions respectées', () => {
    const states = (c: string, n: string, k: string) => passwordChecks(c, n, k).map((x) => x.ok);
    expect(states('', '', '')).toEqual([false, false, false]);
    expect(states('Ancien2026!', 'court', 'court')).toEqual([false, true, true]);
    expect(states('Ancien2026!', 'Nouveau2026!', 'Autre')).toEqual([true, true, false]);
    expect(states('Ancien2026!', 'Nouveau2026!', 'Nouveau2026!')).toEqual([true, true, true]);
  });
});
