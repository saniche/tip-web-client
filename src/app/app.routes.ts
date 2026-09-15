import { Routes } from '@angular/router';
import { Auth } from './pages/auth/auth';
import { Dashboard } from './pages/dashboard/dashboard';
import { Jobs } from './pages/jobs/jobs';

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
    path: 'jobs',
    component: Jobs,
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
