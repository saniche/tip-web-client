import { Routes } from '@angular/router';
import { Auth } from './pages/auth/auth';
import { Register } from './pages/auth/register/register';
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
    path: 'auth/register',
    component: Register,
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
