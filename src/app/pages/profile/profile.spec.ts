import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { AuthStore } from '../../core/state/auth-store';
import { ProfileStore } from '../../core/state/profile-store';
import { Profile } from './profile';

describe('Profile', () => {
  let fixture: ComponentFixture<Profile>;
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
      imports: [Profile],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: AuthStore, useValue: { authSession: () => ({}), isAuthenticated: () => true } },
        { provide: ProfileStore, useValue: store },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Profile);
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

  function selectFiles(files: File[]): void {
    const fileInput: HTMLInputElement = fixture.nativeElement.querySelector('input[type="file"]');
    Object.defineProperty(fileInput, 'files', { configurable: true, value: files });
    fileInput.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }
});
