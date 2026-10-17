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
import { isValidIso } from '@shared/util/dates';

import type { Exercise, ExerciseInput } from '../data/settings.models';
import { contractYears, findExerciseDuplicate, lotsLabel } from '../data/settings.rules';
import { EntityDialog } from '../shell/entity-dialog';

@Component({
  selector: 'sysde-exercise-dialog',
  imports: [ReactiveFormsModule, ButtonComponent, DialogShellComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog-shell
      [title]="editing ? 'Modifier l’exercice' : 'Nouvel exercice'"
      subtitle="Exercice annuel d’un opérateur, pour l’une de ses attributions (secteur et lot)."
    >
      <form id="exercise-form" class="ui-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <ui-field class="span-2" label="Opérateur" [control]="form.controls.operatorId">
          <select class="ui-input" formControlName="operatorId">
            <option value="">Choisir…</option>
            @for (o of operators(); track o.id) {
              <option [value]="o.id">{{ store.operatorLabel(o.id) }}</option>
            }
          </select>
        </ui-field>
        <ui-field
          class="span-2"
          label="Attribution"
          [control]="form.controls.attributionId"
          [hint]="
            attributions().length === 0 && operatorId()
              ? 'Aucune attribution pour cet opérateur.'
              : undefined
          "
        >
          <select class="ui-input" formControlName="attributionId">
            <option value="">
              {{ operatorId() ? 'Choisir…' : 'Choisir d’abord un opérateur' }}
            </option>
            @for (a of attributions(); track a.id) {
              <option [value]="a.id">
                {{ store.sectorLabel(a.sectorId) }} · {{ lotsLabel(a.lots) }} —
                {{ store.contractOf(a.contractId)?.reference }}
              </option>
            }
          </select>
        </ui-field>
        <ui-field label="Année" [control]="form.controls.year">
          <select class="ui-input" formControlName="year">
            <option value="">Choisir…</option>
            @for (y of years(); track y) {
              <option [value]="y">{{ y }}</option>
            }
          </select>
        </ui-field>
        <ui-field label="Date de clôture" [control]="form.controls.closingDate">
          <input class="ui-input" type="date" formControlName="closingDate" />
        </ui-field>
        @if (formError(); as message) {
          <p class="ui-form__error span-2" role="alert">{{ message }}</p>
        }
      </form>
      <div dialogActions>
        <button ui-button variant="secondary" type="button" (click)="cancel()">Annuler</button>
        <button ui-button variant="primary" type="submit" form="exercise-form" [loading]="saving()">
          Enregistrer
        </button>
      </div>
    </ui-dialog-shell>
  `,
})
export class ExerciseDialog extends EntityDialog<Exercise, ExerciseInput> {
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly state = this.store.exercises;
  protected readonly successMessage = this.editing ? 'Exercice modifié.' : 'Exercice créé.';

  protected readonly form = this.fb.group(
    {
      operatorId: [this.initialOperatorId(), Validators.required],
      attributionId: [this.item?.attributionId ?? '', Validators.required],
      year: [this.item ? String(this.item.year) : '', Validators.required],
      closingDate: [
        this.item?.closingDate ?? '',
        [Validators.required, (c: AbstractControl) => this.validDate(c)],
      ],
    },
    { validators: [(group: AbstractControl) => this.rules(group)] },
  );

  protected readonly lotsLabel = lotsLabel;
  protected readonly operatorId = toSignal(this.form.controls.operatorId.valueChanges, {
    initialValue: this.form.controls.operatorId.value,
  });
  private readonly attributionId = toSignal(this.form.controls.attributionId.valueChanges, {
    initialValue: this.form.controls.attributionId.value,
  });

  /** Seuls les opérateurs liés par un contrat peuvent avoir des exercices. */
  protected readonly operators = computed(() => {
    const ids = new Set(this.store.contracts.items().map((c) => c.operatorId));
    return this.store.operators.items().filter((o) => ids.has(o.id));
  });

  /** Attributions de tous les contrats de l'opérateur choisi. */
  protected readonly attributions = computed(() => {
    const contractIds = new Set(
      this.store.contracts
        .items()
        .filter((c) => c.operatorId === this.operatorId())
        .map((c) => c.id),
    );
    return this.store.attributions
      .items()
      .filter((a) => contractIds.has(a.contractId))
      .sort((x, y) => x.sectorId.localeCompare(y.sectorId));
  });

  /** Le contrat se déduit de l'attribution choisie ; ses années bornent l'exercice. */
  private readonly contract = computed(() => {
    const attribution = this.store.attributions.items().find((a) => a.id === this.attributionId());
    return attribution ? this.store.contractOf(attribution.contractId) : undefined;
  });

  protected readonly years = computed(() => {
    const contract = this.contract();
    return contract ? contractYears(contract) : [];
  });

  private initialOperatorId(): string {
    return this.item ? (this.store.contractOf(this.item.contractId)?.operatorId ?? '') : '';
  }

  constructor() {
    super();
    // Changer d'opérateur invalide l'attribution choisie ; changer d'attribution, l'année.
    this.form.controls.operatorId.valueChanges.subscribe(() => {
      const { attributionId } = this.form.getRawValue();
      if (attributionId && !this.attributions().some((a) => a.id === attributionId)) {
        this.form.controls.attributionId.setValue('');
      }
    });
    this.form.controls.attributionId.valueChanges.subscribe(() => {
      const { year } = this.form.getRawValue();
      if (year && !this.years().includes(Number(year))) {
        this.form.controls.year.setValue('');
      }
    });
    // Date de clôture proposée : fin de l'année choisie, tant que l'utilisateur ne l'a pas saisie.
    this.form.controls.year.valueChanges.subscribe((year) => {
      if (year && !this.form.controls.closingDate.dirty) {
        this.form.controls.closingDate.setValue(`${year}-12-31`);
      }
    });
  }

  private validDate(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value ?? '');
    return !value || isValidIso(value) ? null : { date: 'La date saisie est invalide.' };
  }

  private rules(group: AbstractControl): ValidationErrors | null {
    const v = group.value as {
      attributionId: string;
      year: string;
      closingDate: string;
    };
    if (!v.attributionId || !v.year) {
      return null;
    }
    const year = Number(v.year);
    if (isValidIso(v.closingDate) && v.closingDate < `${year}-01-01`) {
      return { closing: `La clôture ne peut pas précéder le début de l’exercice ${year}.` };
    }
    const duplicate = findExerciseDuplicate(
      { attributionId: v.attributionId, year },
      this.store.exercises.items(),
      this.item?.id,
    );
    return duplicate
      ? { duplicate: `Un exercice ${year} existe déjà pour cette attribution.` }
      : null;
  }

  protected toInput(): ExerciseInput {
    const v = this.form.getRawValue();
    // Contrat et secteur sont déduits de l'attribution choisie.
    const attribution = this.store.attributions.items().find((a) => a.id === v.attributionId);
    return {
      attributionId: v.attributionId,
      contractId: attribution?.contractId ?? '',
      sectorId: attribution?.sectorId ?? '',
      year: Number(v.year),
      closingDate: v.closingDate,
    };
  }
}
