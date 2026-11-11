import { Routes } from '@angular/router';
import { Auth } from './pages/auth/auth';
import { Register } from './pages/auth/register/register';
import { Dashboard } from './pages/dashboard/dashboard';
import { ProfileComponent } from './pages/profile/profile.component';
import { authGuard } from './core/guards/auth.guard';
import { AreaId, NavigationDestination } from './navigation/navigation.model';

function context(areaId: AreaId, pageLabel: string, parent?: NavigationDestination) {
  return { navigation: { areaId, pageLabel, parent } };
}

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: 'dashboard',
    title: 'Dashboard',
    data: context('dashboard', 'Dashboard'),
    component: Dashboard,
  },
  {
    path: 'auth',
    component: Auth,
  },
  {
    path: 'auth/register',
    component: Register,
  },
  {
    path: 'jobs/interests',
    title: 'Interests',
    data: context('jobs', 'Interests'),
    canActivate: [authGuard],
    loadComponent: () => import('./pages/interests/interests').then((page) => page.Interests),
  },
  {
    path: 'applications/new',
    title: 'Add application',
    data: context('applications', 'Add application', { label: 'Application journal', path: '/applications' }),
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/application-journal/application-journal-entry').then(
        (page) => page.ApplicationJournalEntry,
      ),
  },
  {
    path: 'applications/:id',
    title: 'Application detail',
    data: context('applications', 'Application detail', { label: 'Application journal', path: '/applications' }),
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/application-journal/application-journal-entry').then(
        (page) => page.ApplicationJournalEntry,
      ),
  },
  {
    path: 'applications',
    title: 'Application journal',
    data: context('applications', 'Application journal'),
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/application-journal/application-journal').then(
        (page) => page.ApplicationJournal,
      ),
  },
  {
    path: 'normalize-job',
    title: 'Normalize job',
    data: context('jobs', 'Normalize job'),
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/normalize-job/normalize-job').then((page) => page.NormalizeJob),
  },
  {
    path: 'normalized-jobs',
    title: 'Normalized jobs',
    data: context('jobs', 'Normalized jobs'),
    loadComponent: () =>
      import('./pages/normalized-jobs/normalized-jobs').then((page) => page.NormalizedJobs),
  },
  {
    path: 'normalized-jobs/:id',
    title: 'Normalized job detail',
    data: context('jobs', 'Normalized job detail', { label: 'Normalized jobs', path: '/normalized-jobs' }),
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/normalized-job-detail/normalized-job-detail').then(
        (page) => page.NormalizedJobDetail,
      ),
  },
  {
    path: 'matching-session',
    title: 'Matching session',
    data: context('matching', 'Matching session'),
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/matching-session/matching-session').then(
        (page) => page.MatchingSessionPage,
      ),
  },
  {
    path: 'matching-reports',
    title: 'Matching reports',
    data: context('matching', 'Matching reports'),
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/matching-reports/matching-reports').then(
        (page) => page.MatchingReportsPage,
      ),
  },
  {
    path: 'matching-reports/:id',
    title: 'Report detail',
    data: context('matching', 'Report detail', { label: 'Matching reports', path: '/matching-reports' }),
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/matching-reports/matching-report-detail').then(
        (page) => page.MatchingReportDetailPage,
      ),
  },
  {
    path: 'tailoring-session',
    title: 'Tailoring session',
    data: context('tailoring', 'Tailoring session'),
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/tailored-cvs/tailored-cv-setup/tailored-cv-setup').then(
        (page) => page.TailoredCvSetup,
      ),
  },
  {
    path: 'tailored-cvs/new/job/:id',
    title: 'Tailoring session',
    canActivate: [authGuard],
    data: { source: 'job', ...context('tailoring', 'Tailoring session') },
    loadComponent: () =>
      import('./pages/tailored-cvs/tailored-cv-setup/tailored-cv-setup').then(
        (page) => page.TailoredCvSetup,
      ),
  },
  {
    path: 'tailored-cvs/new/report/:id',
    title: 'Tailoring session',
    canActivate: [authGuard],
    data: { source: 'report', ...context('tailoring', 'Tailoring session') },
    loadComponent: () =>
      import('./pages/tailored-cvs/tailored-cv-setup/tailored-cv-setup').then(
        (page) => page.TailoredCvSetup,
      ),
  },
  {
    path: 'tailored-cvs/:id/documents/:documentId',
    title: 'Document preview',
    data: context('tailoring', 'Document preview', { label: 'Tailoring request', path: '/tailored-cvs/:id' }),
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/tailored-cvs/tailored-cv-preview/tailored-cv-preview').then(
        (page) => page.TailoredCvPreview,
      ),
  },
  {
    path: 'tailored-cvs/:id',
    title: 'Tailoring request',
    data: context('tailoring', 'Tailoring request', { label: 'Tailoring history', path: '/tailored-cvs' }),
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/tailored-cvs/tailored-cv-request-detail/tailored-cv-request-detail').then(
        (page) => page.TailoredCvRequestDetail,
      ),
  },
  {
    path: 'tailored-cvs',
    title: 'Tailoring history',
    data: context('tailoring', 'Tailoring history'),
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/tailored-cvs/tailored-cv-history/tailored-cv-history').then(
        (page) => page.TailoredCvHistory,
      ),
  },
  {
    path: 'profile',
    title: 'My Profile',
    data: context('profile', 'Profile'),
    canActivate: [authGuard],
    component: ProfileComponent,
  },
  
  {
    path: 'profiles/:id/edit',
    title: 'Edit profile',
    data: context('profile', 'Edit profile', { label: 'Profile details', path: '/profiles/:id' }),
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/Profiles/profile-edit/profile-edit').then((page) => page.ProfileEdit),
  },
  {
    path: 'profiles/:id',
    title: 'Profile details',
    data: context('profile', 'Profile details', { label: 'Profiles', path: '/profiles' }),
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/Profiles/profile-details/profile-details').then(
        (page) => page.ProfileDetails,
      ),
  },
  {
    path: 'profiles',
    title: 'My Profiles',
    data: context('profile', 'Profiles'),
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/Profiles/profile-list/profile-list').then(
        (page) => page.ProfileList,
      ),
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
