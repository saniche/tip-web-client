import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppStore } from '../../core/state/app-store';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-auth',
  styleUrl: './auth.scss',
  templateUrl: './auth.html',
})
export class Auth {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly store = inject(AppStore);

  protected readonly auth = this.store.auth;
  protected readonly isAuthenticated = this.store.isAuthenticated;
  protected readonly form = this.formBuilder.group({
    email: ['talent.ops@tip.dev', [Validators.required, Validators.email]],
    password: ['changeme', [Validators.required]],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.store.login(email, password);
  }
}
