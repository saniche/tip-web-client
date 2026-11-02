import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  USER_STORAGE_IDLE_LIFETIME_MS,
  readUserStorage,
  removeUserStorage,
  writeUserStorage,
} from './user-storage';

const isString = (value: unknown): value is string => typeof value === 'string';

describe('user storage', () => {
  beforeEach(() => {
    const records = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      get length() { return records.size; },
      getItem: (key: string) => records.get(key) ?? null,
      setItem: (key: string, value: string) => records.set(key, value),
      removeItem: (key: string) => records.delete(key),
      key: (index: number) => [...records.keys()][index] ?? null,
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('isolates owners and normalizes their email', () => {
    writeUserStorage(' Person@Example.test ', 'session', 'first');
    writeUserStorage('other@example.test', 'session', 'second');
    expect(readUserStorage('person@example.test', 'session', isString)).toBe('first');
    expect(readUserStorage('other@example.test', 'session', isString)).toBe('second');
    expect(readUserStorage('missing@example.test', 'session', isString)).toBeNull();
  });

  it('does not collide when owner names and storage names contain dots', () => {
    writeUserStorage('a@example.test', 'jobs.detail', 'first');
    writeUserStorage('a@example.test.jobs', 'detail', 'second');
    expect(readUserStorage('a@example.test', 'jobs.detail', isString)).toBe('first');
    expect(readUserStorage('a@example.test.jobs', 'detail', isString)).toBe('second');
  });

  it('renews the expiry after a successful read or write', () => {
    writeUserStorage('a@example.test', 'session', 'first');
    vi.advanceTimersByTime(USER_STORAGE_IDLE_LIFETIME_MS - 1);
    expect(readUserStorage('a@example.test', 'session', isString)).toBe('first');
    vi.advanceTimersByTime(USER_STORAGE_IDLE_LIFETIME_MS - 1);
    writeUserStorage('a@example.test', 'session', 'second');
    vi.advanceTimersByTime(USER_STORAGE_IDLE_LIFETIME_MS - 1);
    expect(readUserStorage('a@example.test', 'session', isString)).toBe('second');
  });

  it('removes expired data at the exact deadline without renewing it', () => {
    writeUserStorage('a@example.test', 'session', 'first');
    vi.advanceTimersByTime(USER_STORAGE_IDLE_LIFETIME_MS);
    expect(readUserStorage('a@example.test', 'session', isString)).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  it('reports invalid data without renewing or removing it', () => {
    writeUserStorage('a@example.test', 'session', 123);
    const key = localStorage.key(0)!;
    const before = localStorage.getItem(key);
    expect(() => readUserStorage('a@example.test', 'session', isString)).toThrow('invalid shape');
    expect(localStorage.getItem(key)).toBe(before);
  });

  it('reports storage write failures when attempting to renew a read', () => {
    writeUserStorage('a@example.test', 'session', 'first');
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    expect(() => readUserStorage('a@example.test', 'session', isString)).toThrow('Storage unavailable');
    vi.restoreAllMocks();
  });

  it('removes only the requested owner and rejects empty owners', () => {
    writeUserStorage('a@example.test', 'session', 'first');
    writeUserStorage('b@example.test', 'session', 'second');
    removeUserStorage('a@example.test', 'session');
    expect(readUserStorage('a@example.test', 'session', isString)).toBeNull();
    expect(readUserStorage('b@example.test', 'session', isString)).toBe('second');
    expect(() => writeUserStorage(' ', 'session', 'first')).toThrow('owner');
  });
});
