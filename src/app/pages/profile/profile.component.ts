import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../core/state/auth-store';
import { ProfileStore } from '../../core/state/profile-store';
import { mergeProfileFiles } from '../../core/utils/profile-file-merge';
import { EditableProfile, ProfileDraft, ProfileEditor } from './profile-editor/profile-editor';

@Component({
  imports: [ProfileEditor, RouterLink],
  selector: 'app-profile',
  styleUrl: './profile.component.scss',
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  private readonly profileStore = inject(ProfileStore);
  private readonly authStore = inject(AuthStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly auth = this.authStore.authSession;
  protected readonly isAuthenticated = this.authStore.isAuthenticated;
  protected readonly profile = this.profileStore.profile;
  protected readonly session = this.profileStore.session;
  protected readonly isLoading = this.profileStore.isLoading;
  protected readonly isSaving = this.profileStore.isSaving;
  protected readonly isUploading = this.profileStore.isUploading;
  protected readonly error = this.profileStore.error;
  protected readonly uploadErrors = this.profileStore.uploadErrors;
  protected readonly saveMessage = this.profileStore.saveMessage;
  protected readonly processingNotice = this.profileStore.processingNotice;
  protected readonly selectedFileNames = signal<string[]>([]);
  protected readonly mergeEnabled = signal(true);
  protected readonly isPreparingMerge = signal(false);
  protected readonly uploadPreparationError = signal<string | null>(null);

  protected readonly editable = computed<EditableProfile | null>(() => {
    const profile = this.profile();
    return profile
      ? {
          label: profile.label || '',
          outputLanguage: profile.output_language || 'English',
          data: profile.data,
        }
      : null;
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.profileStore.stopPolling());
  }

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    if (this.isAuthenticated()) {
      this.profileStore.loadProfile();
    }
  }

  protected saveProfile(draft: ProfileDraft): void {
    this.profileStore.saveProfile(draft.data, draft.label, draft.outputLanguage);
  }

  protected onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    this.selectedFileNames.set(files.map((file) => file.name));

    if (files.length > 0 && this.mergeEnabled()) {
      this.uploadPreparationError.set(null);
      this.isPreparingMerge.set(true);
      void mergeProfileFiles(files)
        .then((mergedFile) => this.profileStore.uploadFiles([mergedFile]))
        .catch((error: unknown) => {
          this.uploadPreparationError.set(errorMessage(error));
        })
        .finally(() => this.isPreparingMerge.set(false));
    } else if (files.length > 0) {
      this.uploadPreparationError.set(null);
      this.profileStore.uploadFiles(files);
    }
    input.value = '';
  }

  protected onMergeToggle(event: Event): void {
    this.mergeEnabled.set((event.target as HTMLInputElement).checked);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to prepare the merged document.';
}
