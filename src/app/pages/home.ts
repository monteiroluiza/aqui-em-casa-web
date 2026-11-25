import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService, Casa, errorMessage } from '../core/auth';
@Component({
  selector: 'app-home',
  template: `<main>
    <header>
      <h1>Aqui em Casa</h1>
      <button (click)="logout()" [disabled]="leaving()">Sair</button>
    </header>
    <p>Bem-vindo(a), {{ auth.session()?.email }}</p>
    <h2>Suas casas</h2>
    @if (loading()) {
      <p role="status">Carregando suas casas...</p>
    }
    @if (message()) {
      <p role="alert">{{ message() }}</p>
      <button (click)="load()">Tentar novamente</button>
    }
    @for (casa of casas(); track casa.casaId) {
      <article>
        <h3>{{ casa.nome }}</h3>
        <p>{{ casa.papel === 'ADMINISTRADOR' ? 'Administrador' : 'Morador' }}</p>
      </article>
    }
    @if (!loading() && !message() && !casas().length) {
      <p>Você ainda não possui vínculo ativo com uma casa.</p>
    }
  </main>`,
  styles: [
    `
      main {
        max-width: 720px;
        margin: 48px auto;
        padding: 20px;
      }
      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      h1 {
        font-family: Georgia, serif;
      }
      article {
        padding: 20px;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: 14px;
        margin: 12px 0;
      }
      button {
        background: var(--color-primary);
        color: var(--color-surface);
        border: 0;
        border-radius: 8px;
        padding: 10px 18px;
      }
    `,
  ],
})
export class Home {
  auth = inject(AuthService);
  private router = inject(Router);
  casas = signal<Casa[]>([]);
  loading = signal(false);
  leaving = signal(false);
  message = signal('');
  constructor() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.message.set('');
    this.auth
      .casas()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (casas) => this.casas.set(casas),
        error: (error) => this.message.set(errorMessage(error)),
      });
  }
  logout() {
    this.leaving.set(true);
    this.auth
      .logout()
      .pipe(
        finalize(() => {
          this.auth.clear();
          void this.router.navigate(['/login']);
        }),
      )
      .subscribe({ error: () => {} });
  }
}
