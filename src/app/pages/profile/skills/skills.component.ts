import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ProfileSkill, SKILL_LEVELS } from '../../../core/models/profile.models';

@Component({
  imports: [],
  selector: 'app-skills-editor',
  templateUrl: './skills.component.html',
})
export class SkillsComponent {
  @Input() skills: (ProfileSkill & { Name?: string | null; Level?: string | null })[] = [];
  @Output() readonly skillsChange = new EventEmitter<any[]>();

  protected readonly levels = SKILL_LEVELS;

  protected addSkill(): void {
    this.skillsChange.emit([...this.skills.map(normalizeSkill), { name: null, level: null }]);
  }

  protected updateName(index: number, event: Event): void {
    this.updateSkill(index, { name: nullableInputValue(event) });
  }

  protected updateLevel(index: number, event: Event): void {
    const value = inputValue(event);
    this.updateSkill(index, { level: SKILL_LEVELS.find((level) => level === value) ?? null });
  }

  protected skillName(skill: ProfileSkill & { Name?: string | null }): string {
    return skill.name ?? skill.Name ?? '';
  }

  protected skillLevel(skill: ProfileSkill & { Level?: string | null }): string {
    return normalizeLevel(skill.level ?? skill.Level) ?? '';
  }

  protected removeSkill(index: number): void {
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

function normalizeSkill(
  skill: ProfileSkill & { Name?: string | null; Level?: string | null },
): ProfileSkill {
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
