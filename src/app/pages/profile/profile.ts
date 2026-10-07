import { Component, DestroyRef, effect, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../core/state/auth-store';
import { ProfileStore } from '../../core/state/profile-store';
import { mergeProfileFiles } from '../../core/utils/profile-file-merge';

const JSON_FIELDS = ['certifications', 'work_experiences', 'education', 'skills'];

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-profile',
  styleUrl: './profile.scss',
  templateUrl: './profile.html',
})
export class Profile implements OnInit {
  private readonly formBuilder = inject(NonNullableFormBuilder);
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

  protected readonly form = this.formBuilder.group({
    name: [''],
    email: ['', [Validators.email]],
    phone: [''],
    location: [''],
    linkedin: [''],
    summary: [''],
    soft_skills: [''],
    total_years_of_experience: [''],
    preferred_job_titles: [''],
    preferred_locations: [''],
    languages: [''],
    source: [''],
    certifications: ['{}'],
    work_experiences: ['{}'],
    education: ['{}'],
    skills: ['{}'],
    output_language: ['English', [Validators.required]],
  });

  constructor() {
    effect(() => {
      const profile = this.profile();
      if (profile) {
        const data = profile.data;
        this.form.patchValue({
          name: stringValue(data['name']),
          email: stringValue(data['email']),
          phone: stringValue(data['phone']),
          location: stringValue(data['location']),
          linkedin: stringValue(data['linkedin']),
          summary: stringValue(data['summary']),
          soft_skills: stringValue(data['soft_skills']),
          total_years_of_experience: stringValue(data['total_years_of_experience']),
          preferred_job_titles: stringValue(data['preferred_job_titles']),
          preferred_locations: stringValue(data['preferred_locations']),
          languages: stringValue(data['languages']),
          source: stringValue(data['source']),
          certifications: jsonValue(data['certifications']),
          work_experiences: jsonValue(data['work_experiences']),
          education: jsonValue(data['education']),
          skills: jsonValue(data['skills']),
          output_language: profile.output_language || 'English',
        });
      }
    });

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

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.getRawValue();
    const data = {
      name: values.name,
      email: values.email,
      phone: values.phone,
      location: values.location,
      linkedin: values.linkedin,
      summary: values.summary,
      soft_skills: values.soft_skills,
      total_years_of_experience: values.total_years_of_experience,
      preferred_job_titles: values.preferred_job_titles,
      preferred_locations: values.preferred_locations,
      languages: values.languages,
      source: values.source,
    } as Record<string, unknown>;

    for (const field of JSON_FIELDS) {
      try {
        data[field] = JSON.parse(values[field as keyof typeof values]);
      } catch {
        this.errorMessage.set(`The ${field.replaceAll('_', ' ')} field must contain valid JSON.`);
        return;
      }
    }

    this.errorMessage.set(null);
    this.profileStore.saveProfile(data, values.output_language);
  }

  protected readonly errorMessage = signal<string | null>(null);
}

function stringValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function jsonValue(value: unknown): string {
  return value === undefined || value === null ? '{}' : JSON.stringify(value, null, 2);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to prepare the merged document.';
}
