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
import { endOfPeriod, isValidIso } from '@shared/util/dates';
import { formatDate } from '@shared/util/format';

import { CONTRACT_YEARS, type Contract, type ContractInput } from '../data/settings.models';
import { findContractConflict } from '../data/settings.rules';
import { EntityDialog } from '../shell/entity-dialog';

@Component({
  selector: 'sysde-contract-dialog',
  imports: [ReactiveFormsModule, ButtonComponent, DialogShellComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog-shell
      [title]="editing ? 'Modifier le contrat' : 'Nouveau contrat'"
      subtitle="Un contrat dure trois ans ; la date de fin est calculée."
    >
      <form id="contract-form" class="ui-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <ui-field label="Référence" [control]="form.controls.reference">
          <input class="ui-input" formControlName="reference" autocomplete="off" />
        </ui-field>
        <ui-field label="Opérateur" [control]="form.controls.operatorId">
          <select class="ui-input" formControlName="operatorId">
            <option value="">Choisir…</option>
            @for (o of operators(); track o.id) {
              <option [value]="o.id">{{ o.acronym }}</option>
            }
          </select>
        </ui-field>
        <ui-field label="Date de début" [control]="form.controls.startDate">
          <input class="ui-input" type="date" formControlName="startDate" />
        </ui-field>
        <ui-field label="Date de fin (calculée)">
          <input class="ui-input" [value]="endLabel()" disabled />
        </ui-field>
        @if (formError(); as message) {
          <p class="ui-form__error span-2" role="alert">{{ message }}</p>
        }
      </form>
      <div dialogActions>
        <button ui-button variant="secondary" type="button" (click)="cancel()">Annuler</button>
        <button ui-button variant="primary" type="submit" form="contract-form" [loading]="saving()">
          Enregistrer
        </button>
      </div>
    </ui-dialog-shell>
  `,
})
export class ContractDialog extends EntityDialog<Contract, ContractInput> {
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly state = this.store.contracts;
  protected readonly successMessage = this.editing ? 'Contrat modifié.' : 'Contrat créé.';

  /** Seuls les opérateurs techniques actifs (ou celui du contrat modifié) reçoivent un contrat. */
  protected readonly operators = computed(() =>
    this.store.operators
      .items()
      .filter((o) => o.type === 'TECHNIQUE' && (o.active || o.id === this.item?.operatorId)),
  );

  protected readonly form = this.fb.group(
    {
      reference: [this.item?.reference ?? '', [Validators.required, Validators.maxLength(40)]],
      operatorId: [this.item?.operatorId ?? '', Validators.required],
      startDate: [
        this.item?.startDate ?? '',
        [Validators.required, (c: AbstractControl) => this.validDate(c)],
      ],
    },
    { validators: [(group: AbstractControl) => this.overlap(group)] },
  );

  private readonly start = toSignal(this.form.controls.startDate.valueChanges, {
    initialValue: this.form.controls.startDate.value,
  });
  protected readonly endLabel = computed(() => {
    const start = this.start();
    return isValidIso(start) ? formatDate(endOfPeriod(start, CONTRACT_YEARS)) : '—';
  });

  private validDate(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value ?? '');
    return !value || isValidIso(value) ? null : { date: 'La date saisie est invalide.' };
  }

  private overlap(group: AbstractControl): ValidationErrors | null {
    const { operatorId, startDate } = group.value as { operatorId: string; startDate: string };
    if (!operatorId || !isValidIso(startDate)) {
      return null;
    }
    const conflict = findContractConflict(
      { operatorId, startDate, endDate: endOfPeriod(startDate, CONTRACT_YEARS) },
      this.store.contracts.items(),
      this.item?.id,
    );
    return conflict
      ? {
          overlap: `Cet opérateur a déjà le contrat ${conflict.reference} (du ${formatDate(conflict.startDate)} au ${formatDate(conflict.endDate)}) sur cette période.`,
        }
      : null;
  }

  protected toInput(): ContractInput {
    const v = this.form.getRawValue();
    return {
      reference: v.reference.trim(),
      operatorId: v.operatorId,
      startDate: v.startDate,
      endDate: endOfPeriod(v.startDate, CONTRACT_YEARS),
    };
  }
}
