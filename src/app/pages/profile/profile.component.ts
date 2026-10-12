import { Component, DestroyRef, effect, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ProfileCertificate,
  ProfileData,
  ProfileEducation,
  ProfileSkill,
  ProfileWorkExperience,
} from '../../core/models/profile.models';
import { AuthStore } from '../../core/state/auth-store';
import { ProfileStore } from '../../core/state/profile-store';
import { mergeProfileFiles } from '../../core/utils/profile-file-merge';
import { CertificatesComponent } from './certificates/certificates.component';
import { EducationComponent } from './education/education.component';
import { SkillsComponent } from './skills/skills.component';
import { StringListComponent } from './string-list/string-list.component';
import { WorkExperiencesComponent } from './work-experiences/work-experiences.component';

@Component({
  imports: [
    CertificatesComponent,
    EducationComponent,
    ReactiveFormsModule,
    RouterLink,
    SkillsComponent,
    StringListComponent,
    WorkExperiencesComponent,
  ],
  selector: 'app-profile',
  styleUrl: './profile.component.scss',
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly profileStore = inject(ProfileStore);
  private readonly authStore = inject(AuthStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly auth = this.authStore.authSession;
  protected readonly isAuthenticated = this.authStore.isAuthenticated;
  protected readonly profile = this.profileStore.profile;
  protected readonly masterProfileData = signal<ProfileData>({});
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
    total_years_of_experience: [''],
    source: [''],
    output_language: ['English', [Validators.required]],
  });

  constructor() {
    effect(() => {
      const profile = this.profile();
      if (profile) {
        const data = profile.data;
        this.masterProfileData.set({ ...data });
        this.form.patchValue({
          name: stringValue(data['name']),
          email: stringValue(data['email']),
          phone: stringValue(data['phone']),
          location: stringValue(data['location']),
          linkedin: stringValue(data['linkedin']),
          summary: stringValue(data['summary']),
          total_years_of_experience: stringValue(data['total_years_of_experience']),
          source: stringValue(data['source']),
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
    const data: ProfileData = {
      ...this.masterProfileData(),
      name: values.name,
      email: values.email,
      phone: values.phone,
      location: values.location,
      linkedin: values.linkedin,
      summary: values.summary,
      total_years_of_experience: values.total_years_of_experience,
      source: values.source,
    };

    this.profileStore.saveProfile(data, values.output_language);
  }

  protected skills(): ProfileSkill[] {
    return this.sectionItems<ProfileSkill>('skills');
  }

  protected certificates(): ProfileCertificate[] {
    return this.sectionItems<ProfileCertificate>('certifications');
  }

  protected education(): ProfileEducation[] {
    return this.sectionItems<ProfileEducation>('education');
  }

  protected workExperiences(): ProfileWorkExperience[] {
    return this.sectionItems<ProfileWorkExperience>('work_experiences');
  }

  protected coreCompetences(): string[] {
    return this.sectionItems<string>('core_competences');
  }

  protected additionalInformations(): string[] {
    return this.sectionItems<string>('additional_informations');
  }

  protected softSkills(): string[] {
    return this.stringListItems('soft_skills');
  }

  protected preferredJobTitles(): string[] {
    return this.stringListItems('preferred_job_titles');
  }

  protected preferredLocations(): string[] {
    return this.stringListItems('preferred_locations');
  }

  protected languages(): string[] {
    return this.stringListItems('languages');
  }

  protected hasUnsupportedStringListData(key: string): boolean {
    const value = this.masterProfileData()[key];
    return (
      value !== null &&
      value !== undefined &&
      typeof value !== 'string' &&
      (!Array.isArray(value) || value.some((item) => typeof item !== 'string'))
    );
  }

  protected hasNonListSectionData(key: string): boolean {
    const value = this.masterProfileData()[key];
    return value !== null && value !== undefined && !Array.isArray(value);
  }

  protected updateSkills(skills: unknown[]): void {
    this.updateSection('skills', skills);
  }

  protected updateCertificates(certificates: unknown[]): void {
    this.updateSection('certifications', certificates);
  }

  protected updateEducation(education: unknown[]): void {
    this.updateSection('education', education);
  }

  protected updateWorkExperiences(experiences: unknown[]): void {
    this.updateSection('work_experiences', experiences);
  }

  protected updateCoreCompetences(items: string[]): void {
    this.updateSection('core_competences', items);
  }

  protected updateAdditionalInformations(items: string[]): void {
    this.updateSection('additional_informations', items);
  }

  protected updateSoftSkills(items: string[]): void {
    this.updateSection('soft_skills', items);
  }

  protected updatePreferredJobTitles(items: string[]): void {
    this.updateSection('preferred_job_titles', items);
  }

  protected updatePreferredLocations(items: string[]): void {
    this.updateSection('preferred_locations', items);
  }

  protected updateLanguages(items: string[]): void {
    this.updateSection('languages', items);
  }

  private sectionItems<T>(key: string): T[] {
    const value = this.masterProfileData()[key];
    return Array.isArray(value) ? (value as T[]) : [];
  }

  private stringListItems(key: string): string[] {
    const value = this.masterProfileData()[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string');
    }
    return typeof value === 'string' ? [value] : [];
  }

  private updateSection(key: string, value: unknown[]): void {
    this.masterProfileData.update((data) => ({ ...data, [key]: value }));
  }
}

function stringValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to prepare the merged document.';
}
