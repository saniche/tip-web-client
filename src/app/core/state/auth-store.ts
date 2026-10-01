import { Injectable, inject, signal, computed } from '@angular/core';
import { TipApi } from '../api/tip-api';
import { AuthSession, RegisterUserRequest } from '../models/auth.models';
import { Observable } from 'rxjs';



const INITIAL_AUTH_SESSION: AuthSession = {
  email: 'guest@tip.local',
  accessToken: null,
  isAuthenticated: false,
};

@Injectable({ providedIn: 'root' })
export class AuthStore {
    tipApi: TipApi = inject(TipApi);

  private readonly authState = signal<AuthSession>(INITIAL_AUTH_SESSION);
  readonly auth = this.authState.asReadonly();

  readonly isAuthenticated = computed(() => this.authState().isAuthenticated);

   login(email: string, _password: string): Observable<void> {
    return new Observable<void>((observer)=>{
    this.tipApi.login({email, password: _password}).subscribe({
      next: (response) => {
        this.authState.set({
          email,
          accessToken: response.accessToken,
          isAuthenticated: true,
        });
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
              this.authState.set({
                email: registerpaylod.email,
                accessToken: response.access_token,
                isAuthenticated: true,
              });
            console.log('Registration successful', response);
            observer.next();
            observer.complete();
          },
          error: (err) => {
              //throw error to the caller
              observer.error(err);
          },
        });

        // Simulate a registration API call
        console.log(`Registering user with email: ${registerpaylod.email} and password: ${registerpaylod.password}`);
      });
    }
  
    logout(): void {
      this.authState.set(INITIAL_AUTH_SESSION);
    }
}