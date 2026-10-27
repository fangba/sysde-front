import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { CurrentUser } from '@core/auth/current-user';
import { isValidIso, todayIso } from '@shared/util/dates';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { DialogShellComponent } from '@shared/ui/dialog-shell/dialog-shell.component';
import { FieldComponent } from '@shared/ui/field/field.component';

import { ACTIVITY_CATEGORIES } from '../../settings/data/settings.constants';
import { SettingsStore } from '../../settings/state/settings.store';
import type { PlanLine } from '../data/planning.models';
import { MAX_PLACE_LENGTH, endFor, spanDays } from '../data/planning.rules';
import { PlanningStore } from '../state/planning.store';

export interface LineDialogData {
  /** Ligne à modifier ; `null` pour une nouvelle ligne. */
  readonly item: PlanLine | null;
  /** Date proposée pour une nouvelle ligne (jour choisi dans le calendrier). */
  readonly date?: string;
  /** Activité imposée pour une nouvelle ligne (ajout depuis le détail d'une activité). */
  readonly activityId?: string;
}

/** Ajout, modification et suppression d'une ligne du brouillon. */

@Component({
  selector: 'sysde-plan-line-dialog',
  imports: [ReactiveFormsModule, ButtonComponent, DialogShellComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog-shell
      [title]="editing ? 'Modifier l’activité' : locked ? 'Nouvelle date' : 'Nouvelle activité'"
      [subtitle]="'Planning ' + store.year()"
    >
      <form id="line-form" class="ui-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <ui-field label="Date de début" [control]="form.controls.date">
          <input
            class="ui-input"
            type="date"
            formControlName="date"
            [min]="store.year() + '-01-01'"
            [max]="store.year() + '-12-31'"
          />
        </ui-field>
        <ui-field label="Date de fin" [control]="form.controls.endDate">
          <input
            class="ui-input"
            type="date"
            formControlName="endDate"
            [min]="form.controls.date.value"
            [max]="store.year() + '-12-31'"
          />
        </ui-field>
        <ui-field
          class="span-2"
          label="Activité"
          [control]="form.controls.activityId"
          [hint]="span()"
        >
          <select class="ui-input" formControlName="activityId">
            <option value="">Choisir…</option>
            @for (group of groups(); track group.label) {
              <optgroup [label]="group.label">
                @for (a of group.items; track a.id) {
                  <option [value]="a.id">{{ a.label }}</option>
                }
              </optgroup>
            }
          </select>
        </ui-field>
        <ui-field
          class="span-2"
          label="Lot / section"
          [control]="form.controls.place"
          hint="Choisissez un lot de votre secteur ou saisissez une section."
        >
          <input
            class="ui-input"
            formControlName="place"
            list="plan-places"
            autocomplete="off"
            [maxlength]="maxPlace"
          />
          <datalist id="plan-places">
            @for (place of places(); track place) {
              <option [value]="place"></option>
            }
          </datalist>
        </ui-field>
        @if (isVisit()) {
          <ui-field
            class="span-2"
            label="Plantation"
            [control]="form.controls.plantation"
            hint="Nom de la plantation visitée."
          >
            <input
              class="ui-input"
              formControlName="plantation"
              autocomplete="off"
              [maxlength]="maxPlace"
            />
          </ui-field>
        }
        @if (error()) {
          <p class="ui-form__error span-2" role="alert">{{ error() }}</p>
        }
      </form>
      <div dialogActions>
        @if (editing) {
          <button ui-button variant="ghost" type="button" class="remove" (click)="remove()">
            Supprimer
          </button>
        }
        <button ui-button variant="secondary" type="button" (click)="ref.close()">Annuler</button>
        <button ui-button variant="primary" type="submit" form="line-form">Enregistrer</button>
      </div>
    </ui-dialog-shell>
  `,
  styles: `
    .remove {
      margin-right: auto;
      color: var(--red-700);
    }
  `,
})
export class PlanLineDialog {
  protected readonly store = inject(PlanningStore);
  private readonly settings = inject(SettingsStore);
  private readonly currentUser = inject(CurrentUser);
  protected readonly ref = inject<DialogRef<void>>(DialogRef);
  private readonly data = inject<LineDialogData>(DIALOG_DATA);
  private readonly item = this.data.item;
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly editing = this.item !== null;
  /** Activité figée : on ajoute une date depuis le détail d'une activité. */
  protected readonly locked = this.item === null && !!this.data.activityId;
  /** Activités du poste, regroupées par catégorie (celles sans activité n'apparaissent pas). */
  protected readonly groups = computed(() =>
    ACTIVITY_CATEGORIES.map((category) => ({
      label: category.label,
      items: this.store
        .activities()
        .filter(
          (a) =>
            a.category === category.code &&
            (!this.store.isLocked(a.id) || a.id === this.item?.activityId),
        ),
    })).filter((group) => group.items.length > 0),
  );
  protected readonly maxPlace = MAX_PLACE_LENGTH;
  protected readonly error = signal('');

  /** Lots du secteur de l'utilisateur, proposés comme suggestions. */
  protected readonly places = computed(() => {
    const code = this.currentUser.user().sector?.code;
    const sector = this.settings.sectors().find((s) => s.code === code);
    return this.settings.lots
      .items()
      .filter((lot) => lot.sectorId === sector?.id)
      .map((lot) => `Lot ${lot.number}`);
  });

  protected readonly form = this.fb.group({
    date: [this.item?.date ?? this.defaultDate(), Validators.required],
    endDate: [this.item?.endDate ?? this.defaultEnd(), Validators.required],
    activityId: [
      { value: this.item?.activityId ?? this.data.activityId ?? '', disabled: this.locked },
      Validators.required,
    ],
    plantation: [this.item?.plantation ?? '', Validators.maxLength(MAX_PLACE_LENGTH)],
    place: [this.item?.place ?? '', [Validators.required, Validators.maxLength(MAX_PLACE_LENGTH)]],
  });

  private readonly activityId = signal(this.form.controls.activityId.value);
  /** L'activité choisie est une visite : la plantation devient obligatoire. */
  protected readonly isVisit = computed(
    () => this.settings.activityOf(this.activityId())?.category === 'VISITE',
  );

  /** Durée de la période choisie, affichée sous l'activité. */
  protected readonly span = signal('');

  constructor() {
    const refresh = () => {
      const { date, endDate } = this.form.getRawValue();
      this.span.set(
        isValidIso(date) && isValidIso(endDate) && endDate >= date
          ? `Période de ${spanDays({ date, endDate })} jour(s).`
          : '',
      );
    };
    /** Propose la fin d'après la durée de l'activité, tant que l'utilisateur n'a pas fixé la fin. */
    const propose = () => {
      const { date, activityId } = this.form.getRawValue();
      if (isValidIso(date) && activityId) {
        this.form.controls.endDate.setValue(endFor(date, this.store.durationOf(activityId)));
      }
    };
    this.form.controls.activityId.valueChanges.subscribe((id) => {
      this.activityId.set(id);
      this.syncPlantation();
      if (!this.endTouched) {
        propose();
      }
    });
    this.form.controls.date.valueChanges.subscribe(() => {
      if (!this.endTouched) {
        propose();
      } else if (this.form.controls.endDate.value < this.form.controls.date.value) {
        this.form.controls.endDate.setValue(this.form.controls.date.value);
      }
    });
    this.form.controls.endDate.valueChanges.subscribe(() => {
      if (this.form.controls.endDate.dirty) {
        this.endTouched = true;
      }
    });
    this.form.valueChanges.subscribe(refresh);
    refresh();
    this.syncPlantation();
  }

  private syncPlantation(): void {
    const control = this.form.controls.plantation;
    control.setValidators(
      this.isVisit() ? [Validators.required, Validators.maxLength(MAX_PLACE_LENGTH)] : [],
    );
    control.updateValueAndValidity();
  }

  /** Vrai dès que l'utilisateur a saisi lui-même la date de fin (ou en modification). */
  private endTouched = this.item !== null;

  private defaultEnd(): string {
    const { activityId } = this.data;
    return activityId
      ? endFor(this.defaultDate(), this.store.durationOf(activityId))
      : this.defaultDate();
  }

  private defaultDate(): string {
    if (this.data.date?.startsWith(`${this.store.year()}-`)) {
      return this.data.date;
    }
    const today = todayIso(new Date());
    return today.startsWith(`${this.store.year()}-`) ? today : `${this.store.year()}-01-01`;
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    const message = this.store.upsertLine(this.item?.id ?? null, {
      date: v.date,
      endDate: v.endDate,
      activityId: v.activityId,
      place: v.place,
      plantation: this.isVisit() ? v.plantation : undefined,
    });
    if (message) {
      this.error.set(message);
      return;
    }
    this.ref.close();
  }

  protected remove(): void {
    const message = this.item ? this.store.removeLine(this.item.id) : null;
    if (message) {
      this.error.set(message);
      return;
    }
    this.ref.close();
  }
}
