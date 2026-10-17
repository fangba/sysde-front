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

import type { Sector, SectorInput } from '../data/settings.models';
import { findSectorCodeConflict } from '../data/settings.rules';
import { EntityDialog } from '../shell/entity-dialog';

@Component({
  selector: 'sysde-sector-dialog',
  imports: [ReactiveFormsModule, ButtonComponent, DialogShellComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog-shell
      [title]="editing ? 'Modifier le secteur' : 'Nouveau secteur'"
      subtitle="Zone d’encadrement, divisée en lots."
    >
      <form id="sector-form" class="ui-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <ui-field label="Code" [control]="form.controls.code" hint="Ex. S07">
          <input class="ui-input" formControlName="code" autocomplete="off" />
        </ui-field>
        <ui-field label="Nom" [control]="form.controls.name">
          <input class="ui-input" formControlName="name" autocomplete="off" />
        </ui-field>
      </form>
      <div dialogActions>
        <button ui-button variant="secondary" type="button" (click)="cancel()">Annuler</button>
        <button ui-button variant="primary" type="submit" form="sector-form" [loading]="saving()">
          Enregistrer
        </button>
      </div>
    </ui-dialog-shell>
  `,
})
export class SectorDialog extends EntityDialog<Sector, SectorInput> {
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly state = this.store.sectorList;
  protected readonly successMessage = this.editing ? 'Secteur modifié.' : 'Secteur créé.';

  protected readonly form = this.fb.group({
    code: [
      this.item?.code ?? '',
      [Validators.required, Validators.maxLength(10), (c: AbstractControl) => this.codeTaken(c)],
    ],
    name: [this.item?.name ?? '', [Validators.required, Validators.maxLength(100)]],
  });

  private codeTaken(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value ?? '').trim();
    return value && findSectorCodeConflict(value, this.store.sectors(), this.item?.id)
      ? { taken: 'Ce code est déjà utilisé par un autre secteur.' }
      : null;
  }

  protected toInput(): SectorInput {
    const v = this.form.getRawValue();
    return { code: v.code.trim().toUpperCase(), name: v.name.trim() };
  }
}
