import type { OnDestroy } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { ButtonComponent } from '@shared/ui/button/button.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { formatDate } from '@shared/util/format';

import { POSTE_LABEL } from '../../settings/data/settings.constants';
import { SettingsStore } from '../../settings/state/settings.store';
import { rosterStatusOf } from '../data/planning.rules';
import { PlanningStore } from '../state/planning.store';
import { ReviewStore } from '../state/review.store';
import { ElaborerTab } from './elaborer.tab';

/**
 * Saisie du planning d'un collaborateur par la secrétaire : l'écran d'Élaboration, appliqué au
 * planning de la personne choisie, avec sa fiche et le passage à la personne suivante.
 */
@Component({
  selector: 'sysde-saisie-page',
  imports: [ButtonComponent, ElaborerTab, EmptyStateComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="crumbs" aria-label="Fil d'Ariane">
      <a routerLink="/planning/equipe">← Équipe</a>
      @if (user(); as u) {
        <span aria-hidden="true">/</span>
        <span>{{ u.lastName }} {{ u.firstName }}</span>
      }
    </nav>

    @if (settings.status() === 'ready' && !user()) {
      <ui-empty-state
        icon="alert"
        title="Collaborateur introuvable"
        description="Cette personne n'appartient pas à votre secteur."
      >
        <a ui-button variant="primary" routerLink="/planning/equipe">Retour à l'équipe</a>
      </ui-empty-state>
    } @else if (user(); as u) {
      <div class="layout">
        <div class="main">
          <div class="banner" role="note">
            <span class="avatar" aria-hidden="true">{{ initials() }}</span>
            <p>
              <strong>
                {{ store.editable() ? 'Vous saisissez' : 'Vous consultez' }} le planning de
                {{ u.firstName }} {{ u.lastName }}
              </strong>
              {{ posteLabel() }} · {{ u.matricule }}.
              @if (store.editable()) {
                Les modifications sont enregistrées à votre nom
                @if (u.poste === 'CS') {
                  ; son planning est validé d'office.
                } @else {
                  et soumises au chef secteur en son nom.
                }
              }
            </p>
          </div>
          @if (store.status() === 'ready') {
            <sysde-elaborer-tab />
          } @else if (store.status() === 'error') {
            <ui-empty-state
              icon="alert"
              tone="red"
              title="Chargement impossible"
              [description]="store.error()"
            >
              <button ui-button variant="primary" type="button" (click)="store.load()">
                Réessayer
              </button>
            </ui-empty-state>
          } @else {
            <p class="loading" role="status">Chargement du planning…</p>
          }
        </div>

        <aside class="side" aria-label="Fiche et navigation">
          <section class="card">
            <strong>{{ u.lastName }} {{ u.firstName }}</strong>
            <p class="meta">
              {{ u.matricule }} · {{ posteLabel() }}
              @if (u.lot) {
                <br />Lot {{ u.lot }}{{ u.section ? ' · Sections ' + u.section : '' }}
              }
            </p>
            @if (history(); as h) {
              <p class="history">
                <span class="dot" aria-hidden="true"></span>
                <span>
                  <strong>{{ h.who }}</strong> {{ h.what }}<br />
                  <small>{{ h.when }}</small>
                </span>
              </p>
            }
          </section>

          @if (store.editable()) {
            <section class="card">
              <strong>Enchaîner les saisies</strong>
              @if (next(); as n) {
                <p class="meta">
                  <strong>{{ remaining() }}</strong>
                  personne{{ remaining() > 1 ? 's' : '' }} n'{{
                    remaining() > 1 ? 'ont' : 'a'
                  }}
                  encore rien. Le suivant dans la liste : <strong>{{ n.name }}</strong> ({{
                    n.matricule
                  }}).
                </p>
                <button
                  ui-button
                  variant="primary"
                  type="button"
                  [loading]="store.saving()"
                  (click)="saveAndNext()"
                >
                  Enregistrer et passer au suivant
                </button>
                <button ui-button variant="secondary" type="button" (click)="goNext()">
                  Passer sans enregistrer
                </button>
              } @else {
                <p class="meta">Tout le monde a au moins commencé son planning.</p>
                <button
                  ui-button
                  variant="primary"
                  type="button"
                  [loading]="store.saving()"
                  [disabled]="!store.dirty()"
                  (click)="store.save()"
                >
                  Enregistrer
                </button>
              }
            </section>
          }
        </aside>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .crumbs {
      display: flex;
      gap: 10px;
      margin-bottom: 14px;
      color: var(--ink-500);
      font-size: 13px;
    }
    .crumbs a {
      color: var(--green-700);
      font-weight: 700;
      text-decoration: none;
    }
    .layout {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      align-items: flex-start;
    }
    .main {
      display: flex;
      flex: 999 1 900px;
      flex-direction: column;
      gap: 16px;
      min-width: 0;
    }
    .banner {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 18px;
      border: 1px solid var(--green-600);
      border-radius: var(--radius-lg);
      background: var(--ok-100);
      color: var(--ok-700);
      font-size: 13.5px;
      line-height: 1.5;
    }
    .banner p {
      margin: 0;
    }
    .banner strong {
      display: block;
      font-size: 15px;
    }
    .avatar {
      display: grid;
      flex: none;
      place-items: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--green-700);
      color: var(--paper);
      font-size: 13px;
      font-weight: 700;
    }
    .side {
      display: flex;
      flex: 1 1 240px;
      flex-direction: column;
      gap: 16px;
      max-width: 360px;
    }
    .card {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 20px 22px;
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      background: var(--paper);
    }
    .meta {
      margin: 0;
      color: var(--ink-700);
      font-size: 13px;
      line-height: 1.55;
    }
    .history {
      display: flex;
      gap: 10px;
      margin: 0;
      padding-top: 12px;
      border-top: 1px solid var(--line);
      font-size: 12.5px;
    }
    .history small {
      color: var(--ink-500);
    }
    .dot {
      flex: none;
      width: 8px;
      height: 8px;
      margin-top: 6px;
      border-radius: 50%;
      background: var(--green-600);
    }
    .loading {
      padding: 24px;
      color: var(--ink-500);
      text-align: center;
    }
  `,
})
export class SaisiePage implements OnDestroy {
  protected readonly store = inject(PlanningStore);
  protected readonly review = inject(ReviewStore);
  protected readonly settings = inject(SettingsStore);
  private readonly router = inject(Router);
  private readonly userId = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((p) => p.get('userId') ?? '')),
    { initialValue: '' },
  );

  protected readonly user = computed(
    () => this.settings.users.items().find((u) => u.id === this.userId()) ?? null,
  );
  protected readonly initials = computed(() => {
    const u = this.user();
    return u ? `${u.lastName.charAt(0)}${u.firstName.charAt(0)}`.toUpperCase() : '';
  });
  protected readonly posteLabel = computed(() => {
    const u = this.user();
    return u ? POSTE_LABEL[u.poste] : '';
  });

  protected readonly history = computed(() => {
    const plan = this.store.plan();
    if (!plan?.editedAt) {
      return null;
    }
    const secretary = plan.editedBy === 'SECRETARY';
    return {
      who: secretary ? 'Vous' : 'Lui-même',
      what: `${secretary ? 'avez' : 'a'} enregistré ${plan.lines.length} ligne${plan.lines.length > 1 ? 's' : ''}`,
      when: formatDate(plan.editedAt),
    };
  });

  /** Personnes sans aucune saisie, par ordre alphabétique, hors la personne affichée. */
  private readonly empty = computed(() =>
    this.review
      .plans()
      .filter((p) => rosterStatusOf(p) === 'NONE' && p.userId !== this.userId())
      .flatMap((p) => {
        const u = this.review.userOf(p);
        return u
          ? [{ id: u.id, name: `${u.lastName} ${u.firstName}`, matricule: u.matricule ?? '' }]
          : [];
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'fr')),
  );
  protected readonly next = computed(() => this.empty()[0] ?? null);
  protected readonly remaining = computed(() => this.empty().length);

  constructor() {
    effect(() => {
      const user = this.user();
      if (!user) {
        return;
      }
      untracked(() => {
        if (this.store.target()?.id === user.id) {
          return;
        }
        this.store.plan.set(null);
        this.store.draft.set([]);
        this.store.target.set(user);
        this.store.load();
        if (this.review.status() !== 'ready') {
          this.review.load();
        }
      });
    });
    // La liste de l'équipe suit les enregistrements faits ici.
    effect(() => {
      const plan = this.store.plan();
      if (plan) {
        untracked(() =>
          this.review.plans.update((list) => list.map((p) => (p.id === plan.id ? plan : p))),
        );
      }
    });
  }

  protected goNext(): void {
    const next = this.next();
    if (next) {
      void this.router.navigate(['/planning/equipe', next.id]);
    }
  }

  protected saveAndNext(): void {
    if (this.store.dirty()) {
      this.store.save(() => this.goNext());
    } else {
      this.goNext();
    }
  }

  ngOnDestroy(): void {
    this.store.target.set(null);
  }
}
