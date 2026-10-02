import { Injectable, inject, computed } from '@angular/core';
import { LocalAuthStore } from './local-auth-store';
import { TipApi } from '../api/tip-api';
import { RegisterUserRequest } from '../models/auth.models';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  
  tipApi: TipApi = inject(TipApi);
  localAuthStore: LocalAuthStore = inject(LocalAuthStore);


  readonly isAuthenticated = computed(() => this.localAuthStore.isAuthenticated());
  readonly authSession = computed(() => this.localAuthStore.getSession());

   login(email: string, _password: string): Observable<void> {

    return new Observable<void>((observer)=>{
    
    this.tipApi.login({username: email, password: _password}).subscribe({
      next: (response) => {
        this.localAuthStore.login(response.access_token, { email, name: null }, 3600 * 23); // Example expiry of 23hour
        observer.next();
        observer.complete();

      },
      error: (err) => {
        observer.error(err);
      },
    });
  });
    }
    register(registerpaylod : RegisterUserRequest): Observable<void> {
      return new Observable<void>((observer) => {
        this.tipApi.register(registerpaylod).subscribe({
          next: (response) => {
            this.localAuthStore.login(response.access_token, { email: registerpaylod.email, name: null }, 3600 * 23); // Example expiry of 23hour
            observer.next();
            observer.complete();
          },
          error: (err) => {
              //throw error to the caller
              observer.error(err);
          },
        });

      });
    }
  
    logout(): void {
      this.localAuthStore.logout();
      this.localAuthStore.rehydrate();
    }

    Refresh(): void {
      this.localAuthStore.rehydrate();
    }
}