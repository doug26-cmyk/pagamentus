import {
  RegraCalculoTributario,
  ResultadoCalculoMemoria,
} from '../models/CalculoTributarioModel';

/**
 * Interface do repositório de Cálculo e Memória de Cálculo (SPEC-3.7)
 */
export interface ICalculoTributarioRepository {
  salvarRegra(regra: RegraCalculoTributario): Promise<RegraCalculoTributario>;
  listarRegrasPorEmpresa(empresaId: string): Promise<RegraCalculoTributario[]>;
  salvarResultado(
    resultado: ResultadoCalculoMemoria
  ): Promise<ResultadoCalculoMemoria>;
  listarResultadosPorEmpresa(
    empresaId: string
  ): Promise<ResultadoCalculoMemoria[]>;
  limpar(): Promise<void>;
}

/**
 * Repositório em memória para regras versionadas e memórias de cálculo
 */
export class InMemoryCalculoTributarioRepository
  implements ICalculoTributarioRepository
{
  private regras: RegraCalculoTributario[] = [];
  private resultados: ResultadoCalculoMemoria[] = [];

  async salvarRegra(
    regra: RegraCalculoTributario
  ): Promise<RegraCalculoTributario> {
    this.regras.push(regra);
    return regra;
  }

  async listarRegrasPorEmpresa(
    empresaId: string
  ): Promise<RegraCalculoTributario[]> {
    return this.regras.filter((r) => r.empresaId === empresaId);
  }

  async salvarResultado(
    resultado: ResultadoCalculoMemoria
  ): Promise<ResultadoCalculoMemoria> {
    this.resultados.push(resultado);
    return resultado;
  }

  async listarResultadosPorEmpresa(
    empresaId: string
  ): Promise<ResultadoCalculoMemoria[]> {
    return this.resultados.filter((r) => r.empresaId === empresaId);
  }

  async limpar(): Promise<void> {
    this.regras = [];
    this.resultados = [];
  }
}
