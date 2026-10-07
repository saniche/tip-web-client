export type ProfileData = Record<string, unknown>;

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
