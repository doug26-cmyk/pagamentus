import * as crypto from 'crypto';
import {
  AnexoCadastral,
  AnexoCadastralComStatus,
  StatusValidadeAnexo,
  TipoAnexoCadastral,
} from '../models/AnexoCadastralModel';
import { IAnexoCadastralRepository } from '../repositories/AnexoCadastralRepository';

const TIPOS_ANEXO_PERMITIDOS: TipoAnexoCadastral[] = [
  'CONTRATO_SOCIAL',
  'PROCURACAO',
  'DOCUMENTO_CADASTRAL',
  'CERTIFICADO',
  'OUTRO',
];

/**
 * Serviço para Anexos Cadastrais e Controle/Alerta de Validade
 * Implementa a SPEC-1.8 (RF-003)
 */
export class AnexoCadastralService {
  private readonly diasAntecedenciaPadrao: number;

  constructor(
    private readonly repo: IAnexoCadastralRepository,
    opcoes?: { diasAntecedenciaAlerta?: number }
  ) {
    this.diasAntecedenciaPadrao = opcoes?.diasAntecedenciaAlerta ?? 30;
  }

  /**
   * Valida se uma string representa uma data real no formato YYYY-MM-DD
   */
  public validarDataIso(dataStr: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) {
      return false;
    }
    const [ano, mes, dia] = dataStr.split('-').map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia));
    return (
      data.getUTCFullYear() === ano &&
      data.getUTCMonth() === mes - 1 &&
      data.getUTCDate() === dia
    );
  }

  /**
   * Converte YYYY-MM-DD para timestamp UTC à meia-noite
   */
  private converterParaUtcMs(dataStr: string): number {
    const [ano, mes, dia] = dataStr.split('-').map(Number);
    return Date.UTC(ano, mes - 1, dia);
  }

  /**
   * Avalia o status de validade de um anexo em relação à data de referência (CA-2 e CA-3)
   */
  public avaliarStatusValidade(
    anexo: AnexoCadastral,
    dataReferenciaIso?: string,
    diasAntecedencia?: number
  ): AnexoCadastralComStatus {
    const janelaDias = diasAntecedencia ?? this.diasAntecedenciaPadrao;
    const hojeIso = dataReferenciaIso || new Date().toISOString().substring(0, 10);

    if (!anexo.dataValidade) {
      return {
        ...anexo,
        statusValidade: 'SEM_VALIDADE',
        diasParaVencimento: null,
        alertaMensagem: null,
      };
    }

    const msReferencia = this.converterParaUtcMs(hojeIso);
    const msValidade = this.converterParaUtcMs(anexo.dataValidade);
    const diferencaDias = Math.round((msValidade - msReferencia) / (1000 * 60 * 60 * 24));

    let statusValidade: StatusValidadeAnexo;
    let alertaMensagem: string | null = null;

    if (diferencaDias < 0) {
      statusValidade = 'VENCIDO';
      alertaMensagem = `ALERTA: O documento '${anexo.nomeArquivo}' (${anexo.tipoAnexo}) está VENCIDO desde ${anexo.dataValidade}.`;
    } else if (diferencaDias <= janelaDias) {
      statusValidade = 'A_VENCER';
      alertaMensagem = `ALERTA: O documento '${anexo.nomeArquivo}' (${anexo.tipoAnexo}) está A VENCER em ${diferencaDias} dia(s) (${anexo.dataValidade}).`;
    } else {
      statusValidade = 'VIGENTE';
    }

    return {
      ...anexo,
      statusValidade,
      diasParaVencimento: diferencaDias,
      alertaMensagem,
    };
  }

  /**
   * Anexa um documento cadastral (Contrato Social, Procuração, Certificado, etc.) com controle de validade (CA-1 e CA-4)
   */
  public async anexarDocumento(
    dados: {
      id?: string;
      organizacaoId: string;
      pessoaEmpresaId: string;
      tipoAnexo: TipoAnexoCadastral;
      nomeArquivo: string;
      mimeType?: string;
      tamanhoBytes?: number;
      caminhoOuHashArquivo?: string;
      dataEmissao?: string | null;
      dataValidade?: string | null;
    },
    dataReferenciaIso?: string
  ): Promise<AnexoCadastralComStatus> {
    const organizacaoId = (dados.organizacaoId || '').trim();
    if (!organizacaoId) {
      throw new Error('O identificador da organização é obrigatório.');
    }

    const pessoaEmpresaId = (dados.pessoaEmpresaId || '').trim();
    if (!pessoaEmpresaId) {
      throw new Error('O vínculo com o cadastro (pessoaEmpresaId) é obrigatório.');
    }

    if (!TIPOS_ANEXO_PERMITIDOS.includes(dados.tipoAnexo)) {
      throw new Error(
        `Tipo de anexo inválido. Valores permitidos: ${TIPOS_ANEXO_PERMITIDOS.join(', ')}.`
      );
    }

    const nomeArquivo = (dados.nomeArquivo || '').trim();
    if (!nomeArquivo) {
      throw new Error('O nome do arquivo é obrigatório.');
    }

    const dataEmissao = dados.dataEmissao ? dados.dataEmissao.trim() : null;
    if (dataEmissao && !this.validarDataIso(dataEmissao)) {
      throw new Error('A data de emissão informada é inválida (use YYYY-MM-DD).');
    }

    const dataValidade = dados.dataValidade ? dados.dataValidade.trim() : null;
    if (dataValidade && !this.validarDataIso(dataValidade)) {
      throw new Error('A data de validade informada é inválida (use YYYY-MM-DD).');
    }

    if (dataEmissao && dataValidade && dataValidade < dataEmissao) {
      throw new Error('A data de validade não pode ser anterior à data de emissão.');
    }

    const novoAnexo: AnexoCadastral = {
      id: dados.id || crypto.randomUUID(),
      organizacaoId,
      pessoaEmpresaId,
      tipoAnexo: dados.tipoAnexo,
      nomeArquivo,
      mimeType: (dados.mimeType || 'application/pdf').trim(),
      tamanhoBytes: dados.tamanhoBytes && dados.tamanhoBytes > 0 ? dados.tamanhoBytes : 1024,
      caminhoOuHashArquivo: (
        dados.caminhoOuHashArquivo || `uploads/${pessoaEmpresaId}/${nomeArquivo}`
      ).trim(),
      dataEmissao,
      dataValidade,
      criadoEm: new Date(),
    };

    const salvo = await this.repo.salvarAnexo(novoAnexo);
    return this.avaliarStatusValidade(salvo, dataReferenciaIso);
  }

  /**
   * Lista todos os anexos de um cadastro avaliando o status de validade de cada um (CA-1, CA-2, CA-3)
   */
  public async listarAnexosPorCadastro(
    pessoaEmpresaId: string,
    dataReferenciaIso?: string,
    diasAntecedencia?: number
  ): Promise<AnexoCadastralComStatus[]> {
    const anexos = await this.repo.listarPorPessoaEmpresa(pessoaEmpresaId);
    return anexos.map((a) =>
      this.avaliarStatusValidade(a, dataReferenciaIso, diasAntecedencia)
    );
  }

  /**
   * Lista apenas os anexos que possuem alerta de validade ativo (`VENCIDO` ou `A_VENCER`) (CA-2 e CA-3)
   */
  public async listarAlertasValidade(opcoes?: {
    organizacaoId?: string;
    pessoaEmpresaId?: string;
    dataReferenciaIso?: string;
    diasAntecedencia?: number;
  }): Promise<AnexoCadastralComStatus[]> {
    let anexos: AnexoCadastral[];

    if (opcoes?.pessoaEmpresaId) {
      anexos = await this.repo.listarPorPessoaEmpresa(opcoes.pessoaEmpresaId);
    } else if (opcoes?.organizacaoId) {
      anexos = await this.repo.listarPorOrganizacao(opcoes.organizacaoId);
    } else {
      anexos = await this.repo.listarTodos();
    }

    return anexos
      .map((a) =>
        this.avaliarStatusValidade(a, opcoes?.dataReferenciaIso, opcoes?.diasAntecedencia)
      )
      .filter(
        (avaliado) =>
          avaliado.statusValidade === 'VENCIDO' || avaliado.statusValidade === 'A_VENCER'
      );
  }
}
