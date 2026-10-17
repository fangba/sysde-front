import { toSignal } from '@angular/core/rxjs-interop';
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

import type { Lot, LotInput } from '../data/settings.models';
import { findLotNumberConflict } from '../data/settings.rules';
import { EntityDialog } from '../shell/entity-dialog';

@Component({
  selector: 'sysde-lot-dialog',
  imports: [ReactiveFormsModule, ButtonComponent, DialogShellComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog-shell
      [title]="editing ? 'Modifier le lot' : 'Nouveau lot'"
      subtitle="Subdivision numérotée d’un secteur."
    >
      <form id="lot-form" class="ui-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <ui-field label="Secteur" [control]="form.controls.sectorId">
          <select class="ui-input" formControlName="sectorId">
            <option value="">Choisir…</option>
            @for (s of store.sectors(); track s.id) {
              <option [value]="s.id">{{ s.code }} · {{ s.name }}</option>
            }
          </select>
        </ui-field>
        <ui-field
          label="Numéro"
          [control]="form.controls.number"
          [hint]="
            editing
              ? 'Le secteur et le numéro ne se modifient pas : des attributions s’y réfèrent.'
              : undefined
          "
        >
          <input class="ui-input" type="number" min="1" formControlName="number" />
        </ui-field>
        <ui-field class="span-2" label="Description" [control]="form.controls.description">
          <input class="ui-input" formControlName="description" autocomplete="off" />
        </ui-field>
        @if (formError(); as message) {
          <p class="ui-form__error span-2" role="alert">{{ message }}</p>
        }
      </form>
      <div dialogActions>
        <button ui-button variant="secondary" type="button" (click)="cancel()">Annuler</button>
        <button ui-button variant="primary" type="submit" form="lot-form" [loading]="saving()">
          Enregistrer
        </button>
      </div>
    </ui-dialog-shell>
  `,
})
export class LotDialog extends EntityDialog<Lot, LotInput> {
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly state = this.store.lots;
  protected readonly successMessage = this.editing ? 'Lot modifié.' : 'Lot créé.';

  protected readonly form = this.fb.group(
    {
      sectorId: [this.item?.sectorId ?? '', Validators.required],
      number: [this.item?.number ?? this.nextNumber(), [Validators.required, Validators.min(1)]],
      description: [this.item?.description ?? '', Validators.maxLength(150)],
    },
    { validators: [(group: AbstractControl) => this.unique(group)] },
  );

  private readonly sectorId = toSignal(this.form.controls.sectorId.valueChanges, {
    initialValue: this.form.controls.sectorId.value,
  });

  constructor() {
    super();
    if (this.editing) {
      // Des attributions référencent ce secteur et ce numéro.
      this.form.controls.sectorId.disable();
      this.form.controls.number.disable();
    } else {
      // Propose le prochain numéro libre du secteur choisi.
      this.form.controls.sectorId.valueChanges.subscribe((id) =>
        this.form.controls.number.setValue(this.nextNumber(id)),
      );
    }
  }

  private nextNumber(sectorId?: string): number {
    const numbers = sectorId ? this.store.lotNumbersOf(sectorId) : [];
    return (numbers.at(-1) ?? 0) + 1;
  }

  private unique(group: AbstractControl): ValidationErrors | null {
    const v = (group as typeof this.form).getRawValue();
    if (!v.sectorId || !v.number) {
      return null;
    }
    return findLotNumberConflict(
      { sectorId: v.sectorId, number: Number(v.number) },
      this.store.lots.items(),
      this.item?.id,
    )
      ? { duplicate: `Le lot ${v.number} existe déjà dans ce secteur.` }
      : null;
  }

  protected toInput(): LotInput {
    const v = this.form.getRawValue();
    return {
      sectorId: v.sectorId,
      number: Number(v.number),
      description: v.description.trim(),
    };
  }
}
