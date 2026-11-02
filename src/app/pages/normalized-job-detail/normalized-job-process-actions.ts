import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { toast } from 'ngx-sonner';
import { TipApi } from '../../core/api/tip-api';
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  ApplicationStatus,
  CreateApplicationRequest,
} from '../../core/models/application-journal';
import { NormalizedJobDetail as JobDetail } from '../../core/models/normalized-job';
import { MatchingStore } from '../../core/state/matching-store';
import { TailoredCvStore } from '../../core/state/tailored-cv-store';

@Component({
  imports: [RouterLink, ReactiveFormsModule],
  selector: 'app-normalized-job-process-actions',
  styleUrl: './normalized-job-process-actions.scss',
  templateUrl: './normalized-job-process-actions.html',
})
export class NormalizedJobProcessActions {
  private readonly api = inject(TipApi);
  private readonly tailoring = inject(TailoredCvStore);
  private readonly matching = inject(MatchingStore);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('applicationDialog') private applicationDialog?: ElementRef<HTMLDialogElement>;

  readonly job = input.required<JobDetail>();
  readonly isApplied = input<boolean | null>(null);
  readonly busy = input(false);
  readonly applicationTracked = output<void>();

  protected readonly applicationDialogOpen = signal(false);
  protected readonly applicationSubmitting = signal(false);
  protected readonly applicationStatuses = APPLICATION_STATUSES;
  protected readonly applicationForm = new FormGroup({
    status: new FormControl<ApplicationStatus>('Applied', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
  });

  protected addToMatchingSession(): void {
    const job = this.job();
    try {
      const added = this.matching.addJob({
        jobId: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        source: job.source,
        entrySource: 'normalized-jobs',
        interestState: 'unknown',
      });
      if (added) {
        toast.success('Job added to the matching session.');
      } else {
        toast.error('Unable to add this job to the matching session.');
      }
    } catch (error: unknown) {
      console.error('Unable to add the job to the matching session', error);
      toast.error('Unable to add this job to the matching session.');
    }
  }

  protected addToTailoring(): void {
    try {
      const result = this.tailoring.addJobFromDetail(this.job());
      switch (result) {
        case 'added':
          toast.success('Job added to your tailoring session.');
          break;
        case 'added-not-saved':
          toast.warning('Job added for now, but the tailoring session could not be saved.');
          break;
        case 'duplicate':
          toast.info('This job is already in your tailoring session.');
          break;
        case 'running':
          toast.error('Jobs cannot be added while tailoring is running.');
          break;
        case 'report-draft':
          toast.error(
            'A matching-report session is open. Finish or discard it before adding another job.',
          );
          break;
        case 'limit':
          toast.error('Select at most 10 jobs in a tailoring session.');
          break;
        case 'invalid':
          toast.error('Only an identified, completed job can be added.');
          break;
        case 'unauthenticated':
          toast.error('Sign in before adding a job to tailoring.');
          break;
        case 'busy':
          toast.error('The tailoring session is being updated. Please try again.');
          break;
        case 'storage-unavailable':
          toast.error('The saved tailoring session could not be accessed. No job was added.');
          break;
      }
    } catch (error: unknown) {
      console.error('Unable to add the job to tailoring', error);
      toast.error('Unable to add the job to tailoring. Please try again.');
    }
  }

  protected openApplicationDialog(): void {
    if (this.isApplied() || this.applicationSubmitting()) {
      return;
    }

    const dialog = this.applicationDialog?.nativeElement;
    if (!dialog) {
      console.error('The application dialog is unavailable.');
      toast.error('Unable to open the application form. Please try again.');
      return;
    }

    this.applicationForm.reset({ status: 'Applied', notes: '' });
    dialog.showModal();
    this.applicationDialogOpen.set(true);
  }

  protected closeApplicationDialog(): void {
    if (this.applicationSubmitting()) {
      return;
    }
    this.closeDialogAndReset();
  }

  protected handleDialogCancel(event: Event): void {
    if (this.applicationSubmitting()) {
      event.preventDefault();
      return;
    }
    this.applicationDialogOpen.set(false);
    this.resetApplicationForm();
  }

  protected submitApplication(): void {
    const job = this.job();
    if (!job.id || this.isApplied() || this.applicationSubmitting()) {
      return;
    }

    const { status, notes } = this.applicationForm.getRawValue();
    const request: CreateApplicationRequest = {
      jobId: job.id,
      recruiterInfo: { name: null, email: null, phone: null },
      contactDate: null,
      followUpDate: null,
      workAuthorizationDiscussed: null,
      notes: notes.trim() || null,
    };

    this.applicationSubmitting.set(true);
    this.api
      .createApplication(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.applicationTracked.emit();
          if (created.status === status) {
            this.finishApplication(status);
            return;
          }

          this.api
            .updateApplicationStatus(created.id, status)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: () => this.finishApplication(status),
              error: (error: unknown) => {
                console.error('Application was created, but its status update failed', error);
                this.applicationSubmitting.set(false);
                this.closeDialogAndReset();
                toast.error(
                  'Application saved, but its status could not be updated. Update it from the application journal.',
                );
              },
            });
        },
        error: (error: unknown) => {
          console.error('Unable to create the application', error);
          this.applicationSubmitting.set(false);
          toast.error('Unable to save the application. Please try again.');
        },
      });
  }

  protected applicationStatusLabel(status: ApplicationStatus): string {
    return APPLICATION_STATUS_LABELS[status];
  }

  private finishApplication(status: ApplicationStatus): void {
    this.applicationSubmitting.set(false);
    this.closeDialogAndReset();
    toast.success(`Application saved with status ${APPLICATION_STATUS_LABELS[status]}.`);
  }

  private closeDialogAndReset(): void {
    const dialog = this.applicationDialog?.nativeElement;
    if (dialog?.open) {
      dialog.close();
    }
    this.applicationDialogOpen.set(false);
    this.resetApplicationForm();
  }

  private resetApplicationForm(): void {
    this.applicationForm.reset({ status: 'Applied', notes: '' });
  }
}
