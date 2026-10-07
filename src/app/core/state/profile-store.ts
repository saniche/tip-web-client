import { Injectable, inject, signal } from '@angular/core';
import { catchError, concatMap, finalize, from, interval, of, startWith, switchMap, takeUntil, takeWhile, tap, timer, toArray } from 'rxjs';
import { TipApi } from '../api/tip-api';
import { ProfileData, ProfileSession, UserProfile } from '../models/profile.models';

const TERMINAL_FILE_STATUSES = new Set(['failed', 'cancel', 'completed']);
export const PROFILE_POLLING_TIMEOUT_MS = 15 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class ProfileStore {
  private readonly api = inject(TipApi);
  private pollingSubscription?: { unsubscribe(): void };

  readonly profile = signal<UserProfile | null>(null);
  readonly session = signal<ProfileSession | null>(null);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isUploading = signal(false);
  readonly error = signal<string | null>(null);
  readonly saveMessage = signal<string | null>(null);
  readonly uploadErrors = signal<{ fileName: string; message: string }[]>([]);
  readonly processingNotice = signal<string | null>(null);

  loadProfile(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.api
      .getProfile()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (profile) => this.profile.set(profile),
        error: (error) => this.error.set(getErrorMessage(error, 'Unable to load your profile.')),
      });
  }

  saveProfile(data: ProfileData, outputLanguage: string): void {
    this.isSaving.set(true);
    this.error.set(null);
    this.saveMessage.set(null);
    this.api
      .updateProfile(data, outputLanguage)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.saveMessage.set('Profile saved successfully.');
        },
        error: (error) => this.error.set(getErrorMessage(error, 'Unable to save your profile.')),
      });
  }

  uploadFiles(files: File[]): void {
    this.stopPolling();
    this.isUploading.set(true);
    this.error.set(null);
    this.saveMessage.set(null);
    this.uploadErrors.set([]);
    this.processingNotice.set(null);

    this.api
      .createProfileSession()
      .pipe(
        switchMap((session) =>
          from(files).pipe(
            concatMap((file) =>
              this.api.uploadProfileFile(session.id, file).pipe(
                catchError((error) => {
                  this.uploadErrors.update((errors) => [
                    ...errors,
                    {
                      fileName: file.name,
                      message: getErrorMessage(error, 'File upload failed.'),
                    },
                  ]);
                  return of(null);
                }),
              ),
            ),
            toArray(),
            switchMap(() => this.api.getProfileSession(session.id)),
          ),
        ),
      )
      .subscribe({
        next: (session) => {
          this.session.set(session);
          this.isUploading.set(false);
          this.startPolling(session.id);
        },
        error: (error) => {
          this.isUploading.set(false);
          this.error.set(getErrorMessage(error, 'Unable to create a processing session.'));
        },
      });
  }

  stopPolling(): void {
    this.pollingSubscription?.unsubscribe();
    this.pollingSubscription = undefined;
  }

  private startPolling(sessionId: string): void {
    this.processingNotice.set(null);
    this.pollingSubscription = interval(2000)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.api.getProfileSession(sessionId).pipe(
            catchError((error) => {
              this.error.set(getErrorMessage(error, 'Unable to check profile processing status.'));
              return of(null);
            }),
          ),
        ),
        takeWhile((session) => session === null || !areAllFilesTerminal(session), true),
        takeUntil(
          timer(PROFILE_POLLING_TIMEOUT_MS).pipe(
            tap(() =>
              this.processingNotice.set(
                'Polling stopped after 15 minutes. Processing may still be ongoing; the latest file statuses are shown.',
              ),
            ),
          ),
        ),
        finalize(() => {
          this.pollingSubscription = undefined;
        }),
      )
      .subscribe((session) => {
        if (!session) {
          return;
        }

        this.session.set(session);
        if (areAllFilesTerminal(session)) {
          this.loadProfile();
        }
      });
  }
}

function areAllFilesTerminal(session: ProfileSession): boolean {
  return (
    Array.isArray(session.files) &&
    session.files.length > 0 &&
    session.files.every((file) => TERMINAL_FILE_STATUSES.has(file.status.toLowerCase()))
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  }

  return fallback;
}
