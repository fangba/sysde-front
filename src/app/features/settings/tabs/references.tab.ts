import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { CurrentUser } from '@core/auth/current-user';

import { GroupsSection } from './groups.section';
import { LotsSection } from './lots.section';
import { SectionsSection } from './sections.section';
import { SectorsSection } from './sectors.section';

type ReferenceSection = 'sectors' | 'lots' | 'sections' | 'groups';

/** Sections de données de référence ; d'autres s'ajouteront ici au fil des besoins. */
const SECTIONS: readonly { readonly id: ReferenceSection; readonly label: string }[] = [
  { id: 'sectors', label: 'Secteurs' },
  { id: 'lots', label: 'Lots' },
  { id: 'sections', label: 'Sections' },
  { id: 'groups', label: 'Groupes' },
];

/** Données d'origine du programme : secteurs, lots, sections… (le chef secteur : sections et groupes). */
@Component({
  selector: 'sysde-references-tab',
  imports: [SectorsSection, LotsSection, SectionsSection, GroupsSection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (sections().length > 1) {
      <div class="sections" role="tablist" aria-label="Données de référence">
        @for (s of sections(); track s.id) {
          <button
            type="button"
            role="tab"
            class="section-chip"
            [class.is-active]="active() === s.id"
            [attr.aria-selected]="active() === s.id"
            (click)="active.set(s.id)"
          >
            {{ s.label }}
          </button>
        }
      </div>
    }

    @switch (active()) {
      @case ('sectors') {
        <sysde-sectors-section />
      }
      @case ('lots') {
        <sysde-lots-section />
      }
      @case ('sections') {
        <sysde-sections-section />
      }
      @case ('groups') {
        <sysde-groups-section />
      }
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .sections {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .section-chip {
      padding: 8px 16px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--paper);
      color: var(--ink-700);
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition:
        background-color 0.15s ease,
        color 0.15s ease,
        border-color 0.15s ease;
    }
    .section-chip:hover {
      border-color: var(--action-from);
    }
    .section-chip.is-active {
      border-color: transparent;
      background: linear-gradient(135deg, var(--action-from), var(--action-to));
      color: var(--on-action);
    }
    .section-chip:focus-visible {
      outline: 2px solid var(--action-from);
      outline-offset: 2px;
    }
  `,
})
export class ReferencesTab {
  private readonly currentUser = inject(CurrentUser);

  /** L'administrateur gère les secteurs et les lots ; le chef secteur, ses sections et ses groupes. */
  protected readonly sections = computed(() =>
    this.currentUser.isAdministrator()
      ? SECTIONS.filter((s) => s.id === 'sectors' || s.id === 'lots')
      : SECTIONS.filter((s) => s.id === 'sections' || s.id === 'groups'),
  );
  protected readonly active = signal<ReferenceSection>(
    this.currentUser.isAdministrator() ? 'sectors' : 'sections',
  );
}
