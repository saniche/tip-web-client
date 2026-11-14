import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { ProfileWorkExperience } from '../../../core/models/profile.models';
import { EditorItemComponent } from '../editor-item/editor-item.component';
import { StringListComponent } from '../string-list/string-list.component';

@Component({
  imports: [EditorItemComponent, StringListComponent],
  selector: 'app-work-experiences-editor',
  templateUrl: './work-experiences.component.html',
  styleUrl: '../profile-editor/editor-section.scss',
})
export class WorkExperiencesComponent {
  @Input() workExperiences: ProfileWorkExperience[] = [];
  @Output() readonly workExperiencesChange = new EventEmitter<any[]>();

  protected readonly openIndex = signal<number | null>(null);

  protected addExperience(): void {
    this.openIndex.set(this.workExperiences.length);
    this.workExperiencesChange.emit([
      ...this.workExperiences,
      {
        Company: null,
        Title: null,
        StartDate: null,
        EndDate: null,
        Summary: null,
        RealisationDescription: [],
      },
    ]);
  }

  protected setOpen(index: number, open: boolean): void {
    this.openIndex.set(open ? index : null);
  }

  protected roleLabel(experience: ProfileWorkExperience): string {
    const title = experience.Title?.trim();
    const company = experience.Company?.trim();
    if (title && company) return `${title} at ${company}`;
    return title || company || 'New experience';
  }

  protected periodLabel(experience: ProfileWorkExperience): string {
    const start = monthOf(experience.StartDate);
    const end = monthOf(experience.EndDate);
    if (!start && !end) return '';
    return `${start || '?'} to ${end || 'present'}`;
  }

  protected updateText(
    index: number,
    field: 'Company' | 'Title' | 'StartDate' | 'EndDate' | 'Summary' | 'RealisationDescription',
    event: Event,
  ): void {
    this.updateExperience(index, { [field]: textValue(event) });
  }

  protected updateRealisationDescription(index: number, descriptions: string[]): void {
    this.updateExperience(index, { RealisationDescription: descriptions });
  }

  protected removeExperience(index: number): void {
    this.openIndex.set(null);
    this.workExperiencesChange.emit(
      this.workExperiences.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  private updateExperience(index: number, changes: Partial<ProfileWorkExperience>): void {
    this.workExperiencesChange.emit(
      this.workExperiences.map((experience, itemIndex) =>
        itemIndex === index ? { ...experience, ...changes } : experience,
      ),
    );
  }
}

function monthOf(value: string | null | undefined): string {
  const text = value?.trim() ?? '';
  return /^\d{4}-\d{2}/.test(text) ? text.slice(0, 7) : text;
}

function textValue(event: Event): string | null {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement;
  return target.value === '' ? null : target.value;
}
