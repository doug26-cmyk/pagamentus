import {
  IncidentePrivacidadeLgpd,
  SolicitacaoTitularLgpd,
} from '../models/LgpdPrivacidadeModel';

/**
 * Contrato do repositório para Solicitações de Titulares e Incidentes LGPD (SPEC-1.11)
 */
export interface ILgpdPrivacidadeRepository {
  // Solicitações de Titulares (CA-2)
  salvarSolicitacao(solicitacao: SolicitacaoTitularLgpd): Promise<SolicitacaoTitularLgpd>;
  buscarSolicitacaoPorId(id: string): Promise<SolicitacaoTitularLgpd | null>;
  listarSolicitacoesPorOrganizacao(
    organizacaoId: string
  ): Promise<SolicitacaoTitularLgpd[]>;

  // Incidentes de Privacidade (CA-3)
  salvarIncidente(incidente: IncidentePrivacidadeLgpd): Promise<IncidentePrivacidadeLgpd>;
  buscarIncidentePorId(id: string): Promise<IncidentePrivacidadeLgpd | null>;
  listarIncidentesPorOrganizacao(
    organizacaoId: string
  ): Promise<IncidentePrivacidadeLgpd[]>;

  limpar(): Promise<void>;
}

/**
 * Implementação em memória do repositório LGPD
 */
export class InMemoryLgpdPrivacidadeRepository implements ILgpdPrivacidadeRepository {
  private solicitacoes: Map<string, SolicitacaoTitularLgpd> = new Map();
  private incidentes: Map<string, IncidentePrivacidadeLgpd> = new Map();

  public async salvarSolicitacao(
    solicitacao: SolicitacaoTitularLgpd
  ): Promise<SolicitacaoTitularLgpd> {
    const copia: SolicitacaoTitularLgpd = { ...solicitacao };
    this.solicitacoes.set(copia.id, copia);
    return { ...copia };
  }

  public async buscarSolicitacaoPorId(
    id: string
  ): Promise<SolicitacaoTitularLgpd | null> {
    const item = this.solicitacoes.get(id);
    return item ? { ...item } : null;
  }

  public async listarSolicitacoesPorOrganizacao(
    organizacaoId: string
  ): Promise<SolicitacaoTitularLgpd[]> {
    return Array.from(this.solicitacoes.values())
      .filter((s) => s.organizacaoId === organizacaoId)
      .map((s) => ({ ...s }));
  }

  public async salvarIncidente(
    incidente: IncidentePrivacidadeLgpd
  ): Promise<IncidentePrivacidadeLgpd> {
    const copia: IncidentePrivacidadeLgpd = { ...incidente };
    this.incidentes.set(copia.id, copia);
    return { ...copia };
  }

  public async buscarIncidentePorId(
    id: string
  ): Promise<IncidentePrivacidadeLgpd | null> {
    const item = this.incidentes.get(id);
    return item ? { ...item } : null;
  }

  public async listarIncidentesPorOrganizacao(
    organizacaoId: string
  ): Promise<IncidentePrivacidadeLgpd[]> {
    return Array.from(this.incidentes.values())
      .filter((i) => i.organizacaoId === organizacaoId)
      .map((i) => ({ ...i }));
  }

  public async limpar(): Promise<void> {
    this.solicitacoes.clear();
    this.incidentes.clear();
  }
}
