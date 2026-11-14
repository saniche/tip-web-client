import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, catchError, finalize, switchMap, tap } from 'rxjs';
import { TipApi } from '../../../core/api/tip-api';
import { ProfileVersionDetail } from '../../../core/models/tailored-cv';
import {
  EditableProfile,
  ProfileDraft,
  ProfileEditor,
} from '../../profile/profile-editor/profile-editor';

type EditState = 'loading' | 'loaded' | 'not-found' | 'error';

@Component({
  imports: [ProfileEditor, RouterLink],
  selector: 'app-profile-edit',
  styleUrl: './profile-edit.scss',
  templateUrl: './profile-edit.html',
})
export class ProfileEdit implements OnInit {
  private readonly api = inject(TipApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);

  protected readonly detail = signal<ProfileVersionDetail | null>(null);
  protected readonly profileId = signal('');
  protected readonly state = signal<EditState>('loading');
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly saveMessage = signal('');

  protected readonly editable = computed<EditableProfile | null>(() => {
    const profile = this.detail();
    return profile
      ? {
          label: profile.label ?? '',
          outputLanguage: profile.output_language || 'English',
          data: profile.data ?? {},
        }
      : null;
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((params) => {
          const id = params.get('id')?.trim();
          this.profileId.set(id ?? '');
          this.detail.set(null);
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

  protected save(draft: ProfileDraft): void {
    if (this.isSaving() || this.state() !== 'loaded') {
      return;
    }

    this.errorMessage.set('');
    this.saveMessage.set('');
    this.isSaving.set(true);
    this.api
      .updateProfileVersion(this.profileId(), draft.data, draft.label, draft.outputLanguage)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (profile) => {
          this.detail.set(profile);
          this.saveMessage.set('Profile saved successfully.');
        },
        error: (error: unknown) => {
          console.error('Unable to save profile version.', error);
          this.errorMessage.set('Unable to save this profile. Please try again.');
        },
      });
  }
}
