import { CentroCustoDimensao } from '../models/CentroCustoModel';

/**
 * Contrato do repositório de Centros de Custo e Dimensões Gerenciais (SPEC-2.6)
 */
export interface ICentroCustoRepository {
  salvar(dimensao: CentroCustoDimensao): Promise<CentroCustoDimensao>;
  buscarPorId(id: string): Promise<CentroCustoDimensao | null>;
  buscarPorEmpresaECodigo(
    empresaId: string,
    codigo: string
  ): Promise<CentroCustoDimensao | null>;
  listarPorEmpresa(empresaId: string): Promise<CentroCustoDimensao[]>;
  limpar(): Promise<void>;
}

/**
 * Implementação em memória do repositório de Centros de Custo e Dimensões Gerenciais
 */
export class InMemoryCentroCustoRepository implements ICentroCustoRepository {
  private dimensoes: Map<string, CentroCustoDimensao> = new Map();

  public async salvar(dimensao: CentroCustoDimensao): Promise<CentroCustoDimensao> {
    const copia: CentroCustoDimensao = { ...dimensao };
    this.dimensoes.set(copia.id, copia);
    return { ...copia };
  }

  public async buscarPorId(id: string): Promise<CentroCustoDimensao | null> {
    const item = this.dimensoes.get(id);
    return item ? { ...item } : null;
  }

  public async buscarPorEmpresaECodigo(
    empresaId: string,
    codigo: string
  ): Promise<CentroCustoDimensao | null> {
    const codigoNormalizado = codigo.trim().toLowerCase();
    for (const item of this.dimensoes.values()) {
      if (
        item.empresaId === empresaId &&
        item.codigo.toLowerCase() === codigoNormalizado
      ) {
        return { ...item };
      }
    }
    return null;
  }

  public async listarPorEmpresa(empresaId: string): Promise<CentroCustoDimensao[]> {
    return Array.from(this.dimensoes.values())
      .filter((d) => d.empresaId === empresaId)
      .map((d) => ({ ...d }));
  }

  public async limpar(): Promise<void> {
    this.dimensoes.clear();
  }
}
