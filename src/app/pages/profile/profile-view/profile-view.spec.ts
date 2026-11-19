import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ProfileData } from '../../../core/models/profile.models';
import { ProfileView } from './profile-view';

describe('ProfileView', () => {
  let fixture: ComponentFixture<ProfileView>;
  const root = () => fixture.nativeElement as HTMLElement;
  const render = (data: ProfileData) => {
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();
  };
  const text = (selector: string) =>
    Array.from(root().querySelectorAll(selector)).map((el) => el.textContent!.replace(/\s+/g, ' ').trim());

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ProfileView] }).compileComponents();
    fixture = TestBed.createComponent(ProfileView);
  });

  it('presents each part of a profile in a readable, read-only layout', () => {
    render({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      location: 'Ottawa',
      total_years_of_experience: 12,
      summary: 'Analytical engine programmer.',
      work_experiences: [
        {
          Title: 'Developer',
          Company: 'Acme',
          StartDate: '2020-01-15',
          EndDate: null,
          Summary: 'Built things.',
          RealisationDescription: ['Led redesign'],
        },
      ],
      skills: [
        { name: 'TypeScript', level: 'Expert' },
        { Name: 'Angular', Level: 'advanced' },
        { name: 'SQL' },
      ],
      education: [{ Degree: 'BSc', Field: 'Mathematics', Institution: 'Uni', Year: 2010, Completed: true }],
      certifications: [{ Name: 'AZ-204', Issuer: 'Microsoft', Year: 2023 }],
      languages: ['English', 'French'],
    });

    expect(text('.profile-view__name')).toEqual(['Ada Lovelace']);
    expect(text('.profile-view__facts dd')).toEqual(['ada@example.com', 'Ottawa', '12']);
    expect(text('.profile-view__timeline h3')).toEqual(['Developer at Acme']);
    expect(text('.profile-view__timeline .profile-view__meta')).toEqual(['2020-01 to present']);
    expect(text('.profile-view__timeline ul li')).toEqual(['Led redesign']);
    expect(text('#view-skills ~ .profile-view__group h3')).toEqual(['Expert', 'Advanced', 'No level']);
    expect(text('.profile-view__plain li')).toEqual(['BSc, Mathematics Uni, 2010', 'AZ-204 Microsoft, 2023']);
    expect(text('#view-preferences ~ .profile-view__group .profile-view__chips li')).toEqual(['English', 'French']);
    expect(root().querySelector('input, textarea, select, button, form')).toBeNull();
  });

  it('accepts legacy skills stored as plain strings', () => {
    render({ skills: ['Analysis', 'Programming'] });
    expect(text('.profile-view__chips li')).toEqual(['Analysis', 'Programming']);
  });

  it('lists unknown keys and badly shaped sections under Other data instead of hiding them', () => {
    render({ name: 'Ada', custom_field: 'keep', skills: 'not a list', nested: { a: 1 } });
    expect(text('.profile-view__other summary')).toEqual(['Other data (3)']);
    expect(text('.profile-view__other h3')).toEqual(['Custom Field', 'Skills', 'Nested']);
    expect(root().querySelector('.profile-view__other pre')!.textContent).toBe('keep');
  });

  it('says so when there is nothing to show', () => {
    render({});
    expect(root().textContent).toContain('No profile information is available.');
  });
});
