import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TipApi } from '../../../core/api/tip-api';
import { ProfileVersion } from '../../../core/models/tailored-cv';
import { ProfileList } from './profile-list';

const profiles: ProfileVersion[] = [
  {
    id: 'profile-1',
    label: 'Engineering profile',
    output_language: 'English',
    is_default: false,
    created_at: '2026-11-01T10:00:00Z',
    updated_at: '2026-11-01T10:00:00Z',
  },
  {
    id: 'profile-2',
    label: 'Product profile',
    output_language: 'French',
    is_default: true,
    created_at: '2026-11-02T10:00:00Z',
    updated_at: '2026-11-02T10:00:00Z',
  },
];

describe('ProfileList', () => {
  let fixture: ComponentFixture<ProfileList>;
  let api: {
    listProfiles: ReturnType<typeof vi.fn>;
    deleteProfile: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    api = {
      listProfiles: vi.fn(() => of(profiles)),
      deleteProfile: vi.fn(() => of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [ProfileList],
      providers: [{ provide: TipApi, useValue: api }],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileList);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('does not delete until the user confirms in the ng-bootstrap modal', async () => {
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('[data-testid="delete-profile-profile-1"]')!.click();
    fixture.detectChanges();

    expect(api.deleteProfile).not.toHaveBeenCalled();
    const modal = document.body.querySelector<HTMLElement>('.modal');
    expect(modal?.textContent).toContain('Engineering profile');

    modal?.querySelector<HTMLButtonElement>('.modal-footer .btn-danger')!.click();
    await vi.waitFor(() => expect(api.deleteProfile).toHaveBeenCalledWith('profile-1'));
    fixture.detectChanges();
    expect(root.textContent).not.toContain('Engineering profile');
    expect(root.textContent).toContain('Product profile');
  }, 10_000);

  it('keeps the profile when deletion is cancelled', async () => {
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('[data-testid="delete-profile-profile-1"]')!.click();
    fixture.detectChanges();

    const modal = document.body.querySelector<HTMLElement>('.modal');
    modal?.querySelector<HTMLButtonElement>('.modal-footer .btn-secondary')!.click();
    await vi.waitFor(() => expect(document.body.querySelector('.modal')).toBeNull());

    expect(api.deleteProfile).not.toHaveBeenCalled();
    expect(root.textContent).toContain('Engineering profile');
  });
});
