import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('bascule et mémorise le choix', () => {
    const service = TestBed.inject(ThemeService);
    service.set('light');
    service.toggle();
    TestBed.tick();
    expect(service.isDark()).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('sysde-theme')).toBe('dark');
  });

  it('relit le choix mémorisé', () => {
    localStorage.setItem('sysde-theme', 'dark');
    expect(TestBed.inject(ThemeService).theme()).toBe('dark');
  });
});
