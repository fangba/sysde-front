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
}

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
  },
  {
    id: 'satellite',
    label: 'Satellite',
    description: 'Imagerie Esri',
    layers: [ESRI_IMAGERY],
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
  },
];

export const DEFAULT_BASEMAP_ID = BASEMAPS[0].id;

/** Vue initiale : la Côte d'Ivoire. */
export const INITIAL_VIEW = { center: [7.54, -5.55] as [number, number], zoom: 7 };
