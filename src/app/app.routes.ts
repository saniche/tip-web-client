import { Routes } from '@angular/router';
import { Auth } from './pages/auth/auth';
import { Register } from './pages/auth/register/register';
import { Dashboard } from './pages/dashboard/dashboard';
import { Jobs } from './pages/jobs/jobs';
import { ProfileComponent } from './pages/profile/profile.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: 'dashboard',
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
    path: 'jobs',
    component: Jobs,
  },
  {
    path: 'jobs/interests',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/interests/interests').then((page) => page.Interests),
  },
  {
    path: 'applications/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/application-journal/application-journal-entry').then(
        (page) => page.ApplicationJournalEntry,
      ),
  },
  {
    path: 'applications/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/application-journal/application-journal-entry').then(
        (page) => page.ApplicationJournalEntry,
      ),
  },
  {
    path: 'applications',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/application-journal/application-journal').then(
        (page) => page.ApplicationJournal,
      ),
  },
  {
    path: 'normalize-job',
    loadComponent: () =>
      import('./pages/normalize-job/normalize-job').then((page) => page.NormalizeJob),
  },
  {
    path: 'normalized-jobs',
    loadComponent: () =>
      import('./pages/normalized-jobs/normalized-jobs').then((page) => page.NormalizedJobs),
  },
  {
    path: 'normalized-jobs/:id',
    loadComponent: () =>
      import('./pages/normalized-job-detail/normalized-job-detail').then(
        (page) => page.NormalizedJobDetail,
      ),
  },
  {
    path: 'matching-session',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/matching-session/matching-session').then(
        (page) => page.MatchingSessionPage,
      ),
  },
  {
    path: 'matching-reports',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/matching-reports/matching-reports').then(
        (page) => page.MatchingReportsPage,
      ),
  },
  {
    path: 'matching-reports/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/matching-reports/matching-report-detail').then(
        (page) => page.MatchingReportDetailPage,
      ),
  },
  {
    path: 'profile',
    component: ProfileComponent,
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
