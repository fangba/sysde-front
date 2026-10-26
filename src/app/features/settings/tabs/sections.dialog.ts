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

import type { Section, SectionInput } from '../data/settings.models';
import { findSectionNameConflict } from '../data/settings.rules';
import { EntityDialog } from '../shell/entity-dialog';
import { ownLots } from './sections.section';

const MAX_NAME_LENGTH = 50;

@Component({
  selector: 'sysde-section-dialog',
  imports: [ReactiveFormsModule, ButtonComponent, DialogShellComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog-shell
      [title]="editing ? 'Modifier la section' : 'Nouvelle section'"
      subtitle="Subdivision d’un lot, nommée par vos soins."
    >
      <form id="section-form" class="ui-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <ui-field
          class="span-2"
          label="Lot"
          [control]="form.controls.lotId"
          [hint]="editing ? 'Le lot d’une section ne se modifie pas.' : undefined"
        >
          <select class="ui-input" formControlName="lotId">
            <option value="">Choisir…</option>
            @for (lot of lots(); track lot.id) {
              <option [value]="lot.id">{{ store.lotLabel(lot.id) }}</option>
            }
          </select>
        </ui-field>
        <ui-field
          class="span-2"
          label="Nom de la section"
          [control]="form.controls.name"
          hint="Libre : « A », « Section Nord », « Bloc 3 »…"
        >
          <input class="ui-input" formControlName="name" autocomplete="off" [maxlength]="maxName" />
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
        <button ui-button variant="primary" type="submit" form="section-form" [loading]="saving()">
          Enregistrer
        </button>
      </div>
    </ui-dialog-shell>
  `,
})
export class SectionDialog extends EntityDialog<Section, SectionInput> {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly currentUser = inject(CurrentUser);

  protected readonly maxName = MAX_NAME_LENGTH;
  protected readonly state = this.store.sections;
  protected readonly successMessage = this.editing ? 'Section modifiée.' : 'Section créée.';

  /** Lots proposés : ceux du secteur du chef secteur, ou tous pour un administrateur. */
  protected readonly lots = computed(() => ownLots(this.store, this.currentUser));

  protected readonly form = this.fb.group(
    {
      lotId: [this.item?.lotId ?? '', Validators.required],
      name: [this.item?.name ?? '', [Validators.required, Validators.maxLength(MAX_NAME_LENGTH)]],
      description: [this.item?.description ?? '', Validators.maxLength(150)],
    },
    { validators: [(group: AbstractControl) => this.unique(group)] },
  );

  constructor() {
    super();
    if (this.editing) {
      this.form.controls.lotId.disable();
    }
  }

  private unique(group: AbstractControl): ValidationErrors | null {
    const v = (group as typeof this.form).getRawValue();
    if (!v.lotId || !v.name.trim()) {
      return null;
    }
    return findSectionNameConflict(
      { lotId: v.lotId, name: v.name },
      this.store.sections.items(),
      this.item?.id,
    )
      ? { duplicate: `Une section « ${v.name.trim()} » existe déjà dans ce lot.` }
      : null;
  }

  protected toInput(): SectionInput {
    const v = this.form.getRawValue();
    return {
      lotId: v.lotId,
      name: v.name.trim().replace(/\s+/g, ' '),
      description: v.description.trim(),
    };
  }
}
