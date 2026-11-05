import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TipApi } from '../../../core/api/tip-api';
import { ProfileVersionDetail } from '../../../core/models/tailored-cv';
import { ProfileDetails } from './profile-details';

const profile: ProfileVersionDetail = {
  id: 'profile-1',
  label: 'Engineering profile',
  output_language: 'English',
  is_default: false,
  created_at: '2026-11-01T10:00:00Z',
  updated_at: '2026-11-02T10:00:00Z',
  data: {
    name: 'Ada Lovelace',
    skills: ['Analysis', 'Programming'],
  },
};

describe('ProfileDetails', () => {
  let fixture: ComponentFixture<ProfileDetails>;
  let api: { getProfileVersion: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    api = { getProfileVersion: vi.fn(() => of(profile)) };
    await TestBed.configureTestingModule({
      imports: [ProfileDetails],
      providers: [
        { provide: TipApi, useValue: api },
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'profile-1' })) } },
      ],
    }).compileComponents();
  });

  it('loads and displays the selected profile as read-only with a version-specific edit link', async () => {
    fixture = TestBed.createComponent(ProfileDetails);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(api.getProfileVersion).toHaveBeenCalledWith('profile-1');
    expect(root.textContent).toContain('Engineering profile');
    expect(root.textContent).toContain('Ada Lovelace');
    expect(root.textContent).toContain('Analysis');
    expect(root.textContent).toContain('Created: 2026-11-01T10:00:00Z');
    expect(root.querySelector('form')).toBeNull();
    expect(root.querySelector('input')).toBeNull();
    expect(root.querySelector<HTMLAnchorElement>('.btn-primary')?.getAttribute('href')).toBe(
      '/profiles/profile-1/edit',
    );
  });
});
