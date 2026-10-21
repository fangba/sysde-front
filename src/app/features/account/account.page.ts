import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { startWith } from 'rxjs';

import { AuthService } from '@core/auth/auth.service';
import { CurrentUser } from '@core/auth/current-user';
import { ToastService } from '@core/notifications/toast.service';
import { ThemeService, type ThemeMode } from '@core/theme/theme.service';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { FieldComponent } from '@shared/ui/field/field.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';

import {
  differsFromCurrent,
  matchesNewPassword,
  minPasswordLength,
  passwordChecks,
} from './account.rules';

interface ThemeChoice {
  readonly mode: ThemeMode;
  readonly label: string;
  readonly icon: 'sun' | 'moon';
  readonly hint: string;
}

/** Page personnelle de l'utilisateur connecté : identité, mot de passe, apparence, session. */
@Component({
  selector: 'sysde-account-page',
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    CardComponent,
    FieldComponent,
    IconComponent,
    PageHeaderComponent,
    StatusPillComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account.page.html',
  styleUrl: './account.page.scss',
})
export class AccountPage {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly theme = inject(ThemeService);
  protected readonly currentUser = inject(CurrentUser);

  protected readonly themes: readonly ThemeChoice[] = [
    { mode: 'light', label: 'Clair', icon: 'sun', hint: 'Fond clair, idéal en plein jour' },
    { mode: 'dark', label: 'Sombre', icon: 'moon', hint: 'Fond sombre, repose les yeux' },
  ];

  protected readonly form = inject(FormBuilder).nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, minPasswordLength, differsFromCurrent]],
    confirmation: ['', [Validators.required, matchesNewPassword]],
  });
  private readonly values = toSignal(
    this.form.valueChanges.pipe(startWith(this.form.getRawValue())),
    { initialValue: this.form.getRawValue() },
  );
  /** Conditions du nouveau mot de passe, mises à jour à chaque saisie. */
  protected readonly checks = computed(() => {
    const { currentPassword = '', newPassword = '', confirmation = '' } = this.values();
    return passwordChecks(currentPassword, newPassword, confirmation);
  });
  protected readonly reveal = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  constructor() {
    // Les contrôles se valident l'un par rapport à l'autre : on les réévalue à chaque saisie.
    const { currentPassword, newPassword, confirmation } = this.form.controls;
    currentPassword.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      newPassword.updateValueAndValidity({ emitEvent: false });
    });
    newPassword.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      confirmation.updateValueAndValidity({ emitEvent: false });
    });
  }

  protected submit(): void {
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { currentPassword, newPassword } = this.form.getRawValue();
    this.saving.set(true);
    this.auth.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.saving.set(false);
        this.form.reset();
        this.toast.show('Votre mot de passe a été modifié.', 'success');
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(
          err instanceof Error
            ? err.message
            : 'Modification impossible. Réessayez dans un instant.',
        );
      },
    });
  }

  protected logout(): void {
    this.auth.logout();
  }
}
