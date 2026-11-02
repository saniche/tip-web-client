import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthStore } from './auth-store';
import { LocalAuthStore } from './local-auth-store';

describe('LocalAuthStore rehydration', () => {
  let store: LocalAuthStore;
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    store = TestBed.inject(LocalAuthStore);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('clears the in-memory session when storage has expired', () => {
    vi.useFakeTimers();
    const auth = TestBed.inject(AuthStore);
    store.login('token', { email: 'user@example.test', name: null }, 60);
    expect(auth.isAuthenticated()).toBe(true);

    vi.advanceTimersByTime(60_000);
    auth.Refresh();

    expect(auth.isAuthenticated()).toBe(false);
    expect(store.getSession().token).toBeNull();
    expect(storage.has('auth_state')).toBe(false);
  });

  it('clears an in-memory session removed from session storage', () => {
    store.login('token', { email: 'user@example.test', name: null }, 60);
    storage.delete('auth_state');
    store.rehydrate();

    expect(store.isAuthenticated()).toBe(false);
    expect(store.getSession().token).toBeNull();
  });

  it('automatically ends the session at expiry without deleting persistent user data', () => {
    vi.useFakeTimers();
    const persistent = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      setItem: (key: string, value: string) => persistent.set(key, value),
      getItem: (key: string) => persistent.get(key) ?? null,
      removeItem: (key: string) => persistent.delete(key),
    });
    localStorage.setItem('test-user-data', 'retained');
    store.login('token', { email: 'user@example.test', name: null }, 60);
    vi.advanceTimersByTime(60_000);
    expect(store.getSession().token).toBeNull();
    expect(storage.has('auth_state')).toBe(false);
    expect(localStorage.getItem('test-user-data')).toBe('retained');
  });

  it('removes only the legacy persistent credential during rehydration', () => {
    const persistent = new Map([
      ['auth_state', 'legacy credential'],
      ['user-data', 'retained'],
    ]);
    vi.stubGlobal('localStorage', {
      removeItem: (key: string) => persistent.delete(key),
    });

    store.rehydrate();

    expect(persistent.has('auth_state')).toBe(false);
    expect(persistent.get('user-data')).toBe('retained');
  });

  it('does not authenticate if session storage cannot be written', () => {
    vi.spyOn(sessionStorage, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    expect(() => store.login('token', { email: 'user@example.test', name: null }, 60))
      .toThrow('storage unavailable');
    expect(store.getSession().token).toBeNull();
  });
});
