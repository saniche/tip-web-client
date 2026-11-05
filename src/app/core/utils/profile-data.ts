import { ProfileDetails, ProfileHeader,  } from "../models/profile.details.models";
import { ProfileCertificate, ProfileSkill, ProfileWorkExperience } from "../models/profile.models";

export function hasProfileData(data: Record<string, unknown> | null): boolean {
  return !!data && Object.entries(data).some(([key, value]) => key !== '__evidence__' && hasValue(value));
}

function hasValue(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number' || typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.some(hasValue);
  if (value && typeof value === 'object') return Object.values(value).some(hasValue);
  return false;
}

export function getProfileDetails(data: Record<string, unknown> | null): ProfileDetails| null {
  if (!data) return null;

  var header = getProfileHeader(data);

  var skills = getProfileSkills(data);
  var certificates = getProfileCertificates(data);
  var work_experiences = getProfileWorkExperiences(data);

  return {
    header: header,
    total_years_of_experience: data['total_years_of_experience'] as number || 0,
    preferred_job_titles: data['preferred_job_titles'] as string[] || [],
    soft_skills: data['soft_skills'] as string[] || [],
    core_competences: data['core_competences'] as string[] || [],
    additional_informations: data['additional_informations'] as string[] || [],
    languages: data['languages'] as string[] || [],
    skills: skills,
    certificates: certificates,
    work_experiences: work_experiences
  }
}

function getProfileHeader(data: Record<string, unknown> | null) : ProfileHeader  {
  if (!data) return  { name: '', email: '', phone: '', location: '', summary: '', headline: '', linkedIn: '' };

  return {
    name: data['name'] as string || '',
    email: data['email'] as string || '',
    phone: data['phone'] as string || '',
    location: data['location'] as string || '',
    summary: data['summary'] as string || '',
    headline: data['headline'] as string || '',
    linkedIn: data['linkedIn'] as string || ''
  }
}

function getProfileSkills(data: Record<string, unknown> | null): ProfileSkill[] {
  if (!data) return [];
  return data['skills'] as ProfileSkill[] || [];
}
function getProfileCertificates(data: Record<string, unknown> | null): ProfileCertificate[] {
  if (!data) return [];
  return data['certificates'] as ProfileCertificate[] || [];
}

function getProfileWorkExperiences(data: Record<string, unknown> | null): ProfileWorkExperience[] {
  if (!data) return [];
  return data['work_experiences'] as ProfileWorkExperience[] || [];
}

export function profileDetailsToRecord(profile: ProfileDetails): Record<string, unknown> {
  return {
    name: profile.header.name,
    email: profile.header.email,
    phone: profile.header.phone,
    location: profile.header.location,
    summary: profile.header.summary,
    headline: profile.header.headline,
    linkedIn: profile.header.linkedIn,
    total_years_of_experience: profile.total_years_of_experience,
    preferred_job_titles: profile.preferred_job_titles,
    soft_skills: profile.soft_skills,
    core_competences: profile.core_competences,
    additional_informations: profile.additional_informations,
    languages: profile.languages,
    skills: profile.skills,
    certificates: profile.certificates,
    work_experiences: profile.work_experiences
  };
}
