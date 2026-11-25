import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, of, switchMap } from 'rxjs';
import { API } from './auth';

interface Previa {
  versao: number;
  sugestoes: { produtoId: string; quantidadeSugerida: number; acao: 'ADICIONAR' | 'ATUALIZAR' | 'MANTER' }[];
}

@Injectable({ providedIn: 'root' })
export class ComprasService {
  private readonly http = inject(HttpClient);
  gerar(casaId: string) {
    const url = `${API}/casas/${encodeURIComponent(casaId)}/lista-compras`;
    return this.http.get<Previa>(`${url}/previa`).pipe(switchMap(previa => {
      const itens = previa.sugestoes.filter(item => item.acao !== 'MANTER' && item.quantidadeSugerida > 0)
        .map(item => ({ produtoId: item.produtoId, quantidade: item.quantidadeSugerida }));
      if (!itens.length) return of('Sua lista já está em dia. Não há novos itens para adicionar.');
      return this.http.post(`${url}/sugestoes`, { versao: previa.versao, itens }).pipe(
        map(() => 'Lista de compras atualizada com os produtos abaixo do desejado.'));
    }));
  }
}
