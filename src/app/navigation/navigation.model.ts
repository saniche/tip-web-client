export type AreaId = 'dashboard' | 'profile' | 'jobs' | 'matching' | 'applications' | 'tailoring' | 'settings';
export type Availability = 'available' | 'unverified' | 'hidden';

export interface NavigationDestination {
  label: string;
  path: string;
}

export interface NavigationArea {
  id: AreaId;
  label: string;
  icon: string;
  availability: Availability;
  destinations: readonly NavigationDestination[];
}

export interface RouteNavigation {
  areaId: AreaId;
  pageLabel: string;
  parent?: NavigationDestination;
}

export const navigationAreas: readonly NavigationArea[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z', availability: 'available',
    destinations: [{ label: 'Overview', path: '/dashboard' }] },
  { id: 'profile', label: 'My Profile', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21a8 8 0 0 1 16 0', availability: 'available',
    destinations: [{ label: 'Profile', path: '/profile' }] },
  { id: 'jobs', label: 'Jobs', icon: 'M3 7h18v13H3z M8 7V4h8v3 M3 12h18', availability: 'available',
    destinations: [{ label: 'Normalized jobs', path: '/normalized-jobs' }, { label: 'Normalize job', path: '/normalize-job' }, { label: 'Interests', path: '/jobs/interests' }, { label: 'Workflow pipeline', path: '/jobs' }] },
  { id: 'matching', label: 'Job Matching', icon: 'M4 5h16 M4 12h10 M4 19h16 M17 10l2 2 3-4', availability: 'available',
    destinations: [{ label: 'Matching session', path: '/matching-session' }, { label: 'Matching reports', path: '/matching-reports' }] },
  { id: 'applications', label: 'Applications', icon: 'M5 3h14v18H5z M8 8h8 M8 12h8 M8 16h6', availability: 'available',
    destinations: [{ label: 'Application journal', path: '/applications' }, { label: 'Add application', path: '/applications/new' }] },
  { id: 'tailoring', label: 'Tailoring', icon: 'M4 4l16 16 M4 20L20 4 M7 7h.01 M7 17h.01', availability: 'available',
    destinations: [{ label: 'Tailoring session', path: '/tailoring-session' }, { label: 'Tailoring history', path: '/tailored-cvs' }] },
  { id: 'settings', label: 'Settings', icon: 'M12 3v2 M12 19v2 M3 12h2 M19 12h2 M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', availability: 'hidden',
    destinations: [] },
];
