import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { ProfileEducation } from '../../../core/models/profile.models';
import { EditorItemComponent } from '../editor-item/editor-item.component';

@Component({
  imports: [EditorItemComponent],
  selector: 'app-education-editor',
  templateUrl: './education.component.html',
  styleUrl: '../profile-editor/editor-section.scss',
})
export class EducationComponent {
  @Input() education: ProfileEducation[] = [];
  @Output() readonly educationChange = new EventEmitter<any[]>();

  protected readonly openIndex = signal<number | null>(null);

  protected setOpen(index: number, open: boolean): void {
    this.openIndex.set(open ? index : null);
  }

  protected heading(entry: ProfileEducation): string {
    const degree = entry.Degree?.trim();
    const field = entry.Field?.trim();
    if (degree && field) return `${degree}, ${field}`;
    return degree || field || entry.Institution?.trim() || 'New education';
  }

  protected meta(entry: ProfileEducation): string {
    const institution = entry.Degree || entry.Field ? entry.Institution?.trim() : '';
    return [institution, entry.Year].filter((part) => part !== null && part !== undefined && part !== '').join(', ');
  }

  protected addEducation(): void {
    this.openIndex.set(this.education.length);
    this.educationChange.emit([
      ...this.education,
      {
        Institution: null,
        Location: null,
        Degree: null,
        Field: null,
        Year: null,
        Completed: null,
      },
    ]);
  }

  protected updateText(
    index: number,
    field: 'Institution' | 'Location' | 'Degree' | 'Field',
    event: Event,
  ): void {
    this.updateEntry(index, { [field]: textValue(event) });
  }

  protected updateYear(index: number, event: Event): void {
    this.updateEntry(index, { Year: numberValue(event) });
  }

  protected updateCompleted(index: number, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.updateEntry(index, { Completed: value === '' ? null : value === 'true' });
  }

  protected removeEducation(index: number): void {
    this.openIndex.set(null);
    this.educationChange.emit(this.education.filter((_, itemIndex) => itemIndex !== index));
  }

  private updateEntry(index: number, changes: Partial<ProfileEducation>): void {
    this.educationChange.emit(
      this.education.map((entry, itemIndex) =>
        itemIndex === index ? { ...entry, ...changes } : entry,
      ),
    );
  }
}

function textValue(event: Event): string | null {
  const value = (event.target as HTMLInputElement).value;
  return value === '' ? null : value;
}

function numberValue(event: Event): number | null {
  const input = event.target as HTMLInputElement;
  return input.value === '' || !Number.isFinite(input.valueAsNumber) ? null : input.valueAsNumber;
}
