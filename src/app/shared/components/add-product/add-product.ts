import { AfterViewInit, Component, DestroyRef, ElementRef, inject, input, OnDestroy, output, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AtualizarProduto, Categoria, EstoqueService } from '../../../core/estoque.service';
import { Icon } from '../../icon';
import { errorMessage } from '../../../core/auth';

@Component({
  selector: 'app-add-product',
  imports: [ReactiveFormsModule, Icon],
  templateUrl: './add-product.html',
  styleUrl: './add-product.scss',
})
export class AddProduct implements AfterViewInit, OnDestroy {
  readonly categorias = input.required<Categoria[]>();
  readonly casaId = input.required<string>();
  readonly categoryCreated = output<Categoria>();
  readonly creatingCategory = signal(false);
  readonly categoryOpen = signal(false);
  readonly categoryTrigger = viewChild.required<ElementRef<HTMLButtonElement>>('categoryTrigger');

  selectedCategoryName() {
    const id = this.form.controls.categoriaId.value;
    return id === '__new__' ? 'Criar nova categoria' : this.categorias().find(item => item.id === id)?.nome ?? 'Selecione uma categoria';
  }

  selectCategory(id: string) {
    this.form.controls.categoriaId.setValue(id);
    this.categoryError.set('');
    this.categoryOpen.set(false);
    this.categoryTrigger().nativeElement.focus();
  }

  closeCategoryMenu(event: Event) {
    if (!this.categoryOpen()) return;
    event.preventDefault();
    event.stopPropagation();
    this.categoryOpen.set(false);
    this.categoryTrigger().nativeElement.focus();
  }

  onCategoryFocusOut(event: FocusEvent) {
    const container = event.currentTarget as HTMLElement;
    if (!container.contains(event.relatedTarget as Node | null)) this.categoryOpen.set(false);
  }
  readonly categoryError = signal('');
  private readonly estoque = inject(EstoqueService);
  private readonly destroyRef = inject(DestroyRef);
  readonly busy = input(false);
  readonly error = input('');
  readonly closed = output<void>();
  readonly save = output<AtualizarProduto>();
  readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private previousFocus: HTMLElement | null = null;
  private readonly fb = inject(FormBuilder);
  readonly categoryName = this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(80)]);
  private readonly quantities = [Validators.required, Validators.min(0), Validators.max(999999999.999), Validators.pattern(/^\d+(\.\d{1,3})?$/)];
  readonly units = ['unidades', 'caixas', 'pacotes', 'frascos', 'rolos', 'potes', 'garrafas', 'kg'];
  readonly form = this.fb.nonNullable.group({
    nome: ['', Validators.required], categoriaId: ['', Validators.required], unidade: ['unidades', Validators.required],
    quantidadeAtual: [1, this.quantities], quantidadeDesejada: [2, this.quantities],
  });

  ngAfterViewInit() {
    this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.form.controls.categoriaId.setValue(this.categorias()[0]?.id ?? '__new__');
    this.dialog().nativeElement.showModal();
  }
  ngOnDestroy() { this.dialog().nativeElement.close(); this.previousFocus?.focus(); }
  close() { if (!this.busy() && !this.creatingCategory()) this.closed.emit(); }
  cancel(event: Event) { event.preventDefault(); this.close(); }
  step(field: 'quantidadeAtual' | 'quantidadeDesejada', delta: number) {
    const control = this.form.controls[field];
    const next = Math.round((Number(control.value || 0) + delta) * 1000) / 1000;
    control.setValue(Math.min(999999999.999, Math.max(0, next)));
  }
  submit() {
    if (this.busy() || this.creatingCategory()) return;
    if (this.form.controls.categoriaId.value === '__new__') {
      this.categoryError.set('Crie a categoria antes de adicionar o produto.');
      return;
    }
    for (const control of [this.form.controls.nome, this.form.controls.unidade]) control.setValue(control.value.trim());
    this.form.markAllAsTouched();
    if (this.form.valid) this.save.emit(this.form.getRawValue());
  }

  createCategory() {
    if (this.busy() || this.creatingCategory()) return;
    this.categoryName.setValue(this.categoryName.value.trim());
    this.categoryName.markAsTouched();
    this.categoryError.set('');
    if (this.categoryName.invalid) return;
    const existing = this.categorias().find(item => item.nome.trim().toLocaleLowerCase('pt-BR') === this.categoryName.value.toLocaleLowerCase('pt-BR'));
    if (existing) {
      this.form.controls.categoriaId.setValue(existing.id);
      this.categoryName.reset();
      return;
    }
    this.creatingCategory.set(true);
    this.estoque.criarCategoria(this.casaId(), this.categoryName.value).pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => this.creatingCategory.set(false)),
    ).subscribe({
      next: categoria => {
        this.categoryCreated.emit(categoria);
        this.form.controls.categoriaId.setValue(categoria.id);
        this.categoryName.reset();
      },
      error: error => this.categoryError.set(errorMessage(error)),
    });
  }
}
