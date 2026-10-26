import type { Plantation } from './plantations.models';
import { assignmentTemplateRows } from './plantations.rules';

/** Modèle Excel : toutes les plantations du périmètre, la colonne « Section » est à remplir. */
export async function downloadAssignmentTemplate(
  plantations: readonly Plantation[],
  sectionNames: readonly string[],
): Promise<void> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  const [header, ...body] = assignmentTemplateRows(plantations);
  const data = [
    header!.map((value) => ({ value, fontWeight: 'bold' as const })),
    ...body.map((cells) => cells.map((value) => value)),
  ];
  const help = [
    [{ value: 'Affecter des plantations à des sections', fontWeight: 'bold' as const }],
    [''],
    ['Renseignez la colonne « Section » avec le nom d’une section créée dans Paramètres.'],
    ['Une plantation ne peut être affectée qu’à une section du lot où elle se trouve.'],
    ['Une ligne sans section est ignorée ; les colonnes Planteur et Lot sont indicatives.'],
    [''],
    [{ value: 'Sections existantes', fontWeight: 'bold' as const }],
    ...(sectionNames.length > 0 ? sectionNames.map((n) => [n]) : [['Aucune pour le moment.']]),
  ];
  await writeXlsxFile(
    [
      {
        data,
        sheet: 'Affectations',
        columns: [{ width: 16 }, { width: 30 }, { width: 8 }, { width: 22 }],
      },
      { data: help, sheet: 'Aide', columns: [{ width: 80 }] },
    ],
    {},
  ).toFile('affectation-plantations-sections.xlsx');
}
