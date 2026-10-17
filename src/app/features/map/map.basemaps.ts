export interface TileSource {
  readonly url: string;
  readonly attribution?: string;
  readonly maxZoom: number;
  readonly subdomains?: string;
}

export interface Basemap {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  /** Couches empilées dans l'ordre : fond, puis éventuellement noms de lieux. */
  readonly layers: readonly TileSource[];
  /** Tuile servant d'imagette (littoral ivoirien, zoom 9) ; couches empilées, la plus haute d'abord. */
  readonly preview: readonly string[];
}

// Tuile z/x/y du sud de la Côte d'Ivoire : lagune, forêt et plantations lisibles dans chaque style.
const PREVIEW = { z: 9, x: 250, y: 248 };
const ESRI_PREVIEW = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${PREVIEW.z}/${PREVIEW.y}/${PREVIEW.x}`;

const ESRI_IMAGERY: TileSource = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Imagerie © Esri, Maxar, Earthstar Geographics',
  maxZoom: 19,
};

/** Fonds de plan proposés. Le premier est celui affiché par défaut. */
export const BASEMAPS: readonly Basemap[] = [
  {
    id: 'plan',
    label: 'Plan',
    description: 'OpenStreetMap',
    layers: [
      {
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution:
          '© contributeurs <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      },
    ],
    preview: [`https://tile.openstreetmap.org/${PREVIEW.z}/${PREVIEW.x}/${PREVIEW.y}.png`],
  },
  {
    id: 'satellite',
    label: 'Satellite',
    description: 'Imagerie Esri',
    layers: [ESRI_IMAGERY],
    preview: [ESRI_PREVIEW],
  },
  {
    id: 'hybride',
    label: 'Hybride',
    description: 'Satellite avec noms de lieux',
    layers: [
      ESRI_IMAGERY,
      {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
      },
    ],
    preview: [
      `https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/${PREVIEW.z}/${PREVIEW.y}/${PREVIEW.x}`,
      ESRI_PREVIEW,
    ],
  },
  {
    id: 'relief',
    label: 'Relief',
    description: 'OpenTopoMap',
    layers: [
      {
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, SRTM · © <a href="https://opentopomap.org">OpenTopoMap</a>',
        maxZoom: 17,
        subdomains: 'abc',
      },
    ],
    preview: [`https://a.tile.opentopomap.org/${PREVIEW.z}/${PREVIEW.x}/${PREVIEW.y}.png`],
  },
];

/** Valeur CSS `background-image` de l'imagette d'un fond de plan. */
export function previewImage(basemap: Basemap): string {
  return basemap.preview.map((url) => `url("${url}")`).join(', ');
}

export const DEFAULT_BASEMAP_ID = BASEMAPS[0].id;

/** Vue initiale : la Côte d'Ivoire. */
export const INITIAL_VIEW = { center: [7.54, -5.55] as [number, number], zoom: 7 };
