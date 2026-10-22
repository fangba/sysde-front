import { describe, expect, it } from 'vitest';

import { canPlan, canTask, dashboardKind } from './access';

describe('canPlan', () => {
  it.each(['CS', 'CF', 'CO', 'FS', 'MO', 'ES', 'SE'])('ouvre le Planning au poste %s', (poste) => {
    expect(canPlan({ administrator: false, poste })).toBe(true);
  });

  it.each(['CD', 'SU'])('refuse le Planning au poste %s', (poste) => {
    expect(canPlan({ administrator: false, poste })).toBe(false);
  });

  it("refuse le Planning à un compte sans poste et à l'administrateur", () => {
    expect(canPlan({ administrator: false })).toBe(false);
    expect(canPlan({ administrator: true, poste: 'CS' })).toBe(false);
  });
});

describe('canTask', () => {
  it.each(['SU', 'CF', 'CO', 'FS', 'MO', 'ES', 'SE'])('refuse les Tâches au poste %s', (poste) => {
    expect(canTask({ administrator: false, poste })).toBe(false);
  });

  it.each(['CD', 'CS'])('ouvre les Tâches au poste %s', (poste) => {
    expect(canTask({ administrator: false, poste })).toBe(true);
  });

  it("ouvre les Tâches à l'administrateur", () => {
    expect(canTask({ administrator: true })).toBe(true);
  });
});

describe('dashboardKind', () => {
  it.each(['CF', 'CO', 'FS', 'MO', 'ES'])('donne un dashboard de terrain au poste %s', (poste) => {
    expect(dashboardKind({ administrator: false, poste })).toBe('field');
  });

  it('donne un dashboard de secrétaire au poste SE', () => {
    expect(dashboardKind({ administrator: false, poste: 'SE' })).toBe('secretary');
  });

  it.each(['CD', 'CS', 'SU'])('garde le dashboard standard au poste %s', (poste) => {
    expect(dashboardKind({ administrator: false, poste })).toBe('standard');
  });

  it("garde le dashboard standard à l'administrateur", () => {
    expect(dashboardKind({ administrator: true, poste: 'MO' })).toBe('standard');
  });
});
