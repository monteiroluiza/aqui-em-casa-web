import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API } from './auth';

export type SituacaoEstoque = 'EM_FALTA' | 'BAIXO' | 'EM_DIA';
export interface Categoria { id: string; nome: string }
export interface AtualizarProduto {
  nome: string;
  categoriaId: string;
  unidade: string;
  quantidadeAtual: number;
  quantidadeDesejada: number;
}
export interface Produto {
  id: string;
  nome: string;
  categoria: { id: string; nome: string };
  unidade: string;
  quantidadeAtual: number;
  quantidadeDesejada: number;
  situacao: SituacaoEstoque;
  quantidadeFaltante: number;
  atualizadoEm: string;
  atualizadoPorId: string;
  atualizadoPorNome: string;
}

@Injectable({ providedIn: 'root' })
export class EstoqueService {
  private readonly http = inject(HttpClient);

  cadastrar(casaId: string, dados: AtualizarProduto) {
    return this.http.post<Produto>(`${API}/casas/${encodeURIComponent(casaId)}/produtos`, dados);
  }

  moradores(casaId: string) {
    return this.http.get<{ id: string; nome: string; email: string }[]>(`${API}/casas/${encodeURIComponent(casaId)}/moradores`);
  }

  categorias(casaId: string) {
    return this.http.get<Categoria[]>(`${API}/casas/${encodeURIComponent(casaId)}/categorias`);
  }

  criarCategoria(casaId: string, nome: string) {
    return this.http.post<Categoria>(`${API}/casas/${encodeURIComponent(casaId)}/categorias`, { nome });
  }

  ajustar(casaId: string, produtoId: string, ajuste: number) {
    return this.http.patch<Produto>(`${API}/casas/${encodeURIComponent(casaId)}/produtos/${encodeURIComponent(produtoId)}/quantidade`, { ajuste });
  }

  atualizar(casaId: string, produtoId: string, dados: AtualizarProduto) {
    return this.http.put<Produto>(`${API}/casas/${encodeURIComponent(casaId)}/produtos/${encodeURIComponent(produtoId)}`, dados);
  }

  consultar(casaId: string, busca = '') {
    const params = busca.trim() ? new HttpParams().set('busca', busca.trim()) : new HttpParams();
    return this.http.get<Produto[]>(`${API}/casas/${encodeURIComponent(casaId)}/produtos`, { params });
  }
}
