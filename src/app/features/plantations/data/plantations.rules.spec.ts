import { buildDemoPlantations } from './plantations.demo';
import { ALL, applyFilter, totalsOf } from './plantations.rules';

describe('plantations.rules', () => {
  const rows = buildDemoPlantations();

  it('filtre par opérateur puis par secteur', () => {
    const saph = applyFilter(rows, { operator: 'SAPH', sector: ALL });
    expect(saph.length).toBeGreaterThan(0);
    expect(saph.every((p) => p.operator === 'SAPH')).toBe(true);
    const sector = `SAPH/${saph[0]?.sectorCode}`;
    const one = applyFilter(rows, { operator: 'SAPH', sector });
    expect(one.every((p) => p.sectorCode === saph[0]?.sectorCode)).toBe(true);
  });

  it('totalise les plantations', () => {
    const t = totalsOf(rows);
    expect(t.count).toBe(rows.length);
    expect(t.hectares).toBe(rows.reduce((s, p) => s + p.hectares, 0));
    expect(t.geolocatedRate).toBeGreaterThan(0.8);
    expect(totalsOf([]).geolocatedRate).toBe(0);
  });
});
