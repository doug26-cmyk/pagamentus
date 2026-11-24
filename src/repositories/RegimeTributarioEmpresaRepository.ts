import { OpcaoRegimeTributario } from '../models/RegimeTributarioEmpresaModel';

/**
 * Interface do repositório de Opções de Regime Tributário (SPEC-3.6)
 */
export interface IRegimeTributarioEmpresaRepository {
  salvar(opcao: OpcaoRegimeTributario): Promise<OpcaoRegimeTributario>;
  listarPorEmpresa(empresaId: string): Promise<OpcaoRegimeTributario[]>;
  limpar(): Promise<void>;
}

/**
 * Repositório em memória para histórico de Regimes Tributários por empresa
 */
export class InMemoryRegimeTributarioEmpresaRepository
  implements IRegimeTributarioEmpresaRepository
{
  private opcoes: OpcaoRegimeTributario[] = [];

  async salvar(opcao: OpcaoRegimeTributario): Promise<OpcaoRegimeTributario> {
    this.opcoes.push(opcao);
    return opcao;
  }

  async listarPorEmpresa(empresaId: string): Promise<OpcaoRegimeTributario[]> {
    return this.opcoes
      .filter((o) => o.empresaId === empresaId)
      .sort((a, b) => a.vigenciaInicio.localeCompare(b.vigenciaInicio));
  }

  async limpar(): Promise<void> {
    this.opcoes = [];
  }
}
