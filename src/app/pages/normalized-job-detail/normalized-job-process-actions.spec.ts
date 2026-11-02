import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'ngx-sonner';
import { TipApi } from '../../core/api/tip-api';
import { NormalizedJobDetail as JobDetail } from '../../core/models/normalized-job';
import { MatchingStore } from '../../core/state/matching-store';
import { TailoredCvStore } from '../../core/state/tailored-cv-store';
import { NormalizedJobProcessActions } from './normalized-job-process-actions';

const job: JobDetail = {
  id: 'job-1',
  url: 'https://example.com/job-1',
  title: 'Senior Engineer',
  company: 'Northwind',
  location: 'Remote',
  salary: '$150,000',
  source: 'career-site',
  postingDate: '2026-10-13',
  summary: 'Summary',
  keyResponsibilities: 'First responsibility',
  requirements: 'First requirement',
  desirables: 'Preferred skill',
  toolsAndTechnologies: ['TypeScript'],
  additionals: ['Remote'],
  status: 'completed',
  submitterId: 'user-1',
  createdAt: '2026-10-13T12:00:00Z',
  hasWriteAccess: true,
  isInterested: false,
  isApplied: false,
};

describe('NormalizedJobProcessActions', () => {
  let fixture: ComponentFixture<NormalizedJobProcessActions>;
  let api: {
    createApplication: ReturnType<typeof vi.fn>;
    updateApplicationStatus: ReturnType<typeof vi.fn>;
  };
  let matching: { addJob: ReturnType<typeof vi.fn> };
  let tailoring: { addJobFromDetail: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    api = {
      createApplication: vi.fn(() => of({ id: 'application-1', status: 'NotStarted' })),
      updateApplicationStatus: vi.fn(() => of(undefined)),
    };
    matching = { addJob: vi.fn(() => true) };
    tailoring = { addJobFromDetail: vi.fn(() => 'added') };

    await TestBed.configureTestingModule({
      imports: [NormalizedJobProcessActions],
      providers: [
        provideRouter([]),
        { provide: TipApi, useValue: api },
        { provide: MatchingStore, useValue: matching },
        { provide: TailoredCvStore, useValue: tailoring },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  function render(selectedJob: JobDetail = job, isApplied = false): void {
    fixture = TestBed.createComponent(NormalizedJobProcessActions);
    fixture.componentRef.setInput('job', selectedJob);
    fixture.componentRef.setInput('isApplied', isApplied);
    fixture.detectChanges();
  }

  function root(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function button(text: string): HTMLButtonElement {
    return Array.from(root().querySelectorAll('button')).find((item) =>
      item.textContent?.includes(text),
    )!;
  }

  it('adds the current job to matching and shows success feedback', () => {
    const successToast = vi.spyOn(toast, 'success');
    render();

    button('Add to matching session').click();

    expect(matching.addJob).toHaveBeenCalledWith({
      jobId: 'job-1',
      title: 'Senior Engineer',
      company: 'Northwind',
      location: 'Remote',
      source: 'career-site',
      entrySource: 'normalized-jobs',
      interestState: 'unknown',
    });
    expect(successToast).toHaveBeenCalledWith('Job added to the matching session.');
  });

  it('shows failure feedback when matching cannot accept the job', () => {
    const errorToast = vi.spyOn(toast, 'error');
    matching.addJob.mockReturnValue(false);
    render();

    button('Add to matching session').click();

    expect(errorToast).toHaveBeenCalledWith('Unable to add this job to the matching session.');
  });

  it('opens a modal dialog and saves the application and selected status', () => {
    const successToast = vi.spyOn(toast, 'success');
    render();
    const dialog = root().querySelector<HTMLDialogElement>('dialog')!;
    const showModal = vi.fn();
    Object.defineProperty(dialog, 'showModal', { configurable: true, value: showModal });
    const tracked = vi.fn();
    fixture.componentInstance.applicationTracked.subscribe(tracked);

    button('Application').click();
    fixture.detectChanges();

    expect(showModal).toHaveBeenCalledOnce();
    expect(fixture.componentInstance['applicationForm'].controls.status.value).toBe('Applied');
    fixture.componentInstance['applicationForm'].controls.status.setValue('Interview');
    fixture.componentInstance['applicationForm'].controls.notes.setValue('Sent a portfolio');
    fixture.componentInstance['submitApplication']();

    expect(api.createApplication).toHaveBeenCalledWith({
      jobId: 'job-1',
      recruiterInfo: { name: null, email: null, phone: null },
      contactDate: null,
      followUpDate: null,
      workAuthorizationDiscussed: null,
      notes: 'Sent a portfolio',
    });
    expect(api.updateApplicationStatus).toHaveBeenCalledWith('application-1', 'Interview');
    expect(tracked).toHaveBeenCalledOnce();
    expect(successToast).toHaveBeenCalledWith('Application saved with status Interview.');
  });

  it('leaves the modal open and shows failure feedback when application creation fails', () => {
    const errorToast = vi.spyOn(toast, 'error');
    api.createApplication.mockReturnValue(throwError(() => new Error('offline')));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render();
    const dialog = root().querySelector<HTMLDialogElement>('dialog')!;
    Object.defineProperty(dialog, 'showModal', { configurable: true, value: vi.fn() });
    button('Application').click();
    fixture.componentInstance['submitApplication']();

    expect(fixture.componentInstance['applicationDialogOpen']()).toBe(true);
    expect(errorToast).toHaveBeenCalledWith('Unable to save the application. Please try again.');
  });

  it('reports a partial failure if the created application status cannot be updated', () => {
    const errorToast = vi.spyOn(toast, 'error');
    api.updateApplicationStatus.mockReturnValue(throwError(() => new Error('offline')));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render();
    const dialog = root().querySelector<HTMLDialogElement>('dialog')!;
    Object.defineProperty(dialog, 'showModal', { configurable: true, value: vi.fn() });
    const tracked = vi.fn();
    fixture.componentInstance.applicationTracked.subscribe(tracked);
    button('Application').click();
    fixture.componentInstance['submitApplication']();

    expect(tracked).toHaveBeenCalledOnce();
    expect(fixture.componentInstance['applicationDialogOpen']()).toBe(false);
    expect(errorToast).toHaveBeenCalledWith(
      'Application saved, but its status could not be updated. Update it from the application journal.',
    );
  });

  it('hides application and tailoring actions when not applicable', () => {
    render({ ...job, status: 'processing' }, true);

    expect(root().textContent).not.toContain('Application');
    expect(root().textContent).not.toContain('Add to tailoring');
    expect(tailoring.addJobFromDetail).not.toHaveBeenCalled();
  });
});
