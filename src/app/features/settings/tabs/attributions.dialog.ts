import { toSignal } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
  type AbstractControl,
  type ValidationErrors,
} from '@angular/forms';

import { ButtonComponent } from '@shared/ui/button/button.component';
import { DialogShellComponent } from '@shared/ui/dialog-shell/dialog-shell.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { FieldComponent } from '@shared/ui/field/field.component';

import type { Attribution, AttributionInput } from '../data/settings.models';
import { findAttributionDuplicate, findLotConflict } from '../data/settings.rules';
import { EntityDialog } from '../shell/entity-dialog';

@Component({
  selector: 'sysde-attribution-dialog',
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    DialogShellComponent,
    FieldComponent,
    IconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown.escape)': 'closeLots($event)' },
  styles: `
    .lot-picker__field {
      position: relative;
    }
    .lot-picker {
      display: grid;
      gap: 6px;
    }
    .lot-picker__label {
      font-size: 13px;
      font-weight: 600;
      color: var(--ink-900);
    }
    .lot-picker__trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      text-align: left;
      cursor: pointer;
    }
    .lot-picker__trigger:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
    .lot-picker__trigger .is-placeholder {
      color: var(--ink-500);
    }
    .lot-picker__panel {
      position: absolute;
      z-index: 5;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      display: grid;
      padding: 6px;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: var(--paper);
      box-shadow: 0 12px 28px rgb(16 40 28 / 14%);
    }
    .lot-picker__item {
      padding: 10px 12px;
      border-radius: 8px;
    }
    .lot-picker__item:hover:not(.is-taken) {
      background: color-mix(in srgb, var(--action-from) 8%, transparent);
    }
    .lot-picker__item.is-taken {
      opacity: 0.55;
    }
    .lot-picker__item small {
      margin-left: auto;
      font-size: 11px;
      color: var(--ink-500);
    }
  `,
  template: `
    <ui-dialog-shell
      [title]="editing ? 'Modifier l’attribution' : 'Nouvelle attribution'"
      subtitle="Lots d’un secteur confiés à un opérateur, pour la période de son contrat."
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
        <div class="lot-picker span-2">
          <span class="lot-picker__label" id="lots-label"> Lots concernés par ce contrat </span>
          <div class="lot-picker__field">
            <button
              type="button"
              class="ui-input lot-picker__trigger"
              aria-haspopup="listbox"
              aria-labelledby="lots-label"
              [attr.aria-expanded]="lotsOpen()"
              [disabled]="!sectorId()"
              (click)="lotsOpen.set(!lotsOpen())"
            >
              <span [class.is-placeholder]="!selected().length">{{ lotsSummary() }}</span>
              <ui-icon name="chevronDown" />
            </button>
            @if (lotsOpen() && sectorId()) {
              <div class="lot-picker__panel" role="listbox" aria-multiselectable="true">
                @for (lot of lots(); track lot) {
                  <label class="ui-check lot-picker__item" [class.is-taken]="taken(lot)">
                    <input
                      type="checkbox"
                      [checked]="selected().includes(lot)"
                      [disabled]="taken(lot)"
                      (change)="toggle(lot)"
                    />
                    <span>Lot {{ lot }}</span>
                    @if (taken(lot)) {
                      <small>Déjà attribué</small>
                    }
                  </label>
                }
              </div>
            }
          </div>
          <p class="ui-form__note">
            @if (sectorId() && !lots().length) {
              Aucun lot n’est défini pour ce secteur : ajoutez-les dans Paramètres › Références.
            } @else if (sectorId()) {
              Cochez uniquement les lots de ce secteur couverts par le contrat ; les autres peuvent
              relever d’un autre contrat.
            } @else {
              Choisissez d’abord un secteur pour sélectionner les lots.
            }
          </p>
        </div>
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

  protected readonly form = this.fb.group(
    {
      contractId: [this.item?.contractId ?? '', Validators.required],
      sectorId: [this.item?.sectorId ?? '', Validators.required],
      lots: [this.item ? [...this.item.lots] : ([] as number[])],
    },
    { validators: [(group: AbstractControl) => this.conflict(group)] },
  );

  private readonly contractId = toSignal(this.form.controls.contractId.valueChanges, {
    initialValue: this.form.controls.contractId.value,
  });
  protected readonly lotsOpen = signal(false);
  protected readonly sectorId = toSignal(this.form.controls.sectorId.valueChanges, {
    initialValue: this.form.controls.sectorId.value,
  });

  /** Lots du secteur choisi, tels que définis dans Paramètres › Références. */
  protected readonly lots = computed(() => this.store.lotNumbersOf(this.sectorId()));
  protected readonly selected = toSignal(this.form.controls.lots.valueChanges, {
    initialValue: this.form.controls.lots.value,
  });
  protected readonly operatorName = computed(() => {
    const contract = this.store.contractOf(this.contractId());
    return contract ? (this.store.operatorOf(contract.operatorId)?.name ?? '') : '';
  });

  /** Lot déjà attribué (sur une période qui se chevauche) : il ne peut pas être coché. */
  protected taken(lot: number): boolean {
    return !!this.lotConflict(this.contractId(), this.sectorId(), lot);
  }

  protected readonly lotsSummary = computed(() => {
    const lots = this.selected();
    if (!this.sectorId()) {
      return 'Choisir d’abord un secteur';
    }
    return lots.length ? lots.map((n) => `Lot ${n}`).join(', ') : 'Choisir les lots…';
  });

  protected closeLots(event: Event): void {
    if (this.lotsOpen()) {
      event.stopPropagation();
      this.lotsOpen.set(false);
    }
  }

  protected toggle(lot: number): void {
    const control = this.form.controls.lots;
    const current = control.value;
    control.setValue(
      current.includes(lot)
        ? current.filter((n) => n !== lot)
        : [...current, lot].sort((a, b) => a - b),
    );
  }

  private lotConflict(contractId: string, sectorId: string, lot: number): Attribution | undefined {
    if (!contractId || !sectorId) {
      return undefined;
    }
    return findLotConflict(
      { contractId, sectorId, lot },
      this.store.attributions.items(),
      this.store.contracts.items(),
      this.item?.id,
    );
  }

  private conflict(group: AbstractControl): ValidationErrors | null {
    const v = group.value as { contractId: string; sectorId: string; lots: number[] };
    const duplicate =
      v.contractId && v.sectorId
        ? findAttributionDuplicate(v, this.store.attributions.items(), this.item?.id)
        : undefined;
    if (duplicate) {
      return {
        duplicate: `Ce secteur est déjà attribué dans ce contrat : modifiez l’attribution existante pour y ajouter des lots.`,
      };
    }
    if (!v.lots.length) {
      return { lot: 'Sélectionnez au moins un lot.' };
    }
    for (const lot of v.lots) {
      const found = this.lotConflict(v.contractId, v.sectorId, lot);
      if (found) {
        return {
          lot: `Le lot ${lot} de ce secteur est déjà attribué à ${this.store.contractLabel(found.contractId)} sur la même période.`,
        };
      }
    }
    return null;
  }

  constructor() {
    super();
    // Changer de contrat ou de secteur invalide les lots cochés devenus indisponibles.
    const prune = (): void => {
      const { contractId, sectorId, lots } = this.form.getRawValue();
      const kept = lots.filter((lot) => !this.lotConflict(contractId, sectorId, lot));
      if (kept.length !== lots.length) {
        this.form.controls.lots.setValue(kept);
      }
    };
    this.form.controls.contractId.valueChanges.subscribe(prune);
    this.form.controls.sectorId.valueChanges.subscribe(() => {
      this.lotsOpen.set(false);
      prune();
    });
  }

  protected toInput(): AttributionInput {
    const v = this.form.getRawValue();
    return { contractId: v.contractId, sectorId: v.sectorId, lots: [...v.lots] };
  }
}
