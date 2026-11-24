import { IPeriodoContabil } from '../models/LancamentoContabil';
import { IPeriodoContabilRepository } from '../repositories/PeriodoContabilRepository';
import { AutenticacaoService } from './AutenticacaoService';
import { AuditoriaHistoricoService } from './AuditoriaHistoricoService';

/**
 * Serviço para controle de Períodos Contábeis (ABERTO, EM_FECHAMENTO e ENCERRADO)
 * Implementa a SPEC-2.5 (RF-012 e RB-002)
 */
export class PeriodoContabilService {
  constructor(
    private readonly periodoRepo: IPeriodoContabilRepository,
    private readonly authService: AutenticacaoService,
    private readonly auditoriaService: AuditoriaHistoricoService
  ) {}

  private validarCompetencia(competencia: string): void {
    if (!competencia || !/^\d{4}-\d{2}$/.test(competencia)) {
      throw new Error('Competência inválida. Utilize o formato YYYY-MM.');
    }
  }

  /**
   * Obtém ou inicializa um período contábil como ABERTO (CA-1)
   */
  public async obterOuCriarPeriodo(
    empresaId: string,
    competencia: string
  ): Promise<IPeriodoContabil> {
    if (!empresaId || !empresaId.trim()) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    this.validarCompetencia(competencia);
    return this.periodoRepo.obterPeriodo(empresaId.trim(), competencia);
  }

  /**
   * Lista todos os períodos contábeis registrados para uma empresa (CA-1)
   */
  public async listarPorEmpresa(empresaId: string): Promise<IPeriodoContabil[]> {
    if (!empresaId || !empresaId.trim()) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    return this.periodoRepo.listarPorEmpresa(empresaId.trim());
  }

  /**
   * Coloca o período contábil em estado EM_FECHAMENTO (CA-1)
   */
  public async iniciarFechamento(
    empresaId: string,
    competencia: string,
    usuarioId?: string
  ): Promise<IPeriodoContabil> {
    const periodo = await this.obterOuCriarPeriodo(empresaId, competencia);
    if (periodo.status === 'ENCERRADO') {
      throw new Error(
        `O período ${competencia} já está ENCERRADO. Utilize o fluxo de reabertura autorizada.`
      );
    }

    await this.periodoRepo.definirStatus(empresaId, competencia, 'EM_FECHAMENTO', {
      usuarioId,
    });
    return this.periodoRepo.obterPeriodo(empresaId, competencia);
  }

  /**
   * Encerra definitivamente o período contábil (status ENCERRADO), bloqueando alterações (CA-1 e CA-2)
   */
  public async encerrarPeriodo(
    empresaId: string,
    competencia: string,
    usuarioId?: string
  ): Promise<IPeriodoContabil> {
    await this.obterOuCriarPeriodo(empresaId, competencia);

    await this.periodoRepo.definirStatus(empresaId, competencia, 'ENCERRADO', {
      usuarioId,
    });
    return this.periodoRepo.obterPeriodo(empresaId, competencia);
  }

  /**
   * Reabre um período contábil ENCERRADO para ABERTO exigindo:
   * 1. Permissão especial 'contabil:periodo:reabrir' (CA-3 / CA-4)
   * 2. Justificativa obrigatória não vazia (CA-3 / CA-4)
   * 3. Registro automático na trilha de auditoria (RB-002 / CA-4)
   */
  public async reabrirPeriodo(dados: {
    empresaId: string;
    competencia: string;
    usuarioId: string;
    justificativa: string;
  }): Promise<IPeriodoContabil> {
    const periodo = await this.obterOuCriarPeriodo(dados.empresaId, dados.competencia);

    if (periodo.status !== 'ENCERRADO') {
      throw new Error(
        `Apenas períodos com status ENCERRADO podem ser reabertos (status atual: ${periodo.status}).`
      );
    }

    if (!dados.usuarioId || !dados.usuarioId.trim()) {
      throw new Error('O usuário responsável pela reabertura é obrigatório.');
    }

    // 1. Exige permissão especial (CA-3 / RF-012 / RB-002)
    await this.authService.exigirPermissao(
      dados.usuarioId.trim(),
      'contabil:periodo:reabrir'
    );

    // 2. Exige justificativa obrigatória (CA-3 / RF-012 / RB-002)
    const justificativa = (dados.justificativa || '').trim();
    if (!justificativa) {
      throw new Error(
        'Justificativa obrigatória: informe o motivo para reabrir um período contábil encerrado (RB-002).'
      );
    }

    // 3. Reabre o período para ABERTO
    await this.periodoRepo.definirStatus(dados.empresaId, dados.competencia, 'ABERTO', {
      usuarioId: dados.usuarioId.trim(),
      justificativa,
    });

    const periodoReaberto = await this.periodoRepo.obterPeriodo(
      dados.empresaId,
      dados.competencia
    );

    // 4. Grava registro imutável na trilha de auditoria (RB-002 / CA-4)
    await this.auditoriaService.registrarEvento({
      organizacaoId: dados.empresaId,
      usuarioId: dados.usuarioId.trim(),
      objetoTipo: 'PERIODO_CONTABIL',
      objetoId: `${dados.empresaId}:${dados.competencia}`,
      operacao: 'ALTERACAO',
      resultado: 'SUCESSO',
      justificativa,
      dadosAnteriores: { status: 'ENCERRADO' },
      dadosNovos: { status: 'ABERTO' },
    });

    return periodoReaberto;
  }
}
