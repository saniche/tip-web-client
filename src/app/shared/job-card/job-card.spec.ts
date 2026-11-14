import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { JobCard } from './job-card';

@Component({
  imports: [JobCard],
  template: `
    <app-job-card
      [jobId]="'job-1'"
      [title]="title"
      [company]="company"
      [location]="location"
      [postingDate]="postingDate"
      [source]="source"
      [extraLabel]="extraLabel"
      [extraValue]="extraValue"
      [inSession]="inSession"
    >
      <button type="button" class="projected">Action</button>
    </app-job-card>
  `,
})
class Host {
  title: string | null = 'Senior Engineer';
  company: string | null = 'Northwind';
  location: string | null = 'Remote';
  postingDate: string | null = '2026-10-13';
  source: string | null = 'https://www.example.com/jobs/1';
  extraLabel: string | null = null;
  extraValue: string | null = null;
  inSession = false;
}

function render(configure: (host: Host) => void = () => undefined) {
  TestBed.configureTestingModule({ imports: [Host], providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(Host);
  configure(fixture.componentInstance);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('JobCard', () => {
  it('shows title link, company, facts and projected actions', () => {
    const root = render();
    const link = root.querySelector<HTMLAnchorElement>('.job-card__title a')!;
    expect(link.textContent!.trim()).toBe('Senior Engineer');
    expect(link.getAttribute('href')).toBe('/normalized-jobs/job-1');
    expect(root.querySelector('.job-card__company')!.textContent).toContain('Northwind');
    expect(root.querySelector('.job-card__facts')!.textContent).toContain('Remote');
    expect(root.querySelector('.job-card__facts')!.textContent).toContain('2026-10-13');
    expect(root.querySelector('.job-card__actions .projected')).toBeTruthy();
  });

  it('uses a dash for missing values', () => {
    const root = render((host) => {
      host.title = null;
      host.company = '  ';
      host.location = null;
      host.postingDate = null;
      host.source = null;
    });
    expect(root.querySelector('.job-card__title a')!.textContent!.trim()).toBe('—');
    expect(root.querySelector('.job-card__company')!.textContent!.trim()).toBe('—');
    expect(root.querySelector('.job-card__source')!.textContent!.trim()).toBe('—');
  });

  it('links URL sources by hostname and prints other sources as text', () => {
    const withUrl = render();
    const link = withUrl.querySelector<HTMLAnchorElement>('.job-card__source a')!;
    expect(link.textContent!.trim()).toBe('example.com');
    expect(link.getAttribute('href')).toBe('https://www.example.com/jobs/1');
    expect(link.getAttribute('rel')).toContain('noopener');

    TestBed.resetTestingModule();
    const withName = render((host) => (host.source = 'Acme'));
    expect(withName.querySelector('.job-card__source a')).toBeNull();
    expect(withName.querySelector('.job-card__source')!.textContent!.trim()).toBe('Acme');

    TestBed.resetTestingModule();
    const unsafe = render((host) => (host.source = 'javascript:alert(1)'));
    expect(unsafe.querySelector('.job-card__source a')).toBeNull();
  });

  it('shows an extra fact with a date-only value', () => {
    const root = render((host) => {
      host.extraLabel = 'Interested on';
      host.extraValue = '2026-10-12T10:30:00Z';
    });
    const text = root.querySelector('.job-card__facts')!.textContent!;
    expect(text).toContain('Interested on');
    expect(text).toContain('2026-10-12');
    expect(text).not.toContain('10:30');
  });

  it('marks jobs that are already in the matching session', () => {
    const idle = render();
    expect(idle.querySelector('.job-card--in-session')).toBeNull();
    expect(idle.querySelector('.job-card__badge')).toBeNull();

    TestBed.resetTestingModule();
    const selected = render((host) => (host.inSession = true));
    expect(selected.querySelector('.job-card--in-session')).toBeTruthy();
    expect(selected.querySelector('.job-card__badge')!.textContent).toContain('In session');
  });
});
