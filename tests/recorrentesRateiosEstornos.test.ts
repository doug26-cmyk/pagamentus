import request from 'supertest';
import { criarApp } from '../src/app';

describe('SPEC-2.3: Recorrentes, Rateios, Provisões e Estornos (RF-009)', () => {
  let app: any;
  let planoContasService: any;
  let modeloService: any;
  let lancamentoService: any;

  const empresaId = 'empresa_teste_001';
  let contaDespesaAluguelId: string;
  let contaAluguelPagarId: string;
  let contaEnergiaId: string;
  let contaFornecedorEnergiaId: string;

  beforeEach(async () => {
    const instancia = criarApp();
    app = instancia.app;
    planoContasService = instancia.planoContasService;
    modeloService = instancia.modeloService;
    lancamentoService = instancia.lancamentoService;

    // Cadastra contas analíticas para as rotinas
    const c1 = await planoContasService.criarConta({
      empresaId,
      codigo: '3.1.01.001',
      nome: 'Despesa com Aluguel',
      nivel: 4,
      tipo: 'ANALITICA',
      natureza: 'DEVEDORA',
      classificacao: 'DESPESA',
    });
    contaDespesaAluguelId = c1.id;

    const c2 = await planoContasService.criarConta({
      empresaId,
      codigo: '2.1.02.001',
      nome: 'Aluguéis a Pagar',
      nivel: 4,
      tipo: 'ANALITICA',
      natureza: 'CREDORA',
      classificacao: 'PASSIVO',
    });
    contaAluguelPagarId = c2.id;

    const c3 = await planoContasService.criarConta({
      empresaId,
      codigo: '3.1.02.001',
      nome: 'Energia Elétrica',
      nivel: 4,
      tipo: 'ANALITICA',
      natureza: 'DEVEDORA',
      classificacao: 'DESPESA',
    });
    contaEnergiaId = c3.id;

    const c4 = await planoContasService.criarConta({
      empresaId,
      codigo: '2.1.01.005',
      nome: 'Concessionária de Energia',
      nivel: 4,
      tipo: 'ANALITICA',
      natureza: 'CREDORA',
      classificacao: 'PASSIVO',
    });
    contaFornecedorEnergiaId = c4.id;

    // Cadastra centros de custo ativos usados nos modelos de rateio
    await instancia.centroCustoService.cadastrarDimensao({
      id: 'CC-COM',
      empresaId,
      codigo: 'CC-COM',
      nome: 'Centro de Custo Comercial',
      tipo: 'CENTRO_CUSTO',
    });
    await instancia.centroCustoService.cadastrarDimensao({
      id: 'CC-FAB',
      empresaId,
      codigo: 'CC-FAB',
      nome: 'Centro de Custo Fabril',
      tipo: 'CENTRO_CUSTO',
    });
  });

  /**
   * CA-1: Dado um modelo de lançamento recorrente devidamente configurado com histórico e partidas balanceadas,
   * quando o usuário solicitar a geração para uma empresa, data e competência,
   * então um novo lançamento contábil é criado e registrado com sucesso a partir das definições do modelo.
   */
  describe('CA-1: Geração de lançamento a partir de modelo recorrente', () => {
    it('deve cadastrar modelo recorrente e gerar lançamento contábil efetivo', async () => {
      // 1. Cadastra o modelo recorrente (Provisão Mensal de Aluguel com valor fixo)
      const resModelo = await request(app)
        .post(`/api/empresas/${empresaId}/modelos-lancamento`)
        .send({
          descricao: 'Provisão de Aluguel Sede',
          tipo: 'RECORRENTE',
          historicoPadrao: 'Provisão mensal de aluguel da sede administrativa',
          partidas: [
            { contaId: contaDespesaAluguelId, tipo: 'DEBITO', valorFixo: 3500.0 },
            { contaId: contaAluguelPagarId, tipo: 'CREDITO', valorFixo: 3500.0 },
          ],
        });

      expect(resModelo.status).toBe(201);
      const modeloId = resModelo.body.dados.id;

      // 2. Aciona a geração para a competência de novembro
      const resGeracao = await request(app)
        .post(`/api/empresas/${empresaId}/modelos-lancamento/${modeloId}/gerar`)
        .send({
          dataLancamento: '2026-11-30',
          competencia: '2026-11',
          documentoOrigem: 'REC-ALUGUEL-11/2026',
          historicoComplementar: 'Competência 11/2026',
        });

      expect(resGeracao.status).toBe(201);
      expect(resGeracao.body.sucesso).toBe(true);
      expect(resGeracao.body.dados.valorTotal).toBe(3500.0);
      expect(resGeracao.body.dados.tipoLancamento).toBe('RECORRENTE');
      expect(resGeracao.body.dados.historico).toContain('Provisão mensal de aluguel da sede administrativa - Competência 11/2026');
      expect(resGeracao.body.dados.partidas).toHaveLength(2);
    });
  });

  /**
   * CA-2: Dado um lançamento contábil previamente registrado,
   * quando o usuário solicitar o seu estorno,
   * então o sistema deve gerar um novo lançamento com partidas contábeis invertidas
   * vinculado explicitamente ao identificador do lançamento original (lancamento_origem_id).
   */
  describe('CA-2: Estorno de lançamento com partidas invertidas e rastreabilidade', () => {
    it('deve gerar lançamento de estorno invertendo débitos/créditos e com lancamentoOrigemId', async () => {
      // 1. Cria lançamento original
      const resOriginal = await request(app)
        .post(`/api/empresas/${empresaId}/lancamentos`)
        .send({
          dataLancamento: '2026-11-10',
          competencia: '2026-11',
          historico: 'Pagamento indevido',
          documentoOrigem: 'NF-999',
          partidas: [
            { contaId: contaDespesaAluguelId, tipo: 'DEBITO', valor: 1200.0 },
            { contaId: contaAluguelPagarId, tipo: 'CREDITO', valor: 1200.0 },
          ],
        });

      expect(resOriginal.status).toBe(201);
      const lancamentoOriginalId = resOriginal.body.dados.id;

      // 2. Aciona estorno
      const resEstorno = await request(app)
        .post(`/api/empresas/${empresaId}/lancamentos/${lancamentoOriginalId}/estornar`)
        .send({
          dataEstorno: '2026-11-11',
          competencia: '2026-11',
          motivoEstorno: 'Lançamento duplicado por engano',
        });

      expect(resEstorno.status).toBe(201);
      expect(resEstorno.body.sucesso).toBe(true);
      const estorno = resEstorno.body.dados;

      // Valida vínculo de rastreabilidade
      expect(estorno.lancamentoOrigemId).toBe(lancamentoOriginalId);
      expect(estorno.tipoLancamento).toBe('ESTORNO');
      expect(estorno.valorTotal).toBe(1200.0);

      // Valida que as partidas foram invertidas:
      // O que era DEBITO na contaDespesaAluguelId virou CREDITO
      const partidaDespesa = estorno.partidas.find((p: any) => p.contaId === contaDespesaAluguelId);
      expect(partidaDespesa.tipo).toBe('CREDITO');

      // O que era CREDITO na contaAluguelPagarId virou DEBITO
      const partidaPassivo = estorno.partidas.find((p: any) => p.contaId === contaAluguelPagarId);
      expect(partidaPassivo.tipo).toBe('DEBITO');
    });
  });

  /**
   * CA-3: Dado um modelo de lançamento configurado com rateio (múltiplas partidas de débito ou crédito por percentual ou centro de custo),
   * quando o lançamento for gerado a partir do modelo,
   * então todas as partidas rateadas são criadas mantendo o balanceamento total de partidas dobradas.
   */
  describe('CA-3: Modelo com rateio proporcional por percentual e centros de custo', () => {
    it('deve gerar lançamento com rateio em múltiplos centros de custo mantendo partidas dobradas', async () => {
      // Modelo de rateio de energia: 60% Comercial (CC-COM) e 40% Fabril (CC-FAB) contra 100% Fornecedor
      const resModelo = await request(app)
        .post(`/api/empresas/${empresaId}/modelos-lancamento`)
        .send({
          descricao: 'Rateio Energia Elétrica por Setor',
          tipo: 'RATEIO',
          historicoPadrao: 'Apropriação de despesa com energia elétrica rateada',
          partidas: [
            { contaId: contaEnergiaId, tipo: 'DEBITO', percentual: 60, centroCustoId: 'CC-COM' },
            { contaId: contaEnergiaId, tipo: 'DEBITO', percentual: 40, centroCustoId: 'CC-FAB' },
            { contaId: contaFornecedorEnergiaId, tipo: 'CREDITO', percentual: 100 },
          ],
        });

      expect(resModelo.status).toBe(201);
      const modeloId = resModelo.body.dados.id;

      // Gera o lançamento para fatura de R$ 10.000,00
      const resGeracao = await request(app)
        .post(`/api/empresas/${empresaId}/modelos-lancamento/${modeloId}/gerar`)
        .send({
          dataLancamento: '2026-11-20',
          competencia: '2026-11',
          documentoOrigem: 'FAT-ENERGIA-112026',
          valorBase: 10000.0,
        });

      expect(resGeracao.status).toBe(201);
      const lancamento = resGeracao.body.dados;

      expect(lancamento.valorTotal).toBe(10000.0);
      expect(lancamento.partidas).toHaveLength(3);

      const debitos = lancamento.partidas.filter((p: any) => p.tipo === 'DEBITO');
      expect(debitos).toHaveLength(2);
      expect(debitos[0].valor).toBe(6000.0);
      expect(debitos[0].centroCustoId).toBe('CC-COM');
      expect(debitos[1].valor).toBe(4000.0);
      expect(debitos[1].centroCustoId).toBe('CC-FAB');

      const creditos = lancamento.partidas.filter((p: any) => p.tipo === 'CREDITO');
      expect(creditos).toHaveLength(1);
      expect(creditos[0].valor).toBe(10000.0);
    });
  });

  /**
   * CA-4: Dado que um lançamento original já foi totalmente estornado,
   * quando houver uma nova tentativa de estorno para o mesmo lançamento original,
   * então o sistema deve rejeitar a operação informando que o lançamento já foi estornado.
   */
  describe('CA-4: Bloqueio de duplicidade de estorno', () => {
    it('deve bloquear nova tentativa de estorno para lançamento já estornado', async () => {
      // 1. Registra lançamento
      const resOriginal = await request(app)
        .post(`/api/empresas/${empresaId}/lancamentos`)
        .send({
          dataLancamento: '2026-11-05',
          competencia: '2026-11',
          historico: 'Lançamento de teste para duplicidade de estorno',
          documentoOrigem: 'DOC-ORIG-100',
          partidas: [
            { contaId: contaDespesaAluguelId, tipo: 'DEBITO', valor: 500.0 },
            { contaId: contaAluguelPagarId, tipo: 'CREDITO', valor: 500.0 },
          ],
        });

      const lancamentoId = resOriginal.body.dados.id;

      // 2. Primeiro estorno: sucesso
      const resEstorno1 = await request(app)
        .post(`/api/empresas/${empresaId}/lancamentos/${lancamentoId}/estornar`)
        .send({
          dataEstorno: '2026-11-06',
          competencia: '2026-11',
          motivoEstorno: 'Primeiro estorno legítimo',
        });
      expect(resEstorno1.status).toBe(201);

      // 3. Segunda tentativa de estorno: deve falhar
      const resEstorno2 = await request(app)
        .post(`/api/empresas/${empresaId}/lancamentos/${lancamentoId}/estornar`)
        .send({
          dataEstorno: '2026-11-07',
          competencia: '2026-11',
          motivoEstorno: 'Tentativa duplicada de estorno',
        });

      expect(resEstorno2.status).toBe(400);
      expect(resEstorno2.body.sucesso).toBe(false);
      expect(resEstorno2.body.mensagem).toContain('já foi estornado anteriormente');
    });
  });
});
