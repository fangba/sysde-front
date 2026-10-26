import { Dialog } from '@angular/cdk/dialog';
import type { ElementRef } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';

import { CurrentUser } from '@core/auth/current-user';
import { IconComponent } from '@shared/ui/icon/icon.component';

import type { MapPlantation } from './data/map.models';
import { MapFilterDrawer } from './map-filter.drawer';
import { MapStore } from './state/map.store';
import {
  BASEMAPS,
  DEFAULT_BASEMAP_ID,
  INITIAL_VIEW,
  previewImage,
  type Basemap,
} from './map.basemaps';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

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
        [attr.aria-label]="'Fond de plan : ' + activeBasemap().label"
        [style.background-image]="preview(activeBasemap())"
        (click)="open.set(!open())"
      >
        <span class="switcher__label">
          <ui-icon name="layers" />
          <span>Fond de plan</span>
        </span>
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
                <span
                  class="option__thumb"
                  aria-hidden="true"
                  [style.background-image]="preview(basemap)"
                ></span>
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
  private readonly dialog = inject(Dialog);
  private readonly injector = inject(Injector);
  protected readonly store = inject(MapStore);
  private readonly currentUser = inject(CurrentUser);
  /** Filtre de plantations : administrateur, chef de département, chef secteur et secrétaire. */
  protected readonly canFilter = computed(
    () =>
      this.currentUser.hasGlobalView() ||
      this.currentUser.isDepartmentHead() ||
      this.currentUser.isSectorHead() ||
      this.currentUser.isSecretary(),
  );

  protected readonly basemaps = BASEMAPS;
  protected readonly preview = previewImage;
  protected readonly activeBasemap = computed(
    () => BASEMAPS.find((b) => b.id === this.current()) ?? BASEMAPS[0],
  );
  protected readonly current = signal(readStoredBasemap());
  protected readonly open = signal(false);

  private map?: L.Map;
  private readonly ready = signal(false);
  private layer?: L.FeatureGroup;
  private tiles: L.TileLayer[] = [];

  constructor() {
    this.store.loadCatalog();

    // Les plantations filtrées sont redessinés dès que la liste change.
    effect(() => {
      const plantations = this.store.plantations();
      if (!this.ready()) {
        return;
      }
      this.drawPlantations(plantations);
    });

    // Leaflet manipule le DOM : on l'initialise côté navigateur, une fois la vue rendue.
    afterNextRender(() => {
      const map = L.map(this.canvas().nativeElement, {
        center: INITIAL_VIEW.center,
        zoom: INITIAL_VIEW.zoom,
        zoomControl: false,
        worldCopyJump: true,
      });
      L.control
        .zoom({ position: 'topleft', zoomInTitle: 'Zoom avant', zoomOutTitle: 'Zoom arrière' })
        .addTo(map);
      L.control.scale({ position: 'bottomright', imperial: false }).addTo(map);
      map.attributionControl.setPrefix(false);
      if (this.canFilter()) {
        this.addFilterControl(map);
      }
      this.map = map;
      this.applyBasemap(this.current());
      this.ready.set(true);

      // La zone change de taille avec le tiroir, la fenêtre, etc.
      const observer = new ResizeObserver(() => map.invalidateSize());
      observer.observe(this.canvas().nativeElement);
      this.destroyRef.onDestroy(() => {
        observer.disconnect();
        map.remove();
      });
    });
  }

  protected openFilter(): void {
    this.dialog.open(MapFilterDrawer, {
      injector: this.injector,
      panelClass: 'ui-drawer-panel',
      width: 'min(440px, 100vw)',
      height: '100%',
      maxHeight: '100vh',
      backdropClass: 'ui-dialog-backdrop',
    });
  }

  /** Bouton de filtre intégré à la carte, dans la pile de contrôles (en haut à gauche). */
  private addFilterControl(map: L.Map): void {
    const Control = L.Control.extend({
      onAdd: () => {
        const root = L.DomUtil.create('div', 'filter-control');
        L.DomEvent.disableClickPropagation(root);
        L.DomEvent.disableScrollPropagation(root);

        const button = L.DomUtil.create('button', 'filter-control__button', root);
        button.type = 'button';
        button.setAttribute('aria-haspopup', 'dialog');
        button.innerHTML =
          '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16l-6 7.5V19l-4-2v-4.5z"/></svg>';
        const label = L.DomUtil.create('span', '', button);
        label.textContent = 'Filtrer';
        const badge = L.DomUtil.create('span', 'filter-control__badge', button);
        badge.hidden = true;
        L.DomEvent.on(button, 'click', () => this.openFilter());

        const chip = L.DomUtil.create('div', 'filter-control__chip', root);
        chip.setAttribute('role', 'status');
        chip.hidden = true;
        const text = L.DomUtil.create('span', '', chip);
        const clear = L.DomUtil.create('button', 'filter-control__clear', chip);
        clear.type = 'button';
        clear.setAttribute('aria-label', 'Retirer le filtre');
        clear.textContent = '×';
        L.DomEvent.on(clear, 'click', () => this.store.reset());

        // Les libellés suivent l'état du filtre.
        effect(
          () => {
            const count = this.store.activeCount();
            badge.hidden = count === 0;
            badge.textContent = String(count);
            chip.hidden = !this.store.filter();
            text.textContent = this.store.loading()
              ? `${this.store.summary()} · chargement…`
              : `${this.store.summary()} · ${this.store.plantations().length} plantations`;
          },
          { injector: this.injector },
        );
        return root;
      },
    });
    new Control({ position: 'topright' }).addTo(map);
  }

  private drawPlantations(plantations: readonly MapPlantation[]): void {
    const map = this.map;
    if (!map) {
      return;
    }
    this.layer?.remove();
    if (plantations.length === 0) {
      this.layer = undefined;
      return;
    }
    const group = L.featureGroup(
      plantations.map((p) =>
        L.polygon(
          p.polygon.map(([lat, lng]) => [lat, lng] as L.LatLngTuple),
          {
            color: '#0f6b46',
            weight: 2,
            fillColor: '#2fbf84',
            fillOpacity: 0.45,
          },
        ).bindPopup(
          `<strong>${escapeHtml(p.name)}</strong><br>${escapeHtml(p.owner)}<br>Lot ${p.lot} · Section ${p.section} · ${Math.round(p.hectares)} ha`,
        ),
      ),
    ).addTo(map);
    this.layer = group;
    map.fitBounds(group.getBounds(), { padding: [60, 60], maxZoom: 13 });
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
