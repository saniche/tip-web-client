import { Component, input, output } from '@angular/core';
import { TailoringMode } from '../../../core/models/tailored-cv';

export interface TailoringReviewJob {
  id: string;
  label: string;
}

@Component({
  selector: 'app-tailored-cv-confirmation',
  templateUrl: './tailored-cv-confirmation.html',
})
export class TailoredCvConfirmation {
  readonly jobs = input.required<TailoringReviewJob[]>();
  readonly profile = input.required<string>();
  readonly mode = input.required<TailoringMode>();
  readonly language = input.required<string>();
  readonly busy = input(false);
  readonly canConfirm = input(false);
  readonly retry = input(false);

  readonly removeJob = output<string>();
  readonly confirm = output<void>();
  readonly cancel = output<void>();
}
