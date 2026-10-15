import { daysUntil, lastMonths, latest, share, variation } from './dashboard.calculations';

describe('dashboard.calculations', () => {
  it('calcule la variation entre les deux derniers mois', () => {
    expect(variation([100, 110])).toBeCloseTo(0.1);
    expect(variation([200, 100])).toBeCloseTo(-0.5);
  });

  it('retourne 0 quand la variation est incalculable', () => {
    expect(variation([])).toBe(0);
    expect(variation([5])).toBe(0);
    expect(variation([0, 5])).toBe(0);
  });

  it('extrait la dernière valeur et la fenêtre de mois', () => {
    expect(latest([1, 2, 3])).toBe(3);
    expect(latest([])).toBe(0);
    expect(lastMonths([1, 2, 3, 4], 2)).toEqual([3, 4]);
    expect(lastMonths([1, 2], 5)).toEqual([1, 2]);
  });

  it('compte les jours restants, négatifs si la date est passée', () => {
    const now = new Date(2026, 9, 15, 18, 30);
    expect(daysUntil('2026-10-31', now)).toBe(16);
    expect(daysUntil('2026-10-15', now)).toBe(0);
    expect(daysUntil('2026-10-10', now)).toBe(-5);
  });

  it('calcule une part sans diviser par zéro', () => {
    expect(share(1, 4)).toBe(0.25);
    expect(share(1, 0)).toBe(0);
  });
});
