import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
  type AbstractControl,
  type ValidationErrors,
} from '@angular/forms';

import { ButtonComponent } from '@shared/ui/button/button.component';
import { DialogShellComponent } from '@shared/ui/dialog-shell/dialog-shell.component';
import { FieldComponent } from '@shared/ui/field/field.component';

import { OPERATOR_TYPE_LABEL } from '../data/settings.constants';
import type { Operator, OperatorInput, OperatorType } from '../data/settings.models';
import { findOperatorCodeConflict } from '../data/settings.rules';
import { EntityDialog } from '../shell/entity-dialog';

const PHONE = /^[0-9 +().-]{8,20}$/;

@Component({
  selector: 'sysde-operator-dialog',
  imports: [ReactiveFormsModule, ButtonComponent, DialogShellComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog-shell
      [title]="editing ? 'Modifier l’opérateur' : 'Nouvel opérateur'"
      subtitle="Organisme administrateur ou opérateur d’encadrement technique."
    >
      <form id="operator-form" class="ui-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <ui-field label="Code" [control]="form.controls.code" hint="Ex. SAPH, SOGB">
          <input class="ui-input" formControlName="code" autocomplete="off" />
        </ui-field>
        <ui-field label="Type" [control]="form.controls.type">
          <select class="ui-input" formControlName="type">
            @for (type of types; track type.value) {
              <option [value]="type.value">{{ type.label }}</option>
            }
          </select>
        </ui-field>
        <ui-field class="span-2" label="Dénomination" [control]="form.controls.name">
          <input class="ui-input" formControlName="name" autocomplete="off" />
        </ui-field>
        <ui-field label="E-mail" [control]="form.controls.email">
          <input class="ui-input" type="email" formControlName="email" autocomplete="off" />
        </ui-field>
        <ui-field label="Téléphone" [control]="form.controls.phone">
          <input class="ui-input" type="tel" formControlName="phone" autocomplete="off" />
        </ui-field>
        <label class="ui-check span-2">
          <input type="checkbox" formControlName="active" />
          Opérateur actif
        </label>
      </form>
      <div dialogActions>
        <button ui-button variant="secondary" type="button" (click)="cancel()">Annuler</button>
        <button ui-button variant="primary" type="submit" form="operator-form" [loading]="saving()">
          Enregistrer
        </button>
      </div>
    </ui-dialog-shell>
  `,
})
export class OperatorDialog extends EntityDialog<Operator, OperatorInput> {
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly state = this.store.operators;
  protected readonly successMessage = this.editing ? 'Opérateur modifié.' : 'Opérateur créé.';
  protected readonly types = (Object.keys(OPERATOR_TYPE_LABEL) as OperatorType[]).map((value) => ({
    value,
    label: OPERATOR_TYPE_LABEL[value],
  }));

  protected readonly form = this.fb.group({
    code: [
      this.item?.code ?? '',
      [Validators.required, Validators.maxLength(12), (c: AbstractControl) => this.codeTaken(c)],
    ],
    name: [this.item?.name ?? '', [Validators.required, Validators.maxLength(150)]],
    type: [this.item?.type ?? ('TECHNIQUE' as OperatorType), Validators.required],
    email: [this.item?.email ?? '', [Validators.email, Validators.maxLength(150)]],
    phone: [this.item?.phone ?? '', Validators.pattern(PHONE)],
    active: [this.item?.active ?? true],
  });

  private codeTaken(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value ?? '').trim();
    return value && findOperatorCodeConflict(value, this.store.operators.items(), this.item?.id)
      ? { taken: 'Ce code est déjà utilisé par un autre opérateur.' }
      : null;
  }

  protected toInput(): OperatorInput {
    const v = this.form.getRawValue();
    return {
      code: v.code.trim().toUpperCase(),
      name: v.name.trim(),
      type: v.type,
      email: v.email.trim(),
      phone: v.phone.trim(),
      active: v.active,
    };
  }
}
