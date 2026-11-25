import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, Observable, finalize } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService, Casa, errorMessage } from '../../core/auth';
import { Categoria, EstoqueService, Produto } from '../../core/estoque.service';
import { ComprasService, Conclusao, ItemCompra, ListaCompras, Previa, Sugestao } from '../../core/compras.service';
import { Footer } from '../../shared/components/footer/footer';
import { Icon } from '../../shared/icon';
import { Modal } from '../../shared/components/modal/modal';
type Escolha = Sugestao & { selected: boolean; quantidade: number };
@Component({ selector: 'app-compras', imports: [ReactiveFormsModule, Footer, Icon, Modal], templateUrl: './compras.html', styleUrl: './compras.scss' })
export class Compras {
  readonly unitOpen = signal(false);
  unitFocusOut(event: FocusEvent) {
    if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) this.unitOpen.set(false);
  }
  closeUnits(event: Event, trigger: HTMLButtonElement) {
    if (!this.unitOpen()) return;
    event.preventDefault(); event.stopPropagation();
    this.unitOpen.set(false); trigger.focus();
  }
  private auth = inject(AuthService); private api = inject(ComprasService); private estoque = inject(EstoqueService);
  private destroy = inject(DestroyRef); private route = inject(ActivatedRoute); private router = inject(Router); private fb = inject(FormBuilder);
  casa = signal<Casa | null>(null); lista = signal<ListaCompras | null>(null); categorias = signal<Categoria[]>([]); produtos = signal<Produto[]>([]);
  loading = signal(true); busy = signal(false); error = signal(''); notice = signal(''); manual = signal(false);
  preview = signal<Previa | null>(null); choices = signal<Escolha[]>([]); suggestions = signal(0);
  conclusion = signal<Conclusao | null>(null); confirmationId = '';
  modalError = signal('');
  pendentes = computed(() => this.lista()?.itens.filter(i => i.situacao === 'PENDENTE') ?? []);
  carrinho = computed(() => this.lista()?.itens.filter(i => i.situacao === 'NO_CARRINHO') ?? []);
  selected = computed(() => this.choices().filter(i => i.selected));
  shortage = computed(() => this.produtos().filter(p => p.quantidadeFaltante > 0).length);
  units = ['unidades', 'caixas', 'pacotes', 'frascos', 'rolos', 'potes', 'garrafas', 'kg'];
  form = this.fb.nonNullable.group({ nome: ['', Validators.required], unidade: ['unidades', Validators.required], categoriaId: ['', Validators.required], quantidade: [1, [Validators.required, Validators.min(0.001), Validators.max(999999999.999), Validators.pattern(/^\d+(\.\d{1,3})?$/)]] });
  constructor() {
    this.auth.casas().pipe(takeUntilDestroyed(this.destroy)).subscribe({ next: casas => {
      this.casa.set(casas[0] ?? null);
      if (casas[0]) this.load(true); else this.loading.set(false);
    }, error: e => { this.error.set(errorMessage(e)); this.loading.set(false); } });
  }
  fmt(n: number) { return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(n); }
  load(initial = false) {
    const casa = this.casa(); if (!casa) return;
    this.loading.set(true);
    forkJoin({ lista: this.api.consultar(casa.casaId), previa: this.api.previa(casa.casaId), categorias: this.estoque.categorias(casa.casaId), produtos: this.estoque.consultar(casa.casaId) })
      .pipe(takeUntilDestroyed(this.destroy), finalize(() => this.loading.set(false))).subscribe({ next: data => {
        this.lista.set(data.lista); this.categorias.set(data.categorias); this.produtos.set(data.produtos);
        this.suggestions.set(data.previa.sugestoes.length);
        if (!this.form.controls.categoriaId.value) this.form.controls.categoriaId.setValue(data.categorias[0]?.id ?? '');
        if (initial && this.route.snapshot.queryParamMap.get('gerar') === '1') {
          this.setPreview(data.previa); void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
        }
      }, error: e => this.error.set(errorMessage(e)) });
  }
  retry() { this.error.set(''); if (this.casa()) this.load(); else void this.router.navigateByUrl('/inicio'); }
  setPreview(previa: Previa) { this.modalError.set(''); this.preview.set(previa); this.choices.set(previa.sugestoes.map(i => ({ ...i, selected: true, quantidade: i.quantidadeSugerida }))); }
  generate() {
    if (this.busy() || !this.casa()) return;
    this.busy.set(true); this.error.set('');
    this.api.previa(this.casa()!.casaId).pipe(takeUntilDestroyed(this.destroy), finalize(() => this.busy.set(false))).subscribe({ next: p => this.setPreview(p), error: e => this.error.set(errorMessage(e)) });
  }
  choose(id: string, selected: boolean) { this.choices.update(items => items.map(i => i.produtoId === id ? { ...i, selected } : i)); }
  stepSuggestion(id: string, delta: number) { this.choices.update(items => items.map(i => i.produtoId === id ? { ...i, quantidade: Math.min(999999999.999, Math.max(0.001, Math.round((i.quantidade + delta) * 1000) / 1000)) } : i)); }
  stock(id: string) { return this.produtos().find(p => p.id === id); }
  confirmSuggestions() {
    if (!this.preview() || !this.selected().length) return;
    this.mutate(this.api.confirmar(this.casa()!.casaId, this.preview()!.versao, this.selected().map(i => ({ produtoId: i.produtoId, quantidade: i.quantidade }))), () => { this.preview.set(null); this.notice.set('Lista de compras atualizada.'); });
  }
  mutate(request: Observable<ListaCompras>, done?: () => void) {
    if (this.busy()) return;
    this.busy.set(true); this.error.set(''); this.modalError.set(''); this.notice.set('');
    request.pipe(takeUntilDestroyed(this.destroy), finalize(() => this.busy.set(false))).subscribe({ next: lista => { this.lista.set(lista); done?.(); this.load(); }, error: e => this.handleError(e) });
  }
  handleError(e: HttpErrorResponse) {
    const message = errorMessage(e);
    if (e.status === 409) { this.preview.set(null); this.conclusion.set(null); this.error.set(message + ' Os dados foram recarregados; revise e tente novamente.'); this.load(); }
    else if (this.preview() || this.conclusion()) this.modalError.set(message);
    else this.error.set(message);
  }
  addManual() {
    this.form.controls.nome.setValue(this.form.controls.nome.value.trim()); this.form.markAllAsTouched();
    if (this.form.invalid || !this.lista()) return;
    this.mutate(this.api.incluir(this.casa()!.casaId, { ...this.form.getRawValue(), versao: this.lista()!.versao }), () => { this.manual.set(false); this.form.controls.nome.reset(); this.form.controls.quantidade.setValue(1); });
  }
  stepManual(delta: number) { const c = this.form.controls.quantidade; c.setValue(Math.min(999999999.999, Math.max(0.001, Math.round((Number(c.value) + delta) * 1000) / 1000))); }
  quantity(item: ItemCompra, delta: number) { const value = Math.round((item.quantidade + delta) * 1000) / 1000; if (value <= 0 || value > 999999999.999) return; this.mutate(this.api.quantidade(this.casa()!.casaId, item.id, this.lista()!.versao, value)); }
  toggle(item: ItemCompra) { this.mutate(this.api.situacao(this.casa()!.casaId, item.id, this.lista()!.versao, item.situacao === 'PENDENTE' ? 'NO_CARRINHO' : 'PENDENTE')); }
  remove(item: ItemCompra) { this.mutate(this.api.remover(this.casa()!.casaId, item.id, this.lista()!.versao)); }
  finish() {
    if (this.busy() || !this.carrinho().length) return;
    this.busy.set(true); this.modalError.set('');
    this.api.previaConclusao(this.casa()!.casaId).pipe(takeUntilDestroyed(this.destroy), finalize(() => this.busy.set(false))).subscribe({ next: p => { this.confirmationId = crypto.randomUUID(); this.conclusion.set(p); }, error: e => this.error.set(errorMessage(e)) });
  }
  confirmPurchase() {
    if (this.busy() || !this.conclusion()?.compras.length) return;
    this.busy.set(true); this.modalError.set('');
    this.api.concluir(this.casa()!.casaId, this.confirmationId, this.conclusion()!).pipe(takeUntilDestroyed(this.destroy), finalize(() => this.busy.set(false))).subscribe({
      next: () => { this.conclusion.set(null); this.notice.set('Compra concluída! Estoque atualizado e itens pendentes mantidos na lista.'); this.load(); }, error: e => this.handleError(e),
    });
  }
}
