/**
 * Tipos dos artefatos fiscais preparados para conferência (SPEC-3.9 / RF-023).
 */
export interface GuiaFiscalConferencia {
  dados: Record<string, unknown>;
  statusTransmissao: 'NAO_TRANSMITIDA';
}

export interface DemonstrativoFiscalConferencia {
  dados: Record<string, unknown>;
}
