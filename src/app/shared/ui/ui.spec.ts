import { TestBed } from '@angular/core/testing';

import { DeadlineItemComponent } from './deadline-item/deadline-item.component';
import { DeltaPillComponent } from './delta-pill/delta-pill.component';
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
});
