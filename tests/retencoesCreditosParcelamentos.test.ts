import request from 'supertest';
import { criarApp } from '../src/app';
import { InMemoryRetencaoCreditoParcelamentoRepository } from '../src/repositories/RetencaoCreditoParcelamentoRepository';

describe('SPEC-3.8: Retenções, créditos e parcelamentos (RF-022)', () => {
  let app: any;
  let repo: InMemoryRetencaoCreditoParcelamentoRepository;

  const empresaFicticiaId = 'empresa-ficticia-ret-001';

  beforeEach(async () => {
    const instancia = criarApp();
    app = instancia.app;
    repo = instancia.retencaoCreditoParcelamentoRepo;
    await repo.limpar();
  });

  /**
   * CA-1: Controle de tributos retidos e sofridos
   */
  it('CA-1: deve registrar e listar tributos retidos e sofridos com vencimentos', async () => {
    const resRetido = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/retencoes`)
      .send({
        tipo: 'RETIDO',
        tributo: 'ISS-RETIDO',
        competencia: '2026-05',
        dataVencimento: '2026-06-10',
        valor: 250.5,
        documentoReferencia: 'NF-1001',
      });
    expect(resRetido.status).toBe(201);
    expect(resRetido.body.dados.tipo).toBe('RETIDO');

    const resSofrido = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/retencoes`)
      .send({
        tipo: 'SOFRIDO',
        tributo: 'IRRF',
        competencia: '2026-05',
        dataVencimento: '2026-06-20',
        valor: 150,
        documentoReferencia: 'NF-2002',
      });
    expect(resSofrido.status).toBe(201);
    expect(resSofrido.body.dados.tipo).toBe('SOFRIDO');

    const resListaSofridos = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/fiscal/retencoes?tipo=SOFRIDO`
    );
    expect(resListaSofridos.status).toBe(200);
    expect(resListaSofridos.body.dados).toHaveLength(1);
    expect(resListaSofridos.body.dados[0].tributo).toBe('IRRF');
  });

  /**
   * CA-2: Controle de créditos e compensações
   */
  it('CA-2: deve registrar crédito, aplicar compensação reduzindo saldo e recusar excesso', async () => {
    const resCredito = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/creditos`)
      .send({
        tributo: 'COFINS',
        origem: 'Crédito de insumos período 2026-04',
        dataApuracao: '2026-04-30',
        valorInicial: 1000,
      });
    expect(resCredito.status).toBe(201);
    const creditoId = resCredito.body.dados.id;

    const resComp = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/compensacoes`)
      .send({
        creditoId,
        tributoDestino: 'CSLL',
        valorCompensado: 400,
        dataCompensacao: '2026-05-15',
      });
    expect(resComp.status).toBe(201);
    expect(resComp.body.dados.creditoAtualizado.saldoDisponivel).toBe(600);

    const resExcesso = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/compensacoes`)
      .send({
        creditoId,
        tributoDestino: 'CSLL',
        valorCompensado: 700,
        dataCompensacao: '2026-05-16',
      });
    expect(resExcesso.status).toBe(400);
  });

  /**
   * CA-3: Controle de parcelamentos e vencimentos
   */
  it('CA-3: deve cadastrar parcelamento, quitar parcela e listar vencimentos consolidados', async () => {
    await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/retencoes`)
      .send({
        tipo: 'RETIDO',
        tributo: 'CSRF',
        competencia: '2026-05',
        dataVencimento: '2026-06-20',
        valor: 300,
      });

    const resParc = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/parcelamentos`)
      .send({
        tributo: 'IRPJ',
        valorTotal: 1000,
        quantidadeParcelas: 3,
        primeiroVencimento: '2026-06-15',
      });
    expect(resParc.status).toBe(201);
    expect(resParc.body.dados.parcelas).toHaveLength(3);
    const parcelamentoId = resParc.body.dados.id;

    const resPagar = await request(app)
      .patch(
        `/api/empresas/${empresaFicticiaId}/fiscal/parcelamentos/${parcelamentoId}/parcelas/1/pagar`
      )
      .send({ dataPagamento: '2026-06-14' });
    expect(resPagar.status).toBe(200);
    expect(resPagar.body.dados.parcelas[0].status).toBe('PAGA');

    // Parcelas 2 (2026-07-15) e 3 (2026-08-15) em aberto + retenção CSRF (2026-06-20)
    const resVenc = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/fiscal/vencimentos?referencia=2026-07-01&ate=2026-07-31`
    );
    expect(resVenc.status).toBe(200);
    expect(resVenc.body.dados).toHaveLength(2);
    expect(resVenc.body.dados[0].status).toBe('ATRASADO'); // 2026-06-20 < 2026-07-01
    expect(resVenc.body.dados[1].status).toBe('ABERTO'); // 2026-07-15 >= 2026-07-01
  });

  /**
   * CA-4: Validações de entrada e existência
   */
  it('CA-4: deve recusar valores inválidos e crédito/parcelamento inexistente', async () => {
    const resValorInv = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/retencoes`)
      .send({
        tipo: 'RETIDO',
        tributo: 'ISS',
        competencia: '2026-05',
        dataVencimento: '2026-06-10',
        valor: 0,
      });
    expect(resValorInv.status).toBe(400);

    const resCredInexistente = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/compensacoes`)
      .send({
        creditoId: 'credito-nao-existe',
        tributoDestino: 'PIS',
        valorCompensado: 100,
        dataCompensacao: '2026-05-10',
      });
    expect(resCredInexistente.status).toBe(404);
  });
});
