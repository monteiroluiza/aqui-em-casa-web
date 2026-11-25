import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export const API = `${environment.apiUrl}/api`;

interface Token {
  email: string;
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}
interface Session extends Token {
  expiresAt: number;
}
export interface Casa {
  casaId: string;
  nome: string;
  membroId: string;
  papel: string;
}
export interface CasaCriada {
  usuarioId: string;
  casaId: string;
  membroId: string;
  listaId: string;
  papel: string;
}
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private readonly key = 'aqui-em-casa.session';
  readonly session = signal<Session | null>(this.restore());
  private restore(): Session | null {
    try {
      const value = JSON.parse(sessionStorage.getItem(this.key) || 'null');
      return value && typeof value.accessToken === 'string' && value.expiresAt > Date.now()
        ? value
        : null;
    } catch {
      return null;
    }
  }
  token() {
    const value = this.session();
    if (value && value.expiresAt > Date.now()) return value.accessToken;
    this.clear();
    return null;
  }
  login(email: string, senha: string) {
    return this.http
      .post<Token>(`${API}/auth/login`, { email: email.trim().toLowerCase(), senha })
      .pipe(
        tap((token) => {
          const session = { ...token, expiresAt: Date.now() + token.expiresIn * 1000 };
          this.session.set(session);
          try {
            sessionStorage.setItem(this.key, JSON.stringify(session));
          } catch {
          }
        }),
      );
  }
  validate() {
    return this.http.get<{ email: string }>(`${API}/auth/sessao`);
  }
  selectCasa(id: string) {
    try {
      sessionStorage.setItem('aqui-em-casa.selected-house', id);
    } catch {}
  }
  casas() {
    return this.http.get<Casa[]>(API + '/casas').pipe(
      map((casas) => {
        let selected: string | null = null;
        try {
          selected = sessionStorage.getItem('aqui-em-casa.selected-house');
        } catch {}
        return [...casas].sort(
          (a, b) => Number(b.casaId === selected) - Number(a.casaId === selected),
        );
      }),
    );
  }
  register(data: { nome: string; email: string; senha: string; nomeCasa: string }) {
    return this.http.post(`${API}/cadastros/nova-casa`, data);
  }
  createCasa(nomeCasa: string) {
    return this.http
      .post<CasaCriada>(`${API}/casas`, { nomeCasa })
      .pipe(tap((casa) => this.selectCasa(casa.casaId)));
  }
  accept(data: { nome: string; email: string; senha: string; codigo: string }) {
    return this.http.post<{ casaId: string; email: string }>(`${API}/convites/aceitar`, data);
  }
  logout() {
    return this.http.post<void>(`${API}/auth/logout`, {});
  }
  clear() {
    this.session.set(null);
    try {
      sessionStorage.removeItem(this.key);
      sessionStorage.removeItem('aqui-em-casa.selected-house');
    } catch {
      /* Storage may be unavailable. */
    }
  }
}
export const authGuard: CanActivateFn = (_, state) => {
  const auth = inject(AuthService),
    router = inject(Router);
  if (!auth.token())
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  return auth.validate().pipe(
    switchMap(() => auth.casas()),
    map((casas) => {
      const setup = state.url.split('?')[0] === '/criar-casa';
      if (!casas.length && !setup) return router.createUrlTree(['/criar-casa']);
      if (casas.length && setup) return router.createUrlTree(['/inicio']);
      return true;
    }),
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) auth.clear();
      return of(
        router.createUrlTree(['/login'], {
          queryParams: {
            returnUrl: state.url,
            reason: error.status === 401 ? 'expired' : 'unavailable',
          },
        }),
      );
    }),
  );
};
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService),
    router = inject(Router);
  const protectedApi =
    request.url.startsWith(`${API}/`) &&
    ![`${API}/auth/login`, `${API}/cadastros/nova-casa`, `${API}/convites/aceitar`].includes(
      request.url,
    );
  const token = protectedApi ? auth.token() : null;
  return next(
    token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request,
  ).pipe(
    catchError((error: HttpErrorResponse) => {
      if (protectedApi && error.status === 401) {
        auth.clear();
        void router.navigate(['/login'], { queryParams: { reason: 'expired' } });
      }
      return throwError(() => error);
    }),
  );
};
export function errorMessage(error: HttpErrorResponse): string {
  if ([0, 502, 504].includes(error.status))
    return 'Não foi possível conectar ao servidor. Tente novamente em instantes.';
  if (
    typeof error.error === 'string' &&
    error.error.trim() &&
    !error.error.trim().startsWith('<') &&
    error.error.length < 300
  )
    return error.error;
  if (error.error?.detail) return error.error.detail;
  if (error.status === 401) return 'E-mail ou senha inválidos.';
  if (error.status === 409) return 'Este e-mail já está cadastrado.';
  return 'Não foi possível concluir a solicitação. Tente novamente.';
}
