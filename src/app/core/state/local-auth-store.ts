import { Injectable } from '@angular/core';
import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { User } from '../models/auth.models';


export interface LocalAuthState {
  token: string | null;
  user: User | null;
  expiresAt: number | null; // Unix timestamp in ms
}

const INITIAL_AUTH_STATE: LocalAuthState = {
  token: null,
  user: null,
  expiresAt: null
};

@Injectable({ providedIn: 'root' })
export class LocalAuthStore extends signalStore(

  //Add state feature
  withState(INITIAL_AUTH_STATE),

  //Computed signals
  withComputed((state) => ({

    isAuthenticated: () => {
      const token = state.token();
      const expiresAt = state.expiresAt();
      return !!token && !!expiresAt && Date.now() < expiresAt;
    },

    getSession: () => ( {
      token: state.token(),
      user: state.user(),
    })

  })),

  //Methods
  withMethods((store) => ({
    
    login(token: string, user: User, expiresInSeconds: number) {
      const expiresAt = Date.now() + expiresInSeconds * 1000;
      patchState(store,{ token, user, expiresAt });
      saveToLocalStorage({ token, user, expiresAt });
    },

    logout() {
      patchState(store,{ token: null, user: null, expiresAt: null });
      clearLocalStorage();
    },

    rehydrate() {

      console.log('Rehydrating local auth state from localStorage');
      const saved = loadFromLocalStorage();
      if (!saved) return;

      // Remove if expired
      if (saved.expiresAt && Date.now() >= saved.expiresAt) {
        clearLocalStorage();
        return;
      }


      patchState(store,saved);

      console.log('token', saved.token);
      console.log('user', saved.user);
      console.log('expiresAt', saved.expiresAt);
      console.log('Local auth state rehydrated successfully');
    }

  }))
) {}

// --- LocalStorage helpers ---
function saveToLocalStorage(state: LocalAuthState) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem('auth_state', JSON.stringify(state));
}

function loadFromLocalStorage(): LocalAuthState | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem('auth_state');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LocalAuthState;
  } catch {
    return null;
  }
}

function clearLocalStorage() {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem('auth_state');
}