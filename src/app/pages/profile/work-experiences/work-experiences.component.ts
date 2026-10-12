import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ProfileWorkExperience } from '../../../core/models/profile.models';
import { StringListComponent } from '../string-list/string-list.component';

@Component({
  imports: [StringListComponent],
  selector: 'app-work-experiences-editor',
  templateUrl: './work-experiences.component.html',
})
export class WorkExperiencesComponent {
  @Input() workExperiences: ProfileWorkExperience[] = [];
  @Output() readonly workExperiencesChange = new EventEmitter<any[]>();

  protected addExperience(): void {
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

function textValue(event: Event): string | null {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement;
  return target.value === '' ? null : target.value;
}
