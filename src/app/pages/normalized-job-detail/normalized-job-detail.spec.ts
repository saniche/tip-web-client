import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TipApi } from '../../core/api/tip-api';
import { NormalizedJobDetail as JobDetail } from '../../core/models/normalized-job';
import { NormalizedJobDetail } from './normalized-job-detail';

const detail: JobDetail = {
  id: 'job-1',
  url: 'https://example.com/job-1',
  title: 'Senior Engineer',
  company: 'Northwind',
  location: 'Remote',
  salary: '$150,000',
  source: 'career-site',
  postingDate: '2026-10-13',
  summary: 'Summary',
  keyResponsibilities: 'First responsibility\n\nSecond responsibility',
  requirements: 'First requirement\nSecond requirement',
  desirables: 'Preferred skill',
  technicalStack: ['TypeScript'],
  additionals: ['Remote'],
  status: 'completed',
  submitterId: 'user-1',
  createdAt: '2026-10-13T12:00:00Z',
  hasWriteAccess: true,
  isInterested: false,
};

describe('NormalizedJobDetail', () => {
  let fixture: ComponentFixture<NormalizedJobDetail>;
  let api: {
    getNormalizedJob: ReturnType<typeof vi.fn>;
    updateNormalizedJob: ReturnType<typeof vi.fn>;
    deleteNormalizedJob: ReturnType<typeof vi.fn>;
    addInterest: ReturnType<typeof vi.fn>;
    removeInterest: ReturnType<typeof vi.fn>;
  };
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  beforeEach(async () => {
    api = {
      getNormalizedJob: vi.fn(() => of(detail)),
      updateNormalizedJob: vi.fn(() => of(detail)),
      deleteNormalizedJob: vi.fn(() => of(undefined)),
      addInterest: vi.fn(() => of(undefined)),
      removeInterest: vi.fn(() => of(undefined)),
    };
    router = { navigateByUrl: vi.fn().mockResolvedValue(true) };
    params = new BehaviorSubject(convertToParamMap({ id: 'job-1' }));

    await TestBed.configureTestingModule({
      imports: [NormalizedJobDetail],
      providers: [
        { provide: TipApi, useValue: api },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { paramMap: params.asObservable() } },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function render(): void {
    fixture = TestBed.createComponent(NormalizedJobDetail);
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

  it('loads and renders all detail fields with a clickable non-email source', () => {
    render();

    expect(api.getNormalizedJob).toHaveBeenCalledWith('job-1');
    expect(root().textContent).toContain('Senior Engineer');
    expect(root().textContent).toContain('First responsibility');
    expect(root().textContent).toContain('TypeScript');
    expect(root().textContent).toContain('Completed');
    expect(root().querySelector('a[href="https://example.com/job-1"]')).toBeTruthy();
  });

  it('starts with the summary collapsed and renders requested text sections as line-item lists', () => {
    render();

    const summary = root().querySelector('details');
    expect(summary?.open).toBe(false);

    const responsibilities = Array.from(root().querySelectorAll('article')).find((article) =>
      article.querySelector('h2')?.textContent?.includes('Key responsibilities'),
    );
    expect(
      Array.from(responsibilities?.querySelectorAll('li') ?? []).map((item) =>
        item.textContent?.trim(),
      ),
    ).toEqual(['First responsibility', 'Second responsibility']);

    const requirements = Array.from(root().querySelectorAll('article')).find((article) =>
      article.querySelector('h2')?.textContent?.includes('Requirements'),
    );
    expect(requirements?.querySelectorAll('li')).toHaveLength(2);

    const desirables = Array.from(root().querySelectorAll('article')).find((article) =>
      article.querySelector('h2')?.textContent?.includes('Desirables'),
    );
    expect(Array.from(desirables?.querySelectorAll('li') ?? []).map((item) => item.textContent?.trim()))
      .toEqual(['Preferred skill']);

    const additionalDetails = Array.from(root().querySelectorAll('article')).find((article) =>
      article.querySelector('h2')?.textContent?.includes('Additional details'),
    );
    expect(Array.from(additionalDetails?.querySelectorAll('li') ?? []).map((item) => item.textContent?.trim()))
      .toEqual(['Remote']);
  });

  it('renders array values for responsibility, requirement, and desirable lists', () => {
    api.getNormalizedJob.mockReturnValue(
      of({
        ...detail,
        keyResponsibilities: ['Lead a team', 'Review designs'],
        requirements: ['Five years experience', 'TypeScript'],
        desirables: ['Cloud experience'],
      }),
    );

    render();

    expect(root().textContent).toContain('Lead a team');
    expect(root().textContent).toContain('Review designs');
    expect(root().textContent).toContain('Five years experience');
    expect(root().textContent).toContain('Cloud experience');
  });

  it('does not make an email source URL clickable', () => {
    api.getNormalizedJob.mockReturnValue(
      of({ ...detail, source: 'EMAIL', url: 'https://example.com/email-job' }),
    );

    render();

    expect(root().querySelector('a[href="https://example.com/email-job"]')).toBeNull();
  });

  it('renders numeric detail values without calling string methods on them', () => {
    api.getNormalizedJob.mockReturnValue(of({ ...detail, salary: 150000 }));

    render();

    expect(root().textContent).toContain('150000');
  });

  it('hides write controls when the server denies write access', () => {
    api.getNormalizedJob.mockReturnValue(of({ ...detail, hasWriteAccess: false }));

    render();

    expect(root().textContent).not.toContain('Edit header');
    expect(root().textContent).not.toContain('Delete job');
  });

  it('updates only the editable header values and shows the saved result', () => {
    api.updateNormalizedJob.mockReturnValue(of({ ...detail, company: 'Fabrikam' }));
    render();
    button('Edit header').click();
    fixture.detectChanges();

    const company = root().querySelector<HTMLInputElement>('#job-detail-company')!;
    company.value = 'Fabrikam';
    company.dispatchEvent(new Event('input'));
    button('Save changes').click();
    fixture.detectChanges();

    expect(api.updateNormalizedJob).toHaveBeenCalledWith('job-1', {
      company: 'Fabrikam',
      location: 'Remote',
      salary: '$150,000',
      source: 'career-site',
    });
    expect(root().textContent).toContain('Fabrikam');
  });

  it('confirms deletion and returns to the normalized listing', () => {
    render();
    button('Delete job').click();
    fixture.detectChanges();
    button('Confirm deletion').click();

    expect(api.deleteNormalizedJob).toHaveBeenCalledWith('job-1');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/normalized-jobs');
  });

  it('keeps entered values and reports a failed update', () => {
    api.updateNormalizedJob.mockReturnValue(throwError(() => new Error('offline')));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render();
    button('Edit header').click();
    fixture.detectChanges();

    const company = root().querySelector<HTMLInputElement>('#job-detail-company')!;
    company.value = 'Fabrikam';
    company.dispatchEvent(new Event('input'));
    button('Save changes').click();
    fixture.detectChanges();

    expect(root().textContent).toContain('Unable to save these changes.');
    expect(root().querySelector<HTMLInputElement>('#job-detail-company')?.value).toBe('Fabrikam');
  });

  it('toggles interest status by adding and removing interest', () => {
    render();

    // Initial state: not interested -> button shows 'Add to interests'
    const addBtn = button('Add to interests');
    expect(addBtn).toBeTruthy();

    addBtn.click();
    fixture.detectChanges();

    expect(api.addInterest).toHaveBeenCalledWith('job-1');

    // State updated to interested -> button shows 'Remove from interests'
    const removeBtn = button('Remove from interests');
    expect(removeBtn).toBeTruthy();

    removeBtn.click();
    fixture.detectChanges();

    expect(api.removeInterest).toHaveBeenCalledWith('job-1');
  });

  it('initializes the toggle from the loaded interest status', () => {
    api.getNormalizedJob.mockReturnValue(of({ ...detail, isInterested: true }));
    render();

    expect(button('Remove from interests')).toBeTruthy();
    button('Remove from interests').click();

    expect(api.removeInterest).toHaveBeenCalledWith('job-1');
    expect(api.addInterest).not.toHaveBeenCalled();
  });

  it('does not offer an add action when the backend omits interest status', () => {
    api.getNormalizedJob.mockReturnValue(of({ ...detail, isInterested: null }));
    render();

    expect(button('Interest status unavailable').disabled).toBe(true);
    expect(root().textContent).toContain("Unable to determine this job's interest status");

    button('Interest status unavailable').click();
    expect(api.addInterest).not.toHaveBeenCalled();
    expect(api.removeInterest).not.toHaveBeenCalled();
  });

  it('displays an error message when interest toggle fails', () => {
    api.addInterest.mockReturnValue(throwError(() => new Error('Server error')));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render();
    button('Add to interests').click();
    fixture.detectChanges();

    expect(root().textContent).toContain('Unable to add interest');
  });
});
