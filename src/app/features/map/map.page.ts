import type { ElementRef } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';

import { IconComponent } from '@shared/ui/icon/icon.component';

import { BASEMAPS, DEFAULT_BASEMAP_ID, INITIAL_VIEW, type Basemap } from './map.basemaps';

const STORAGE_KEY = 'sysde-basemap';

function readStoredBasemap(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return BASEMAPS.some((b) => b.id === stored) ? (stored as string) : DEFAULT_BASEMAP_ID;
  } catch {
    return DEFAULT_BASEMAP_ID;
  }
}

/** Carte plein écran (Leaflet) avec choix du fond de plan. */
@Component({
  selector: 'sysde-map-page',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'map-page' },
  template: `
    <div #canvas class="canvas" role="application" aria-label="Carte interactive"></div>

    <div class="switcher" role="group" aria-label="Fond de plan">
      <button
        type="button"
        class="switcher__toggle"
        aria-controls="basemap-list"
        [attr.aria-expanded]="open()"
        (click)="open.set(!open())"
      >
        <ui-icon name="layers" />
        <span>Fond de plan</span>
      </button>

      @if (open()) {
        <ul id="basemap-list" class="switcher__list">
          @for (basemap of basemaps; track basemap.id) {
            <li>
              <button
                type="button"
                class="option"
                [class.is-active]="basemap.id === current()"
                [attr.aria-pressed]="basemap.id === current()"
                (click)="select(basemap)"
              >
                <span class="option__dot" aria-hidden="true"></span>
                <span class="option__text">
                  <strong>{{ basemap.label }}</strong>
                  <span>{{ basemap.description }}</span>
                </span>
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styleUrl: './map.page.scss',
})
export class MapPage {
  private readonly canvas = viewChild.required<ElementRef<HTMLDivElement>>('canvas');
  private readonly destroyRef = inject(DestroyRef);

  protected readonly basemaps = BASEMAPS;
  protected readonly current = signal(readStoredBasemap());
  protected readonly open = signal(false);

  private map?: L.Map;
  private tiles: L.TileLayer[] = [];

  constructor() {
    // Leaflet manipule le DOM : on l'initialise côté navigateur, une fois la vue rendue.
    afterNextRender(() => {
      const map = L.map(this.canvas().nativeElement, {
        center: INITIAL_VIEW.center,
        zoom: INITIAL_VIEW.zoom,
        zoomControl: false,
        worldCopyJump: true,
      });
      L.control
        .zoom({ position: 'bottomright', zoomInTitle: 'Zoom avant', zoomOutTitle: 'Zoom arrière' })
        .addTo(map);
      L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);
      map.attributionControl.setPrefix(false);
      this.map = map;
      this.applyBasemap(this.current());

      // La zone change de taille avec le tiroir, la fenêtre, etc.
      const observer = new ResizeObserver(() => map.invalidateSize());
      observer.observe(this.canvas().nativeElement);
      this.destroyRef.onDestroy(() => {
        observer.disconnect();
        map.remove();
      });
    });
  }

  protected select(basemap: Basemap): void {
    this.current.set(basemap.id);
    this.open.set(false);
    this.applyBasemap(basemap.id);
    try {
      localStorage.setItem(STORAGE_KEY, basemap.id);
    } catch {
      // Stockage indisponible : le choix vaut pour cette visite seulement.
    }
  }

  private applyBasemap(id: string): void {
    const map = this.map;
    const basemap = BASEMAPS.find((b) => b.id === id);
    if (!map || !basemap) {
      return;
    }
    this.tiles.forEach((layer) => layer.remove());
    this.tiles = basemap.layers.map((source) =>
      L.tileLayer(source.url, {
        attribution: source.attribution,
        maxZoom: source.maxZoom,
        subdomains: source.subdomains ?? 'abc',
      }).addTo(map),
    );
  }
}
