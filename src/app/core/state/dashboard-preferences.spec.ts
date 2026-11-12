import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { USER_STORAGE_IDLE_LIFETIME_MS, writeUserStorage } from '../utils/user-storage';
import {
  DASHBOARD_PREFERENCES_KEY,
  DASHBOARD_WIDGETS,
  DashboardPreferencesStore,
  defaultDashboardPreferences,
} from './dashboard-preferences';

describe('DashboardPreferencesStore', () => {
  let store: DashboardPreferencesStore;
  const owner = 'first@example.test';

  beforeEach(() => {
    const records = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => records.get(key) ?? null,
      setItem: (key: string, value: string) => records.set(key, value),
      removeItem: (key: string) => records.delete(key),
      key: (index: number) => [...records.keys()][index] ?? null,
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    store = new DashboardPreferencesStore();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses the original visible ordering by default', () => {
    store.activate(owner);
    expect(store.preferences()).toEqual(defaultDashboardPreferences());
    expect(store.preferences().widgets.map((widget) => widget.id)).toEqual([
      'hero', 'profile', 'applications', 'follow-ups', 'matching', 'tailoring', 'interests', 'normalization',
    ]);
  });

  it('persists visibility, order and dismissal independently for each owner', () => {
    store.activate(owner);
    store.setVisible('hero', false);
    store.move('profile', -1);
    store.dismissChecklist();
    const expected = store.preferences();

    store.activate('second@example.test');
    expect(store.preferences()).toEqual(defaultDashboardPreferences());
    store.setVisible('matching', false);
    store.activate(' FIRST@example.test ');
    expect(store.preferences()).toEqual(expected);

    const reloaded = new DashboardPreferencesStore();
    reloaded.activate('second@example.test');
    expect(reloaded.preferences().widgets.find((widget) => widget.id === 'matching')?.visible).toBe(false);
    expect(reloaded.preferences().checklistDismissed).toBe(false);
  });

  it('preserves known order, ignores unknown widgets, and appends newly added ones', () => {
    writeUserStorage(owner, DASHBOARD_PREFERENCES_KEY, {
      widgets: [
        { id: 'matching', visible: false },
        { id: 'retired-widget', visible: true },
        { id: 'hero', visible: true },
      ],
      checklistDismissed: false,
    });
    store.activate(owner);
    expect(store.preferences().widgets).toEqual([
      { id: 'matching', visible: false },
      { id: 'hero', visible: true },
      ...DASHBOARD_WIDGETS.filter(({ id }) => id !== 'matching' && id !== 'hero').map(({ id }) => ({ id, visible: true })),
    ]);
  });

  it('expires preferences after seven idle days', () => {
    store.activate(owner);
    store.setVisible('hero', false);
    vi.advanceTimersByTime(USER_STORAGE_IDLE_LIFETIME_MS);
    store.activate(owner);
    expect(store.preferences()).toEqual(defaultDashboardPreferences());
  });

  it.each([
    ['malformed JSON', () => {
      writeUserStorage(owner, DASHBOARD_PREFERENCES_KEY, {});
      localStorage.setItem(localStorage.key(0)!, '{');
    }],
    ['invalid envelope', () => {
      writeUserStorage(owner, DASHBOARD_PREFERENCES_KEY, {});
      localStorage.setItem(localStorage.key(0)!, JSON.stringify({ version: 2 }));
    }],
    ['invalid shape', () => writeUserStorage(owner, DASHBOARD_PREFERENCES_KEY, { widgets: 'bad' })],
    ['duplicate widgets', () => writeUserStorage(owner, DASHBOARD_PREFERENCES_KEY, {
      widgets: [{ id: 'hero', visible: true }, { id: 'hero', visible: false }], checklistDismissed: false,
    })],
  ])('falls back and reports %s', (_label, arrange) => {
    arrange();
    store.activate(owner);
    expect(store.preferences()).toEqual(defaultDashboardPreferences());
    expect(store.error()).toContain('could not be restored');
  });

  it('reports read and write failures without claiming changes were saved', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    store.activate(owner);
    expect(store.error()).toContain('could not be restored');
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    store.setVisible('profile', false);
    expect(store.error()).toContain('could not be saved');
  });
});
