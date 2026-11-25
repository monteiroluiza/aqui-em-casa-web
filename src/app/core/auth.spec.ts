import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, provideRouter, RouterStateSnapshot, UrlTree } from '@angular/router';
import { isObservable } from 'rxjs';
import { AuthService, authGuard, authInterceptor } from './auth';

describe('Autenticação', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()] });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); sessionStorage.clear(); });
  function login() {
    auth.login(' Lu@Example.com ', 'senha').subscribe();
    const req = http.expectOne('/api/auth/login');
    expect(req.request.body).toEqual({ email: 'lu@example.com', senha: 'senha' });
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ email: 'lu@example.com', accessToken: 'opaque-token', expiresIn: 3600, tokenType: 'Bearer' });
  }
  it('envia o token somente aos endpoints protegidos da própria API', () => {
    login();
    auth.casas().subscribe();
    const casas = http.expectOne('/api/casas');
    expect(casas.request.headers.get('Authorization')).toBe('Bearer opaque-token');
    casas.flush([]);
    TestBed.inject(HttpClient).get('https://example.com/api').subscribe();
    const external = http.expectOne('https://example.com/api');
    expect(external.request.headers.has('Authorization')).toBe(false);
    external.flush({});
  });
  it('bloqueia navegação sem sessão', () => {
    const result = TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, { url: '/inicio' } as RouterStateSnapshot));
    expect(result instanceof UrlTree).toBe(true);
    expect(String(result)).toContain('/login');
  });
  it('confirma a sessão no backend antes de liberar a rota', () => {
    login();
    const result = TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, { url: '/inicio' } as RouterStateSnapshot));
    expect(isObservable(result)).toBe(true);
    if (isObservable(result)) result.subscribe(value => expect(value).toBe(true));
    http.expectOne('/api/auth/sessao').flush({ email: 'lu@example.com' });
  });
  it('descarta o token expirado', () => {
    login();
    auth.session.update(value => value ? { ...value, expiresAt: Date.now() - 1 } : null);
    expect(auth.token()).toBeNull();
    expect(sessionStorage.getItem('aqui-em-casa.session')).toBeNull();
  });
});
