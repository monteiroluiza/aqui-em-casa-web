import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API } from './auth';
export interface Morador { id: string; nome: string; email: string; papel: 'ADMINISTRADOR' | 'MORADOR' }
export interface Convite { id: string; email: string; estado: string; expiraEm: string; expirado: boolean }
export interface ConviteCriado { id: string; email: string; codigo: string; expiraEm: string }
@Injectable({ providedIn: 'root' })
export class CasaService {
  private http = inject(HttpClient);
  private url(id: string) { return `${API}/casas/${encodeURIComponent(id)}`; }
  moradores(id: string) { return this.http.get<Morador[]>(`${this.url(id)}/moradores`); }
  convites(id: string) { return this.http.get<Convite[]>(`${this.url(id)}/convites`); }
  convidar(id: string, email: string) { return this.http.post<ConviteCriado>(`${this.url(id)}/convites`, { email }); }
  remover(id: string, membro: string) { return this.http.delete<void>(`${this.url(id)}/moradores/${encodeURIComponent(membro)}`); }
  cancelar(id: string, convite: string) { return this.http.delete<void>(`${this.url(id)}/convites/${encodeURIComponent(convite)}`); }
}
