import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { CurrentUser } from '@core/auth/current-user';

import { DemoSettingsApi, SettingsApi } from '../../settings/data/settings.api';
import { SettingsStore } from '../../settings/state/settings.store';

import { DemoPlanningApi, PlanningApi } from '../data/planning.api';
import { PlanningStore } from './planning.store';
import { ReviewStore } from './review.store';

const wait = () => new Promise((resolve) => setTimeout(resolve, 400));

async function setup(email: string, poste: string) {
  TestBed.configureTestingModule({
    providers: [
      PlanningStore,
      ReviewStore,
      SettingsStore,
      { provide: SettingsApi, useClass: DemoSettingsApi },
      DemoPlanningApi,
      { provide: PlanningApi, useExisting: DemoPlanningApi },
      {
        provide: CurrentUser,
        useValue: { user: () => ({ email, poste }), isSectorHead: () => poste === 'CS' },
      },
    ],
  });
  TestBed.inject(SettingsStore).load();
  await wait();
  return { mine: TestBed.inject(PlanningStore), review: TestBed.inject(ReviewStore) };
}

const year = new Date().getFullYear();
const input = (day: number) => ({
  date: `${year}-06-${String(day).padStart(2, '0')}`,
  endDate: `${year}-06-${String(day).padStart(2, '0')}`,
  activityId: 'ac-4',
  place: 'Lot 1',
  hours: 4,
});

describe('PlanningStore (collaborateur)', () => {
  it('charge le planning, ajoute des lignes et suit les modifications', async () => {
    const { mine } = await setup('collaborateur@sysde.ci', 'CF');
    mine.load();
    await wait();
    expect(mine.status()).toBe('ready');
    expect(mine.editable()).toBe(true);
    expect(mine.plan()?.rejection).toBeDefined();
    expect(mine.dirty()).toBe(false);

    const before = mine.draft().length;
    expect(mine.upsertLine(null, input(3))).toBeNull();
    expect(mine.draft()).toHaveLength(before + 1);
    expect(mine.dirty()).toBe(true);
    expect(mine.upsertLine(null, input(3))).toContain('déjà prévue');
    mine.discard();
    expect(mine.dirty()).toBe(false);
  });

  it("suit l'objectif annuel et propose la durée de chaque activité", async () => {
    const { mine } = await setup('collaborateur@sysde.ci', 'CF');
    mine.load();
    await wait();
    const initial = mine.objectives().find((o) => o.activity.id === 'ac-4');
    expect(initial?.target).toBe(2);
    expect(initial?.planned).toBe(1);
    expect(mine.durationOf('ac-4')).toBe(20);
    expect(mine.durationOf('ac-6')).toBe(3);
  });

  it('ne propose que les activités actives du poste et refuse les autres', async () => {
    const { mine } = await setup('collaborateur@sysde.ci', 'CF');
    expect(mine.activities().map((a) => a.label)).toEqual([
      'Formation initiale',
      'Suivi post perfectionnement',
      'Recyclage des saigneurs',
    ]);
    expect(mine.upsertLine(null, { ...input(5), activityId: 'ac-7' })).toContain('pas proposée');
    expect(mine.activityLabel('ac-4')).toBe('Formation initiale');
  });

  it('enregistre puis soumet, et le planning devient non modifiable', async () => {
    const { mine } = await setup('collaborateur@sysde.ci', 'CF');
    mine.load();
    await wait();
    mine.upsertLine(null, input(4));
    mine.submit();
    await wait();
    await wait();
    expect(mine.plan()?.status).toBe('SOUMIS');
    expect(mine.plan()?.rejection).toBeUndefined();
    expect(mine.editable()).toBe(false);
    expect(mine.dirty()).toBe(false);
  });

  it("remplace ou complète le brouillon à l'import", async () => {
    const { mine } = await setup('collaborateur@sysde.ci', 'CF');
    mine.load();
    await wait();
    const before = mine.draft().length;
    expect(mine.importLines([input(10), input(11)], 'append')).toBeNull();
    expect(mine.draft()).toHaveLength(before + 2);
    expect(mine.importLines([input(12)], 'replace')).toBeNull();
    expect(mine.draft()).toHaveLength(1);
  });
});

describe("plannings de l'équipe (lecture seule)", () => {
  it('sont ouverts à la secrétaire et au chef secteur, pas aux autres postes', async () => {
    await setup('secretaire@sysde.ci', 'SE');
    const api = TestBed.inject(PlanningApi);
    const plans = await firstValueFrom(api.team(new Date().getFullYear()));
    expect(plans.length).toBeGreaterThan(0);

    TestBed.resetTestingModule();
    await setup('collaborateur@sysde.ci', 'CF');
    await expect(
      firstValueFrom(TestBed.inject(PlanningApi).team(new Date().getFullYear())),
    ).rejects.toThrow();
  });
});

describe('ReviewStore (chef secteur)', () => {
  it("liste les plannings de l'équipe, les soumis d'abord, puis valide et rejette", async () => {
    const { review } = await setup('chef.secteur@sysde.ci', 'CS');
    review.load();
    await wait();
    const plans = review.sorted();
    expect(plans.map((p) => p.status)).toEqual([
      'SOUMIS',
      'SOUMIS',
      'BROUILLON',
      'BROUILLON',
      'VALIDE',
    ]);
    expect(review.pending()).toBe(2);

    const [first, second] = plans;
    let closed = 0;
    review.decide(first!, { approve: true }, () => closed++);
    await wait();
    review.decide(second!, { approve: false, reason: 'Revoir les dates de mars.' }, () => closed++);
    await wait();
    expect(closed).toBe(2);
    expect(review.plans().find((p) => p.id === first!.id)?.status).toBe('VALIDE');
    const rejected = review.plans().find((p) => p.id === second!.id);
    expect(rejected?.status).toBe('BROUILLON');
    expect(rejected?.rejection?.reason).toBe('Revoir les dates de mars.');
    expect(review.pending()).toBe(0);
  });

  it('refuse le rejet sans motif', async () => {
    const { review } = await setup('chef.secteur@sysde.ci', 'CS');
    review.load();
    await wait();
    let closed = 0;
    review.decide(review.sorted()[0]!, { approve: false, reason: '  ' }, () => closed++);
    await wait();
    expect(closed).toBe(0);
    expect(review.pending()).toBe(2);
  });
});
