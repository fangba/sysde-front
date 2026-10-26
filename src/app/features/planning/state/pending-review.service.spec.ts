import { describe, expect, it } from 'vitest';

import type { AnnualPlan } from '../data/planning.models';
import { countPending, countToDo } from './pending-review.service';

const plan = (over: Partial<AnnualPlan>): AnnualPlan => ({
  id: 'p',
  userId: 'u',
  year: 2026,
  status: 'BROUILLON',
  lines: [],
  ...over,
});
const line = {
  id: 'l',
  date: '2026-03-01',
  endDate: '2026-03-01',
  activityId: 'a',
  place: 'Lot 1',
  hours: 8,
};

describe('pastilles du menu Planning', () => {
  it('secrétaire : compte les plannings vides, en brouillon et rejetés', () => {
    const plans = [
      plan({}), // pas de planning
      plan({ lines: [line] }), // brouillon
      plan({ lines: [line], rejection: { reason: 'x', date: '2026-02-01' } }), // rejeté
      plan({ lines: [line], status: 'SOUMIS' }),
      plan({ lines: [line], status: 'VALIDE' }),
    ];
    expect(countToDo(plans)).toBe(3);
  });

  it('chef secteur : compte les plannings et activités soumis', () => {
    const plans = [
      plan({ status: 'SOUMIS', lines: [line] }),
      plan({ submissions: [{ activityId: 'a', status: 'SOUMIS' }] }),
    ];
    expect(countPending(plans)).toBe(2);
  });
});
