import { computed, inject, Injectable, signal } from "@angular/core";
import { TipApi } from "../api/tip-api";
import { AuthStore } from "../state/auth-store";

export interface TailoredContentManagerState{
    previewGeneration: number;
    documentLoading: boolean;
    documentError: string | null;
    preview: string | null;
}

const DEFAULT_MANAGER_STATE: TailoredContentManagerState = {
    previewGeneration: 0,
    documentLoading: false,
    documentError: null,
    preview: null,
};


@Injectable({ providedIn: 'root' })
export class TailoredContentManager 
{
  private previewGeneration = 0;
    
  private readonly api = inject(TipApi);
  private readonly auth = inject(AuthStore);
  private readonly state = signal<TailoredContentManagerState>({ ...DEFAULT_MANAGER_STATE });
  readonly preview = computed(() => this.state().preview);
  readonly documentLoading = computed(() => this.state().documentLoading);
  readonly documentError = computed(() => this.state().documentError);

  reset(): void {
    this.previewGeneration++;
    this.state.set({ ...DEFAULT_MANAGER_STATE });
  }

  clearError(): void {
    this.state.update(s => ({ ...s, documentError: null }));
  }
  
  previewDocument(id: string): void {
    const generation = ++this.previewGeneration;
    const owner = this.auth.authSession().user?.email ?? null;
    const token = this.auth.authSession().token ?? null;
    this.state.update(s => ({ ...s, preview: null, documentError: null, documentLoading: true }));
    this.api.downloadTailoredDocument(id).subscribe({
      next: (blob) => {
        void blob.text().then((text) => {
          if (generation !== this.previewGeneration || owner !== (this.auth.authSession().user?.email ?? null) || token !== (this.auth.authSession().token ?? null)) return;
          this.state.update(s => ({ ...s, preview: text, documentLoading: false }));
        }).catch((error: unknown) => {
          if (generation !== this.previewGeneration || owner !== (this.auth.authSession().user?.email ?? null) || token !== (this.auth.authSession().token ?? null)) return;
          console.error('Unable to read document preview', error);
          this.state.update(s => ({ ...s, documentLoading: false, documentError: 'Unable to read the document preview. Please retry.' }));
        });
      },
      error: (error: unknown) => {
        if (generation !== this.previewGeneration || owner !== (this.auth.authSession().user?.email ?? null) || token !== (this.auth.authSession().token ?? null)) return;
        console.error('Unable to retrieve document preview', error);
        this.state.update(s => ({ ...s, documentLoading: false, documentError: 'Unable to retrieve the document. Please retry.' }));
      },
    });
  }

  downloadDocument(id: string, filename: string | null): void {
    const owner = this.auth.authSession().user?.email ?? null;
    const token = this.auth.authSession().token ?? null;
    this.state.update(s => ({ ...s, documentError: null }));
    this.api.downloadTailoredDocument(id).subscribe({
      next: (blob) => {
        if (owner !== (this.auth.authSession().user?.email ?? null) || token !== (this.auth.authSession().token ?? null)) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'tailored-document.md';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
      },
      error: (error: unknown) => {
        if (owner !== (this.auth.authSession().user?.email ?? null) || token !== (this.auth.authSession().token ?? null)) return;
        console.error('Unable to download CV', error);
        this.state.update(s => ({ ...s, documentError: 'Unable to download the document. Please retry.' }));
      },
    });
  }
}