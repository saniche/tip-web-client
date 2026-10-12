export type ProfileData = Record<string, unknown>;

export const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

export interface ProfileSkill {
  name?: string | null;
  level?: SkillLevel | null;
}

export interface ProfileCertificate {
  Name?: string | null;
  Issuer?: string | null;
  Year?: number | null;
}

export interface ProfileEducation {
  Institution?: string | null;
  Location?: string | null;
  Degree?: string | null;
  Field?: string | null;
  Year?: number | null;
  Completed?: boolean | null;
}

export interface ProfileWorkExperience {
  Company?: string | null;
  Title?: string | null;
  StartDate?: string | null;
  EndDate?: string | null;
  Summary?: string | null;
  RealisationDescription?: string | null;
}

export interface UserProfile {
  id: string;
  user_id: string;
  data: ProfileData;
  output_language: string;
}

export interface ProfileSessionFile {
  id: string;
  status: string;
  error: string | null;
}

export interface ProfileSession {
  id: string;
  status: string;
  files: ProfileSessionFile[];
}
