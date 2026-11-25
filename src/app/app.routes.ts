import { Routes } from '@angular/router';

import { authGuard } from './core/auth';
export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login').then(m => m.Login) },
  { path: 'inicio', canActivate: [authGuard], loadComponent: () => import('./pages/home').then(m => m.Home) },
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  { path: '**', redirectTo: 'inicio' }
];
