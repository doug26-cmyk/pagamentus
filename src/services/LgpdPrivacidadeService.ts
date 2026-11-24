import * as crypto from 'crypto';
import {
  IncidentePrivacidadeLgpd,
  SeveridadeIncidenteLgpd,
  SolicitacaoTitularLgpd,
  StatusIncidenteLgpd,
  StatusSolicitacaoTitular,
  TipoDireitoTitular,
} from '../models/LgpdPrivacidadeModel';
import { ILgpdPrivacidadeRepository } from '../repositories/LgpdPrivacidadeRepository';

const TIPOS_DIREITO_PERMITIDOS: TipoDireitoTitular[] = [
  'CONFIRMACAO',
  'ACESSO',
  'CORRECAO',
  'ELIMINACAO',
  'ANONIMIZACAO',
  'PORTABILIDADE',
  'REVOGACAO_CONSENTIMENTO',
];

const SEVERIDADES_PERMITIDAS: SeveridadeIncidenteLgpd[] = [
  'BAIXA',
  'MEDIA',
  'ALTA',
  'CRITICA',
];

/**
 * Serviço de Gestão de Solicitações de Titulares e Registro de Incidentes LGPD
 * Implementa a SPEC-1.11 (RNF-002)
 */
export class LgpdPrivacidadeService {
  constructor(private readonly repo: ILgpdPrivacidadeRepository) {}

  // ============================================================================
  // CA-2 e CA-4: Fluxo de Solicitação do Titular de Dados (Procedimento Aprovado)
  // ============================================================================

  /**
   * Registra uma nova solicitação de titular gerando protocolo e prazo legal de 15 dias (CA-2 e CA-4)
   */
  public async registrarSolicitacaoTitular(dados: {
    organizacaoId: string;
    titularNome: string;
    titularContato: string;
    tipoDireito: TipoDireitoTitular;
    descricao: string;
  }): Promise<SolicitacaoTitularLgpd> {
    const organizacaoId = (dados.organizacaoId || '').trim();
    if (!organizacaoId) {
      throw new Error('O identificador da organização é obrigatório.');
    }

    const titularNome = (dados.titularNome || '').trim();
    const titularContato = (dados.titularContato || '').trim();
    if (!titularNome || !titularContato) {
      throw new Error('O nome e o contato do titular são obrigatórios.');
    }

    if (!TIPOS_DIREITO_PERMITIDOS.includes(dados.tipoDireito)) {
      throw new Error(
        `Tipo de direito inválido. Valores permitidos: ${TIPOS_DIREITO_PERMITIDOS.join(', ')}.`
      );
    }

    const descricao = (dados.descricao || '').trim();
    if (!descricao) {
      throw new Error('A descrição da solicitação do titular é obrigatória.');
    }

    const agora = new Date();
    const prazo = new Date(agora.getTime() + 15 * 24 * 60 * 60 * 1000);
    const protocolo = `LGPD-${agora.getFullYear()}-${crypto
      .randomBytes(3)
      .toString('hex')
      .toUpperCase()}`;

    const novaSolicitacao: SolicitacaoTitularLgpd = {
      id: crypto.randomUUID(),
      protocolo,
      organizacaoId,
      titularNome,
      titularContato,
      tipoDireito: dados.tipoDireito,
      descricao,
      status: 'ABERTA',
      justificativaResposta: null,
      prazoLimite: prazo.toISOString().substring(0, 10),
      criadoEm: agora,
      concluidoEm: null,
    };

    return this.repo.salvarSolicitacao(novaSolicitacao);
  }

  /**
   * Atualiza o status de atendimento de uma solicitação de titular conforme procedimento aprovado (CA-2)
   */
  public async atualizarAtendimentoSolicitacao(
    solicitacaoId: string,
    dados: {
      status: StatusSolicitacaoTitular;
      justificativaResposta?: string;
    }
  ): Promise<SolicitacaoTitularLgpd> {
    const solicitacao = await this.repo.buscarSolicitacaoPorId(solicitacaoId);
    if (!solicitacao) {
      throw new Error('Solicitação de titular não encontrada.');
    }

    const statusPermitidos: StatusSolicitacaoTitular[] = [
      'ABERTA',
      'EM_ANALISE',
      'ATENDIDA',
      'INDEFERIDA_COM_JUSTIFICATIVA',
    ];
    if (!statusPermitidos.includes(dados.status)) {
      throw new Error('Status de atendimento inválido.');
    }

    if (
      (dados.status === 'ATENDIDA' || dados.status === 'INDEFERIDA_COM_JUSTIFICATIVA') &&
      (!dados.justificativaResposta || !dados.justificativaResposta.trim())
    ) {
      throw new Error(
        'A justificativa ou resumo da resposta é obrigatória ao concluir o atendimento.'
      );
    }

    solicitacao.status = dados.status;
    if (dados.justificativaResposta) {
      solicitacao.justificativaResposta = dados.justificativaResposta.trim();
    }
    if (dados.status === 'ATENDIDA' || dados.status === 'INDEFERIDA_COM_JUSTIFICATIVA') {
      solicitacao.concluidoEm = new Date();
    }

    return this.repo.salvarSolicitacao(solicitacao);
  }

  /**
   * Lista as solicitações de titulares registradas para a organização (CA-2)
   */
  public async listarSolicitacoesPorOrganizacao(
    organizacaoId: string
  ): Promise<SolicitacaoTitularLgpd[]> {
    return this.repo.listarSolicitacoesPorOrganizacao(organizacaoId);
  }

  // ============================================================================
  // CA-3 e CA-4: Registro e Acompanhamento de Incidentes de Privacidade (RNF-002)
  // ============================================================================

  /**
   * Registra um incidente de segurança/privacidade envolvendo dados pessoais (CA-3 e CA-4)
   */
  public async registrarIncidente(dados: {
    organizacaoId: string;
    titulo: string;
    descricao: string;
    dadosAfetados: string;
    severidade: SeveridadeIncidenteLgpd;
    medidasAdotadas: string;
    registradoPorUsuarioId: string;
  }): Promise<IncidentePrivacidadeLgpd> {
    const organizacaoId = (dados.organizacaoId || '').trim();
    const titulo = (dados.titulo || '').trim();
    const descricao = (dados.descricao || '').trim();
    const dadosAfetados = (dados.dadosAfetados || '').trim();
    const medidasAdotadas = (dados.medidasAdotadas || '').trim();
    const registradoPorUsuarioId = (dados.registradoPorUsuarioId || '').trim();

    if (
      !organizacaoId ||
      !titulo ||
      !descricao ||
      !dadosAfetados ||
      !medidasAdotadas ||
      !registradoPorUsuarioId
    ) {
      throw new Error(
        'Todos os campos obrigatórios do incidente (organização, título, descrição, dados afetados, medidas e responsável) devem ser preenchidos.'
      );
    }

    if (!SEVERIDADES_PERMITIDAS.includes(dados.severidade)) {
      throw new Error(
        `Severidade inválida. Valores permitidos: ${SEVERIDADES_PERMITIDAS.join(', ')}.`
      );
    }

    const novoIncidente: IncidentePrivacidadeLgpd = {
      id: crypto.randomUUID(),
      organizacaoId,
      titulo,
      descricao,
      dadosAfetados,
      severidade: dados.severidade,
      medidasAdotadas,
      status: 'ABERTO',
      registradoPorUsuarioId,
      registradoEm: new Date(),
      resolvidoEm: null,
    };

    return this.repo.salvarIncidente(novoIncidente);
  }

  /**
   * Atualiza o status de tratamento de um incidente de privacidade (CA-3)
   */
  public async atualizarStatusIncidente(
    incidenteId: string,
    status: StatusIncidenteLgpd,
    medidasAdotadas?: string
  ): Promise<IncidentePrivacidadeLgpd> {
    const incidente = await this.repo.buscarIncidentePorId(incidenteId);
    if (!incidente) {
      throw new Error('Incidente de privacidade não encontrado.');
    }

    const statusPermitidos: StatusIncidenteLgpd[] = ['ABERTO', 'EM_CONTENCAO', 'RESOLVIDO'];
    if (!statusPermitidos.includes(status)) {
      throw new Error('Status de incidente inválido.');
    }

    incidente.status = status;
    if (medidasAdotadas && medidasAdotadas.trim()) {
      incidente.medidasAdotadas = medidasAdotadas.trim();
    }
    if (status === 'RESOLVIDO') {
      incidente.resolvidoEm = new Date();
    }

    return this.repo.salvarIncidente(incidente);
  }

  /**
   * Lista os incidentes de privacidade registrados para a organização (CA-3)
   */
  public async listarIncidentesPorOrganizacao(
    organizacaoId: string
  ): Promise<IncidentePrivacidadeLgpd[]> {
    return this.repo.listarIncidentesPorOrganizacao(organizacaoId);
  }
}
