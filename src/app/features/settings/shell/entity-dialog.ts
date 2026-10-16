import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { inject, signal } from '@angular/core';
import type { FormGroup } from '@angular/forms';

import { ToastService } from '@core/notifications/toast.service';
import { toApiError } from '@core/http/api-error';

import { SettingsStore, type EntityState } from '../state/settings.store';

export interface EntityDialogData<T> {
  /** Élément à modifier ; `null` pour une création. */
  readonly item: T | null;
}

/** Comportement commun des fenêtres de création / modification. */
export abstract class EntityDialog<T extends { readonly id: string }, I> {
  protected readonly store = inject(SettingsStore);
  protected readonly toast = inject(ToastService);
  private readonly ref = inject<DialogRef<T>>(DialogRef);
  protected readonly item = inject<EntityDialogData<T>>(DIALOG_DATA).item;

  protected readonly editing = this.item !== null;
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);

  protected abstract readonly state: EntityState<T, I>;
  protected abstract readonly form: FormGroup;
  protected abstract readonly successMessage: string;
  protected abstract toInput(): I;

  protected submit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.state.save(this.item?.id ?? null, this.toInput()).subscribe({
      next: () => {
        this.toast.show(this.successMessage, 'success');
        this.ref.close();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.toast.show(toApiError(error).message, 'error');
      },
    });
  }

  protected cancel(): void {
    this.ref.close();
  }

  /** Message d'une règle métier portée par le formulaire entier (affiché après une tentative). */
  protected formError(): string {
    const errors = this.form.errors;
    const first = errors ? Object.values(errors).find((v) => typeof v === 'string') : undefined;
    return this.submitted() && typeof first === 'string' ? first : '';
  }
}
