import { CriarLancamentoDTO, LancamentoContabil, IPartidaContabil } from '../models/LancamentoContabil';
import { ILancamentoContabilRepository } from '../repositories/LancamentoContabilRepository';
import { IPeriodoContabilRepository } from '../repositories/PeriodoContabilRepository';
import { ICentroCustoRepository } from '../repositories/CentroCustoRepository';
import { PlanoContasService } from './PlanoContasService';

export interface EstornarLancamentoDTO {
  dataEstorno: string;
  competencia: string;
  motivoEstorno: string;
}

/**
 * Serviço responsável pelo registro, validação e estorno de Lançamentos Contábeis (SPEC-2.2 / SPEC-2.3)
 * Atende aos requisitos RF-007, RF-008, RF-009 e RB-001.
 */
export class LancamentoContabilService {
  constructor(
    private readonly lancamentoRepo: ILancamentoContabilRepository,
    private readonly periodoRepo: IPeriodoContabilRepository,
    private readonly planoContasService: PlanoContasService,
    private readonly centroCustoRepo?: ICentroCustoRepository
  ) {}

  /**
   * Registra um lançamento contábil manual com validações estritas de partidas dobradas
   */
  async criarLancamento(dto: CriarLancamentoDTO): Promise<LancamentoContabil> {
    // 1. Validação de campos obrigatórios do cabeçalho (RF-007)
    if (!dto.empresaId || !dto.dataLancamento || !dto.competencia || !dto.historico || !dto.documentoOrigem) {
      throw new Error('Campos obrigatórios ausentes: empresaId, dataLancamento, competencia, historico e documentoOrigem devem ser informados.');
    }

    if (!dto.partidas || dto.partidas.length < 2) {
      throw new Error('O lançamento contábil deve possuir ao menos duas partidas (uma a débito e uma a crédito).');
    }

    // 2. Validação de período contábil aberto (RF-008 / CA-3)
    const statusPeriodo = await this.periodoRepo.obterStatus(dto.empresaId, dto.competencia);
    if (statusPeriodo === 'ENCERRADO') {
      throw new Error(`O período contábil da competência ${dto.competencia} está encerrado. Lançamentos não são permitidos.`);
    }

    // 2.1 Validação opcional de centro de custo cadastrado e ativo (SPEC-2.6 / RF-014)
    if (this.centroCustoRepo) {
      const validarCc = async (ccId: string) => {
        const dimensao = await this.centroCustoRepo!.buscarPorId(ccId);
        if (!dimensao || dimensao.empresaId !== dto.empresaId) {
          throw new Error(`Centro de custo '${ccId}' não encontrado para a empresa.`);
        }
        if (!dimensao.ativo) {
          throw new Error(`Centro de custo '${dimensao.codigo}' está inativo.`);
        }
      };

      if (dto.centroCustoId) {
        await validarCc(dto.centroCustoId);
      }
      for (const partida of dto.partidas) {
        if (partida.centroCustoId) {
          await validarCc(partida.centroCustoId);
        }
      }
    }

    // 3. Validação das contas contábeis e dos valores individuais das partidas (RF-008 / CA-4 / CA-5)
    let totalDebitos = 0;
    let totalCreditos = 0;
    const partidasFormatadas: IPartidaContabil[] = [];

    for (const partida of dto.partidas) {
      // CA-5: Inconsistência de valores (valores <= 0)
      if (partida.valor === undefined || partida.valor === null || partida.valor <= 0) {
        throw new Error('Inconsistência de valores: todas as partidas devem possuir valor monetário positivo maior que zero.');
      }

      if (partida.tipo !== 'DEBITO' && partida.tipo !== 'CREDITO') {
        throw new Error(`Tipo de partida inválido: ${partida.tipo}. Utilize DEBITO ou CREDITO.`);
      }

      // CA-4: Validação de conta ativa e analítica (integrado à SPEC-2.1)
      try {
        await this.planoContasService.validarContaParaLancamento(partida.contaId);
      } catch (error: any) {
        throw new Error(`Validação de conta contábil falhou: ${error.message}`);
      }

      const partidaId = `partida_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      partidasFormatadas.push({
        id: partidaId,
        contaId: partida.contaId,
        tipo: partida.tipo,
        valor: Number(partida.valor.toFixed(2)),
        centroCustoId: partida.centroCustoId,
      });

      if (partida.tipo === 'DEBITO') {
        totalDebitos += partida.valor;
      } else {
        totalCreditos += partida.valor;
      }
    }

    // 4. Validação de Partidas Dobradas - Balanço entre Débitos e Créditos (RB-001 / RF-008 / CA-2)
    const diferenca = Math.abs(Number((totalDebitos - totalCreditos).toFixed(2)));
    if (diferenca > 0.0001) {
      throw new Error(
        `Lançamento desbalanceado! A soma dos débitos (R$ ${totalDebitos.toFixed(2)}) é diferente da soma dos créditos (R$ ${totalCreditos.toFixed(2)}). Diferença: R$ ${diferenca.toFixed(2)}.`
      );
    }

    // 5. Persistência atômica do lançamento balanceado (CA-1)
    const lancamentoId = `lanc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const novoLancamento = new LancamentoContabil({
      id: lancamentoId,
      empresaId: dto.empresaId,
      dataLancamento: dto.dataLancamento,
      competencia: dto.competencia,
      historico: dto.historico.trim(),
      documentoOrigem: dto.documentoOrigem.trim(),
      centroCustoId: dto.centroCustoId,
      valorTotal: Number(totalDebitos.toFixed(2)),
      tipoLancamento: dto.tipoLancamento || 'NORMAL',
      lancamentoOrigemId: dto.lancamentoOrigemId,
      loteId: dto.loteId,
      partidas: partidasFormatadas.map((p) => ({ ...p, lancamentoId })),
    });

    return await this.lancamentoRepo.criar(novoLancamento);
  }

  /**
   * Estorna um lançamento contábil existente invertendo as partidas e vinculando ao original (RF-009 / CA-2 e CA-4)
   */
  async estornarLancamento(
    empresaId: string,
    lancamentoId: string,
    dadosEstorno: EstornarLancamentoDTO
  ): Promise<LancamentoContabil> {
    // 1. Busca o lançamento original
    const lancamentoOriginal = await this.buscarPorId(lancamentoId);

    if (lancamentoOriginal.empresaId !== empresaId) {
      throw new Error('Lançamento não pertence à empresa informada.');
    }

    if (lancamentoOriginal.tipoLancamento === 'ESTORNO') {
      throw new Error('Não é permitido estornar um lançamento que já é do tipo estorno.');
    }

    // 2. Validação se já foi estornado anteriormente (CA-4 da SPEC-2.3)
    const estornoExistente = await this.lancamentoRepo.buscarEstornoPorOrigemId(lancamentoId);
    if (estornoExistente) {
      throw new Error(`O lançamento ${lancamentoId} já foi estornado anteriormente pelo lançamento ${estornoExistente.id}.`);
    }

    // 3. Inversão estrita das partidas: DEBITO vira CREDITO e CREDITO vira DEBITO (CA-2)
    const partidasInvertidas: IPartidaContabil[] = lancamentoOriginal.partidas.map((p) => ({
      id: `partida_estorno_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      contaId: p.contaId,
      tipo: p.tipo === 'DEBITO' ? 'CREDITO' : 'DEBITO',
      valor: p.valor,
      centroCustoId: p.centroCustoId,
    }));

    // 4. Criação do lançamento de estorno vinculado (CA-2)
    return await this.criarLancamento({
      empresaId,
      dataLancamento: dadosEstorno.dataEstorno,
      competencia: dadosEstorno.competencia,
      historico: `Estorno de lançamento ref. ${lancamentoOriginal.documentoOrigem}: ${dadosEstorno.motivoEstorno || lancamentoOriginal.historico}`,
      documentoOrigem: `ESTORNO-${lancamentoOriginal.documentoOrigem}`,
      centroCustoId: lancamentoOriginal.centroCustoId,
      tipoLancamento: 'ESTORNO',
      lancamentoOrigemId: lancamentoOriginal.id,
      partidas: partidasInvertidas,
    });
  }

  /**
   * Consulta os lançamentos contábeis de uma empresa
   */
  async listarPorEmpresa(empresaId: string): Promise<LancamentoContabil[]> {
    if (!empresaId) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    return await this.lancamentoRepo.listarPorEmpresa(empresaId);
  }

  /**
   * Busca um lançamento por ID
   */
  async buscarPorId(id: string): Promise<LancamentoContabil> {
    const lancamento = await this.lancamentoRepo.buscarPorId(id);
    if (!lancamento) {
      throw new Error('Lançamento contábil não encontrado.');
    }
    return lancamento;
  }
}
