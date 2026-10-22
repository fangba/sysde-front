import { ACTIVITY_CATEGORIES } from '../../settings/data/settings.constants';
import type { Activity } from '../../settings/data/settings.models';
import { parseDateCell, templateRows } from './planning.rules';

/** Lecture d'un fichier .xlsx : lignes de la première feuille. Chargé à la demande. */
export async function readPlanFile(file: File): Promise<readonly (readonly unknown[])[]> {
  const { readSheet } = await import('read-excel-file/browser');
  return readSheet(file);
}

/** Télécharge le modèle Excel : feuille à remplir et feuille d'aide avec les activités admises. */
export async function downloadPlanTemplate(
  year: number,
  activities: readonly Activity[],
): Promise<void> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  const [header, ...examples] = templateRows(year, activities);
  const planning = [
    header!.map((value) => ({ value, fontWeight: 'bold' as const })),
    ...examples.map(([date, endDate, activity, place, hours]) => [
      { value: toDate(String(date)), type: Date, format: 'dd/mm/yyyy' },
      { value: toDate(String(endDate)), type: Date, format: 'dd/mm/yyyy' },
      activity!,
      place!,
      hours!,
    ]),
  ];
  const help = [
    [{ value: 'Activités admises pour votre poste', fontWeight: 'bold' as const }],
    ...ACTIVITY_CATEGORIES.flatMap((category) => {
      const labels = activities.filter((a) => a.category === category.code).map((a) => a.label);
      return labels.length > 0
        ? [
            [''],
            [{ value: category.label, fontWeight: 'bold' as const }],
            ...labels.map((l) => [l]),
          ]
        : [];
    }),
    [''],
    ['Une ligne par activité, même si elle dure plusieurs jours.'],
    ['Les dates de début et de fin doivent être dans l’année du planning.'],
    ['Date fin : facultative, déduite de la durée de l’activité si vous la laissez vide.'],
    ['Heures par jour : 12 au maximum.'],
  ];
  await writeXlsxFile(
    [
      {
        data: planning,
        sheet: `Planning ${year}`,
        columns: [{ width: 14 }, { width: 14 }, { width: 26 }, { width: 18 }, { width: 16 }],
      },
      { data: help, sheet: 'Aide', columns: [{ width: 60 }] },
    ],
    {},
  ).toFile(`modele-planning-${year}.xlsx`);
}

function toDate(text: string): Date {
  const iso = parseDateCell(text) ?? '1970-01-01';
  return new Date(`${iso}T00:00:00.000Z`);
}
