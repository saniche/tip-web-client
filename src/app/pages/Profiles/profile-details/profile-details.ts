import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, catchError, switchMap, tap } from 'rxjs';
import { TipApi } from '../../../core/api/tip-api';
import { ProfileVersionDetail } from '../../../core/models/tailored-cv';
import { ProfileView } from '../../profile/profile-view/profile-view';

type DetailState = 'loading' | 'loaded' | 'not-found' | 'error';

@Component({
  imports: [ProfileView, RouterLink],
  selector: 'app-profile-details',
  styleUrl: './profile-details.scss',
  templateUrl: './profile-details.html',
})
export class ProfileDetails implements OnInit {
  private readonly api = inject(TipApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);

  protected readonly detail = signal<ProfileVersionDetail | null>(null);
  protected readonly state = signal<DetailState>('loading');
  protected readonly errorMessage = signal('');

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((params) => {
          const id = params.get('id')?.trim();
          this.detail.set(null);
          this.errorMessage.set('');

          if (!id) {
            this.state.set('not-found');
            return EMPTY;
          }

          this.state.set('loading');
          return this.api.getProfileVersion(id).pipe(
            tap((detail) => {
              this.detail.set(detail);
              this.state.set('loaded');
            }),
            catchError((error: unknown) => {
              console.error('Unable to load profile details.', error);
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
}
