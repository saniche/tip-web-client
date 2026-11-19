import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { CertificatesComponent } from './certificates/certificates.component';
import { EducationComponent } from './education/education.component';
import { SkillsComponent } from './skills/skills.component';
import { WorkExperiencesComponent } from './work-experiences/work-experiences.component';

describe('profile section editors', () => {
  it('adds skills from the quick-add bar and ignores empty or duplicate names', async () => {
    const fixture = await createFixture(SkillsComponent);
    const emitted: unknown[][] = [];
    fixture.componentInstance.skillsChange.subscribe((value) => emitted.push(value));
    const root = fixture.nativeElement as HTMLElement;
    const nameInput = root.querySelector<HTMLInputElement>('input[aria-label="New skill name"]')!;
    const levelSelect = root.querySelector<HTMLSelectElement>('select[aria-label="New skill level"]')!;

    click(fixture, 'button.btn-outline-primary');
    expect(emitted).toHaveLength(0);

    nameInput.value = ' TypeScript ';
    levelSelect.value = 'Expert';
    nameInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
    expect(emitted.at(-1)).toEqual([{ name: 'TypeScript', level: 'Expert' }]);
    expect(nameInput.value).toBe('');

    fixture.componentRef.setInput('skills', emitted.at(-1));
    fixture.detectChanges();
    nameInput.value = 'typescript';
    click(fixture, 'button.btn-outline-primary');
    expect(emitted).toHaveLength(1);
    expect(root.querySelector('.skills__edit')).toBeTruthy();
  });

  it('groups skills by level from highest to lowest, including legacy PascalCase fields', async () => {
    const fixture = await createFixture(SkillsComponent);
    fixture.componentRef.setInput('skills', [
      { name: 'SQL' },
      { name: 'TypeScript', level: 'Expert' },
      { Name: 'Angular', Level: 'Advanced' },
    ]);
    fixture.detectChanges();

    const groups = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.skills__group'),
    ).map((group) => ({
      level: group.querySelector('.skills__level')!.childNodes[0].textContent!.trim(),
      chips: Array.from(group.querySelectorAll('.skills__chip')).map((chip) => chip.textContent!.trim()),
    }));
    expect(groups).toEqual([
      { level: 'Expert', chips: ['TypeScript'] },
      { level: 'Advanced', chips: ['Angular'] },
      { level: 'No level', chips: ['SQL'] },
    ]);
  });

  it('edits a selected skill, emits nullable values, and removes it', async () => {
    const fixture = await createFixture(SkillsComponent);
    const emitted: unknown[][] = [];
    fixture.componentInstance.skillsChange.subscribe((value) => emitted.push(value));
    const root = fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('skills', [{ name: 'TypeScript', level: null }]);
    fixture.detectChanges();
    expect(root.querySelector('.skills__edit')).toBeNull();

    click(fixture, '.skills__chip');
    const name = root.querySelector<HTMLInputElement>('.skills__edit input')!;
    expect(name.value).toBe('TypeScript');

    const level = root.querySelector<HTMLSelectElement>('.skills__edit select')!;
    level.value = 'Beginner';
    level.dispatchEvent(new Event('change'));
    expect(emitted.at(-1)).toEqual([{ name: 'TypeScript', level: 'Beginner' }]);

    fixture.componentRef.setInput('skills', emitted.at(-1));
    fixture.detectChanges();
    name.value = '';
    name.dispatchEvent(new Event('input'));
    expect(emitted.at(-1)).toEqual([{ name: null, level: 'Beginner' }]);

    fixture.componentRef.setInput('skills', emitted.at(-1));
    fixture.detectChanges();
    expect(root.querySelector('.skills__chip')!.textContent).toContain('Unnamed skill');
    click(fixture, 'button.btn-outline-danger');
    expect(emitted.at(-1)).toEqual([]);
    fixture.componentRef.setInput('skills', []);
    fixture.detectChanges();
    expect(root.querySelector('.skills__edit')).toBeNull();
  });

  it('adds, edits, and removes certificates with nullable numeric years', async () => {
    const fixture = await createFixture(CertificatesComponent);
    const emitted: unknown[][] = [];
    fixture.componentInstance.certificatesChange.subscribe((value) => emitted.push(value));

    click(fixture, 'button');
    expect(emitted.at(-1)).toEqual([{ Name: null, Issuer: null, Year: null }]);

    fixture.componentRef.setInput('certificates', emitted.at(-1));
    fixture.detectChanges();
    const year = fixture.nativeElement.querySelector('input[type="number"]') as HTMLInputElement;
    year.value = '2024';
    year.dispatchEvent(new Event('input'));
    expect(emitted.at(-1)).toEqual([{ Name: null, Issuer: null, Year: 2024 }]);

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
        Institution: null,
        Location: null,
        Degree: null,
        Field: null,
        Year: null,
        Completed: null,
      },
    ]);

    fixture.componentRef.setInput('education', emitted.at(-1));
    fixture.detectChanges();
    const completed = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    completed.value = 'false';
    completed.dispatchEvent(new Event('change'));
    expect(emitted.at(-1)).toEqual([
      {
        Institution: null,
        Location: null,
        Degree: null,
        Field: null,
        Year: null,
        Completed: false,
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
        Company: null,
        Title: null,
        StartDate: null,
        EndDate: null,
        Summary: null,
        RealisationDescription: [],
      },
    ]);

    fixture.componentRef.setInput('workExperiences', emitted.at(-1));
    fixture.detectChanges();
    const summary = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    summary.value = 'Built product features';
    summary.dispatchEvent(new Event('input'));
    expect(emitted.at(-1)).toEqual([
      {
        Company: null,
        Title: null,
        StartDate: null,
        EndDate: null,
        Summary: 'Built product features',
        RealisationDescription: [],
      },
    ]);

    fixture.componentRef.setInput('workExperiences', emitted.at(-1));
    fixture.detectChanges();
    click(fixture, 'button.btn-outline-danger');
    expect(emitted.at(-1)).toEqual([]);
  });

  it('summarises experiences as collapsed rows and opens one at a time', async () => {
    const fixture = await createFixture(WorkExperiencesComponent);
    const root = fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('workExperiences', [
      { Company: 'Acme', Title: 'Developer', StartDate: '2020-01-15', EndDate: '2022-06-30' },
      { Company: 'Example', Title: null, StartDate: '2022-07-01', EndDate: null },
    ]);
    fixture.detectChanges();

    const heads = Array.from(root.querySelectorAll<HTMLButtonElement>('.editor-item__head'));
    expect(
      heads.map((head) => Array.from(head.querySelectorAll('span')).map((span) => span.textContent!.trim())),
    ).toEqual([
      ['Developer at Acme', '2020-01 to 2022-06'],
      ['Example', '2022-07 to present'],
    ]);
    const bodies = () => Array.from(root.querySelectorAll<HTMLElement>('.editor-item__body')).map((body) => body.hidden);
    expect(bodies()).toEqual([true, true]);

    heads[0].click();
    fixture.detectChanges();
    expect(bodies()).toEqual([false, true]);
    expect(heads[0].getAttribute('aria-expanded')).toBe('true');

    heads[1].click();
    fixture.detectChanges();
    expect(bodies()).toEqual([true, false]);

    heads[1].click();
    fixture.detectChanges();
    expect(bodies()).toEqual([true, true]);
  });

  it('opens a newly added experience so it can be filled in', async () => {
    const fixture = await createFixture(WorkExperiencesComponent);
    const root = fixture.nativeElement as HTMLElement;
    click(fixture, 'button');
    fixture.componentRef.setInput('workExperiences', [{ Company: null, Title: null }]);
    fixture.detectChanges();

    expect(root.querySelector('.editor-item__head')!.textContent).toContain('New experience');
    expect(root.querySelector<HTMLElement>('.editor-item__body')!.hidden).toBe(false);
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
