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
import { contractYears, findExerciseDuplicate, sectorIdsOfContract } from '../data/settings.rules';
import { EntityDialog } from '../shell/entity-dialog';

@Component({
  selector: 'sysde-exercise-dialog',
  imports: [ReactiveFormsModule, ButtonComponent, DialogShellComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog-shell
      [title]="editing ? 'Modifier l’exercice' : 'Nouvel exercice'"
      subtitle="Exercice annuel d’un contrat, pour un secteur qui lui est attribué."
    >
      <form id="exercise-form" class="ui-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <ui-field class="span-2" label="Contrat" [control]="form.controls.contractId">
          <select class="ui-input" formControlName="contractId">
            <option value="">Choisir…</option>
            @for (c of store.contracts.items(); track c.id) {
              <option [value]="c.id">{{ store.contractLabel(c.id) }}</option>
            }
          </select>
        </ui-field>
        <ui-field
          label="Secteur"
          [control]="form.controls.sectorId"
          [hint]="
            sectors().length === 0 && contractId()
              ? 'Aucun secteur attribué à ce contrat.'
              : undefined
          "
        >
          <select class="ui-input" formControlName="sectorId">
            <option value="">Choisir…</option>
            @for (s of sectors(); track s.id) {
              <option [value]="s.id">{{ s.code }} · {{ s.name }}</option>
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
      contractId: [this.item?.contractId ?? '', Validators.required],
      sectorId: [this.item?.sectorId ?? '', Validators.required],
      year: [this.item ? String(this.item.year) : '', Validators.required],
      closingDate: [
        this.item?.closingDate ?? '',
        [Validators.required, (c: AbstractControl) => this.validDate(c)],
      ],
    },
    { validators: [(group: AbstractControl) => this.rules(group)] },
  );

  protected readonly contractId = toSignal(this.form.controls.contractId.valueChanges, {
    initialValue: this.form.controls.contractId.value,
  });

  /** Seuls les secteurs attribués au contrat peuvent faire l'objet d'un exercice. */
  protected readonly sectors = computed(() => {
    const ids = sectorIdsOfContract(this.contractId(), this.store.attributions.items());
    return this.store.sectors().filter((s) => ids.includes(s.id));
  });

  protected readonly years = computed(() => {
    const contract = this.store.contractOf(this.contractId());
    return contract ? contractYears(contract) : [];
  });

  constructor() {
    super();
    // Un changement de contrat invalide le secteur et l'année déjà choisis.
    this.form.controls.contractId.valueChanges.subscribe(() => {
      const { sectorId, year } = this.form.getRawValue();
      if (sectorId && !this.sectors().some((s) => s.id === sectorId)) {
        this.form.controls.sectorId.setValue('');
      }
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
      contractId: string;
      sectorId: string;
      year: string;
      closingDate: string;
    };
    if (!v.contractId || !v.sectorId || !v.year) {
      return null;
    }
    const year = Number(v.year);
    if (isValidIso(v.closingDate) && v.closingDate < `${year}-01-01`) {
      return { closing: `La clôture ne peut pas précéder le début de l’exercice ${year}.` };
    }
    const duplicate = findExerciseDuplicate(
      { contractId: v.contractId, sectorId: v.sectorId, year },
      this.store.exercises.items(),
      this.item?.id,
    );
    return duplicate
      ? { duplicate: `Un exercice ${year} existe déjà pour ce secteur et ce contrat.` }
      : null;
  }

  protected toInput(): ExerciseInput {
    const v = this.form.getRawValue();
    return {
      contractId: v.contractId,
      sectorId: v.sectorId,
      year: Number(v.year),
      closingDate: v.closingDate,
    };
  }
}
