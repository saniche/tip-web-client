import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { WorkExperiencesComponent } from './work-experiences.component';

describe('WorkExperiencesComponent', () => {
  let fixture: ComponentFixture<WorkExperiencesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [WorkExperiencesComponent] }).compileComponents();
    fixture = TestBed.createComponent(WorkExperiencesComponent);
  });

  it('renders realization descriptions as editable list items and emits changes for their experience', () => {
    fixture.componentRef.setInput('workExperiences', [
      { Company: 'Acme', RealisationDescription: ['Led redesign'] },
      { Company: 'Example', RealisationDescription: ['Automated reporting'] },
    ]);
    fixture.detectChanges();

    const editors = fixture.nativeElement.querySelectorAll(
      'app-string-list-editor',
    ) as NodeListOf<HTMLElement>;
    expect(editors).toHaveLength(2);
    expect(editors[0].querySelector('input')?.value).toBe('Led redesign');
    expect(editors[1].querySelector('input')?.value).toBe('Automated reporting');

    const emitted: unknown[][] = [];
    fixture.componentInstance.workExperiencesChange.subscribe((experiences) => emitted.push(experiences));

    const addButton = editors[0].querySelector(
      'button:not([aria-label])',
    ) as HTMLButtonElement;
    addButton.click();
    expect(emitted.at(-1)).toEqual([
      { Company: 'Acme', RealisationDescription: ['Led redesign', ''] },
      { Company: 'Example', RealisationDescription: ['Automated reporting'] },
    ]);

    fixture.componentRef.setInput('workExperiences', emitted.at(-1));
    fixture.detectChanges();
    const addedDescription = fixture.nativeElement.querySelectorAll(
      'app-string-list-editor input',
    )[1] as HTMLInputElement;
    addedDescription.value = 'Mentored a cross-functional team';
    addedDescription.dispatchEvent(new Event('input'));

    expect(emitted.at(-1)).toEqual([
      {
        Company: 'Acme',
        RealisationDescription: ['Led redesign', 'Mentored a cross-functional team'],
      },
      { Company: 'Example', RealisationDescription: ['Automated reporting'] },
    ]);
  });
});
