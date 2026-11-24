/**
 * Modelos de Domínio para Títulos a Pagar e a Receber e Vínculos (SPEC-2.9 / RF-046, RF-050)
 */

export type TipoTitulo = 'PAGAR' | 'RECEBER';
export type TipoContraparte = 'FORNECEDOR' | 'CLIENTE';

export interface ContraparteTitulo {
  id?: string;
  nome: string;
  tipo: TipoContraparte;
}

export interface ParcelaTitulo {
  numero: number;
  valor: number;
  vencimento: string; // Formato YYYY-MM-DD
}

export interface AnexoTitulo {
  id: string;
  nomeArquivo: string;
  tipoConteudo?: string;
  referenciaUri: string;
  registradoEm: Date;
}

export interface VinculoTitulo {
  documentoFiscalId?: string;
  documentoFiscalNumero?: string;
  lancamentoContabilId?: string;
  comprovanteReferencia?: string;
  atualizadoEm?: Date;
}

export interface TituloFinanceiro {
  id: string;
  empresaId: string;
  tipo: TipoTitulo;
  contraparte: ContraparteTitulo;
  categoria: string;
  condicaoPagamento: string;
  centroCustoId?: string;
  valorTotal: number;
  parcelas: ParcelaTitulo[];
  vinculos: VinculoTitulo;
  anexos: AnexoTitulo[];
  criadoEm: Date;
}
