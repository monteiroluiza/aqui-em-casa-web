import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { AuthService, errorMessage } from '../../core/auth';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-criar-casa',
  imports: [ReactiveFormsModule, Icon, RouterLink],
  templateUrl: './criar-casa.html',
  styleUrl: './criar-casa.scss',
})
export class CriarCasa {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly busy = signal(false);
  readonly message = signal('');
  readonly hasActiveCasa = signal(false);
  readonly form = inject(FormBuilder).nonNullable.group({ nome: ['', [Validators.required, Validators.maxLength(150)]] });

  submit() {
    if (this.busy()) return;
    this.form.controls.nome.setValue(this.form.controls.nome.value.trim());
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.busy.set(true);
    this.message.set('');
    this.hasActiveCasa.set(false);
    this.auth.createCasa(this.form.controls.nome.value).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => void this.router.navigateByUrl('/inicio', { replaceUrl: true }),
      error: error => {
        this.hasActiveCasa.set(error.status === 409);
        this.message.set(error.status === 409
        ? 'Você já possui uma casa ativa. Acesse o estoque para continuar.'
        : [404, 405, 501].includes(error.status)
        ? 'A criação de casa para contas existentes ainda não está disponível no servidor.' : errorMessage(error));
      },
    });
  }

  logout() {
    if (this.busy()) return;
    this.busy.set(true);
    this.auth.logout().pipe(timeout(5000), finalize(() => {
      this.auth.clear();
      this.busy.set(false);
      void this.router.navigateByUrl('/login', { replaceUrl: true });
    })).subscribe({ error: () => {} });
  }
}
