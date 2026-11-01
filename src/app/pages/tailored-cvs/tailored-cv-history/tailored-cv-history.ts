import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TailoredCvStore } from '../../../core/state/tailored-cv-store';

@Component({
  selector: 'app-tailored-cv-history',
  imports: [RouterLink],
  templateUrl: './tailored-cv-history.html',
  styleUrl: './tailored-cv-history.scss',
})
export class TailoredCvHistory {
  protected readonly store = inject(TailoredCvStore);
  constructor() {
    this.store.loadHistory();
  }
}
