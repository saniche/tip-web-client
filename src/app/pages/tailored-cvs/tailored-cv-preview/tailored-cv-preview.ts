import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TipApi } from '../../../core/api/tip-api';
import { TailoredDocument } from '../../../core/models/tailored-cv';
import { AuthStore } from '../../../core/state/auth-store';
import { TailoredCvStore } from '../../../core/state/tailored-cv-store';

@Component({
  selector: 'app-tailored-cv-preview',
  imports: [RouterLink],
  templateUrl: './tailored-cv-preview.html',
  styleUrl: './tailored-cv-preview.scss',
})
export class TailoredCvPreview {
  protected readonly store = inject(TailoredCvStore);
  private readonly api = inject(TipApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthStore);
  private readonly owner = this.auth.authSession().user?.email ?? null;
  private readonly route = inject(ActivatedRoute);
  protected readonly requestId = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly documentId = this.route.snapshot.paramMap.get('documentId') ?? '';
  protected readonly document = signal<TailoredDocument | null>(null);
  protected readonly documentLabel = computed(() =>
    this.document()?.kind === 'cover_letter' ? 'Cover letter' : this.document() ? 'CV' : 'Document',
  );
  protected readonly contextError = signal<string | null>(null);
  protected readonly contextLoading = signal(true);
  protected readonly jobIds = signal<string[]>([]);
  protected readonly profileId = signal('');

  constructor() {
    effect(() => {
      if ((this.auth.authSession().user?.email ?? null) !== this.owner) {
        this.document.set(null);
        this.profileId.set('');
        this.jobIds.set([]);
        this.contextError.set('Please sign in again to view this document.');
      }
    });
    this.load();
  }

  protected load(): void {
    this.contextLoading.set(true);
    this.contextError.set(null);
    this.document.set(null);
    this.api.getTailoringRequest(this.requestId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (request) => {
        if ((this.auth.authSession().user?.email ?? null) !== this.owner) return;
        this.contextLoading.set(false);
        const document = request.id === this.requestId && request.documents?.find((item) =>
          item.id === this.documentId && item.status === 'completed',
        );
        if (!document) {
          this.contextError.set('This document is not available in the selected request.');
          return;
        }
        this.document.set(document);
        this.jobIds.set(document.job_ids?.length ? document.job_ids : request.job_ids);
        this.profileId.set(request.profile_id);
        this.store.previewDocument(document.id);
      },
      error: (error: unknown) => {
        if ((this.auth.authSession().user?.email ?? null) !== this.owner) return;
        console.error('Unable to load document context', error);
        this.contextLoading.set(false);
        this.contextError.set('Unable to load the request. Please retry.');
      },
    });
  }
}
