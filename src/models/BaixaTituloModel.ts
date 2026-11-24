/**
 * Modelos de Domínio para Baixas, Juros, Multas, Descontos, Estornos e Inadimplência
 * (SPEC-2.10 / RF-047)
 */

export type StatusParcela = 'ABERTA' | 'PARCIAL' | 'LIQUIDADA';
export type TipoOperacaoBaixa = 'PAGAMENTO' | 'RECEBIMENTO';

export interface BaixaTitulo {
  id: string;
  empresaId: string;
  tituloId: string;
  numeroParcela: number;
  tipoOperacao: TipoOperacaoBaixa;
  dataBaixa: string; // Formato YYYY-MM-DD
  principalBaixado: number;
  juros: number;
  multa: number;
  desconto: number;
  valorLiquido: number;
  estornada: boolean;
  estornadaEm?: Date;
  motivoEstorno?: string;
  criadoEm: Date;
}

export interface ResumoParcelaBaixa {
  numero: number;
  valorOriginal: number;
  valorBaixado: number;
  saldoEmAberto: number;
  vencimento: string;
  status: StatusParcela;
  inadimplente: boolean;
}

export interface ItemParcelaInadimplente {
  tituloId: string;
  tipoTitulo: 'PAGAR' | 'RECEBER';
  contraparteNome: string;
  numeroParcela: number;
  vencimento: string;
  saldoEmAberto: number;
  status: StatusParcela;
  inadimplente: boolean;
}

export interface ResultadoInadimplencia {
  empresaId: string;
  dataReferencia: string;
  parcelasInadimplentes: ItemParcelaInadimplente[];
}
