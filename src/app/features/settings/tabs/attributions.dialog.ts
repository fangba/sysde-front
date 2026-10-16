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

import { LOTS_PER_SECTOR, type Attribution, type AttributionInput } from '../data/settings.models';
import { findLotConflict } from '../data/settings.rules';
import { EntityDialog } from '../shell/entity-dialog';

@Component({
  selector: 'sysde-attribution-dialog',
  imports: [ReactiveFormsModule, ButtonComponent, DialogShellComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog-shell
      [title]="editing ? 'Modifier l’attribution' : 'Nouvelle attribution'"
      subtitle="Un lot d’un secteur est confié à un opérateur dans le cadre de son contrat."
    >
      <form
        id="attribution-form"
        class="ui-form"
        [formGroup]="form"
        (ngSubmit)="submit()"
        novalidate
      >
        <ui-field class="span-2" label="Contrat" [control]="form.controls.contractId">
          <select class="ui-input" formControlName="contractId">
            <option value="">Choisir…</option>
            @for (c of store.contracts.items(); track c.id) {
              <option [value]="c.id">{{ store.contractLabel(c.id) }}</option>
            }
          </select>
        </ui-field>
        <ui-field label="Secteur" [control]="form.controls.sectorId">
          <select class="ui-input" formControlName="sectorId">
            <option value="">Choisir…</option>
            @for (s of store.sectors(); track s.id) {
              <option [value]="s.id">{{ s.code }} · {{ s.name }}</option>
            }
          </select>
        </ui-field>
        <ui-field label="Lot" [control]="form.controls.lot">
          <select class="ui-input" formControlName="lot">
            @for (lot of lots; track lot) {
              <option [value]="lot">Lot {{ lot }}</option>
            }
          </select>
        </ui-field>
        @if (operatorName(); as name) {
          <p class="ui-form__note span-2">Opérateur concerné : {{ name }}</p>
        }
        @if (formError(); as message) {
          <p class="ui-form__error span-2" role="alert">{{ message }}</p>
        }
      </form>
      <div dialogActions>
        <button ui-button variant="secondary" type="button" (click)="cancel()">Annuler</button>
        <button
          ui-button
          variant="primary"
          type="submit"
          form="attribution-form"
          [loading]="saving()"
        >
          Enregistrer
        </button>
      </div>
    </ui-dialog-shell>
  `,
})
export class AttributionDialog extends EntityDialog<Attribution, AttributionInput> {
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly state = this.store.attributions;
  protected readonly successMessage = this.editing ? 'Attribution modifiée.' : 'Attribution créée.';
  protected readonly lots = Array.from({ length: LOTS_PER_SECTOR }, (_, i) => i + 1);

  protected readonly form = this.fb.group(
    {
      contractId: [this.item?.contractId ?? '', Validators.required],
      sectorId: [this.item?.sectorId ?? '', Validators.required],
      lot: [this.item?.lot ?? 1, Validators.required],
    },
    { validators: [(group: AbstractControl) => this.conflict(group)] },
  );

  private readonly contractId = toSignal(this.form.controls.contractId.valueChanges, {
    initialValue: this.form.controls.contractId.value,
  });
  protected readonly operatorName = computed(() => {
    const contract = this.store.contractOf(this.contractId());
    return contract ? (this.store.operatorOf(contract.operatorId)?.name ?? '') : '';
  });

  private conflict(group: AbstractControl): ValidationErrors | null {
    const v = group.value as { contractId: string; sectorId: string; lot: number | string };
    if (!v.contractId || !v.sectorId) {
      return null;
    }
    const found = findLotConflict(
      { contractId: v.contractId, sectorId: v.sectorId, lot: Number(v.lot) },
      this.store.attributions.items(),
      this.store.contracts.items(),
      this.item?.id,
    );
    return found
      ? {
          lot: `Le lot ${found.lot} de ce secteur est déjà attribué à ${this.store.contractLabel(found.contractId)} sur la même période.`,
        }
      : null;
  }

  protected toInput(): AttributionInput {
    const v = this.form.getRawValue();
    return { contractId: v.contractId, sectorId: v.sectorId, lot: Number(v.lot) };
  }
}
