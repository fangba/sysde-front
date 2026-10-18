import { toSignal } from '@angular/core/rxjs-interop';
import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';

import { CurrentUser } from '@core/auth/current-user';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { DialogShellComponent } from '@shared/ui/dialog-shell/dialog-shell.component';
import { FieldComponent } from '@shared/ui/field/field.component';

import { MapStore } from './state/map.store';

/** Tiroir de filtre : opérateur, puis secteur de cet opérateur, puis lot du secteur. */
@Component({
  selector: 'sysde-map-filter-drawer',
  imports: [ReactiveFormsModule, ButtonComponent, DialogShellComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog-shell
      title="Filtrer les plantations"
      subtitle="Affichez sur la carte les plantations encadrées par un opérateur."
    >
      <form id="map-filter-form" class="ui-form" [formGroup]="form" (ngSubmit)="apply()" novalidate>
        <ui-field class="span-2" label="Opérateur" [control]="form.controls.operatorId">
          <select class="ui-input" formControlName="operatorId">
            @if (operators().length !== 1) {
              <option value="">Choisir…</option>
            }
            @for (o of operators(); track o.id) {
              <option [value]="o.id">{{ o.acronym }} · {{ o.name }}</option>
            }
          </select>
        </ui-field>

        <ui-field
          class="span-2"
          label="Secteur"
          [control]="form.controls.sectorId"
          [hint]="
            operatorId()
              ? sectors().length
                ? 'Secteurs encadrés par cet opérateur.'
                : 'Aucun secteur n’est attribué à cet opérateur.'
              : 'Choisissez d’abord un opérateur.'
          "
        >
          <select class="ui-input" formControlName="sectorId">
            <option value="">Tous les secteurs</option>
            @for (s of sectors(); track s.id) {
              <option [value]="s.id">{{ s.code }} · {{ s.name }}</option>
            }
          </select>
        </ui-field>

        <ui-field
          class="span-2"
          label="Lot"
          [control]="form.controls.lot"
          [hint]="sectorId() ? 'Lots attribués dans ce secteur.' : 'Choisissez d’abord un secteur.'"
        >
          <select class="ui-input" formControlName="lot">
            <option value="">Tous les lots</option>
            @for (l of lots(); track l.lot) {
              <option [value]="l.lot">Lot {{ l.lot }}</option>
            }
          </select>
        </ui-field>

        @if (showSections) {
          <ui-field
            class="span-2"
            label="Section"
            [control]="form.controls.section"
            [hint]="lot() ? 'Sections de ce lot.' : 'Choisissez d’abord un lot.'"
          >
            <select class="ui-input" formControlName="section">
              <option value="">Toutes les sections</option>
              @for (name of sections(); track name) {
                <option [value]="name">Section {{ name }}</option>
              }
            </select>
          </ui-field>
        }
      </form>

      <div dialogActions>
        <button ui-button variant="secondary" type="button" (click)="reset()">Réinitialiser</button>
        <button
          ui-button
          variant="primary"
          type="submit"
          form="map-filter-form"
          [disabled]="!operatorId()"
        >
          Afficher les plantations
        </button>
      </div>
    </ui-dialog-shell>
  `,
})
export class MapFilterDrawer {
  protected readonly store = inject(MapStore);
  private readonly ref = inject(DialogRef);
  private readonly currentUser = inject(CurrentUser);
  private readonly fb = inject(NonNullableFormBuilder);

  /** L'administrateur et le superviseur voient tous les opérateurs ; un chef de département ou de secteur, le sien uniquement. */
  protected readonly operators = computed(() => {
    const catalog = this.store.catalog();
    return this.currentUser.hasGlobalView()
      ? catalog
      : catalog.filter(
          (o) => o.acronym.toLowerCase() === this.currentUser.user().operator.acronym.toLowerCase(),
        );
  });

  protected readonly form = this.fb.group({
    operatorId: this.store.filter()?.operatorId ?? '',
    sectorId: this.store.filter()?.sectorId ?? '',
    lot: this.store.filter()?.lot === undefined ? '' : String(this.store.filter()?.lot),
    section: this.store.filter()?.section ?? '',
  });

  /** Le niveau « section » est proposé au chef de secteur. */
  protected readonly showSections = this.currentUser.isSectorHead();

  protected readonly operatorId = toSignal(this.form.controls.operatorId.valueChanges, {
    initialValue: this.form.controls.operatorId.value,
  });
  protected readonly sectorId = toSignal(this.form.controls.sectorId.valueChanges, {
    initialValue: this.form.controls.sectorId.value,
  });

  protected readonly sectors = computed(
    () => this.operators().find((o) => o.id === this.operatorId())?.sectors ?? [],
  );
  protected readonly lot = toSignal(this.form.controls.lot.valueChanges, {
    initialValue: this.form.controls.lot.value,
  });
  protected readonly lots = computed(
    () => this.sectors().find((s) => s.id === this.sectorId())?.lots ?? [],
  );
  protected readonly sections = computed(
    () => this.lots().find((l) => String(l.lot) === this.lot())?.sections ?? [],
  );

  constructor() {
    // Un seul opérateur possible (chef de département) : il est choisi d'office.
    effect(() => {
      const only = this.operators();
      const control = this.form.controls.operatorId;
      if (only.length === 1) {
        if (!control.value) {
          control.setValue(only[0]?.id ?? '');
        }
        // Un seul choix possible : la liste est verrouillée sur l'opérateur du chef de département.
        control.disable({ emitEvent: false });
      }
    });

    // Changer d'opérateur ou de secteur invalide les choix qui en dépendent.
    this.form.controls.operatorId.valueChanges.subscribe(() => {
      this.form.controls.sectorId.setValue('');
    });
    this.form.controls.sectorId.valueChanges.subscribe(() => {
      this.form.controls.lot.setValue('');
    });
    this.form.controls.lot.valueChanges.subscribe(() => {
      this.form.controls.section.setValue('');
    });
  }

  protected apply(): void {
    const { operatorId, sectorId, lot, section } = this.form.getRawValue();
    // Garde-fou : seul un opérateur proposé par la liste peut être demandé.
    if (!operatorId || !this.operators().some((o) => o.id === operatorId)) {
      return;
    }
    this.store.apply({
      operatorId,
      ...(sectorId ? { sectorId } : {}),
      ...(lot ? { lot: Number(lot) } : {}),
      ...(section ? { section } : {}),
    });
    this.ref.close();
  }

  protected reset(): void {
    this.store.reset();
    this.ref.close();
  }
}
