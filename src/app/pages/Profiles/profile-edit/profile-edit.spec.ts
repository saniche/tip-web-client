import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TipApi } from '../../../core/api/tip-api';
import { ProfileVersionDetail } from '../../../core/models/tailored-cv';
import { ProfileEdit } from './profile-edit';

const profile: ProfileVersionDetail = {
  id: 'profile-1',
  label: 'Engineering profile',
  output_language: 'English',
  is_default: false,
  created_at: '2026-11-01T10:00:00Z',
  updated_at: '2026-11-02T10:00:00Z',
  data: {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    custom_data: { preserved: true },
  },
};

describe('ProfileEdit', () => {
  let fixture: ComponentFixture<ProfileEdit>;
  let api: {
    getProfileVersion: ReturnType<typeof vi.fn>;
    updateProfileVersion: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    api = {
      getProfileVersion: vi.fn(() => of(profile)),
      updateProfileVersion: vi.fn((id, data, label, outputLanguage) =>
        of({ ...profile, data, label, output_language: outputLanguage }),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [ProfileEdit],
      providers: [
        { provide: TipApi, useValue: api },
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: 'profile-1' })) },
        },
      ],
    }).compileComponents();
  });

  it('updates only the selected profile version and preserves unedited profile data', async () => {
    fixture = TestBed.createComponent(ProfileEdit);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const label = root.querySelector<HTMLInputElement>('[formControlName="label"]')!;
    const outputLanguage = root.querySelector<HTMLInputElement>(
      '[formControlName="output_language"]',
    )!;
    const name = root.querySelector<HTMLInputElement>('[formControlName="name"]')!;

    label.value = 'Updated engineering profile';
    label.dispatchEvent(new Event('input'));
    outputLanguage.value = 'French';
    outputLanguage.dispatchEvent(new Event('input'));
    name.value = 'Grace Hopper';
    name.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    root.querySelector<HTMLFormElement>('form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await fixture.whenStable();

    expect(api.updateProfileVersion).toHaveBeenCalledWith(
      'profile-1',
      {
        name: 'Grace Hopper',
        email: 'ada@example.com',
        custom_data: { preserved: true },
        phone: '',
        location: '',
        linkedin: '',
        summary: '',
        total_years_of_experience: '',
        source: '',
      },
      'Updated engineering profile',
      'French',
    );
    expect(root.textContent).toContain('Profile saved successfully.');
  });
});
