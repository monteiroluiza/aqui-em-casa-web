import { Component, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { AuthService, Casa, errorMessage } from '../core/auth';
import { Footer } from '../shared/components/footer/footer';

@Component({
  selector: 'app-home',
  imports: [Footer],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly auth = inject(AuthService);
  readonly casas = signal<Casa[]>([]);
  readonly casa = computed<Casa | null>(() => this.casas()[0] ?? null);
  readonly loading = signal(false);
  readonly message = signal('');

  constructor() { this.load(); }

  load() {
    this.loading.set(true);
    this.message.set('');
    this.auth.casas().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: casas => this.casas.set(casas),
      error: error => this.message.set(errorMessage(error)),
    });
  }
}

