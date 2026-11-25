import { Router } from '@angular/router';
import { copyInputValue } from '../../shared/utils/clipboard';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, timeout } from 'rxjs';
import { AuthService, Casa, errorMessage } from '../../core/auth';
import { CasaService, Convite, ConviteCriado, Morador } from '../../core/casa.service';
import { Footer } from '../../shared/components/footer/footer';
import { Modal } from '../../shared/components/modal/modal';
import { Icon } from '../../shared/icon';
@Component({ selector: 'app-casa', imports: [ReactiveFormsModule, Footer, Modal, Icon], templateUrl: './casa.html', styleUrl: './casa.scss' })
export class CasaPage {
  private readonly router = inject(Router);
  readonly leaving = signal(false);
  logout() {
    if (this.leaving() || this.busy()) return;
    this.leaving.set(true);
    this.auth.logout().pipe(
      timeout(5000),
      finalize(() => {
        this.auth.clear();
        this.created.set(null);
        void this.router.navigate(['/login'], { replaceUrl: true });
      }),
    ).subscribe({ error: () => {} });
  }
  private auth = inject(AuthService); private api = inject(CasaService); private destroy = inject(DestroyRef); private fb = inject(FormBuilder);
  casa = signal<Casa | null>(null); moradores = signal<Morador[]>([]); convites = signal<Convite[]>([]);
  admin = computed(() => this.casa()?.papel === 'ADMINISTRADOR');
  pendentes = computed(() => this.convites().filter(c => c.estado === 'PENDENTE' && !c.expirado && new Date(c.expiraEm).getTime() > Date.now()));
  loading = signal(false); loadingInvites = signal(false); busy = signal(false);
  error = signal(''); inviteError = signal(''); modalError = signal(''); notice = signal('');
  showInvite = signal(false); removing = signal<string | null>(null); cancelling = signal<string | null>(null);
  created = signal<ConviteCriado | null>(null);
  form = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]] });
  constructor() { this.load(); }
  load() {
    if (this.loading()) return;
    this.loading.set(true); this.error.set('');
    this.auth.casas().pipe(takeUntilDestroyed(this.destroy)).subscribe({ next: casas => {
      this.casa.set(casas[0] ?? null);
      if (!casas[0]) { this.loading.set(false); return; }
      this.loadMembers();
      if (this.admin()) this.loadInvites();
    }, error: e => { this.error.set(errorMessage(e)); this.loading.set(false); } });
  }
  loadMembers() {
    this.api.moradores(this.casa()!.casaId).pipe(takeUntilDestroyed(this.destroy), finalize(() => this.loading.set(false))).subscribe({ next: items => this.moradores.set(items), error: e => this.error.set(errorMessage(e)) });
  }
  loadInvites() {
    if (!this.admin()) return;
    this.loadingInvites.set(true); this.inviteError.set('');
    this.api.convites(this.casa()!.casaId).pipe(takeUntilDestroyed(this.destroy), finalize(() => this.loadingInvites.set(false))).subscribe({ next: items => this.convites.set(items), error: e => this.inviteError.set(errorMessage(e)) });
  }
  initials(nome: string) { const words = nome.trim().split(/\s+/); return (words[0]?.[0] ?? '') + (words.length > 1 ? words.at(-1)![0] : ''); }
  canRemove(m: Morador) { return this.admin() && m.id !== this.casa()?.membroId && (m.papel !== 'ADMINISTRADOR' || this.moradores().filter(i => i.papel === 'ADMINISTRADOR').length > 1); }
  openInvite() { this.form.reset(); this.modalError.set(''); this.showInvite.set(true); }
  invite() {
    if (this.busy() || !this.admin()) return;
    this.form.controls.email.setValue(this.form.controls.email.value.trim().toLowerCase()); this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.busy.set(true); this.modalError.set('');
    this.api.convidar(this.casa()!.casaId, this.form.controls.email.value).pipe(takeUntilDestroyed(this.destroy), finalize(() => this.busy.set(false))).subscribe({ next: convite => {
      this.copyStatus.set(''); this.created.set(convite); this.showInvite.set(false); this.notice.set('Convite criado. Copie o código abaixo para compartilhar.'); this.loadInvites();
    }, error: e => this.modalError.set(errorMessage(e)) });
  }
  remove(m: Morador) {
    if (this.busy() || !this.canRemove(m)) return;
    this.busy.set(true); this.error.set('');
    this.api.remover(this.casa()!.casaId, m.id).pipe(takeUntilDestroyed(this.destroy), finalize(() => this.busy.set(false))).subscribe({ next: () => {
      this.moradores.update(items => items.filter(i => i.id !== m.id)); this.removing.set(null); this.notice.set(`Acesso de ${m.nome} removido.`);
    }, error: e => this.error.set(errorMessage(e)) });
  }
  cancel(c: Convite) {
    if (this.busy() || !this.admin()) return;
    this.busy.set(true); this.inviteError.set('');
    this.api.cancelar(this.casa()!.casaId, c.id).pipe(takeUntilDestroyed(this.destroy), finalize(() => this.busy.set(false))).subscribe({ next: () => {
      this.convites.update(items => items.filter(i => i.id !== c.id)); this.cancelling.set(null);
      if (this.created()?.id === c.id) this.created.set(null);
      this.notice.set('Convite cancelado.');
    }, error: e => this.inviteError.set(errorMessage(e)) });
  }
  readonly copyStatus = signal('');
  readonly copying = signal(false);
  async copyCode(input: HTMLInputElement) {
    if (this.copying()) return;
    this.copying.set(true);
    this.copyStatus.set('');
    try {
      const copied = await copyInputValue(input);
      this.copyStatus.set(copied ? 'Código copiado!' : 'O navegador bloqueou a cópia. O código está selecionado: use Ctrl+C ou toque e segure para copiar.');
    } finally { this.copying.set(false); }
  }
}
