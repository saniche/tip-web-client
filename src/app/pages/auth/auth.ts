import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppStore } from '../../core/state/app-store';
import { AuthStore } from '../../core/state/auth-store';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-auth',
  styleUrl: './auth.scss',
  templateUrl: './auth.html',
})
export class Auth {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly authStore = inject(AuthStore);
  

  protected readonly isAuthenticated = this.authStore.isAuthenticated;
  protected readonly auth = this.authStore.authSession;
  
  protected readonly form = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });


  protected authenticationError  = signal (null);

  protected submit(): void {

    this.authenticationError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.authStore.login(email, password).subscribe({
      next: () => {
        console.log('Login successful');
        navigation.navigate('/');
      },
      error: (err) => {
        this.authenticationError.set(err.message);
        console.error('Login failed', err);
      }
    });
  }
}
