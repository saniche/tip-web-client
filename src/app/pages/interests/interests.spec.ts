import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { provideRouter } from '@angular/router';
import { BehaviorSubject, Observable, of, Subject, Subscriber, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TipApi } from '../../core/api/tip-api';
import { JobInterest, JobInterestsPage } from '../../core/models/interest';
import { MatchingStore, MATCHING_SESSION_STORAGE_KEY } from '../../core/state/matching-store';
import { Interests } from './interests';

const mockInterests: JobInterest[] = [
  {
    id: 'int-1',
    createdAt: '2026-10-22T20:00:00Z',
    job: {
      id: 'job-1',
      title: 'Senior Frontend Developer',
      company: 'TechCorp',
      location: 'Remote',
      postingDate: '2026-10-20',
      source: 'https://example.com/job-1',
    },
  },
  {
    id: 'int-2',
    createdAt: '2026-10-21T15:30:00Z',
    job: {
      id: 'job-2',
      title: null,
      company: 'DataWorks',
      location: null,
      postingDate: null,
      source: null,
    },
  },
];

const mockPage: JobInterestsPage = {
  items: mockInterests,
  limit: 20,
  total: 2,
  page: 1,
};

describe('Interests Component', () => {
  let fixture: ComponentFixture<Interests>;
  let component: Interests;
  let api: {
    listInterests: ReturnType<typeof vi.fn>;
    removeInterest: ReturnType<typeof vi.fn>;
  };
  let router: Router;
  let matchingStore: MatchingStore;
  let queryParams: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  beforeEach(async () => {
    sessionStorage.removeItem(MATCHING_SESSION_STORAGE_KEY);
    api = {
      listInterests: vi.fn(() => of(mockPage)),
      removeInterest: vi.fn(() => of(undefined)),
    };
    queryParams = new BehaviorSubject(convertToParamMap({}));

    await TestBed.configureTestingModule({
      imports: [Interests],
      providers: [
        provideRouter([]),
        { provide: TipApi, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: queryParams.asObservable(),
            snapshot: { queryParamMap: queryParams.value },
          },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    matchingStore = TestBed.inject(MatchingStore);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function render(): ComponentFixture<Interests> {
    fixture = TestBed.createComponent(Interests);
    component = fixture.componentInstance;
    fixture.detectChanges();
    return fixture;
  }

  it('renders a list of job interests with headers and links', () => {
    render();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Senior Frontend Developer');
    expect(compiled.textContent).toContain('TechCorp');
    expect(compiled.textContent).toContain('Remote');
    expect(compiled.textContent).toContain('DataWorks');

    const titleLink = compiled.querySelector('a[href="/normalized-jobs/job-1"]');
    expect(titleLink).toBeTruthy();
  });

  it('adds an existing interest to a matching session without changing interest membership', () => {
    render();

    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '[data-testid="add-to-matching-int-1"]',
    );
    button?.click();

    expect(matchingStore.session()?.selectedJobs).toEqual([
      {
        jobId: 'job-1',
        title: 'Senior Frontend Developer',
        company: 'TechCorp',
        location: 'Remote',
        source: 'https://example.com/job-1',
        entrySources: ['my-interests'],
        interestState: 'known-in-interest',
      },
    ]);
    expect(api.listInterests).toHaveBeenCalledTimes(1);
    expect(api.removeInterest).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/matching-session']);
  });

  it('shows empty state when no interests are returned', () => {
    api.listInterests.mockReturnValue(of({ items: [], limit: 20, total: 0, page: 1 }));
    render();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('You have not added any job interests yet');
  });

  it('shows error state and retries on failure', () => {
    api.listInterests.mockReturnValue(throwError(() => new Error('Network error')));
    render();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Unable to load job interests');

    api.listInterests.mockReturnValue(of(mockPage));
    const retryBtn = compiled.querySelector('.interests__message button') as HTMLButtonElement;
    retryBtn.click();
    fixture.detectChanges();

    expect(api.listInterests).toHaveBeenCalled();
  });

  it('applies filters on form submit and resets to page 1', () => {
    render();
    const titleInput = fixture.nativeElement.querySelector('#interest-title-filter') as HTMLInputElement;
    titleInput.value = 'Engineer';
    titleInput.dispatchEvent(new Event('input'));

    const form = fixture.nativeElement.querySelector('form.interests__filters') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));

    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({
      queryParams: expect.objectContaining({
        title: 'Engineer',
        page: 1,
      }),
    }));
  });

  it('debounces filter navigation until 300 ms after the latest input', () => {
    vi.useFakeTimers();
    render();
    const titleInput = fixture.nativeElement.querySelector('#interest-title-filter') as HTMLInputElement;

    titleInput.value = 'Engineer';
    titleInput.dispatchEvent(new Event('input'));

    expect(router.navigate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(299);
    expect(router.navigate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({
      queryParams: expect.objectContaining({ title: 'Engineer', page: 1 }),
    }));
  });

  it('cancels stale list requests when a newer filter query arrives', () => {
    let staleObserver: Subscriber<JobInterestsPage> | undefined;
    let staleRequestCancelled = false;
    const staleRequest = new Observable<JobInterestsPage>((subscriber) => {
      staleObserver = subscriber;
      return () => {
        staleRequestCancelled = true;
      };
    });
    const latestPage = { ...mockPage, items: [mockInterests[1]] };
    api.listInterests.mockReturnValueOnce(staleRequest).mockReturnValueOnce(of(latestPage));

    render();
    queryParams.next(convertToParamMap({ title: 'DataWorks' }));

    expect(staleRequestCancelled).toBe(true);
    staleObserver?.next(mockPage);
    expect(component['interests']()).toEqual([mockInterests[1]]);
  });

  it('clears filters when clear button is clicked', () => {
    render();
    const clearBtn = fixture.nativeElement.querySelector('button.btn-outline-secondary') as HTMLButtonElement;
    clearBtn.click();

    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({
      queryParams: expect.objectContaining({
        title: null,
        company: null,
        location: null,
        page: 1,
      }),
    }));
  });

  it('requires confirmation before removing an interest', () => {
    render();
    const removeBtn = fixture.nativeElement.querySelector('tbody tr button.btn-outline-danger') as HTMLButtonElement;
    expect(removeBtn).toBeTruthy();
    expect(removeBtn.textContent?.trim()).toBe('Remove');

    // Trigger removal confirmation
    component['startRemoval']('int-1');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(component['confirmingRemovalId']()).toBe('int-1');
    const confirmBtn = compiled.querySelector('button.btn-danger') as HTMLButtonElement;
    expect(confirmBtn).toBeTruthy();

    // Cancel removal
    component['cancelRemoval']();
    fixture.detectChanges();
    expect(component['confirmingRemovalId']()).toBeNull();
    expect(compiled.querySelector('button.btn-danger')).toBeNull();
    expect(api.removeInterest).not.toHaveBeenCalled();

    // Confirm removal
    component['startRemoval']('int-1');
    component.confirmRemoval(mockInterests[0]);
    expect(api.removeInterest).toHaveBeenCalledWith('job-1');
  });

  it('prevents duplicate removal while the request is pending', () => {
    const pendingRequest = new Subject<void>();
    api.removeInterest.mockReturnValue(pendingRequest);
    render();

    component['startRemoval']('int-1');
    component.confirmRemoval(mockInterests[0]);
    component.confirmRemoval(mockInterests[0]);
    fixture.detectChanges();

    expect(api.removeInterest).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('tbody tr .spinner-border')).toBeTruthy();
    const remainingRemoveButton = fixture.nativeElement.querySelector(
      'tbody tr:nth-child(2) button.btn-outline-danger',
    ) as HTMLButtonElement;
    expect(remainingRemoveButton.disabled).toBe(true);

    pendingRequest.next();
    pendingRequest.complete();
  });

  it('preserves the item and reports a removal failure', () => {
    api.removeInterest.mockReturnValue(throwError(() => new Error('offline')));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render();

    component['startRemoval']('int-1');
    component.confirmRemoval(mockInterests[0]);
    fixture.detectChanges();

    expect(component['interests']()).toEqual(mockInterests);
    expect(fixture.nativeElement.textContent).toContain('Unable to remove interest');
    expect(fixture.nativeElement.textContent).toContain('Senior Frontend Developer');
  });

  it('navigates to the preceding page when removing its last item', () => {
    const lastInterestPage: JobInterestsPage = {
      items: [mockInterests[0]],
      limit: 20,
      total: 21,
      page: 2,
    };
    queryParams.next(convertToParamMap({ page: '2' }));
    api.listInterests.mockReturnValue(of(lastInterestPage));
    render();

    component['startRemoval']('int-1');
    component.confirmRemoval(mockInterests[0]);

    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({
      queryParams: { page: 1 },
    }));
  });

  it('navigates to previous and next pages', () => {
    api.listInterests.mockReturnValue(of({
      items: mockInterests,
      limit: 1,
      total: 3,
      page: 2,
    }));
    render();

    const buttons = fixture.nativeElement.querySelectorAll('.interests__pagination-navigation button') as NodeListOf<HTMLButtonElement>;
    const prevBtn = buttons[0];
    const nextBtn = buttons[1];

    expect(prevBtn.disabled).toBe(false);
    expect(nextBtn.disabled).toBe(false);

    prevBtn.click();
    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({
      queryParams: { page: 1 },
    }));

    nextBtn.click();
    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({
      queryParams: { page: 3 },
    }));
  });
});
