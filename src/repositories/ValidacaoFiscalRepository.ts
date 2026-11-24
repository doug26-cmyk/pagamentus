import { RegraValidacaoFiscal } from '../models/ValidacaoFiscalModel';

/**
 * Interface do repositório de Regras de Validação Fiscal (SPEC-3.3)
 */
export interface IValidacaoFiscalRepository {
  salvarRegra(regra: RegraValidacaoFiscal): Promise<RegraValidacaoFiscal>;
  obterRegraPorEmpresa(empresaId: string): Promise<RegraValidacaoFiscal | null>;
  limpar(): Promise<void>;
}

/**
 * Repositório em memória para Regras de Validação Fiscal
 */
export class InMemoryValidacaoFiscalRepository
  implements IValidacaoFiscalRepository
{
  private regras: Map<string, RegraValidacaoFiscal> = new Map();

  async salvarRegra(regra: RegraValidacaoFiscal): Promise<RegraValidacaoFiscal> {
    this.regras.set(regra.empresaId, regra);
    return regra;
  }

  async obterRegraPorEmpresa(
    empresaId: string
  ): Promise<RegraValidacaoFiscal | null> {
    return this.regras.get(empresaId) || null;
  }

  async limpar(): Promise<void> {
    this.regras.clear();
  }
}
