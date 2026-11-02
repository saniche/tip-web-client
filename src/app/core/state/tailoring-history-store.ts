import { Injectable, inject, signal } from '@angular/core';
import { catchError, forkJoin, map, of } from 'rxjs';
import { TipApi } from '../api/tip-api';
import { TailoringRequest } from '../models/tailored-cv';
import { AuthStore } from './auth-store';

@Injectable({ providedIn: 'root' })
export class TailoringHistoryStore {
  private readonly api = inject(TipApi);
  private readonly auth = inject(AuthStore);
  private generation = 0;
  readonly requests = signal<TailoringRequest[]>([]);
  readonly historyLoading = signal(false);
  readonly historyError = signal<string | null>(null);
  readonly historyDocumentErrors = signal<string[]>([]);

  reset(): void {
    this.generation++;
    this.requests.set([]);
    this.historyLoading.set(false);
    this.historyError.set(null);
    this.historyDocumentErrors.set([]);
  }

  load(): void {

    const generation = ++this.generation;
    const session = this.auth.authSession();
    const owner = session.user?.email ?? null;
    const token = session.token ?? null;

    const isCurrent = (): boolean =>
      generation === this.generation &&
      owner === (this.auth.authSession().user?.email ?? null) &&
      token === (this.auth.authSession().token ?? null);

    this.historyLoading.set(true);
    this.historyError.set(null);
    this.historyDocumentErrors.set([]);
    this.requests.set([]);
    
    this.api.listTailoringRequests().subscribe({
      next: (requests) => {
        if (!isCurrent()) return;
        this.requests.set(requests);
        const terminal = requests.filter((request) =>
          ['completed', 'partial', 'failed'].includes(request.status),
        );
        if (!terminal.length) {
          this.historyLoading.set(false);
          return;
        }
        forkJoin(terminal.map((request) => this.api.getTailoringRequest(request.id).pipe(
          map((detail) => ({ detail, id: request.id, failed: false })),
          catchError((error: unknown) => {
            if (isCurrent()) console.error('Unable to load tailoring history documents', error);
            return of({ detail: request, id: request.id, failed: true });
          }),
        ))).subscribe((results) => {
          if (!isCurrent()) return;
          const byId = new Map(results.map((result) => [result.id, result.detail]));
          this.requests.set(requests.map((request) => byId.get(request.id) ?? request));
          this.historyDocumentErrors.set(results.filter((result) => result.failed).map((result) => result.id));
          this.historyLoading.set(false);
        });
      },
      error: (error: unknown) => {
        if (!isCurrent()) return;
        console.error('Unable to load tailoring history', error);
        this.historyLoading.set(false);
        this.historyError.set('Unable to load tailoring history. Please retry.');
      },
    });
  }
}
