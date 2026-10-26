import { buildDemoPlantations } from './plantations.demo';
import {
  ALL,
  applyFilter,
  assignmentTemplateRows,
  parseAssignmentRows,
  sectionsFor,
  totalsOf,
} from './plantations.rules';

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

  describe('affectation aux sections', () => {
    const p1 = { ...rows[0]!, code: 'PL-1', lot: 1, sectorCode: 'S01', sectionId: undefined };
    const p2 = { ...rows[1]!, code: 'PL-2', lot: 2, sectorCode: 'S01', sectionId: 'sc2' };
    const plantations = [p1, p2];
    const sectors = [{ id: 'sec1', code: 'S01' }];
    const lots = [
      { id: 'l1', sectorId: 'sec1', number: 1 },
      { id: 'l2', sectorId: 'sec1', number: 2 },
      { id: 'lx', sectorId: 'autre', number: 1 },
    ];
    const sections = [
      { id: 'sc1', lotId: 'l1', name: 'Nord' },
      { id: 'sc2', lotId: 'l2', name: 'Bloc 3' },
      { id: 'scx', lotId: 'lx', name: 'Ailleurs' },
    ];
    const parse = (body: unknown[][]) =>
      parseAssignmentRows(
        [['Plantation', 'Section'], ...body],
        plantations,
        sections,
        lots,
        sectors,
      );

    it('ne propose que les sections du lot de la plantation', () => {
      expect(sectionsFor(p1, sections, lots, sectors).map((s) => s.id)).toEqual(['sc1']);
      expect(sectionsFor(p2, sections, lots, sectors).map((s) => s.id)).toEqual(['sc2']);
    });

    it('prépare les affectations valides, sans tenir compte des accents ni de la casse', () => {
      const r = parse([[' pl-1 ', 'NORD']]);
      expect(r.errors).toEqual([]);
      expect(r.ready.map((i) => i.section.id)).toEqual(['sc1']);
    });

    it('signale plantation inconnue, section inconnue, section d’un autre lot et doublon', () => {
      const r = parse([
        ['PL-9', 'Nord'],
        ['PL-1', 'Inventée'],
        ['PL-2', 'Nord'],
        ['PL-2', 'Bloc 3'],
      ]);
      expect(r.errors.map((e) => e.row)).toEqual([2, 3, 4, 5]);
      expect(r.errors[0]?.message).toContain('introuvable dans votre secteur');
      expect(r.errors[1]?.message).toContain('créez-la d’abord dans Paramètres');
      expect(r.errors[2]?.message).toContain('pas dans le lot 2');
      expect(r.errors[3]?.message).toContain('figure déjà');
    });

    it('compte comme inchangées les lignes sans section ou déjà conformes', () => {
      const r = parse([
        ['PL-1', ''],
        ['PL-2', 'Bloc 3'],
      ]);
      expect(r.ready).toEqual([]);
      expect(r.unchanged).toBe(2);
    });

    it('rejette un fichier sans les bonnes colonnes ou vide', () => {
      expect(
        parseAssignmentRows(
          [
            ['A', 'B'],
            ['x', 'y'],
          ],
          plantations,
          sections,
          lots,
          sectors,
        ).fileError,
      ).toContain('introuvables');
      expect(parse([]).fileError).toContain('aucune ligne');
    });

    it('génère le modèle trié par lot', () => {
      const rowsOut = assignmentTemplateRows([p2, p1]);
      expect(rowsOut[0]).toEqual(['Plantation', 'Planteur', 'Lot', 'Section']);
      expect(rowsOut[1]?.[0]).toBe('PL-1');
    });
  });
});
