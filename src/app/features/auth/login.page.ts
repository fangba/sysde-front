import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { safeReturnUrl } from '@core/auth/auth.guard';
import { AuthService } from '@core/auth/auth.service';
import { APP_CONFIG } from '@core/config/app-config';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { FieldComponent } from '@shared/ui/field/field.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { DEMO_ACCOUNTS, type DemoAccount } from './data/demo-accounts';
import { ThemeToggleComponent } from '@shared/ui/theme-toggle/theme-toggle.component';

@Component({
  selector: 'sysde-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    FieldComponent,
    IconComponent,
    ThemeToggleComponent,
  ],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly demo = inject(APP_CONFIG).useDemoData;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    remember: [true],
  });
  protected readonly showPassword = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal('');

  protected readonly accounts = DEMO_ACCOUNTS;

  protected readonly points = [
    { icon: 'map', text: 'Suivi des secteurs, lots et parcelles sur une carte unique' },
    { icon: 'clipboard', text: 'Tâches et contrats de l’encadrement technique centralisés' },
    { icon: 'layers', text: 'Données synchronisées avec l’application mobile hors ligne' },
  ] as const;

  /** Pré-remplit le formulaire avec un compte de démonstration. */
  protected useAccount(account: DemoAccount): void {
    this.error.set('');
    this.form.patchValue({ email: account.email, password: account.password });
  }

  protected submit(): void {
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password, remember } = this.form.getRawValue();
    this.loading.set(true);
    this.auth.login({ email: email.trim(), password }, remember).subscribe({
      next: () => {
        void this.router.navigateByUrl(
          safeReturnUrl(this.route.snapshot.queryParamMap.get('retour')),
        );
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(
          err instanceof Error ? err.message : 'Connexion impossible. Réessayez dans un instant.',
        );
      },
    });
  }
}
