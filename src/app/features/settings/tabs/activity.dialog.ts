import { DIALOG_DATA } from '@angular/cdk/dialog';
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

import { ACTIVITY_CATEGORY_LABEL, POSTE_LABEL } from '../data/settings.constants';
import type {
  Activity,
  ActivityCategory,
  ActivityInput,
  PlanningPoste,
} from '../data/settings.models';
import { findActivityConflict } from '../data/settings.rules';
import { EntityDialog, type EntityDialogData } from '../shell/entity-dialog';

export interface ActivityDialogData extends EntityDialogData<Activity> {
  /** Poste et catégorie imposés pour une nouvelle activité. */
  readonly poste: PlanningPoste;
  readonly category: ActivityCategory;
}

/** Création et modification d'une activité d'un poste, dans une catégorie. */
@Component({
  selector: 'sysde-activity-dialog',
  imports: [ReactiveFormsModule, ButtonComponent, DialogShellComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog-shell
      [title]="editing ? 'Modifier l’activité' : 'Nouvelle activité'"
      [subtitle]="subtitle"
    >
      <form id="activity-form" class="ui-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <ui-field class="span-2" label="Libellé" [control]="form.controls.label">
          <input class="ui-input" formControlName="label" autocomplete="off" />
        </ui-field>
        <ui-field
          label="Objectif annuel"
          [control]="form.controls.annualTarget"
          hint="Séances par an. Laissez vide s'il n'y en a pas."
        >
          <input class="ui-input" type="number" formControlName="annualTarget" min="1" step="1" />
        </ui-field>
        <ui-field
          label="Durée d’une séance (jours)"
          [control]="form.controls.durationDays"
          hint="Proposée comme période dans le planning."
        >
          <input class="ui-input" type="number" formControlName="durationDays" min="1" step="1" />
        </ui-field>
        <label class="ui-check span-2">
          <input type="checkbox" formControlName="active" />
          Activité proposée dans les plannings
        </label>
        <p class="ui-form__note span-2">
          Une activité déjà inscrite à un planning ne peut pas être supprimée : désactivez-la pour
          ne plus la proposer.
        </p>
      </form>
      <div dialogActions>
        <button ui-button variant="secondary" type="button" (click)="cancel()">Annuler</button>
        <button ui-button variant="primary" type="submit" form="activity-form" [loading]="saving()">
          Enregistrer
        </button>
      </div>
    </ui-dialog-shell>
  `,
})
export class ActivityDialog extends EntityDialog<Activity, ActivityInput> {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly data = inject<ActivityDialogData>(DIALOG_DATA);

  protected readonly state = this.store.activities;
  protected readonly successMessage = this.editing ? 'Activité modifiée.' : 'Activité créée.';
  private readonly poste = this.item?.poste ?? this.data.poste;
  private readonly category = this.item?.category ?? this.data.category;
  protected readonly subtitle = `${POSTE_LABEL[this.poste]} · ${ACTIVITY_CATEGORY_LABEL[this.category]}`;

  protected readonly form = this.fb.group({
    label: [
      this.item?.label ?? '',
      [Validators.required, Validators.maxLength(80), (c: AbstractControl) => this.labelTaken(c)],
    ],
    active: [this.item?.active ?? true],
    annualTarget: [
      this.item?.annualTarget ?? (null as number | null),
      [Validators.min(1), Validators.max(366), Validators.pattern(/^\d+$/)],
    ],
    durationDays: [
      this.item?.durationDays ?? 1,
      [Validators.required, Validators.min(1), Validators.max(366), Validators.pattern(/^\d+$/)],
    ],
  });

  private labelTaken(control: AbstractControl): ValidationErrors | null {
    const label = String(control.value ?? '').trim();
    return label &&
      findActivityConflict(
        { poste: this.poste, label },
        this.store.activities.items(),
        this.item?.id,
      )
      ? { taken: 'Ce poste a déjà une activité portant ce nom.' }
      : null;
  }

  protected toInput(): ActivityInput {
    const v = this.form.getRawValue();
    return {
      poste: this.poste,
      category: this.category,
      label: v.label.trim(),
      active: v.active,
      annualTarget:
        v.annualTarget === null || String(v.annualTarget) === '' ? null : Number(v.annualTarget),
      durationDays: Number(v.durationDays),
    };
  }
}
