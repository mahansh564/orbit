import { describe, expect, it } from 'vitest';
import {
  applyActionToSnapshot,
  deriveStateFromAction,
  levelFromXp,
  type CreatureSnapshot
} from '../src/webview/entities/Creature';

describe('Creature state machine', () => {
  it('maps actions to expected states', () => {
    expect(deriveStateFromAction('read')).toBe('foraging');
    expect(deriveStateFromAction('write')).toBe('working');
    expect(deriveStateFromAction('test_fail')).toBe('distressed');
    expect(deriveStateFromAction('complete')).toBe('celebrating');
  });

  it('updates xp mood and level for positive actions', () => {
    const initial = {
      state: 'idle' as const,
      xp: 48,
      level: 1,
      mood: 0,
      updatedAt: 0
    };

    const next = applyActionToSnapshot(initial, 'test_pass', 1000);

    expect(next.state).toBe('celebrating');
    expect(next.xp).toBeGreaterThan(initial.xp);
    expect(next.level).toBeGreaterThanOrEqual(2);
    expect(next.mood).toBeGreaterThan(initial.mood);
    expect(next.updatedAt).toBe(1000);
  });

  it('clamps mood to lower bound for repeated failures', () => {
    let snapshot: CreatureSnapshot = {
      state: 'idle' as const,
      xp: 0,
      level: 1,
      mood: 0,
      updatedAt: 0
    };

    for (let i = 0; i < 30; i += 1) {
      snapshot = applyActionToSnapshot(snapshot, 'error', i + 1);
    }

    expect(snapshot.mood).toBeGreaterThanOrEqual(-100);
    expect(snapshot.state).toBe('distressed');
  });

  it('computes levels from thresholds', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(60)).toBeGreaterThanOrEqual(2);
    expect(levelFromXp(1200)).toBeGreaterThanOrEqual(8);
  });
});
