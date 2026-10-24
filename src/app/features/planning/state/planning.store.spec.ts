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
      'Formation à la saignée',
      'Suivi post perfectionnement',
      'Recyclage des saigneurs',
      'Perfectionnement in situ',
    ]);
    expect(mine.upsertLine(null, { ...input(5), activityId: 'ac-7' })).toContain('pas proposée');
    expect(mine.activityLabel('ac-4')).toBe('Formation à la saignée');
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

describe("soumission d'une seule activité", () => {
  const recyclage = (day: number, over: Partial<ReturnType<typeof input>> = {}) => ({
    ...input(day),
    endDate: `${year}-06-${String(day + 2).padStart(2, '0')}`,
    activityId: 'ac-6',
    ...over,
  });

  it("verrouille l'activité soumise sans toucher aux autres", async () => {
    const { mine } = await setup('collaborateur@sysde.ci', 'CF');
    mine.load();
    await wait();
    expect(mine.canSubmitActivities()).toBe(true);
    expect(mine.upsertLine(null, recyclage(9))).toBeNull();

    mine.submitActivity('ac-6');
    await wait();
    await wait();
    expect(mine.plan()?.status).toBe('BROUILLON');
    expect(mine.submissionOf('ac-6')?.status).toBe('SOUMIS');
    expect(mine.isLocked('ac-6')).toBe(true);
    expect(mine.isLocked('ac-4')).toBe(false);
    expect(mine.upsertLine(null, recyclage(20))).toContain('soumise');
    const line = mine.draft().find((l) => l.activityId === 'ac-6')!;
    expect(mine.removeLine(line.id)).toContain('soumise');
    expect(mine.upsertLine(null, input(25))).toBeNull();
    // Remplacer le brouillon par un import garde les dates de l'activité soumise.
    expect(mine.importLines([input(12)], 'replace')).toBeNull();
    expect(mine.draft().filter((l) => l.activityId === 'ac-6')).toHaveLength(1);
  });

  it('refuse de soumettre une activité sans date ou dont les dates sont incohérentes', async () => {
    const { mine } = await setup('collaborateur@sysde.ci', 'CF');
    mine.load();
    await wait();
    mine.submitActivity('ac-6');
    await wait();
    expect(mine.submissionOf('ac-6')).toBeUndefined();
    // Deux séances pour 1 attendue par an.
    mine.upsertLine(null, recyclage(9));
    mine.upsertLine(null, recyclage(16));
    mine.submitActivity('ac-6');
    await wait();
    expect(mine.submissionOf('ac-6')).toBeUndefined();
    expect(mine.isLocked('ac-6')).toBe(false);
  });

  it("n'est pas proposée au chef secteur, dont le planning est validé d'office", async () => {
    const { mine } = await setup('chef.secteur@sysde.ci', 'CS');
    mine.load();
    await wait();
    expect(mine.canSubmitActivities()).toBe(false);
  });

  it('est validée ou rejetée par le chef secteur, un rejet rend les dates modifiables', async () => {
    const { mine, review } = await setup('collaborateur@sysde.ci', 'CF');
    mine.load();
    await wait();
    mine.upsertLine(null, recyclage(9));
    mine.submitActivity('ac-6');
    await wait();
    await wait();
    review.plans.set([mine.plan()!]);
    expect(review.pendingActivities()).toBe(1);

    let closed = 0;
    review.decideActivity(mine.plan()!, 'ac-6', { approve: false, reason: ' ' }, () => closed++);
    await wait();
    expect(closed).toBe(0);
    review.decideActivity(
      mine.plan()!,
      'ac-6',
      { approve: false, reason: 'Revoir la date.' },
      () => closed++,
    );
    await wait();
    expect(closed).toBe(1);
    expect(review.activityRows()[0]?.submission).toMatchObject({
      status: 'REJETE',
      rejection: { reason: 'Revoir la date.' },
    });
    expect(review.pendingActivities()).toBe(0);
    mine.load();
    await wait();
    expect(mine.isLocked('ac-6')).toBe(false);
    expect(mine.submissionOf('ac-6')?.rejection?.reason).toBe('Revoir la date.');

    mine.submitActivity('ac-6');
    await wait();
    await wait();
    review.plans.set([mine.plan()!]);
    review.decideActivity(mine.plan()!, 'ac-6', { approve: true }, () => closed++);
    await wait();
    expect(review.activityRows()[0]?.submission.status).toBe('VALIDE');
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
