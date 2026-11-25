import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API } from './auth';
import { Categoria } from './estoque.service';
export interface ItemCompra { id: string; produtoId: string | null; nome: string; categoria: Categoria; unidade: string; quantidade: number; situacao: 'PENDENTE' | 'NO_CARRINHO' }
export interface ListaCompras { listaId: string; versao: number; itens: ItemCompra[] }
export interface Sugestao { produtoId: string; nome: string; categoria: Categoria; unidade: string; quantidadeFaltante: number; quantidadeNaLista: number; quantidadeSugerida: number; acao: 'ADICIONAR' | 'ATUALIZAR' | 'MANTER' }
export interface Previa { listaId: string; versao: number; sugestoes: Sugestao[] }
export interface CompraPrevista { itemIds: string[]; produtoId: string | null; nome: string; categoria: Categoria; unidade: string; quantidadeComprada: number; saldoAtual: number; saldoPrevisto: number; novoProduto: boolean }
export interface Conclusao { listaId: string; versao: number; compras: CompraPrevista[]; pendentes: ItemCompra[] }
@Injectable({ providedIn: 'root' })
export class ComprasService {
  private readonly http = inject(HttpClient);
  private url(casa: string) { return `${API}/casas/${encodeURIComponent(casa)}/lista-compras`; }
  consultar(casa: string) { return this.http.get<ListaCompras>(this.url(casa)); }
  previa(casa: string) { return this.http.get<Previa>(`${this.url(casa)}/previa`); }
  confirmar(casa: string, versao: number, itens: { produtoId: string; quantidade: number }[]) { return this.http.post<ListaCompras>(`${this.url(casa)}/sugestoes`, { versao, itens }); }
  incluir(casa: string, dados: { versao: number; nome: string; categoriaId: string; unidade: string; quantidade: number }) { return this.http.post<ListaCompras>(`${this.url(casa)}/itens`, dados); }
  quantidade(casa: string, item: string, versao: number, quantidade: number) { return this.http.put<ListaCompras>(`${this.url(casa)}/itens/${item}/quantidade`, { versao, quantidade }); }
  situacao(casa: string, item: string, versao: number, situacao: ItemCompra['situacao']) { return this.http.patch<ListaCompras>(`${this.url(casa)}/itens/${item}/situacao`, { versao, situacao }); }
  remover(casa: string, item: string, versao: number) { return this.http.delete<ListaCompras>(`${this.url(casa)}/itens/${item}`, { params: { versao } }); }
  previaConclusao(casa: string) { return this.http.get<Conclusao>(`${this.url(casa)}/conclusao/previa`); }
  concluir(casa: string, confirmacaoId: string, previa: Conclusao) {
    return this.http.post<{ itensProcessados: number }>(`${this.url(casa)}/conclusao`, { confirmacaoId, versao: previa.versao,
      compras: previa.compras.map(({ itemIds, produtoId, unidade, saldoAtual }) => ({ itemIds, produtoId, unidade, saldoAtual })) });
  }
}
