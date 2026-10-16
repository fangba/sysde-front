import { totalsOf, toCsv } from './reporting.calculations';
import { buildReport } from './reporting.demo';

describe('reporting', () => {
  it("liste les opérateurs techniques pour l'administrateur", () => {
    const view = buildReport({ level: 'organisme', operator: 'FIRCA' });
    expect(view.rows.map((r) => r.name)).toContain('SAPH');
    expect(view.rows.some((r) => r.name === 'FIRCA')).toBe(false);
  });

  it('découpe un opérateur en secteurs pour le chef de département', () => {
    const view = buildReport({ level: 'operateur', operator: 'SAPH' });
    expect(view.rows).toHaveLength(3);
    expect(view.rows[0]?.detail).toBe('Aboisso');
    const saph = buildReport({ level: 'organisme', operator: '' }).rows[0];
    expect(totalsOf(view.rows).planters).toBeLessThanOrEqual(saph?.planters ?? 0);
  });

  it('liste les collaborateurs pour le chef de secteur', () => {
    const view = buildReport({ level: 'secteur', operator: 'SAPH', sector: 'S01' });
    expect(view.rows).toHaveLength(4);
  });

  it('compte les rapports par statut', () => {
    const t = totalsOf(buildReport({ level: 'organisme', operator: '' }).rows);
    expect(t.byStatus.transmis + t.byStatus['en-cours'] + t.byStatus['en-retard']).toBe(7);
  });

  it('échappe les guillemets du CSV', () => {
    expect(toCsv(['a'], [['x"y']])).toBe('"a"\r\n"x""y"');
  });
});

describe('reporting : filtre par secteur', () => {
  it('affiche les collaborateurs du secteur choisi par le chef de département', () => {
    const view = buildReport({ level: 'operateur', operator: 'SAPH', filterSector: 'S02' });
    expect(view.level).toBe('secteur');
    expect(view.rows).toHaveLength(4);
  });
});

describe('reporting : filtre par opérateur', () => {
  it("affiche les secteurs de l'opérateur choisi par l'administrateur", () => {
    const view = buildReport({ level: 'organisme', operator: 'FIRCA', filterOperator: 'SOGB' });
    expect(view.level).toBe('operateur');
    expect(view.rows).toHaveLength(3);
  });
});
