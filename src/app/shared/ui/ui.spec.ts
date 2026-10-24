import { TestBed } from '@angular/core/testing';

import { DeadlineItemComponent } from './deadline-item/deadline-item.component';
import { DeltaPillComponent } from './delta-pill/delta-pill.component';
import { DataTableComponent, type TableColumn } from './data-table/data-table.component';
import { DonutComponent } from './donut/donut.component';

describe('ui components', () => {
  it('delta-pill annonce le sens de la variation', () => {
    const fixture = TestBed.createComponent(DeltaPillComponent);
    fixture.componentRef.setInput('value', -0.042);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('en baisse');
    expect(text.replace(/\s/g, ' ')).toContain('4,2 %');
  });

  it('deadline-item signale un retard', () => {
    const fixture = TestBed.createComponent(DeadlineItemComponent);
    fixture.componentRef.setInput('title', 'Rapport');
    fixture.componentRef.setInput('meta', 'SAPH');
    fixture.componentRef.setInput('date', '2026-10-10');
    fixture.componentRef.setInput('daysLeft', -5);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('En retard de 5 j');
  });

  it('donut répartit les parts', () => {
    const fixture = TestBed.createComponent(DonutComponent);
    fixture.componentRef.setInput('ariaLabel', 'Test');
    fixture.componentRef.setInput('slices', [
      { name: 'A', value: 3, tone: 'green' },
      { name: 'B', value: 1, tone: 'mint' },
    ]);
    fixture.detectChanges();
    const text = ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/\s/g, ' ');
    expect(text).toContain('75 %');
    expect(text).toContain('25 %');
  });

  it('data-table filtre par colonne et garde les zones de filtre sans résultat', () => {
    interface Row {
      readonly id: string;
      readonly name: string;
      readonly active: boolean;
    }
    const columns: readonly TableColumn<Row>[] = [
      { id: 'name', header: 'Nom', text: (r) => r.name, filter: 'text' },
      {
        id: 'active',
        header: 'Statut',
        text: (r) => (r.active ? 'Actif' : 'Inactif'),
        filter: ['Actif', 'Inactif'],
      },
    ];
    const fixture = TestBed.createComponent(DataTableComponent<Row>);
    fixture.componentRef.setInput('columns', columns);
    fixture.componentRef.setInput('caption', 'Test');
    fixture.componentRef.setInput('rowLabel', (r: Row) => r.name);
    fixture.componentRef.setInput('columnFilters', true);
    fixture.componentRef.setInput('rows', [
      { id: '1', name: 'Aka', active: true },
      { id: '2', name: 'Kra', active: false },
      { id: '3', name: 'Kané', active: true },
    ]);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const rows = () => root.querySelectorAll('tbody tr').length;
    const type = (selector: string, value: string, event: string) => {
      const el = root.querySelector<HTMLInputElement | HTMLSelectElement>(selector);
      expect(el).not.toBeNull();
      el!.value = value;
      el!.dispatchEvent(new Event(event));
      fixture.detectChanges();
    };

    expect(rows()).toBe(3);
    type('tr.filters input', 'k', 'input');
    expect(rows()).toBe(3);
    // « Inactif » ne doit pas ressortir pour « Actif » : valeur exacte.
    type('tr.filters select', 'Actif', 'change');
    expect(rows()).toBe(2);
    type('tr.filters input', 'zzz', 'input');
    // Plus aucune ligne de données : une seule ligne de message, les filtres restent affichés.
    expect(root.querySelectorAll('tbody td.none').length).toBe(1);
    expect(root.querySelector('tr.filters')).not.toBeNull();
    expect(root.textContent).toContain('Aucun élément ne correspond');
  });
});
