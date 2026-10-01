import { Component, inject } from '@angular/core';
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
  protected readonly auth = this.authStore.auth;
  
  protected readonly form = this.formBuilder.group({
    email: ['talent.ops@tip.dev', [Validators.required, Validators.email]],
    password: ['changeme', [Validators.required]],
  });

  protected registrationError : string | null = null;

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.authStore.login(email, password).subscribe({
      next: () => {
        console.log('Login successful');
      },
      error: (err) => {
        console.error('Login failed', err);
      }
    });
  }
}
