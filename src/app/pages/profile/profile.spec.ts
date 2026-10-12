import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { AuthStore } from '../../core/state/auth-store';
import { ProfileStore } from '../../core/state/profile-store';
import { ProfileComponent } from './profile.component';

describe('Profile', () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let store: {
    profile: ReturnType<typeof signal>;
    session: ReturnType<typeof signal>;
    isLoading: ReturnType<typeof signal>;
    isSaving: ReturnType<typeof signal>;
    isUploading: ReturnType<typeof signal>;
    error: ReturnType<typeof signal>;
    uploadErrors: ReturnType<typeof signal>;
    saveMessage: ReturnType<typeof signal>;
    processingNotice: ReturnType<typeof signal>;
    loadProfile: ReturnType<typeof vi.fn>;
    uploadFiles: ReturnType<typeof vi.fn>;
    stopPolling: ReturnType<typeof vi.fn>;
    saveProfile: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    store = {
      profile: signal(null),
      session: signal(null),
      isLoading: signal(false),
      isSaving: signal(false),
      isUploading: signal(false),
      error: signal(null),
      uploadErrors: signal([]),
      saveMessage: signal(null),
      processingNotice: signal(null),
      loadProfile: vi.fn(),
      uploadFiles: vi.fn(),
      stopPolling: vi.fn(),
      saveProfile: vi.fn(),
    };
  });

  async function createFixture(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: AuthStore, useValue: { authSession: () => ({}), isAuthenticated: () => true } },
        { provide: ProfileStore, useValue: store },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    fixture.detectChanges();
  }

  it('enables merging by default and uploads one merged Markdown file', async () => {
    await createFixture();
    const mergeToggle: HTMLInputElement = fixture.nativeElement.querySelector(
      '.profile-merge-toggle input',
    );
    expect(mergeToggle.checked).toBe(true);

    const markdown = new File(['placeholder'], 'resume.md');
    Object.defineProperty(markdown, 'text', { value: () => Promise.resolve('Resume content') });
    selectFiles([markdown]);

    await vi.waitFor(() => expect(store.uploadFiles).toHaveBeenCalledOnce());
    expect(store.uploadFiles).toHaveBeenCalledOnce();
    const uploadFiles = store.uploadFiles.mock.calls[0][0] as File[];
    expect(uploadFiles).toHaveLength(1);
    expect(uploadFiles[0].name).toBe('merged-profile.md');
    expect(await uploadFiles[0].text()).toContain('## resume.md\n\nResume content');
  });

  it('uploads originals separately when merge is disabled', async () => {
    await createFixture();
    const mergeToggle: HTMLInputElement = fixture.nativeElement.querySelector(
      '.profile-merge-toggle input',
    );
    mergeToggle.checked = false;
    mergeToggle.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const files = [new File(['one'], 'one.md'), new File(['two'], 'two.pdf')];
    selectFiles(files);

    expect(store.uploadFiles).toHaveBeenCalledOnce();
    expect(store.uploadFiles).toHaveBeenCalledWith(files);
  });

  it('does not upload any file when merged extraction fails', async () => {
    await createFixture();
    const markdown = new File(['placeholder'], 'empty.md');
    Object.defineProperty(markdown, 'text', { value: () => Promise.resolve('   ') });
    selectFiles([markdown]);

    await vi.waitFor(() =>
      expect(fixture.nativeElement.textContent).toContain('No readable text was found in "empty.md"'),
    );
    fixture.detectChanges();
    expect(store.uploadFiles).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('No readable text was found in "empty.md"');
    expect(fixture.nativeElement.textContent).toContain('Disable merge mode');
  });

  it('merges edited sections into the master profile and preserves other data when saving', async () => {
    store.profile.set({
      id: 'profile-id',
      user_id: 'user-id',
      output_language: 'English',
      data: {
        name: 'Ada',
        custom_field: 'preserve me',
        skills: [],
        certifications: [],
        education: [],
        work_experiences: [],
      },
    });
    await createFixture();

    const addSkill: HTMLButtonElement = fixture.nativeElement.querySelector(
      'app-skills-editor button',
    );
    addSkill.click();
    fixture.detectChanges();

    const skillName: HTMLInputElement = fixture.nativeElement.querySelector(
      'app-skills-editor input',
    );
    skillName.value = 'TypeScript';
    skillName.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const form: HTMLFormElement = fixture.nativeElement.querySelector('.profile-form');
    form.dispatchEvent(new Event('submit'));
    expect(store.saveProfile).toHaveBeenCalledOnce();

    const [data, outputLanguage] = store.saveProfile.mock.calls[0];
    expect(data).toMatchObject({
      name: 'Ada',
      custom_field: 'preserve me',
      skills: [{ name: 'TypeScript', level: null }],
      certifications: [],
      education: [],
      work_experiences: [],
    });
    expect(outputLanguage).toBe('English');
  });

  it('makes every structured profile section collapsible', async () => {
    await createFixture();

    const sections = fixture.nativeElement.querySelectorAll(
      'app-skills-editor details, app-certificates-editor details, app-education-editor details, app-work-experiences-editor details, app-string-list-editor details',
    ) as NodeListOf<HTMLDetailsElement>;
    expect(sections).toHaveLength(6);
    expect(Array.from(sections).every((section) => section.open)).toBe(true);

    for (const section of sections) {
      (section.querySelector('summary') as HTMLElement).click();
    }
    fixture.detectChanges();

    expect(Array.from(sections).every((section) => !section.open)).toBe(true);
  });

  it('saves edits to core competences and additional informations lists', async () => {
    store.profile.set({
      id: 'profile-id',
      user_id: 'user-id',
      output_language: 'English',
      data: {
        custom_field: 'preserve me',
        core_competences: [],
        additional_informations: [],
      },
    });
    await createFixture();

    const editors = fixture.nativeElement.querySelectorAll('app-string-list-editor');
    expect(editors).toHaveLength(2);
    const coreCompetencesAdd = editors[0].querySelector('button') as HTMLButtonElement;
    const additionalInfoAdd = editors[1].querySelector('button') as HTMLButtonElement;
    coreCompetencesAdd.click();
    additionalInfoAdd.click();
    fixture.detectChanges();

    const inputs = fixture.nativeElement.querySelectorAll('app-string-list-editor input');
    (inputs[0] as HTMLInputElement).value = 'Strategic planning';
    inputs[0].dispatchEvent(new Event('input'));
    (inputs[1] as HTMLInputElement).value = 'Volunteer mentor';
    inputs[1].dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const form: HTMLFormElement = fixture.nativeElement.querySelector('.profile-form');
    form.dispatchEvent(new Event('submit'));

    const [data] = store.saveProfile.mock.calls[0];
    expect(data).toMatchObject({
      custom_field: 'preserve me',
      core_competences: ['Strategic planning'],
      additional_informations: ['Volunteer mentor'],
    });
  });

  function selectFiles(files: File[]): void {
    const fileInput: HTMLInputElement = fixture.nativeElement.querySelector('input[type="file"]');
    Object.defineProperty(fileInput, 'files', { configurable: true, value: files });
    fileInput.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }
});
