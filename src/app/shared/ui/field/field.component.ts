import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import type { AbstractControl } from '@angular/forms';
import { Validators, type ValidationErrors } from '@angular/forms';

const MESSAGES: Readonly<Record<string, string>> = {
  required: 'Ce champ est obligatoire.',
  email: "L'adresse e-mail n'est pas valide.",
  pattern: 'Le format saisi est invalide.',
};

function firstMessage(errors: ValidationErrors): string {
  for (const [key, value] of Object.entries(errors)) {
    if (typeof value === 'string') {
      return value; // message fourni par un validateur métier
    }
    const known = MESSAGES[key];
    if (known) {
      return known;
    }
  }
  return 'La valeur saisie est invalide.';
}

/**
 * Libellé + contrôle + message d'erreur. Le contrôle (input, select…) est projeté ;
 * le `<label>` englobant l'associe au champ sans identifiant à gérer.
 */
@Component({
  selector: 'ui-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-field' },
  template: `
    <!-- Le contrôle est projeté dans le label : l'association est implicite. -->
    <!-- eslint-disable-next-line @angular-eslint/template/label-has-associated-control -->
    <label class="field">
      <span class="label">
        {{ label() }}
        @if (required()) {
          <span class="req" aria-hidden="true">*</span>
        }
      </span>
      <ng-content />
      @if (error(); as message) {
        <span class="error" role="alert">{{ message }}</span>
      } @else if (hint()) {
        <span class="hint">{{ hint() }}</span>
      }
    </label>
  `,
  styleUrl: './field.component.scss',
})
export class FieldComponent {
  readonly label = input.required<string>();
  /** Contrôle de formulaire suivi pour afficher l'erreur. */
  readonly control = input<AbstractControl | null>(null);
  readonly hint = input<string>();

  private readonly tick = signal(0);

  protected readonly required = computed(
    () => this.control()?.hasValidator(Validators.required) ?? false,
  );

  protected readonly error = computed(() => {
    this.tick();
    const control = this.control();
    return control && control.touched && control.errors ? firstMessage(control.errors) : '';
  });

  constructor() {
    effect((onCleanup) => {
      const control = this.control();
      if (!control) {
        return;
      }
      const subscription = control.events.subscribe(() => this.tick.update((n) => n + 1));
      onCleanup(() => subscription.unsubscribe());
    });
  }
}
