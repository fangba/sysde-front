import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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

import type { Group, GroupInput } from '../data/settings.models';
import { findGroupNameConflict, monitorsOf } from '../data/settings.rules';
import { EntityDialog } from '../shell/entity-dialog';
import { ownLots } from './sections.section';

const MAX_NAME_LENGTH = 50;

@Component({
  selector: 'sysde-group-dialog',
  imports: [ReactiveFormsModule, ButtonComponent, DialogShellComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog-shell
      [title]="editing ? 'Modifier le groupe' : 'Nouveau groupe'"
      subtitle="Groupe de vulgarisation d’une section, géré par un moniteur."
    >
      <form id="group-form" class="ui-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <ui-field class="span-2" label="Lot" [control]="form.controls.lotId">
          <select class="ui-input" formControlName="lotId">
            <option value="">Choisir…</option>
            @for (lot of lots(); track lot.id) {
              <option [value]="lot.id">{{ store.lotLabel(lot.id) }}</option>
            }
          </select>
        </ui-field>
        <ui-field
          class="span-2"
          label="Section"
          [control]="form.controls.sectionId"
          [hint]="
            lotId() && sections().length === 0
              ? 'Ce lot n’a pas encore de section : créez-en une d’abord.'
              : undefined
          "
        >
          <select class="ui-input" formControlName="sectionId">
            <option value="">Choisir…</option>
            @for (s of sections(); track s.id) {
              <option [value]="s.id">{{ s.name }}</option>
            }
          </select>
        </ui-field>
        <ui-field class="span-2" label="Nom du groupe" [control]="form.controls.name">
          <input class="ui-input" formControlName="name" autocomplete="off" [maxlength]="maxName" />
        </ui-field>
        <ui-field label="Village (facultatif)" [control]="form.controls.village">
          <input class="ui-input" formControlName="village" autocomplete="off" />
        </ui-field>
        <ui-field label="Délégué du groupe (facultatif)" [control]="form.controls.delegate">
          <input class="ui-input" formControlName="delegate" autocomplete="off" />
        </ui-field>
        <ui-field
          class="span-2"
          label="Moniteur"
          [control]="form.controls.monitorId"
          [hint]="monitors().length === 0 ? 'Aucun moniteur actif dans votre secteur.' : undefined"
        >
          <select class="ui-input" formControlName="monitorId">
            <option value="">Choisir…</option>
            @for (m of monitors(); track m.id) {
              <option [value]="m.id">{{ m.lastName }} {{ m.firstName }}</option>
            }
          </select>
        </ui-field>
        @if (formError(); as message) {
          <p class="ui-form__error span-2" role="alert">{{ message }}</p>
        }
      </form>
      <div dialogActions>
        <button ui-button variant="secondary" type="button" (click)="cancel()">Annuler</button>
        <button ui-button variant="primary" type="submit" form="group-form" [loading]="saving()">
          Enregistrer
        </button>
      </div>
    </ui-dialog-shell>
  `,
})
export class GroupDialog extends EntityDialog<Group, GroupInput> {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly currentUser = inject(CurrentUser);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly maxName = MAX_NAME_LENGTH;
  protected readonly state = this.store.groups;
  protected readonly successMessage = this.editing ? 'Groupe modifié.' : 'Groupe créé.';

  protected readonly lots = computed(() => ownLots(this.store, this.currentUser));

  protected readonly form = this.fb.group(
    {
      lotId: [this.item?.lotId ?? '', Validators.required],
      sectionId: [this.item?.sectionId ?? '', Validators.required],
      name: [this.item?.name ?? '', [Validators.required, Validators.maxLength(MAX_NAME_LENGTH)]],
      village: [this.item?.village ?? '', Validators.maxLength(80)],
      delegate: [this.item?.delegate ?? '', Validators.maxLength(80)],
      monitorId: [this.item?.monitorId ?? '', Validators.required],
    },
    { validators: [(group: AbstractControl) => this.unique(group)] },
  );

  protected readonly lotId = signal(this.form.controls.lotId.value);

  /** Sections du lot choisi. */
  protected readonly sections = computed(() =>
    this.store.sections
      .items()
      .filter((s) => s.lotId === this.lotId())
      .sort((a, b) => a.name.localeCompare(b.name, 'fr')),
  );

  /** Moniteurs de l'opérateur du chef secteur dans son secteur ; garde celui déjà choisi. */
  protected readonly monitors = computed(() => {
    const user = this.currentUser.user();
    const sector = this.store.sectors().find((s) => s.code === user.sector?.code);
    const operator = this.store.operatorByAcronym(user.operator.acronym);
    const list =
      sector && operator ? monitorsOf(this.store.users.items(), sector.id, operator.id) : [];
    const current =
      this.item && this.store.users.items().find((u) => u.id === this.item?.monitorId);
    return current && !list.some((m) => m.id === current.id) ? [...list, current] : list;
  });

  constructor() {
    super();
    if (this.editing) {
      this.form.controls.lotId.disable();
      this.form.controls.sectionId.disable();
    }
    this.form.controls.lotId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.lotId.set(value);
        this.form.controls.sectionId.setValue('');
      });
  }

  private unique(group: AbstractControl): ValidationErrors | null {
    const v = (group as typeof this.form).getRawValue();
    if (!v.sectionId || !v.name.trim()) {
      return null;
    }
    return findGroupNameConflict(
      { sectionId: v.sectionId, name: v.name },
      this.store.groups.items(),
      this.item?.id,
    )
      ? { duplicate: `Un groupe « ${v.name.trim()} » existe déjà dans cette section.` }
      : null;
  }

  protected toInput(): GroupInput {
    const v = this.form.getRawValue();
    return {
      lotId: v.lotId,
      sectionId: v.sectionId,
      name: v.name.trim().replace(/\s+/g, ' '),
      village: v.village.trim(),
      delegate: v.delegate.trim(),
      monitorId: v.monitorId,
    };
  }
}
