import { Component, input } from '@angular/core';

@Component({
  selector: 'app-tailored-cv-status',
  templateUrl: './tailored-cv-status.html',
  styleUrl: './tailored-cv-status.scss',
})
export class TailoredCvStatus {
  readonly status = input<string | null>(null);
  readonly warning = input<string | null>(null);
  readonly error = input<string | null>(null);
}
