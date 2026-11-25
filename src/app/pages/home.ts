import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize, forkJoin, of, Subject, switchMap, timer } from 'rxjs';
import { Router } from '@angular/router';
import { AddProduct } from '../shared/components/add-product/add-product';
import { AuthService, Casa, errorMessage } from '../core/auth';
import { AtualizarProduto, Categoria, EstoqueService, Produto } from '../core/estoque.service';
import { ProductCard } from '../shared/components/product-card/product-card';
import { Footer } from '../shared/components/footer/footer';
import { Icon } from '../shared/icon';

@Component({
  selector: 'app-home',
  imports: [Footer, Icon, ProductCard, AddProduct],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly auth = inject(AuthService);
  private readonly estoque = inject(EstoqueService);
  private readonly router = inject(Router);
  readonly showAdd = signal(false);
  readonly adding = signal(false);
  readonly addError = signal('');
  readonly generating = signal(false);
  readonly actionMessage = signal('');
  readonly actionError = signal(false);
  readonly belowTarget = signal(0);
  readonly currentUser = signal('');
  private readonly destroyRef = inject(DestroyRef);
  private readonly searches = new Subject<{ casaId: string; busca: string; delay: number }>();
  readonly casas = signal<Casa[]>([]);
  readonly casa = computed<Casa | null>(() => this.casas()[0] ?? null);
  readonly loading = signal(false);
  readonly message = signal('');
  readonly busca = signal('');
  readonly filtro = signal<'TODOS' | 'EM_FALTA' | 'BAIXO'>('TODOS');
  readonly produtos = signal<Produto[]>([]);
  readonly categorias = signal<Categoria[]>([]);
  readonly pending = signal<Set<string>>(new Set());
  readonly productErrors = signal<Record<string, string>>({});
  readonly mutationMessage = signal('');
  readonly loadingProducts = signal(false);
  readonly stockError = signal('');
  readonly counts = computed(() => ({
    TODOS: this.produtos().length,
    EM_FALTA: this.produtos().filter(produto => produto.situacao === 'EM_FALTA').length,
    BAIXO: this.produtos().filter(produto => produto.situacao === 'BAIXO').length,
  }));
  readonly filteredProducts = computed(() => this.produtos().filter(produto =>
    this.filtro() === 'TODOS' || produto.situacao === this.filtro()));
  readonly groups = computed(() => {
    const groups = new Map<string, { categoria: Categoria; produtos: Produto[] }>();
    for (const produto of this.filteredProducts()) {
      const group = groups.get(produto.categoria.id) ?? { categoria: produto.categoria, produtos: [] };
      group.produtos.push(produto);
      groups.set(produto.categoria.id, group);
    }
    return [...groups.values()];
  });
  readonly filters = [
    { id: 'TODOS', label: 'Todos' },
    { id: 'EM_FALTA', label: 'Em falta' },
    { id: 'BAIXO', label: 'Estoque baixo' },
  ] as const;

  constructor() {
    this.searches.pipe(
      switchMap(query => {
        this.loadingProducts.set(true);
        this.stockError.set('');
        this.produtos.set([]);
        return timer(query.delay).pipe(
          switchMap(() => forkJoin({
            produtos: this.estoque.consultar(query.casaId, query.busca),
            todos: query.busca.trim() ? this.estoque.consultar(query.casaId) : of(null),
            categorias: this.estoque.categorias(query.casaId),
          })),
          catchError(error => { this.stockError.set(errorMessage(error)); return EMPTY; }),
          finalize(() => this.loadingProducts.set(false)),
        );
      }),
      takeUntilDestroyed(),
    ).subscribe(({ produtos, todos, categorias }) => {
      this.produtos.set(produtos);
      this.categorias.set(categorias);
      this.belowTarget.set((todos ?? produtos).filter(produto => produto.quantidadeFaltante > 0).length);
    });
    this.load();
  }

  search(value: string) {
    this.busca.set(value);
    this.loadProducts(300);
  }

  onCategoryCreated(categoria: Categoria) {
    this.categorias.update(items => [...items.filter(item => item.id !== categoria.id), categoria].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
  }

  openAdd() { this.addError.set(''); this.showAdd.set(true); }

  addProduct(dados: AtualizarProduto) {
    const casa = this.casa();
    if (!casa || this.adding()) return;
    this.adding.set(true);
    this.addError.set('');
    this.estoque.cadastrar(casa.casaId, dados).pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => this.adding.set(false)),
    ).subscribe({
      next: produto => {
        this.showAdd.set(false);
        this.actionError.set(false);
        this.actionMessage.set(`${produto.nome} adicionado ao estoque.`);
        this.clearFilters();
      },
      error: error => this.addError.set(errorMessage(error)),
    });
  }

  generateList() {
    void this.router.navigate(['/compras'], { queryParams: { gerar: '1' } });
  }

  clearFilters() {
    this.filtro.set('TODOS');
    this.busca.set('');
    this.loadProducts();
  }

  categoryIcon(nome: string) {
    const value = nome.toLocaleLowerCase('pt-BR');
    if (value.includes('geladeira')) return 'fridge';
    if (value.includes('despensa')) return 'wheat';
    return 'box';
  }

  adjustProduct(produto: Produto, ajuste: number) {
    const casa = this.casa();
    if (!casa || this.pending().has(produto.id) || produto.quantidadeAtual + ajuste < 0) return;
    this.beginMutation(produto.id);
    this.estoque.ajustar(casa.casaId, produto.id, ajuste).pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => this.endMutation(produto.id)),
    ).subscribe({
      next: updated => {
        this.belowTarget.update(count => Math.max(0, count + Number(updated.quantidadeFaltante > 0) - Number(produto.quantidadeFaltante > 0)));
        this.produtos.update(produtos => produtos.map(item => item.id === updated.id ? updated : item));
        this.mutationMessage.set(`Quantidade de ${updated.nome} atualizada.`);
        // Se houver busca em andamento, reinicia para não sobrescrever o saldo atualizado.
        if (this.loadingProducts()) this.loadProducts();
      },
      error: error => this.productErrors.update(errors => ({ ...errors, [produto.id]: errorMessage(error) })),
    });
  }

  saveProduct(produto: Produto, dados: AtualizarProduto, card: ProductCard) {
    const casa = this.casa();
    if (!casa || this.pending().has(produto.id)) return;
    this.beginMutation(produto.id);
    this.estoque.atualizar(casa.casaId, produto.id, dados).pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => this.endMutation(produto.id)),
    ).subscribe({
      next: updated => {
        card.editing.set(false);
        this.mutationMessage.set(`${updated.nome} atualizado.`);
        this.loadProducts();
      },
      error: error => this.productErrors.update(errors => ({ ...errors, [produto.id]: errorMessage(error) })),
    });
  }

  private beginMutation(id: string) {
    this.pending.update(ids => new Set([...ids, id]));
    this.productErrors.update(errors => ({ ...errors, [id]: '' }));
    this.mutationMessage.set('');
  }

  private endMutation(id: string) {
    this.pending.update(ids => { const next = new Set(ids); next.delete(id); return next; });
  }

  loadProducts(delay = 0) {
    const casa = this.casa();
    if (casa) this.searches.next({ casaId: casa.casaId, busca: this.busca(), delay });
  }

  load() {
    this.loading.set(true);
    this.message.set('');
    this.auth.casas().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false))).subscribe({
      next: casas => {
        this.casas.set(casas);
        this.loadProducts();
        this.currentUser.set(this.auth.session()?.email ?? '');
        if (casas[0]) this.estoque.moradores(casas[0].casaId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: moradores => {
            const morador = moradores.find(item => item.id === casas[0].membroId);
            if (morador) this.currentUser.set(morador.nome);
          },
          error: () => { /* Mantém o e-mail autenticado quando o nome não está disponível. */ },
        });
      },
      error: error => this.message.set(errorMessage(error)),
    });
  }
}

