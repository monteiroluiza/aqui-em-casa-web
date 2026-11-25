import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AtualizarProduto, Categoria, Produto } from '../../../core/estoque.service';
import { Icon } from '../../icon';

@Component({
  selector: 'app-product-card',
  imports: [Icon, ReactiveFormsModule],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
})
export class ProductCard {
  readonly produto = input.required<Produto>();
  readonly categorias = input<Categoria[]>([]);
  readonly busy = input(false);
  readonly error = input('');
  readonly adjust = output<number>();
  readonly save = output<AtualizarProduto>();
  readonly editing = signal(false);
  private readonly fb = inject(FormBuilder);
  private readonly amountValidators = [Validators.required, Validators.min(0), Validators.max(999999999.999), Validators.pattern(/^\d+(\.\d{1,3})?$/)];
  readonly form = this.fb.nonNullable.group({
    nome: ['', Validators.required],
    categoriaId: ['', Validators.required],
    unidade: ['', Validators.required],
    quantidadeAtual: [0, this.amountValidators],
    quantidadeDesejada: [0, this.amountValidators],
  });

  format(value: number) { return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(value); }

  edit() {
    const produto = this.produto();
    this.form.reset({ nome: produto.nome, categoriaId: produto.categoria.id, unidade: produto.unidade,
      quantidadeAtual: produto.quantidadeAtual, quantidadeDesejada: produto.quantidadeDesejada });
    this.editing.set(true);
  }

  submit() {
    if (this.busy()) return;
    this.form.controls.nome.setValue(this.form.controls.nome.value.trim());
    this.form.controls.unidade.setValue(this.form.controls.unidade.value.trim());
    this.form.markAllAsTouched();
    if (this.form.valid) this.save.emit(this.form.getRawValue());
  }
}
