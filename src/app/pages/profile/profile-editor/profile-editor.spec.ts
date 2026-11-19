import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { EditableProfile, ProfileDraft, ProfileEditor } from './profile-editor';

const profile: EditableProfile = {
  label: 'Engineering profile',
  outputLanguage: 'English',
  data: {
    name: 'Ada',
    email: 'ada@example.com',
    custom_field: 'preserve me',
    skills: [{ name: 'TypeScript', level: 'Expert' }],
  },
};

describe('ProfileEditor', () => {
  let fixture: ComponentFixture<ProfileEditor>;
  let drafts: ProfileDraft[];

  const root = () => fixture.nativeElement as HTMLElement;
  const input = (name: string) => root().querySelector<HTMLInputElement>(`[formControlName="${name}"]`)!;
  const type = (el: HTMLInputElement | HTMLTextAreaElement, value: string) => {
    el.value = value;
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const saveButton = () => root().querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const discardButton = () =>
    Array.from(root().querySelectorAll<HTMLButtonElement>('.profile-editor__bar button')).find((button) =>
      button.textContent!.includes('Discard'),
    )!;
  const submit = () => {
    root().querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ProfileEditor] }).compileComponents();
    fixture = TestBed.createComponent(ProfileEditor);
    fixture.componentRef.setInput('profile', profile);
    fixture.detectChanges();
    drafts = [];
    fixture.componentInstance.save.subscribe((draft) => drafts.push(draft));
  });

  it('starts clean, marks edits as unsaved, and emits a draft that keeps unknown keys', () => {
    expect(root().querySelector('.profile-editor__unsaved')).toBeNull();
    expect(saveButton().disabled).toBe(true);
    expect(discardButton().disabled).toBe(true);

    type(input('name'), 'Ada Lovelace');
    expect(root().querySelector('.profile-editor__unsaved')!.textContent).toContain('Unsaved changes');
    expect(saveButton().disabled).toBe(false);

    submit();
    expect(drafts).toHaveLength(1);
    expect(drafts[0].label).toBe('Engineering profile');
    expect(drafts[0].outputLanguage).toBe('English');
    expect(drafts[0].data).toMatchObject({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      custom_field: 'preserve me',
      skills: [{ name: 'TypeScript', level: 'Expert' }],
    });
  });

  it('treats a change inside a section editor as unsaved and discards it', () => {
    const skillName = root().querySelector<HTMLInputElement>('app-skills-editor input[aria-label="New skill name"]')!;
    skillName.value = 'Angular';
    skillName.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
    fixture.detectChanges();
    expect(root().querySelector('.profile-editor__unsaved')).toBeTruthy();
    expect(root().querySelectorAll('.skills__chip')).toHaveLength(2);

    discardButton().click();
    fixture.detectChanges();
    expect(root().querySelector('.profile-editor__unsaved')).toBeNull();
    expect(root().querySelectorAll('.skills__chip')).toHaveLength(1);
  });

  it('restores the saved values on discard and clears the marker when a new profile arrives', () => {
    type(input('name'), 'Someone else');
    discardButton().click();
    fixture.detectChanges();
    expect(input('name').value).toBe('Ada');
    expect(root().querySelector('.profile-editor__unsaved')).toBeNull();

    type(input('name'), 'Edited');
    fixture.componentRef.setInput('profile', { ...profile, data: { ...profile.data, name: 'Saved name' } });
    fixture.detectChanges();
    expect(input('name').value).toBe('Saved name');
    expect(root().querySelector('.profile-editor__unsaved')).toBeNull();
  });

  it('does not emit an invalid draft and returns to the Overview to show the problem', () => {
    root().querySelector<HTMLButtonElement>('.profile-editor__nav-item:nth-child(3)')!.click();
    type(input('email'), 'not-an-email');
    expect(root().querySelector('.profile-editor__nav-item.is-active')!.textContent).toContain('Skills');

    submit();
    expect(drafts).toHaveLength(0);
    expect(root().querySelector('.profile-editor__nav-item.is-active')!.textContent).toContain('Overview');
    expect(root().textContent).toContain('Enter a valid email address.');
  });

  it('keeps Enter in a text field from saving the profile but still allows new lines in the summary', () => {
    const enter = () => new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    const inField = enter();
    input('name').dispatchEvent(inField);
    expect(inField.defaultPrevented).toBe(true);

    const inSummary = enter();
    root().querySelector('textarea[formControlName="summary"]')!.dispatchEvent(inSummary);
    expect(inSummary.defaultPrevented).toBe(false);
  });

  it('ignores submit while a save is running', () => {
    type(input('name'), 'Ada Lovelace');
    fixture.componentRef.setInput('saving', true);
    fixture.detectChanges();
    expect(saveButton().textContent).toContain('Saving');
    expect(saveButton().disabled).toBe(true);

    submit();
    expect(drafts).toHaveLength(0);
  });

  it('shows the status message once there is nothing left to save', () => {
    fixture.componentRef.setInput('statusMessage', 'Profile saved successfully.');
    fixture.detectChanges();
    expect(root().querySelector('.profile-editor__state')!.textContent).toContain('Profile saved successfully.');

    type(input('name'), 'Ada Lovelace');
    expect(root().querySelector('.profile-editor__state')!.textContent).not.toContain('saved successfully');
  });
});
