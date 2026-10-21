import type { AbstractControl, ValidationErrors } from '@angular/forms';

/** Longueur minimale d'un mot de passe. */
export const MIN_PASSWORD_LENGTH = 8;

/** Mot de passe trop court. L'erreur est un message affiché tel quel par `ui-field`. */
export function minPasswordLength(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '');
  return value.length > 0 && value.length < MIN_PASSWORD_LENGTH
    ? { minlength: `Au moins ${MIN_PASSWORD_LENGTH} caractères.` }
    : null;
}

/** Le nouveau mot de passe doit différer de l'actuel (contrôle frère `currentPassword`). */
export function differsFromCurrent(control: AbstractControl): ValidationErrors | null {
  const current = control.parent?.get('currentPassword')?.value as string | undefined;
  const value = control.value as string | undefined;
  return value && current && value === current
    ? { same: "Le nouveau mot de passe doit être différent de l'actuel." }
    : null;
}

/** La confirmation doit reprendre le nouveau mot de passe (contrôle frère `newPassword`). */
export function matchesNewPassword(control: AbstractControl): ValidationErrors | null {
  const next = control.parent?.get('newPassword')?.value as string | undefined;
  const value = control.value as string | undefined;
  return value && value !== next
    ? { mismatch: 'La confirmation ne correspond pas au nouveau mot de passe.' }
    : null;
}

export interface PasswordCheck {
  readonly key: 'length' | 'different' | 'match';
  readonly label: string;
  readonly ok: boolean;
}

/** Conditions d'un nouveau mot de passe, pour l'aide en direct sous le formulaire. */
export function passwordChecks(
  current: string,
  next: string,
  confirmation: string,
): PasswordCheck[] {
  return [
    {
      key: 'length',
      label: `Au moins ${MIN_PASSWORD_LENGTH} caractères`,
      ok: next.length >= MIN_PASSWORD_LENGTH,
    },
    {
      key: 'different',
      label: 'Différent du mot de passe actuel',
      ok: next.length > 0 && next !== current,
    },
    { key: 'match', label: 'Confirmation identique', ok: next.length > 0 && next === confirmation },
  ];
}
