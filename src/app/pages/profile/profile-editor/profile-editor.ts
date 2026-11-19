import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ProfileCertificate,
  ProfileData,
  ProfileEducation,
  ProfileSkill,
  ProfileWorkExperience,
} from '../../../core/models/profile.models';
import { CertificatesComponent } from '../certificates/certificates.component';
import { EducationComponent } from '../education/education.component';
import { SkillsComponent } from '../skills/skills.component';
import { StringListComponent } from '../string-list/string-list.component';
import { WorkExperiencesComponent } from '../work-experiences/work-experiences.component';

export type ProfileSectionId =
  | 'overview'
  | 'experience'
  | 'skills'
  | 'education'
  | 'preferences'
  | 'import';

/** What the editor shows. */
export interface EditableProfile {
  label: string;
  outputLanguage: string;
  data: ProfileData;
}

/** What the editor emits on save. Unknown keys of the original data are preserved. */
export type ProfileDraft = EditableProfile;

/**
 * Shared profile editor: one section at a time, a sticky save bar and unsaved-changes tracking.
 * Used by "My profile" (with an Import section) and by "Edit profile version".
 */
@Component({
  imports: [
    CertificatesComponent,
    EducationComponent,
    ReactiveFormsModule,
    SkillsComponent,
    StringListComponent,
    WorkExperiencesComponent,
  ],
  selector: 'app-profile-editor',
  templateUrl: './profile-editor.html',
  styleUrl: './profile-editor.scss',
})
export class ProfileEditor {
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly profile = input<EditableProfile | null>(null);
  readonly saving = input(false);
  /** While true, the editor does not decide where to land (an empty profile may still be loading). */
  readonly loading = input(false);
  /** Shown in the save bar, e.g. "Profile saved successfully." */
  readonly statusMessage = input<string | null>(null);
  /** Adds an "Import documents" section that hosts the projected `[profileImport]` content. */
  readonly importEnabled = input(false);
  readonly importStatus = input<string | null>(null);
  readonly save = output<ProfileDraft>();

  protected readonly data = signal<ProfileData>({});
  protected readonly active = signal<ProfileSectionId>('overview');
  private userChoseSection = false;
  private readonly formDirty = signal(false);
  private readonly dataDirty = signal(false);
  protected readonly dirty = computed(() => this.formDirty() || this.dataDirty());

  protected readonly form = this.formBuilder.group({
    label: [''],
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

  protected readonly sections = computed(() => {
    const items: { id: ProfileSectionId; label: string; count: number | null }[] = [
      { id: 'overview', label: 'Overview', count: null },
      { id: 'experience', label: 'Experience', count: this.workExperiences().length },
      { id: 'skills', label: 'Skills', count: this.skills().length },
      {
        id: 'education',
        label: 'Education',
        count: this.education().length + this.certificates().length,
      },
      { id: 'preferences', label: 'Preferences', count: null },
    ];
    if (this.importEnabled()) {
      items.push({ id: 'import', label: 'Import documents', count: null });
    }
    return items;
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.formDirty.set(true));
    effect(() => {
      const profile = this.profile();
      untracked(() => this.applyProfile(profile));
    });
    // First visit without a profile lands on Import; once a profile arrives we leave it.
    effect(() => {
      const profile = this.profile();
      const settled = !this.loading();
      const empty = !profile || Object.keys(profile.data).length === 0;
      untracked(() => {
        if (this.userChoseSection || !this.importEnabled()) return;
        if (settled && empty) {
          this.active.set('import');
        } else if (!empty && this.active() === 'import') {
          this.active.set('overview');
        }
      });
    });
  }

  protected select(section: ProfileSectionId): void {
    this.userChoseSection = true;
    this.active.set(section);
  }

  protected submit(): void {
    if (this.saving()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.active.set('overview');
      return;
    }

    const values = this.form.getRawValue();
    this.save.emit({
      label: values.label,
      outputLanguage: values.output_language,
      data: {
        ...this.data(),
        name: values.name,
        email: values.email,
        phone: values.phone,
        location: values.location,
        linkedin: values.linkedin,
        summary: values.summary,
        total_years_of_experience: values.total_years_of_experience,
        source: values.source,
      },
    });
  }

  protected discard(): void {
    this.applyProfile(this.profile());
  }

  /** Enter inside a text field adds an item or moves on; it must not save the profile. */
  protected preventImplicitSubmit(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.type !== 'submit') {
      event.preventDefault();
    }
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
    const value = this.data()[key];
    return (
      value !== null &&
      value !== undefined &&
      typeof value !== 'string' &&
      (!Array.isArray(value) || value.some((item) => typeof item !== 'string'))
    );
  }

  protected hasNonListSectionData(key: string): boolean {
    const value = this.data()[key];
    return value !== null && value !== undefined && !Array.isArray(value);
  }

  protected updateSection(key: string, value: unknown[]): void {
    this.data.update((data) => ({ ...data, [key]: value }));
    this.dataDirty.set(true);
  }

  private applyProfile(profile: EditableProfile | null): void {
    const data = profile?.data ?? {};

    this.data.set({ ...data });
    this.form.reset(
      {
        label: profile?.label ?? '',
        name: stringValue(data['name']),
        email: stringValue(data['email']),
        phone: stringValue(data['phone']),
        location: stringValue(data['location']),
        linkedin: stringValue(data['linkedin']),
        summary: stringValue(data['summary']),
        total_years_of_experience: stringValue(data['total_years_of_experience']),
        source: stringValue(data['source']),
        output_language: profile?.outputLanguage || 'English',
      },
      { emitEvent: false },
    );
    this.formDirty.set(false);
    this.dataDirty.set(false);
  }

  private sectionItems<T>(key: string): T[] {
    const value = this.data()[key];
    return Array.isArray(value) ? (value as T[]) : [];
  }

  private stringListItems(key: string): string[] {
    const value = this.data()[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string');
    }
    return typeof value === 'string' ? [value] : [];
  }
}

function stringValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return typeof value === 'string' ? value : JSON.stringify(value);
}
