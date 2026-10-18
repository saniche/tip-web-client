import { Routes } from '@angular/router';
import { Auth } from './pages/auth/auth';
import { Register } from './pages/auth/register/register';
import { Dashboard } from './pages/dashboard/dashboard';
import { Jobs } from './pages/jobs/jobs';
import { ProfileComponent } from './pages/profile/profile.component';

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
    path: 'profile',
    component: ProfileComponent,
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
