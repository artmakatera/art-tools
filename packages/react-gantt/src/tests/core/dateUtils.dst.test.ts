import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { addDays, diffDays } from '../../core/dateUtils';

// Isolated in its own file: it pins the process timezone, and vitest runs each
// test file in its own worker so the change can't leak sideways. Node resolves
// TZ per Date construction, so stubbing the env is enough — no reload needed.
beforeAll(() => {
  // Has both a fall-back (Nov 1) and a spring-forward (Mar 8) transition in 2026.
  vi.stubEnv('TZ', 'America/New_York');
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe('addDays across DST transitions', () => {
  it('actually runs in a DST zone', () => {
    // Guard: if the stub ever stops taking effect, the cases below would still
    // pass in a no-DST zone and quietly stop testing anything.
    const jan = new Date(2026, 0, 15).getTimezoneOffset();
    const jul = new Date(2026, 6, 15).getTimezoneOffset();
    expect(jan).not.toBe(jul);
    expect(jan).toBe(300); // EST = UTC-5
  });

  it('advances past a 25-hour fall-back day instead of stalling inside it', () => {
    // Regression: adding 86_400_000 ms landed back inside Nov 1 (which has 25
    // hours in this zone), so every subsequent call returned the same instant
    // and a held arrow key could never move a bar past the boundary.
    let d = new Date(2026, 9, 30);
    const seen: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      d = addDays(d, 1);
      seen.push(d.toDateString());
    }
    expect(seen).toEqual([
      'Sat Oct 31 2026',
      'Sun Nov 01 2026',
      'Mon Nov 02 2026',
      'Tue Nov 03 2026',
      'Wed Nov 04 2026',
    ]);
  });

  it('advances past a 23-hour spring-forward day', () => {
    let d = new Date(2026, 2, 6);
    const seen: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      d = addDays(d, 1);
      seen.push(d.toDateString());
    }
    expect(seen).toEqual([
      'Sat Mar 07 2026',
      'Sun Mar 08 2026',
      'Mon Mar 09 2026',
      'Tue Mar 10 2026',
    ]);
  });

  it('always lands on local midnight and never repeats a day over a full year', () => {
    const days = new Set<string>();
    let d = new Date(2026, 0, 1);
    for (let i = 0; i < 365; i += 1) {
      d = addDays(d, 1);
      expect(d.getHours()).toBe(0);
      expect(d.getMinutes()).toBe(0);
      days.add(d.toDateString());
    }
    expect(days.size).toBe(365);
  });

  it('is invertible across a transition', () => {
    const start = new Date(2026, 10, 1);
    expect(addDays(addDays(start, 5), -5).getTime()).toBe(start.getTime());
    expect(diffDays(start, addDays(start, 5))).toBe(5);
  });
});
