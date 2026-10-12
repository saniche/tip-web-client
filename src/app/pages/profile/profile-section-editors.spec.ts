import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { CertificatesComponent } from './certificates/certificates.component';
import { EducationComponent } from './education/education.component';
import { SkillsComponent } from './skills/skills.component';
import { WorkExperiencesComponent } from './work-experiences/work-experiences.component';

describe('profile section editors', () => {
  it('adds, edits, and removes skills while emitting nullable values', async () => {
    const fixture = await createFixture(SkillsComponent);
    const emitted: unknown[][] = [];
    fixture.componentInstance.skillsChange.subscribe((value) => emitted.push(value));

    click(fixture, 'button');
    expect(emitted.at(-1)).toEqual([{ name: null, level: null }]);

    fixture.componentRef.setInput('skills', emitted.at(-1));
    fixture.detectChanges();
    const name = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    name.value = 'TypeScript';
    name.dispatchEvent(new Event('input'));
    expect(emitted.at(-1)).toEqual([{ name: 'TypeScript', level: null }]);

    fixture.componentRef.setInput('skills', emitted.at(-1));
    fixture.detectChanges();
    const level = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    level.value = 'Beginner';
    level.dispatchEvent(new Event('change'));
    expect(emitted.at(-1)).toEqual([{ name: 'TypeScript', level: 'Beginner' }]);

    fixture.componentRef.setInput('skills', emitted.at(-1));
    fixture.detectChanges();
    const clearedName = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    clearedName.value = '';
    clearedName.dispatchEvent(new Event('input'));
    expect(emitted.at(-1)).toEqual([{ name: null, level: 'Beginner' }]);

    fixture.componentRef.setInput('skills', emitted.at(-1));
    fixture.detectChanges();
    click(fixture, 'button.btn-outline-danger');
    expect(emitted.at(-1)).toEqual([]);
  });

  it('shows existing skill levels from lowercase or legacy PascalCase profile fields', async () => {
    const fixture = await createFixture(SkillsComponent);
    fixture.componentRef.setInput('skills', [
      { name: 'TypeScript', level: 'Expert' },
      { Name: 'Angular', Level: 'Advanced' },
    ]);
    fixture.detectChanges();

    const selects = fixture.nativeElement.querySelectorAll('select') as NodeListOf<HTMLSelectElement>;
    expect(Array.from(selects).map((select) => select.value)).toEqual(['Expert', 'Advanced']);
  });

  it('adds, edits, and removes certificates with nullable numeric years', async () => {
    const fixture = await createFixture(CertificatesComponent);
    const emitted: unknown[][] = [];
    fixture.componentInstance.certificatesChange.subscribe((value) => emitted.push(value));

    click(fixture, 'button');
    expect(emitted.at(-1)).toEqual([{ name: null, issuer: null, year: null }]);

    fixture.componentRef.setInput('certificates', emitted.at(-1));
    fixture.detectChanges();
    const year = fixture.nativeElement.querySelector('input[type="number"]') as HTMLInputElement;
    year.value = '2024';
    year.dispatchEvent(new Event('input'));
    expect(emitted.at(-1)).toEqual([{ name: null, issuer: null, year: 2024 }]);

    fixture.componentRef.setInput('certificates', emitted.at(-1));
    fixture.detectChanges();
    click(fixture, 'button.btn-outline-danger');
    expect(emitted.at(-1)).toEqual([]);
  });

  it('adds, edits, and removes education with nullable completion state', async () => {
    const fixture = await createFixture(EducationComponent);
    const emitted: unknown[][] = [];
    fixture.componentInstance.educationChange.subscribe((value) => emitted.push(value));

    click(fixture, 'button');
    expect(emitted.at(-1)).toEqual([
      {
        institution: null,
        location: null,
        degree: null,
        field: null,
        year: null,
        completed: null,
      },
    ]);

    fixture.componentRef.setInput('education', emitted.at(-1));
    fixture.detectChanges();
    const completed = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    completed.value = 'false';
    completed.dispatchEvent(new Event('change'));
    expect(emitted.at(-1)).toEqual([
      {
        institution: null,
        location: null,
        degree: null,
        field: null,
        year: null,
        completed: false,
      },
    ]);

    fixture.componentRef.setInput('education', emitted.at(-1));
    fixture.detectChanges();
    click(fixture, 'button.btn-outline-danger');
    expect(emitted.at(-1)).toEqual([]);
  });

  it('adds, edits, and removes work experiences with nullable dates and descriptions', async () => {
    const fixture = await createFixture(WorkExperiencesComponent);
    const emitted: unknown[][] = [];
    fixture.componentInstance.workExperiencesChange.subscribe((value) => emitted.push(value));

    click(fixture, 'button');
    expect(emitted.at(-1)).toEqual([
      {
        company: null,
        title: null,
        startDate: null,
        endDate: null,
        summary: null,
        realisationDescription: null,
      },
    ]);

    fixture.componentRef.setInput('workExperiences', emitted.at(-1));
    fixture.detectChanges();
    const summary = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    summary.value = 'Built product features';
    summary.dispatchEvent(new Event('input'));
    expect(emitted.at(-1)).toEqual([
      {
        company: null,
        title: null,
        startDate: null,
        endDate: null,
        summary: 'Built product features',
        realisationDescription: null,
      },
    ]);

    fixture.componentRef.setInput('workExperiences', emitted.at(-1));
    fixture.detectChanges();
    click(fixture, 'button.btn-outline-danger');
    expect(emitted.at(-1)).toEqual([]);
  });
});

async function createFixture<T>(component: Type<T>): Promise<ComponentFixture<T>> {
  await TestBed.configureTestingModule({ imports: [component] }).compileComponents();
  const fixture = TestBed.createComponent(component);
  fixture.detectChanges();
  return fixture;
}

function click(fixture: ComponentFixture<unknown>, selector: string): void {
  (fixture.nativeElement.querySelector(selector) as HTMLButtonElement).click();
  fixture.detectChanges();
}
