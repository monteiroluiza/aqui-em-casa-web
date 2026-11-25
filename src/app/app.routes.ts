import { Routes } from '@angular/router';

import { authGuard } from './core/auth';
export const routes: Routes = [
  { path: 'criar-casa', canActivate: [authGuard], loadComponent: () => import('./pages/criar-casa/criar-casa').then(m => m.CriarCasa) },
  { path: 'login', loadComponent: () => import('./pages/login/login').then(m => m.Login) },
  { path: 'inicio', canActivate: [authGuard], loadComponent: () => import('./pages/home').then(m => m.Home) },
  { path: 'compras', canActivate: [authGuard], loadComponent: () => import('./pages/compras/compras').then(m => m.Compras) },
  { path: 'casa', canActivate: [authGuard], loadComponent: () => import('./pages/casa/casa').then(m => m.CasaPage) },
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  { path: '**', redirectTo: 'inicio' }
];
