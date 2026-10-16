import { DIALOG_DATA } from '@angular/cdk/dialog';
import { toSignal } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
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

import { POSTE_LABEL } from '../../settings/data/settings.constants';
import type { Poste, User, UserInput } from '../../settings/data/settings.models';
import { findEmailConflict, sectorsOfOperator } from '../../settings/data/settings.rules';
import { EntityDialog, type EntityDialogData } from '../../settings/shell/entity-dialog';
import { STAFF_CONFIG, type StaffKind } from './staff.config';

const PHONE = /^[0-9 +().-]{8,20}$/;

/** Création et modification du personnel d'un opérateur technique, selon la catégorie ouverte. */
@Component({
  selector: 'sysde-staff-dialog',
  imports: [ReactiveFormsModule, ButtonComponent, DialogShellComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog-shell
      [title]="(editing ? 'Modifier le ' : 'Nouveau ') + config.singular"
      subtitle="Il est rattaché à un opérateur d’encadrement technique."
    >
      <form id="staff-form" class="ui-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
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
        <ui-field
          [class.span-2]="config.postes.length === 1"
          label="Opérateur"
          [control]="form.controls.operatorId"
        >
          <select class="ui-input" formControlName="operatorId">
            <option value="">Choisir…</option>
            @for (o of operators(); track o.id) {
              <option [value]="o.id">{{ o.acronym }} · {{ o.name }}</option>
            }
          </select>
        </ui-field>
        @if (config.postes.length > 1) {
          <ui-field label="Poste" [control]="form.controls.poste">
            <select class="ui-input" formControlName="poste">
              <option value="">Choisir…</option>
              @for (p of config.postes; track p) {
                <option [value]="p">{{ p }} · {{ label[p] }}</option>
              }
            </select>
          </ui-field>
        }
        @if (config.sector !== 'none') {
          <ui-field
            class="span-2"
            label="Secteur"
            [control]="form.controls.sectorId"
            [hint]="
              operatorId()
                ? sectors().length
                  ? 'Secteurs attribués à cet opérateur.'
                  : 'Aucun secteur n’est attribué à cet opérateur : voir Paramètres › Attribution.'
                : 'Choisissez d’abord l’opérateur.'
            "
          >
            <select class="ui-input" formControlName="sectorId">
              <option value="">{{ config.sector === 'optional' ? 'Aucun' : 'Choisir…' }}</option>
              @for (s of sectors(); track s.id) {
                <option [value]="s.id">{{ s.code }} · {{ s.name }}</option>
              }
            </select>
          </ui-field>
        }
        <label class="ui-check span-2">
          <input type="checkbox" formControlName="active" />
          Compte actif
        </label>
      </form>
      <div dialogActions>
        <button ui-button variant="secondary" type="button" (click)="cancel()">Annuler</button>
        <button ui-button variant="primary" type="submit" form="staff-form" [loading]="saving()">
          Enregistrer
        </button>
      </div>
    </ui-dialog-shell>
  `,
})
export class StaffDialog extends EntityDialog<User, UserInput> {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly kind = inject<EntityDialogData<User> & { kind: StaffKind }>(DIALOG_DATA).kind;

  protected readonly config = STAFF_CONFIG[this.kind];
  protected readonly label = POSTE_LABEL;
  protected readonly state = this.store.users;
  protected readonly successMessage = this.editing ? this.config.updated : this.config.created;

  protected readonly operators = computed(() =>
    this.store.operators
      .items()
      .filter((o) => o.type === 'TECHNIQUE' && (o.active || o.id === this.item?.operatorId)),
  );

  protected readonly form = this.fb.group({
    lastName: [this.item?.lastName ?? '', [Validators.required, Validators.maxLength(80)]],
    firstName: [this.item?.firstName ?? '', [Validators.required, Validators.maxLength(80)]],
    email: [
      this.item?.email ?? '',
      [Validators.required, Validators.email, (c: AbstractControl) => this.emailTaken(c)],
    ],
    phone: [this.item?.phone ?? '', Validators.pattern(PHONE)],
    operatorId: [this.item?.operatorId ?? '', Validators.required],
    poste: [
      (this.item?.poste ?? (this.config.postes.length === 1 ? this.config.postes[0] : '')) as
        Poste | '',
      Validators.required,
    ],
    sectorId: [
      this.item?.sectorId ?? '',
      this.config.sector === 'required' ? Validators.required : [],
    ],
    active: [this.item?.active ?? true],
  });

  protected readonly operatorId = toSignal(this.form.controls.operatorId.valueChanges, {
    initialValue: this.form.controls.operatorId.value,
  });

  /** Secteurs attribués à l'opérateur choisi ; le secteur déjà enregistré reste proposé. */
  protected readonly sectors = computed(() => {
    const list = sectorsOfOperator(
      this.operatorId(),
      this.store.contracts.items(),
      this.store.attributions.items(),
      this.store.sectors(),
    );
    const current = this.item?.sectorId && this.item.operatorId === this.operatorId();
    const kept = current ? this.store.sectorOf(this.item!.sectorId!) : undefined;
    return kept && !list.some((s) => s.id === kept.id) ? [...list, kept] : list;
  });

  constructor() {
    super();
    // Changer d'opérateur peut rendre le secteur choisi impossible.
    this.form.controls.operatorId.valueChanges.subscribe(() => {
      const sectorId = this.form.controls.sectorId.value;
      if (sectorId && !this.sectors().some((s) => s.id === sectorId)) {
        this.form.controls.sectorId.setValue('');
      }
    });
  }

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
      ...(this.config.sector !== 'none' && v.sectorId ? { sectorId: v.sectorId } : {}),
      active: v.active,
    };
  }
}
