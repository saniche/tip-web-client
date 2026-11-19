import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { ProfileSkill, SKILL_LEVELS } from '../../../core/models/profile.models';

type SkillInput = ProfileSkill & { Name?: string | null; Level?: string | null };

interface SkillGroup {
  level: string;
  items: { index: number; name: string }[];
}

const NO_LEVEL = 'No level';

@Component({
  imports: [],
  selector: 'app-skills-editor',
  templateUrl: './skills.component.html',
  styleUrl: './skills.component.scss',
})
export class SkillsComponent {
  @Input() skills: SkillInput[] = [];
  @Output() readonly skillsChange = new EventEmitter<any[]>();

  protected readonly levels = SKILL_LEVELS;
  protected readonly editingIndex = signal<number | null>(null);

  /** Skills grouped from the highest level to the lowest, keeping the stored index of each. */
  protected groups(): SkillGroup[] {
    const buckets = new Map<string, SkillGroup['items']>();
    for (const level of [...this.levels].reverse()) buckets.set(level, []);
    buckets.set(NO_LEVEL, []);
    this.skills.forEach((skill, index) => {
      buckets.get(this.skillLevel(skill) || NO_LEVEL)!.push({ index, name: this.skillName(skill) });
    });
    return [...buckets]
      .filter(([, items]) => items.length > 0)
      .map(([level, items]) => ({ level, items }));
  }

  protected editing(): { index: number; name: string; level: string } | null {
    const index = this.editingIndex();
    const skill = index === null ? undefined : this.skills[index];
    return index !== null && skill
      ? { index, name: this.skillName(skill), level: this.skillLevel(skill) }
      : null;
  }

  protected quickAdd(nameInput: HTMLInputElement, levelSelect: HTMLSelectElement): void {
    const name = nameInput.value.trim();
    if (!name) return;

    const existing = this.skills.findIndex(
      (skill) => this.skillName(skill).trim().toLowerCase() === name.toLowerCase(),
    );
    if (existing >= 0) {
      this.editingIndex.set(existing);
    } else {
      this.skillsChange.emit([
        ...this.skills.map(normalizeSkill),
        { name, level: SKILL_LEVELS.find((level) => level === levelSelect.value) ?? null },
      ]);
    }
    nameInput.value = '';
    nameInput.focus();
  }

  protected edit(index: number): void {
    this.editingIndex.update((current) => (current === index ? null : index));
  }

  protected updateName(index: number, event: Event): void {
    this.updateSkill(index, { name: nullableInputValue(event) });
  }

  protected updateLevel(index: number, event: Event): void {
    const value = inputValue(event);
    this.updateSkill(index, { level: SKILL_LEVELS.find((level) => level === value) ?? null });
  }

  protected skillName(skill: SkillInput): string {
    return skill.name ?? skill.Name ?? '';
  }

  protected skillLevel(skill: SkillInput): string {
    return normalizeLevel(skill.level ?? skill.Level) ?? '';
  }

  protected removeSkill(index: number): void {
    this.editingIndex.set(null);
    this.skillsChange.emit(
      this.skills.filter((_, itemIndex) => itemIndex !== index).map(normalizeSkill),
    );
  }

  private updateSkill(index: number, changes: Partial<ProfileSkill>): void {
    this.skillsChange.emit(
      this.skills.map((skill, itemIndex) =>
        itemIndex === index ? { ...normalizeSkill(skill), ...changes } : normalizeSkill(skill),
      ),
    );
  }
}

function normalizeSkill(skill: SkillInput): ProfileSkill {
  return {
    name: skill.name ?? skill.Name ?? null,
    level: normalizeLevel(skill.level ?? skill.Level),
  };
}

function normalizeLevel(value: unknown): ProfileSkill['level'] {
  if (typeof value !== 'string') {
    return null;
  }
  return SKILL_LEVELS.find((level) => level.toLowerCase() === value.trim().toLowerCase()) ?? null;
}

function inputValue(event: Event): string {
  return (event.target as HTMLInputElement).value;
}

function nullableInputValue(event: Event): string | null {
  const value = inputValue(event);
  return value === '' ? null : value;
}
