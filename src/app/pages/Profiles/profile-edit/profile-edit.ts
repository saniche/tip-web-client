import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, catchError, finalize, switchMap, tap } from 'rxjs';
import {
  ProfileCertificate,
  ProfileData,
  ProfileEducation,
  ProfileSkill,
  ProfileWorkExperience,
} from '../../../core/models/profile.models';
import { ProfileVersionDetail } from '../../../core/models/tailored-cv';
import { TipApi } from '../../../core/api/tip-api';
import { CertificatesComponent } from '../../profile/certificates/certificates.component';
import { EducationComponent } from '../../profile/education/education.component';
import { SkillsComponent } from '../../profile/skills/skills.component';
import { StringListComponent } from '../../profile/string-list/string-list.component';
import { WorkExperiencesComponent } from '../../profile/work-experiences/work-experiences.component';

type EditState = 'loading' | 'loaded' | 'not-found' | 'error';

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
  selector: 'app-profile-edit',
  styleUrl: './profile-edit.scss',
  templateUrl: './profile-edit.html',
})
export class ProfileEdit implements OnInit {
  private readonly api = inject(TipApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);

  protected readonly detail = signal<ProfileVersionDetail | null>(null);
  protected readonly profileId = signal('');
  protected readonly state = signal<EditState>('loading');
  protected readonly masterProfileData = signal<ProfileData>({});
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly saveMessage = signal('');

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
    output_language: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((params) => {
          const id = params.get('id')?.trim();
          this.profileId.set(id ?? '');
          this.detail.set(null);
          this.masterProfileData.set({});
          this.errorMessage.set('');
          this.saveMessage.set('');

          if (!id) {
            this.state.set('not-found');
            return EMPTY;
          }

          this.state.set('loading');
          return this.api.getProfileVersion(id).pipe(
            tap((profile) => {
              this.detail.set(profile);
              this.setProfileForm(profile);
              this.state.set('loaded');
            }),
            catchError((error: unknown) => {
              console.error('Unable to load profile for editing.', error);
              if (error instanceof HttpErrorResponse && error.status === 404) {
                this.state.set('not-found');
              } else {
                this.errorMessage.set('Unable to load this profile. Please try again.');
                this.state.set('error');
              }
              return EMPTY;
            }),
          );
        }),
      )
      .subscribe();
  }

  protected save(): void {
    if (this.form.invalid || this.isSaving() || this.state() !== 'loaded') {
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

    this.errorMessage.set('');
    this.saveMessage.set('');
    this.isSaving.set(true);
    this.api
      .updateProfileVersion(this.profileId(), data, values.label, values.output_language)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (profile) => {
          this.detail.set(profile);
          this.setProfileForm(profile);
          this.saveMessage.set('Profile saved successfully.');
        },
        error: (error: unknown) => {
          console.error('Unable to save profile version.', error);
          this.errorMessage.set('Unable to save this profile. Please try again.');
        },
      });
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

  private setProfileForm(profile: ProfileVersionDetail): void {
    const data = profile.data ?? {};
    this.masterProfileData.set({ ...data });
    this.form.patchValue({
      label: profile.label ?? '',
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
