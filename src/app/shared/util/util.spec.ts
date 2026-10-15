import { areaPath, monotonePath } from './curves';
import { formatDate, formatInteger, formatPercent, formatPercentRounded } from './format';
import { monthLabel, monthShortLabel } from './months';
import { niceScale } from './scale';

describe('niceScale', () => {
  it('arrondit le maximum sur un pas lisible', () => {
    const scale = niceScale(1910, 4);
    expect(scale.max).toBe(2000);
    expect(scale.ticks).toEqual([0, 500, 1000, 1500, 2000]);
  });

  it("retombe sur 1 quand la valeur n'est pas exploitable", () => {
    expect(niceScale(0).max).toBeGreaterThan(0);
    expect(niceScale(Number.NaN).max).toBeGreaterThan(0);
  });
});

describe('curves', () => {
  it('passe par le premier et le dernier point', () => {
    const path = monotonePath([
      [0, 10],
      [10, 0],
      [20, 5],
    ]);
    expect(path.startsWith('M0,10')).toBe(true);
    expect(path.endsWith('20,5')).toBe(true);
  });

  it('gère les séries vides ou à un seul point', () => {
    expect(monotonePath([])).toBe('');
    expect(monotonePath([[1, 2]])).toBe('M1,2');
  });

  it("ferme l'aire sur la ligne de base", () => {
    const points: [number, number][] = [
      [0, 5],
      [10, 1],
    ];
    expect(areaPath(monotonePath(points), points, 20)).toMatch(/L10,20 L0,20 Z$/);
  });
});

describe('format', () => {
  it('formate à la française', () => {
    expect(formatInteger(18742).replace(/\s/g, ' ')).toBe('18 742');
    expect(formatPercent(0.032).replace(/\s/g, ' ')).toBe('3,2 %');
    expect(formatPercentRounded(0.6799).replace(/\s/g, ' ')).toBe('68 %');
    expect(formatDate('2026-10-31')).toBe('31/10/2026');
  });
});

describe('months', () => {
  it('libelle les mois', () => {
    expect(monthLabel('2026-09')).toBe('Septembre 2026');
    expect(monthShortLabel('2026-02')).toBe('Fév 26');
  });
});
