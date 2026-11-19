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
    const language: HTMLSelectElement = fixture.nativeElement.querySelector('.profile-import-language select');
    expect(language.value).toBe('English');
    expect(Array.from(language.options, (option) => option.value)).toEqual([
      'English', 'French', 'Spanish', 'Mandarin Chinese', 'Hindi', 'Arabic',
      'Portuguese', 'Bengali', 'Russian', 'Japanese', 'German',
    ]);
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
    expect(store.uploadFiles.mock.calls[0][1]).toBe('English');
    expect(uploadFiles).toHaveLength(1);
    expect(uploadFiles[0].name).toBe('merged-profile.md');
    expect(await uploadFiles[0].text()).toContain('## resume.md\n\nResume content');
  });

  it('uploads originals separately when merge is disabled', async () => {
    await createFixture();
    selectLanguage('French');
    const mergeToggle: HTMLInputElement = fixture.nativeElement.querySelector(
      '.profile-merge-toggle input',
    );
    mergeToggle.checked = false;
    mergeToggle.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const files = [new File(['one'], 'one.md'), new File(['two'], 'two.pdf')];
    selectFiles(files);

    expect(store.uploadFiles).toHaveBeenCalledOnce();
    expect(store.uploadFiles).toHaveBeenCalledWith(files, 'French');
  });

  it('captures the language before asynchronous merge and disables the selector while preparing', async () => {
    await createFixture();
    selectLanguage('French');
    let resolveText!: (value: string) => void;
    const text = new Promise<string>((resolve) => { resolveText = resolve; });
    const markdown = new File(['placeholder'], 'resume.md');
    Object.defineProperty(markdown, 'text', { value: () => text });
    selectFiles([markdown]);

    const language: HTMLSelectElement = fixture.nativeElement.querySelector('.profile-import-language select');
    expect(language.disabled).toBe(true);
    selectLanguage('Spanish');
    resolveText('Resume content');
    await vi.waitFor(() => expect(store.uploadFiles).toHaveBeenCalledOnce());
    expect(store.uploadFiles.mock.calls[0][1]).toBe('French');
  });

  it('disables the import language selector during upload', async () => {
    await createFixture();
    store.isUploading.set(true);
    fixture.detectChanges();
    const language = fixture.nativeElement.querySelector('.profile-import-language select') as HTMLSelectElement;
    expect(language.disabled).toBe(true);
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
      label: 'Ada profile',
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
    selectLanguage('French');
    const labelInput = fixture.nativeElement.querySelector(
      'input[formControlName="label"]',
    ) as HTMLInputElement;
    expect(labelInput.value).toBe('Ada profile');
    labelInput.value = 'Engineering profile';
    labelInput.dispatchEvent(new Event('input'));

    const skillName: HTMLInputElement = fixture.nativeElement.querySelector(
      'app-skills-editor input[aria-label="New skill name"]',
    );
    skillName.value = 'TypeScript';
    skillName.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
    fixture.detectChanges();

    const form: HTMLFormElement = fixture.nativeElement.querySelector('.profile-form');
    form.dispatchEvent(new Event('submit'));
    expect(store.saveProfile).toHaveBeenCalledOnce();

    const [data, label, outputLanguage] = store.saveProfile.mock.calls[0];
    expect(data).toMatchObject({
      name: 'Ada',
      custom_field: 'preserve me',
      skills: [{ name: 'TypeScript', level: null }],
      certifications: [],
      education: [],
      work_experiences: [],
    });
    expect(label).toBe('Engineering profile');
    expect(outputLanguage).toBe('English');
  });

  it('shows one profile section at a time with counts in the navigation', async () => {
    store.profile.set({
      id: 'profile-id',
      user_id: 'user-id',
      label: 'Ada profile',
      output_language: 'English',
      data: { name: 'Ada', skills: [{ name: 'TypeScript', level: 'Expert' }, { name: 'SQL' }] },
    });
    await createFixture();
    const root = fixture.nativeElement as HTMLElement;
    const visiblePanes = () =>
      Array.from(root.querySelectorAll<HTMLElement>('.profile-editor__pane'))
        .filter((pane) => !pane.hidden)
        .map((pane) => pane.getAttribute('aria-label') ?? pane.getAttribute('aria-labelledby'));
    const navButton = (label: string) =>
      Array.from(root.querySelectorAll<HTMLButtonElement>('.profile-editor__nav-item')).find((button) =>
        button.textContent!.includes(label),
      )!;

    expect(visiblePanes()).toEqual(['pane-overview']);
    expect(navButton('Skills').textContent).toContain('2');

    navButton('Skills').click();
    fixture.detectChanges();
    expect(visiblePanes()).toEqual(['Skills']);
    expect(navButton('Skills').getAttribute('aria-current')).toBe('true');
    expect(navButton('Overview').getAttribute('aria-current')).toBeNull();
  });

  it('opens on Import when there is no profile yet and leaves it once a profile arrives', async () => {
    await createFixture();
    const root = fixture.nativeElement as HTMLElement;
    const active = () => root.querySelector('.profile-editor__nav-item.is-active')!.textContent!.trim();
    expect(active()).toContain('Import documents');
    expect(root.querySelector<HTMLElement>('.profile-editor__import')!.hidden).toBe(false);

    store.profile.set({
      id: 'profile-id',
      user_id: 'user-id',
      label: 'Ada profile',
      output_language: 'English',
      data: { name: 'Ada' },
    });
    fixture.detectChanges();
    expect(active()).toContain('Overview');
  });

  it('saves edits to core competences and additional informations lists', async () => {
    store.profile.set({
      id: 'profile-id',
      user_id: 'user-id',
      label: 'Ada profile',
      output_language: 'English',
      data: {
        custom_field: 'preserve me',
        core_competences: [],
        additional_informations: [],
      },
    });
    await createFixture();

    const coreCompetencesEditor = fixture.nativeElement.querySelector(
      'app-string-list-editor[title="Core Competences"]',
    ) as HTMLElement;
    const additionalInformationsEditor = fixture.nativeElement.querySelector(
      'app-string-list-editor[title="Additional Informations"]',
    ) as HTMLElement;
    const coreCompetencesAdd = coreCompetencesEditor.querySelector('button') as HTMLButtonElement;
    const additionalInfoAdd = additionalInformationsEditor.querySelector(
      'button',
    ) as HTMLButtonElement;
    coreCompetencesAdd.click();
    additionalInfoAdd.click();
    fixture.detectChanges();

    const coreCompetencesInput = coreCompetencesEditor.querySelector('input') as HTMLInputElement;
    coreCompetencesInput.value = 'Strategic planning';
    coreCompetencesInput.dispatchEvent(new Event('input'));
    const additionalInformationsInput = additionalInformationsEditor.querySelector(
      'input',
    ) as HTMLInputElement;
    additionalInformationsInput.value = 'Volunteer mentor';
    additionalInformationsInput.dispatchEvent(new Event('input'));
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

  it('saves soft skills, job titles, locations, and languages as string lists', async () => {
    store.profile.set({
      id: 'profile-id',
      user_id: 'user-id',
      label: 'Ada profile',
      output_language: 'English',
      data: {
        custom_field: 'preserve me',
        soft_skills: 'Communication',
        preferred_job_titles: [],
        preferred_locations: [],
        languages: [],
      },
    });
    await createFixture();

    const listUpdates = [
      { title: 'Soft skills', item: 'Mentoring' },
      { title: 'Preferred job titles', item: 'Engineering manager' },
      { title: 'Preferred locations', item: 'Montreal' },
      { title: 'Languages', item: 'French' },
    ];

    for (const { title, item } of listUpdates) {
      const editor = fixture.nativeElement.querySelector(
        `app-string-list-editor[title="${title}"]`,
      ) as HTMLElement;
      if (title === 'Soft skills') {
        expect(editor.querySelector('.string-chips__chip')!.textContent).toContain('Communication');
      }
      const entry = editor.querySelector(`input[aria-label="Add ${title}"]`) as HTMLInputElement;
      entry.value = item;
      entry.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
      fixture.detectChanges();
    }

    const form: HTMLFormElement = fixture.nativeElement.querySelector('.profile-form');
    form.dispatchEvent(new Event('submit'));

    const [data] = store.saveProfile.mock.calls[0];
    expect(data).toMatchObject({
      custom_field: 'preserve me',
      soft_skills: ['Communication', 'Mentoring'],
      preferred_job_titles: ['Engineering manager'],
      preferred_locations: ['Montreal'],
      languages: ['French'],
    });
  });

  function selectFiles(files: File[]): void {
    const fileInput: HTMLInputElement = fixture.nativeElement.querySelector('input[type="file"]');
    Object.defineProperty(fileInput, 'files', { configurable: true, value: files });
    fileInput.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function selectLanguage(value: string): void {
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('.profile-import-language select');
    select.value = value;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }
});
