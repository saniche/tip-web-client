import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TipApi } from '../../core/api/tip-api';
import { ApplicationJournalEntry as JournalEntry } from '../../core/models/application-journal';
import { NormalizedJob, NormalizedJobsPage } from '../../core/models/normalized-job';
import { ApplicationJournalEntry } from './application-journal-entry';

const job: NormalizedJob = {
  id: 'job-1',
  title: 'Senior Engineer',
  company: 'Northwind',
  location: 'Remote',
  postingDate: '2026-10-20',
  source: 'https://example.com/job-1',
};

const normalizedJobPage: NormalizedJobsPage = {
  items: [job],
  limit: 10,
  total: 1,
  page: 1,
};

const entry: JournalEntry = {
  id: 'application-1',
  createdAt: '2026-10-22T12:00:00Z',
  updatedAt: null,
  status: 'Applied',
  job: { ...job, url: 'https://example.com/job-1' },
  recruiterName: 'Avery Recruiter',
  recruiterEmail: 'avery@example.com',
  contactDate: '2026-10-22',
  followUpDate: '2026-10-30',
  workAuthorizationDiscussed: true,
  notes: 'Submitted application',
  statusHistory: [
    {
      id: 'history-1',
      status: 'NotStarted',
      changedAt: '2026-10-22T12:00:00Z',
      note: null,
    },
    {
      id: 'history-2',
      status: 'Applied',
      changedAt: '2026-10-23T12:00:00Z',
      note: 'Submitted application',
    },
  ],
};

describe('ApplicationJournalEntry', () => {
  let fixture: ComponentFixture<ApplicationJournalEntry>;
  let component: ApplicationJournalEntry;
  let api: {
    getApplication: ReturnType<typeof vi.fn>;
    createApplication: ReturnType<typeof vi.fn>;
    updateApplication: ReturnType<typeof vi.fn>;
    updateApplicationStatus: ReturnType<typeof vi.fn>;
    deleteApplication: ReturnType<typeof vi.fn>;
    listNormalizedJobs: ReturnType<typeof vi.fn>;
  };
  let router: Router;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  beforeEach(async () => {
    api = {
      getApplication: vi.fn(() => of(entry)),
      createApplication: vi.fn(() => of({ ...entry, id: 'application-new', status: 'NotStarted' })),
      updateApplication: vi.fn(() => of({ ...entry, recruiterName: 'Updated Recruiter' })),
      updateApplicationStatus: vi.fn(() => of(undefined)),
      deleteApplication: vi.fn(() => of(undefined)),
      listNormalizedJobs: vi.fn(() => of(normalizedJobPage)),
    };
    params = new BehaviorSubject(convertToParamMap({ id: 'application-1' }));

    await TestBed.configureTestingModule({
      imports: [ApplicationJournalEntry],
      providers: [
        provideRouter([]),
        { provide: TipApi, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: params.asObservable(),
            snapshot: { paramMap: params.value },
          },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function render(id: string | null = 'application-1'): void {
    params.next(convertToParamMap(id ? { id } : {}));
    fixture = TestBed.createComponent(ApplicationJournalEntry);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function root(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('renders entry details and chronological read-only status history', () => {
    render();

    expect(api.getApplication).toHaveBeenCalledWith('application-1');
    expect(root().textContent).toContain('Senior Engineer');
    expect(root().textContent).toContain('Northwind');
    expect(root().textContent).toContain('Current status: Applied');
    expect(root().textContent).toContain('Submitted application');
    const events = Array.from(
      root().querySelectorAll('.application-journal-entry__history-list li'),
    );
    expect(events).toHaveLength(2);
    expect(events[0].textContent).toContain('Not started');
    expect(events[1].textContent).toContain('Applied');
    expect(
      root().querySelector('.application-journal-entry__history')?.querySelectorAll('button'),
    ).toHaveLength(0);
  });

  it('searches and selects an existing normalized job in the create flow', () => {
    vi.useFakeTimers();
    render(null);
    vi.advanceTimersByTime(250);
    fixture.detectChanges();

    expect(api.listNormalizedJobs).toHaveBeenCalledWith({ page: 1, limit: 10 });
    expect(root().textContent).toContain('Senior Engineer');
    root().querySelector<HTMLButtonElement>('.list-group-item')!.click();
    fixture.detectChanges();

    expect(component['selectedJob']()?.id).toBe('job-1');
    expect(root().textContent).toContain('Change job');
  });

  it('creates an application for the selected job without an initial status', () => {
    render(null);
    component['selectJob'](job);
    component['editForm'].controls.recruiterName.setValue('Avery');
    component['editForm'].controls.recruiterEmail.setValue('avery@example.com');
    component['editForm'].controls.notes.setValue('Initial call');

    component['saveEntry']();

    expect(api.createApplication).toHaveBeenCalledWith({
      jobId: 'job-1',
      recruiterName: 'Avery',
      recruiterEmail: 'avery@example.com',
      contactDate: null,
      followUpDate: null,
      workAuthorizationDiscussed: null,
      notes: 'Initial call',
    });
    expect(api.updateApplicationStatus).not.toHaveBeenCalled();
    expect(api.deleteApplication).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/applications', 'application-new']);
  });

  it('edits only the allowed application fields', () => {
    render();
    component['editForm'].controls.recruiterName.setValue('Updated Recruiter');
    component['editForm'].controls.notes.setValue('Changed details');

    component['saveEntry']();

    expect(api.updateApplication).toHaveBeenCalledWith('application-1', {
      recruiterName: 'Updated Recruiter',
      recruiterEmail: 'avery@example.com',
      contactDate: '2026-10-22',
      followUpDate: '2026-10-30',
      workAuthorizationDiscussed: true,
      notes: 'Changed details',
    });
    fixture.detectChanges();
    expect(root().querySelector<HTMLInputElement>('#application-recruiter-name')?.value).toBe(
      'Updated Recruiter',
    );
  });

  it('shows a clear duplicate-entry conflict and preserves the form', () => {
    api.createApplication.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    render(null);
    component['selectJob'](job);
    component['editForm'].controls.notes.setValue('Keep this note');

    component['saveEntry']();

    expect(component['saveError']()).toContain('already exists');
    expect(component['editForm'].controls.notes.value).toBe('Keep this note');
  });

  it('blocks creation when the optional recruiter email is invalid', () => {
    render(null);
    component['selectJob'](job);
    component['editForm'].controls.recruiterEmail.setValue('not-an-email');

    component['saveEntry']();

    expect(api.createApplication).not.toHaveBeenCalled();
    expect(component['saveError']()).toContain('valid recruiter email');
  });

  it('prevents duplicate create requests while the first request is pending', () => {
    const pending = new Subject<JournalEntry>();
    api.createApplication.mockReturnValue(pending);
    render(null);
    component['selectJob'](job);

    component['saveEntry']();
    component['saveEntry']();

    expect(api.createApplication).toHaveBeenCalledTimes(1);
    expect(component['state']()).toBe('saving');
    pending.next({ ...entry, id: 'application-new' });
    pending.complete();
  });

  it('updates status and reloads authoritative history after success', () => {
    const updated: JournalEntry = {
      ...entry,
      status: 'Interview',
      statusHistory: [
        ...entry.statusHistory,
        {
          id: 'history-3',
          status: 'Interview',
          changedAt: '2026-10-24T12:00:00Z',
          note: 'Interview scheduled',
        },
      ],
    };
    api.getApplication.mockReturnValueOnce(of(entry)).mockReturnValueOnce(of(updated));
    render();
    component['statusForm'].controls.status.setValue('Interview');
    component['statusForm'].controls.note.setValue('Interview scheduled');

    component['updateStatus']();
    fixture.detectChanges();

    expect(api.updateApplicationStatus).toHaveBeenCalledWith(
      'application-1',
      'Interview',
      'Interview scheduled',
    );
    expect(api.getApplication).toHaveBeenCalledTimes(2);
    expect(component['entry']()?.status).toBe('Interview');
    expect(root().textContent).toContain('Interview scheduled');
  });

  it('retains the displayed status and reports a failed status update', () => {
    api.updateApplicationStatus.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    render();
    component['statusForm'].controls.status.setValue('Closed');

    component['updateStatus']();

    expect(component['entry']()?.status).toBe('Applied');
    expect(component['statusError']()).toContain('Unable to update');
  });

  it('requires deletion confirmation and returns to the journal after success', () => {
    render();
    component['requestDelete']();
    component['cancelDelete']();
    expect(api.deleteApplication).not.toHaveBeenCalled();

    component['requestDelete']();
    component['confirmDelete']();

    expect(api.deleteApplication).toHaveBeenCalledWith('application-1');
    expect(router.navigate).toHaveBeenCalledWith(['/applications']);
  });

  it('prevents duplicate deletion while pending and reports deletion failures', () => {
    const pending = new Subject<void>();
    api.deleteApplication.mockReturnValue(pending);
    render();
    component['requestDelete']();
    component['confirmDelete']();
    component['confirmDelete']();

    expect(api.deleteApplication).toHaveBeenCalledTimes(1);
    expect(component['state']()).toBe('deleting');
    pending.error(new HttpErrorResponse({ status: 500 }));

    expect(component['state']()).toBe('loaded');
    expect(component['entry']()?.id).toBe('application-1');
    expect(component['deleteError']()).toContain('Unable to delete');
  });
});
