import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { AuthStore } from '../../../core/state/auth-store';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-register',
  styleUrl: './register.scss',
  templateUrl: './register.html',
})
export class Register {

  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly authStore = inject(AuthStore);

  readonly isAuthenticated = this.authStore.isAuthenticated;
  
  protected readonly form = this.formBuilder.group(
    {
      displayName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      passwordConfimmation: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator() },
  );

  protected submitted = false;
  protected registrationError = '';
  protected registrationComplete = false;

  protected submit(): void {
    this.submitted = true;
    this.registrationError = '';
    this.registrationComplete = false;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.authStore.register(this.form.getRawValue()).subscribe({
      next: () => {
        this.registrationComplete = true;
        this.form.reset();
      },
      error: () => {
        this.registrationError = 'Registration could not be completed. Please try again.';
      },
    });
  }
}



function passwordsMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password')?.value;
    const confirmation = control.get('passwordConfimmation')?.value;

    return password === confirmation ? null : { passwordsMismatch: true };
  };
}
