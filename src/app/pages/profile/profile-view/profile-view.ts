import { Component, computed, input } from '@angular/core';
import { ProfileData, SKILL_LEVELS } from '../../../core/models/profile.models';

interface ExperienceView {
  heading: string;
  period: string;
  summary: string;
  achievements: string[];
}

interface EducationView {
  heading: string;
  meta: string;
}

interface SkillGroupView {
  level: string;
  names: string[];
}

const KNOWN_KEYS = new Set([
  'name',
  'email',
  'phone',
  'location',
  'linkedin',
  'summary',
  'total_years_of_experience',
  'source',
  'skills',
  'work_experiences',
  'education',
  'certifications',
  'core_competences',
  'soft_skills',
  'preferred_job_titles',
  'preferred_locations',
  'languages',
  'additional_informations',
]);
const LIST_KEYS = [
  'skills',
  'work_experiences',
  'education',
  'certifications',
  'core_competences',
  'soft_skills',
  'preferred_job_titles',
  'preferred_locations',
  'languages',
  'additional_informations',
];
const NO_LEVEL = 'No level';

/** Read-only presentation of a profile's data. Anything it cannot present is listed under "Other data". */
@Component({
  selector: 'app-profile-view',
  templateUrl: './profile-view.html',
  styleUrl: './profile-view.scss',
})
export class ProfileView {
  readonly data = input<ProfileData>({});

  protected readonly contact = computed(() => {
    const data = this.data();
    return {
      name: text(data['name']),
      details: ['email', 'phone', 'location', 'linkedin']
        .map((key) => ({ key, value: text(data[key]) }))
        .filter((item) => item.value),
      years: text(data['total_years_of_experience']),
      summary: text(data['summary']),
    };
  });

  protected readonly experiences = computed<ExperienceView[]>(() =>
    list(this.data()['work_experiences']).map((item) => {
      const entry = record(item);
      const title = text(entry['Title']);
      const company = text(entry['Company']);
      const start = month(entry['StartDate']);
      const end = month(entry['EndDate']);
      return {
        heading: title && company ? `${title} at ${company}` : title || company || 'Untitled role',
        period: start || end ? `${start || '?'} to ${end || 'present'}` : '',
        summary: text(entry['Summary']),
        achievements: strings(entry['RealisationDescription']),
      };
    }),
  );

  protected readonly skillGroups = computed<SkillGroupView[]>(() => {
    const buckets = new Map<string, string[]>();
    for (const level of [...SKILL_LEVELS].reverse()) buckets.set(level, []);
    buckets.set(NO_LEVEL, []);
    for (const item of list(this.data()['skills'])) {
      const entry = typeof item === 'string' ? { name: item } : record(item);
      const name = text(entry['name'] ?? entry['Name']);
      if (!name) continue;
      const rawLevel = text(entry['level'] ?? entry['Level']).toLowerCase();
      const level = SKILL_LEVELS.find((candidate) => candidate.toLowerCase() === rawLevel);
      buckets.get(level ?? NO_LEVEL)!.push(name);
    }
    return [...buckets]
      .filter(([, names]) => names.length > 0)
      .map(([level, names]) => ({ level, names }));
  });

  protected readonly education = computed<EducationView[]>(() =>
    list(this.data()['education']).map((item) => {
      const entry = record(item);
      const degree = text(entry['Degree']);
      const field = text(entry['Field']);
      const heading = [degree, field].filter(Boolean).join(', ') || text(entry['Institution']) || 'Education';
      const institution = degree || field ? text(entry['Institution']) : '';
      const completed = entry['Completed'] === false ? 'not completed' : '';
      return {
        heading,
        meta: [institution, text(entry['Location']), text(entry['Year']), completed].filter(Boolean).join(', '),
      };
    }),
  );

  protected readonly certificates = computed<EducationView[]>(() =>
    list(this.data()['certifications']).map((item) => {
      const entry = record(item);
      return {
        heading: text(entry['Name']) || 'Certificate',
        meta: [text(entry['Issuer']), text(entry['Year'])].filter(Boolean).join(', '),
      };
    }),
  );

  protected readonly softSkills = computed(() => strings(this.data()['soft_skills']));
  protected readonly languages = computed(() => strings(this.data()['languages']));
  protected readonly preferredTitles = computed(() => strings(this.data()['preferred_job_titles']));
  protected readonly preferredLocations = computed(() => strings(this.data()['preferred_locations']));
  protected readonly coreCompetences = computed(() => strings(this.data()['core_competences']));
  protected readonly additionalInformations = computed(() => strings(this.data()['additional_informations']));

  protected readonly hasPreferences = computed(
    () =>
      this.preferredTitles().length > 0 ||
      this.preferredLocations().length > 0 ||
      this.languages().length > 0 ||
      this.additionalInformations().length > 0,
  );

  protected readonly otherData = computed(() => {
    const data = this.data();
    return Object.entries(data)
      .filter(
        ([key, value]) =>
          value !== null &&
          value !== undefined &&
          value !== '' &&
          (!KNOWN_KEYS.has(key) || (LIST_KEYS.includes(key) && !Array.isArray(value))),
      )
      .map(([key, value]) => ({
        label: humanizeKey(key),
        value: typeof value === 'string' ? value : (JSON.stringify(value, null, 2) ?? String(value)),
      }));
  });

  protected readonly isEmpty = computed(
    () =>
      !this.contact().name &&
      this.contact().details.length === 0 &&
      !this.contact().summary &&
      this.experiences().length === 0 &&
      this.skillGroups().length === 0 &&
      this.education().length === 0 &&
      this.certificates().length === 0 &&
      this.softSkills().length === 0 &&
      this.coreCompetences().length === 0 &&
      !this.hasPreferences() &&
      this.otherData().length === 0,
  );
}

function text(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function strings(value: unknown): string[] {
  return list(value)
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function month(value: unknown): string {
  const raw = text(value);
  return /^\d{4}-\d{2}/.test(raw) ? raw.slice(0, 7) : raw;
}

function humanizeKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
