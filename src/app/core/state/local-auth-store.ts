import { Injectable } from '@angular/core';
import { signalStore, withState, withMethods, withComputed, withHooks, patchState } from '@ngrx/signals';
import { User } from '../models/auth.models';

export interface LocalAuthState {
  token: string | null;
  user: User | null;
  expiresAt: number | null;
}

const INITIAL_AUTH_STATE: LocalAuthState = { token: null, user: null, expiresAt: null };
const AUTH_STORAGE_KEY = 'auth_state';
const MAX_TIMEOUT_MS = 2_147_483_647;

function isAuthState(value: unknown): value is LocalAuthState {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const user = record['user'];
  return typeof record['token'] === 'string' && record['token'].length > 0 &&
    typeof record['expiresAt'] === 'number' && Number.isFinite(record['expiresAt']) &&
    typeof user === 'object' && user !== null && !Array.isArray(user) &&
    typeof (user as Record<string, unknown>)['email'] === 'string' &&
    ((user as Record<string, unknown>)['name'] === null ||
      typeof (user as Record<string, unknown>)['name'] === 'string');
}

@Injectable({ providedIn: 'root' })
export class LocalAuthStore extends signalStore(
  withState(INITIAL_AUTH_STATE),
  withComputed((state) => ({
    isAuthenticated: () => {
      const token = state.token();
      const expiresAt = state.expiresAt();
      return !!token && !!expiresAt && Date.now() < expiresAt;
    },
    getSession: () => ({ token: state.token(), user: state.user() }),
  })),
  withMethods((store) => {
    let expiryTimer: ReturnType<typeof setTimeout> | null = null;
    const stopTimer = (): void => {
      if (expiryTimer !== null) clearTimeout(expiryTimer);
      expiryTimer = null;
    };
    const logout = (): void => {
      stopTimer();
      patchState(store, INITIAL_AUTH_STATE);
      if (typeof sessionStorage !== 'undefined') {
        try {
          sessionStorage.removeItem(AUTH_STORAGE_KEY);
        } catch (error: unknown) {
          console.error('Unable to clear the authentication session', error);
        }
      }
    };
    const scheduleExpiry = (expiresAt: number): void => {
      stopTimer();
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        logout();
        return;
      }
      expiryTimer = setTimeout(() => scheduleExpiry(expiresAt), Math.min(remaining, MAX_TIMEOUT_MS));
    };
    return {
      login(token: string, user: User, expiresInSeconds: number): void {
        const expiresAt = Date.now() + expiresInSeconds * 1000;
        const state = { token, user, expiresAt };
        if (!isAuthState(state) || !user.email.trim() || expiresInSeconds <= 0) {
          throw new TypeError('The authentication session is invalid.');
        }
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
        }
        patchState(store, state);
        scheduleExpiry(expiresAt);
      },
      logout,
      rehydrate(): void {
        try {
          if (typeof localStorage !== 'undefined') localStorage.removeItem(AUTH_STORAGE_KEY);
        } catch (error: unknown) {
          console.error('Unable to remove the legacy authentication credential', error);
        }
        if (typeof sessionStorage === 'undefined') return;
        try {
          const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
          if (raw === null) {
            stopTimer();
            patchState(store, INITIAL_AUTH_STATE);
            return;
          }
          const saved: unknown = JSON.parse(raw);
          if (!isAuthState(saved)) {
            throw new TypeError('The saved authentication session is invalid.');
          }
          if (!saved.expiresAt || Date.now() >= saved.expiresAt) {
            logout();
            return;
          }
          patchState(store, saved);
          scheduleExpiry(saved.expiresAt);
        } catch (error: unknown) {
          console.error('Unable to restore the authentication session', error);
          logout();
        }
      },
      stopExpiryTimer: stopTimer,
    };
  }),
  withHooks({
    onDestroy(store) {
      store.stopExpiryTimer();
    },
  }),
) {}
