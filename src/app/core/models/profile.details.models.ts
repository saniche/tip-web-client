import { ProfileCertificate, ProfileSkill, ProfileWorkExperience } from "./profile.models";
import { ProfileVersion } from "./tailored-cv";

export interface ProfileHeader {
    name: string;
    email: string;
    phone: string;
    location: string;
    summary: string;
    headline: string;
    linkedIn: string;
}


export interface ProfileDetails {
    header: ProfileHeader;
    total_years_of_experience: number;
    preferred_job_titles: string[];
    soft_skills: string[];
    core_competences: string[];
    additional_informations: string[];
    languages: string[];
    skills: ProfileSkill[];
    certificates: ProfileCertificate[];
    work_experiences: ProfileWorkExperience[];
}

export interface UserProfileData extends ProfileVersion {
    profile: ProfileDetails;
}