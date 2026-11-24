import {
  DemonstrativoFiscalConferencia,
  GuiaFiscalConferencia,
} from '../models/GuiaDemonstrativoFiscalModel';

/**
 * Prepara guias e demonstrativos para conferência, sem transmiti-los (SPEC-3.9).
 */
export class GuiaDemonstrativoFiscalService {
  private validarEmpresaId(empresaId: string): string {
    const id = empresaId.trim();
    if (!id) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    return id;
  }

  private validarDados(dados: unknown): Record<string, unknown> {
    if (
      typeof dados !== 'object' ||
      dados === null ||
      Array.isArray(dados)
    ) {
      throw new Error('dados deve ser um objeto.');
    }
    return dados as Record<string, unknown>;
  }

  /**
   * Prepara a guia e registra explicitamente que ela não foi transmitida (CA-1, CA-3).
   */
  public prepararGuia(
    empresaId: string,
    dados: unknown
  ): GuiaFiscalConferencia {
    this.validarEmpresaId(empresaId);
    return {
      dados: this.validarDados(dados),
      statusTransmissao: 'NAO_TRANSMITIDA',
    };
  }

  /**
   * Prepara os dados recebidos como demonstrativo disponível para conferência (CA-2).
   */
  public prepararDemonstrativo(
    empresaId: string,
    dados: unknown
  ): DemonstrativoFiscalConferencia {
    this.validarEmpresaId(empresaId);
    return {
      dados: this.validarDados(dados),
    };
  }
}
