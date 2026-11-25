import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, switchMap, tap } from 'rxjs';
import { AuthService, errorMessage } from '../../core/auth';
import { Icon } from '../../shared/icon';
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, Icon],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  mode = signal<'login' | 'register'>('login');
  invite = signal(false);
  inviteStep = signal<'code' | 'account'>('code');
  existingAccount = signal(false);
  openInvite() { this.changeMode('register'); this.changeInvite(true); }
  continueInvite() {
    const code = this.registerForm.controls.codigo;
    code.setValue(code.value.trim()); code.markAsTouched();
    if (code.valid) this.inviteStep.set('account');
  }
  setExisting(value: boolean) {
    this.existingAccount.set(value);
    this.registerForm.controls.nome.setValidators(value ? [Validators.maxLength(150)] : [Validators.required, Validators.maxLength(150)]);
    this.registerForm.controls.nome.updateValueAndValidity();
  }
  visible = signal(false);
  busy = signal(false);
  message = signal(
    this.route.snapshot.queryParamMap.get('reason') === 'expired'
      ? 'Sua sessão expirou. Entre novamente.'
      : this.route.snapshot.queryParamMap.get('reason') === 'unavailable'
        ? 'Não foi possível validar sua sessão. Tente novamente.'
        : '',
  );
  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', Validators.required],
  });
  registerForm = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    senha: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(128)]],
    nomeCasa: ['', Validators.required],
    codigo: [''],
  });
  get form(): FormGroup {
    return this.mode() === 'login' ? this.loginForm : this.registerForm;
  }
  changeMode(mode: 'login' | 'register') {
    this.mode.set(mode);
    this.message.set('');
    this.visible.set(false);
  }
  changeInvite(invite: boolean) {
    this.invite.set(invite);
    this.inviteStep.set('code');
    this.setExisting(false);
    this.message.set('');
    this.registerForm.controls.nomeCasa.setValidators(invite ? [] : [Validators.required]);
    this.registerForm.controls.codigo.setValidators(
      invite ? [Validators.required, Validators.maxLength(100)] : [],
    );
    this.registerForm.controls.senha.setValidators([
      Validators.required,
      Validators.minLength(invite ? 8 : 4),
      Validators.maxLength(128),
    ]);
    for (const control of Object.values(this.registerForm.controls))
      control.updateValueAndValidity();
  }
  invalid(name: string) {
    const field = this.form.get(name);
    return !!field && field.invalid && field.touched;
  }
  forgot() {
    this.message.set('A recuperação de senha ainda não está disponível.');
  }
  submit() {
    if (this.busy()) return;
    if (this.mode() === 'register' && this.invite() && this.inviteStep() === 'code') { this.continueInvite(); return; }
    const fields =
      this.mode() === 'login'
        ? ['email']
        : ['email', 'nome', this.invite() ? 'codigo' : 'nomeCasa'];
    for (const name of fields) {
      const field = this.form.get(name);
      field?.setValue(field.value.trim());
    }
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.busy.set(true);
    this.message.set('');
    let created = false;
    const credentials = this.form.getRawValue();
    const data = this.registerForm.getRawValue();
    data.email = data.email.toLowerCase();
    const request =
      this.mode() === 'login'
        ? this.auth.login(credentials.email, credentials.senha)
        : (this.invite()
            ? this.auth.accept({
                nome: data.nome,
                email: data.email,
                senha: data.senha,
                codigo: data.codigo,
              }).pipe(tap(response => this.auth.selectCasa(response.casaId)))
            : this.auth.register({
                nome: data.nome,
                email: data.email,
                senha: data.senha,
                nomeCasa: data.nomeCasa,
              })
          ).pipe(
            tap(() => {
              created = true;
            }),
            switchMap(() => this.auth.login(data.email, data.senha)),
          );
    request.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => {
        this.loginForm.controls.senha.reset();
        this.registerForm.controls.senha.reset();
        const target = this.route.snapshot.queryParamMap.get('returnUrl');
        void this.router.navigateByUrl(
          target && /^\/(?:inicio|compras|casa)(?:[/?#]|$)/.test(target) ? target : '/inicio',
        );
      },
      error: (error) => {
        if (created) {
          this.changeMode('login');
          this.loginForm.controls.email.setValue(data.email);
          this.message.set(this.invite() ? 'Convite aceito! Entre com seu e-mail e senha para continuar.' : 'Cadastro concluído! Entre com seu e-mail e senha para continuar.');
        } else this.message.set(errorMessage(error));
      },
    });
  }
}
