import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SubmissionStatus } from '../../core/models/normalization';
import { NormalizationStore } from '../../core/state/normalization-store';

const ACTIVE_STATUSES: readonly SubmissionStatus[] = ['submitting', 'pending', 'processing'];

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-normalize-job',
  styleUrl: './normalize-job.scss',
  templateUrl: './normalize-job.html',
})
export class NormalizeJob {
  private readonly store = inject(NormalizationStore);

  protected readonly submissions = this.store.submissions;
  protected readonly inProgressCount = this.store.inProgressCount;

  protected readonly form = new FormGroup({
    url: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    content: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected submitForm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { url, content } = this.form.getRawValue();
    const submissionId = this.store.submit(url, content);

    if (submissionId) {
      this.form.reset();
    }
  }

  protected dismiss(submissionId: string): void {
    this.store.dismiss(submissionId);
  }

  protected isActive(status: SubmissionStatus): boolean {
    return ACTIVE_STATUSES.includes(status);
  }
}
