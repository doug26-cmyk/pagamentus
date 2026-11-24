import { RegraTributariaVersionada } from '../models/RegraTributariaVersionadaModel';

/**
 * Interface do repositório de Regras Tributárias Versionadas (SPEC-3.5)
 */
export interface IRegraTributariaVersionadaRepository {
  salvar(regra: RegraTributariaVersionada): Promise<RegraTributariaVersionada>;
  listarPorEmpresa(empresaId: string): Promise<RegraTributariaVersionada[]>;
  listarVersoesPorCodigo(
    empresaId: string,
    codigoRegra: string
  ): Promise<RegraTributariaVersionada[]>;
  limpar(): Promise<void>;
}

/**
 * Repositório em memória para Regras Tributárias Versionadas
 */
export class InMemoryRegraTributariaVersionadaRepository
  implements IRegraTributariaVersionadaRepository
{
  private regras: RegraTributariaVersionada[] = [];

  async salvar(
    regra: RegraTributariaVersionada
  ): Promise<RegraTributariaVersionada> {
    this.regras.push(regra);
    return regra;
  }

  async listarPorEmpresa(
    empresaId: string
  ): Promise<RegraTributariaVersionada[]> {
    return this.regras
      .filter((r) => r.empresaId === empresaId)
      .sort((a, b) => a.versao - b.versao);
  }

  async listarVersoesPorCodigo(
    empresaId: string,
    codigoRegra: string
  ): Promise<RegraTributariaVersionada[]> {
    return this.regras
      .filter((r) => r.empresaId === empresaId && r.codigoRegra === codigoRegra)
      .sort((a, b) => a.versao - b.versao);
  }

  async limpar(): Promise<void> {
    this.regras = [];
  }
}
