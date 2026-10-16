import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
  type AbstractControl,
  type ValidationErrors,
} from '@angular/forms';

import { CurrentUser } from '@core/auth/current-user';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { DialogShellComponent } from '@shared/ui/dialog-shell/dialog-shell.component';
import { FieldComponent } from '@shared/ui/field/field.component';

import { POSTE_LABEL } from '../../settings/data/settings.constants';
import type { Poste, User, UserInput } from '../../settings/data/settings.models';
import { allowedPostes, findEmailConflict } from '../../settings/data/settings.rules';
import { EntityDialog } from '../../settings/shell/entity-dialog';

const PHONE = /^[0-9 +().-]{8,20}$/;

@Component({
  selector: 'sysde-user-dialog',
  imports: [ReactiveFormsModule, ButtonComponent, DialogShellComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog-shell
      [title]="editing ? 'Modifier le compte' : 'Nouveau compte utilisateur'"
      [subtitle]="
        'Un utilisateur occupe un seul poste au sein de ' +
        (own()?.acronym ?? 'votre organisme') +
        '.'
      "
    >
      <form id="user-form" class="ui-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <ui-field label="Nom" [control]="form.controls.lastName">
          <input class="ui-input" formControlName="lastName" autocomplete="off" />
        </ui-field>
        <ui-field label="Prénoms" [control]="form.controls.firstName">
          <input class="ui-input" formControlName="firstName" autocomplete="off" />
        </ui-field>
        <ui-field label="E-mail" [control]="form.controls.email">
          <input class="ui-input" type="email" formControlName="email" autocomplete="off" />
        </ui-field>
        <ui-field label="Téléphone" [control]="form.controls.phone">
          <input class="ui-input" type="tel" formControlName="phone" autocomplete="off" />
        </ui-field>
        <ui-field label="Organisme" [control]="form.controls.operatorId">
          <select class="ui-input" formControlName="operatorId">
            <option [value]="own()?.id ?? ''">{{ own()?.acronym }}</option>
          </select>
        </ui-field>
        <ui-field
          label="Poste"
          [control]="form.controls.poste"
          hint="Les opérateurs techniques se gèrent dans les onglets Chef département, Chef secteur et Collaborateur."
        >
          <select class="ui-input" formControlName="poste">
            <option value="">Choisir…</option>
            @for (p of postes(); track p) {
              <option [value]="p">{{ p }} · {{ label[p] }}</option>
            }
          </select>
        </ui-field>
        <label class="ui-check span-2">
          <input type="checkbox" formControlName="active" />
          Compte actif
        </label>
      </form>
      <div dialogActions>
        <button ui-button variant="secondary" type="button" (click)="cancel()">Annuler</button>
        <button ui-button variant="primary" type="submit" form="user-form" [loading]="saving()">
          Enregistrer
        </button>
      </div>
    </ui-dialog-shell>
  `,
})
export class UserDialog extends EntityDialog<User, UserInput> {
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly state = this.store.users;
  protected readonly successMessage = this.editing ? 'Compte modifié.' : 'Compte créé.';
  protected readonly label = POSTE_LABEL;

  private readonly currentUser = inject(CurrentUser);

  /** L'organisme du compte est toujours celui de l'utilisateur connecté, jamais un autre. */
  protected readonly own = computed(() =>
    this.store.operatorByAcronym(this.currentUser.user().operator.acronym),
  );

  protected readonly form = this.fb.group({
    lastName: [this.item?.lastName ?? '', [Validators.required, Validators.maxLength(80)]],
    firstName: [this.item?.firstName ?? '', [Validators.required, Validators.maxLength(80)]],
    email: [
      this.item?.email ?? '',
      [Validators.required, Validators.email, (c: AbstractControl) => this.emailTaken(c)],
    ],
    phone: [this.item?.phone ?? '', Validators.pattern(PHONE)],
    operatorId: [{ value: this.item?.operatorId ?? this.own()?.id ?? '', disabled: true }],
    poste: [(this.item?.poste ?? '') as Poste | '', Validators.required],
    active: [this.item?.active ?? true],
  });

  protected readonly postes = computed(() => {
    const operator = this.own();
    return operator ? allowedPostes(operator.type, this.item?.poste) : [];
  });

  private emailTaken(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value ?? '').trim();
    return value && findEmailConflict(value, this.store.users.items(), this.item?.id)
      ? { taken: 'Cette adresse e-mail est déjà associée à un compte.' }
      : null;
  }

  protected toInput(): UserInput {
    const v = this.form.getRawValue();
    return {
      lastName: v.lastName.trim(),
      firstName: v.firstName.trim(),
      email: v.email.trim().toLowerCase(),
      phone: v.phone.trim(),
      operatorId: v.operatorId,
      poste: v.poste as Poste,
      active: v.active,
    };
  }
}
