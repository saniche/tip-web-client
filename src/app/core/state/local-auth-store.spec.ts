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
    vi.stubGlobal('localStorage', {
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

  it('clears an in-memory session removed from storage by another tab', () => {
    store.login('token', { email: 'user@example.test', name: null }, 60);
    storage.delete('auth_state');
    store.rehydrate();

    expect(store.isAuthenticated()).toBe(false);
    expect(store.getSession().token).toBeNull();
  });
});
