import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Compact card for a normalized job. Used by Normalized jobs and Interests.
 * Page-specific buttons are projected into the footer.
 */
@Component({
  selector: 'app-job-card',
  imports: [RouterLink],
  templateUrl: './job-card.html',
  styleUrl: './job-card.scss',
})
export class JobCard {
  readonly jobId = input.required<string>();
  readonly title = input<string | null>(null);
  readonly company = input<string | null>(null);
  readonly location = input<string | null>(null);
  readonly postingDate = input<string | null>(null);
  readonly source = input<string | null>(null);
  /** Optional extra fact, e.g. the date the job was added to interests. */
  readonly extraLabel = input<string | null>(null);
  readonly extraValue = input<string | null>(null);
  /** True when the job is already part of the open matching session. */
  readonly inSession = input(false);

  protected readonly sourceLink = computed(() => {
    const value = this.source()?.trim();
    if (!value) return null;
    try {
      const url = new URL(value);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
      return { href: url.href, label: url.hostname.replace(/^www\./, '') };
    } catch {
      return null;
    }
  });

  protected readonly sourceText = computed(() => this.source()?.trim() || null);

  protected display(value: string | null): string {
    return value?.trim() || '—';
  }

  protected date(value: string | null): string {
    const text = value?.trim();
    if (!text) return '—';
    return /^\d{4}-\d{2}-\d{2}T/.test(text) ? text.slice(0, 10) : text;
  }
}
