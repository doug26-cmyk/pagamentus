import request from 'supertest';
import { criarApp } from '../src/app';
import { InMemoryBaixaTituloRepository } from '../src/repositories/BaixaTituloRepository';
import { InMemoryCentroCustoRepository } from '../src/repositories/CentroCustoRepository';
import { InMemoryTituloFinanceiroRepository } from '../src/repositories/TituloFinanceiroRepository';

describe('SPEC-2.12: Fluxo de caixa e relatórios financeiros (RF-049)', () => {
  let app: any;
  let tituloRepo: InMemoryTituloFinanceiroRepository;
  let baixaRepo: InMemoryBaixaTituloRepository;
  let centroCustoRepo: InMemoryCentroCustoRepository;

  const empresaFicticiaId = 'empresa-ficticia-fin-001';
  let ccTiId: string;
  let ccComercialId: string;

  beforeEach(async () => {
    const instancia = criarApp();
    app = instancia.app;
    tituloRepo = instancia.tituloFinanceiroRepo;
    baixaRepo = instancia.baixaTituloRepo;
    centroCustoRepo = instancia.centroCustoRepo;

    await baixaRepo.limpar();
    await tituloRepo.limpar();
    await centroCustoRepo.limpar();

    const resCcTi = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/centros-custo`)
      .send({ codigo: 'CC-TI', nome: 'Tecnologia', tipo: 'CENTRO_CUSTO' });
    ccTiId = resCcTi.body.dados.id;

    const resCcCom = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/centros-custo`)
      .send({ codigo: 'CC-COM', nome: 'Comercial', tipo: 'CENTRO_CUSTO' });
    ccComercialId = resCcCom.body.dados.id;

    // 1. Título a RECEBER (CC-COM): R$ 5.000 em 3 parcelas:
    // P1 = 2.000 (venc 2026-10-25 -> 24 dias de atraso em 2026-11-18, já baixada R$ 500 -> aberto 1.500)
    // P2 = 1.500 (venc 2026-09-10 -> 69 dias de atraso em 2026-11-18, aberto 1.500)
    // P3 = 1.500 (venc 2026-11-30 -> a vencer em 2026-11-18, aberto 1.500)
    const resReceber = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/titulos`)
      .send({
        tipo: 'RECEBER',
        contraparte: { nome: 'Cliente Fictício Alpha', tipo: 'CLIENTE' },
        categoria: 'Contratos',
        condicaoPagamento: '3x',
        centroCustoId: ccComercialId,
        valorTotal: 5000,
        parcelas: [
          { numero: 1, valor: 2000, vencimento: '2026-10-25' },
          { numero: 2, valor: 1500, vencimento: '2026-09-10' },
          { numero: 3, valor: 1500, vencimento: '2026-11-30' },
        ],
      });
    const tituloReceberId = resReceber.body.dados.id;

    // Baixa parcial na P1 em 2026-11-05 de R$ 500
    await request(app)
      .post(
        `/api/empresas/${empresaFicticiaId}/titulos/${tituloReceberId}/parcelas/1/baixas`
      )
      .send({ dataBaixa: '2026-11-05', principalBaixado: 500 });

    // 2. Título a PAGAR (CC-TI): R$ 1.800 (P1=800 venc 2026-11-12 paga em 2026-11-12; P2=1.000 venc 2026-11-25 em aberto)
    const resPagarTi = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/titulos`)
      .send({
        tipo: 'PAGAR',
        contraparte: { nome: 'Fornecedor Cloud Fictício', tipo: 'FORNECEDOR' },
        categoria: 'Infraestrutura',
        condicaoPagamento: '2x',
        centroCustoId: ccTiId,
        valorTotal: 1800,
        parcelas: [
          { numero: 1, valor: 800, vencimento: '2026-11-12' },
          { numero: 2, valor: 1000, vencimento: '2026-11-25' },
        ],
      });
    const tituloPagarTiId = resPagarTi.body.dados.id;

    await request(app)
      .post(
        `/api/empresas/${empresaFicticiaId}/titulos/${tituloPagarTiId}/parcelas/1/baixas`
      )
      .send({ dataBaixa: '2026-11-12', principalBaixado: 800 });

    // 3. Título a PAGAR (CC-COM): R$ 400 (P1=400 venc 2026-11-28 em aberto)
    await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/titulos`)
      .send({
        tipo: 'PAGAR',
        contraparte: { nome: 'Agência Marketing Fictícia', tipo: 'FORNECEDOR' },
        categoria: 'Marketing',
        condicaoPagamento: 'À vista',
        centroCustoId: ccComercialId,
        valorTotal: 400,
        parcelas: [{ numero: 1, valor: 400, vencimento: '2026-11-28' }],
      });
  });

  /**
   * CA-1: Fluxo de caixa e posição financeira
   */
  it('CA-1: deve gerar fluxo de caixa (realizado e previsto) e posição financeira com totais corretos', async () => {
    const resFluxo = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/financeiro/fluxo-caixa?dataInicio=2026-11-01&dataFim=2026-11-30`
    );
    expect(resFluxo.status).toBe(200);
    const fluxo = resFluxo.body.dados;

    expect(fluxo.realizado.entradas).toBe(500);
    expect(fluxo.realizado.saidas).toBe(800);
    expect(fluxo.realizado.saldoLiquido).toBe(-300);

    // Previsto em Nov/2026: P3 receber (1.500) - [P2 TI (1.000) + P1 COM (400)] = +100
    expect(fluxo.previsto.entradas).toBe(1500);
    expect(fluxo.previsto.saidas).toBe(1400);
    expect(fluxo.previsto.saldoLiquido).toBe(100);
    expect(fluxo.saldoTotalProjetado).toBe(-200);

    const resPos = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/financeiro/posicao?dataReferencia=2026-11-18`
    );
    expect(resPos.status).toBe(200);
    const pos = resPos.body.dados;

    // Aberto receber: 1.500 + 1.500 + 1.500 = 4.500; Aberto pagar: 1.000 + 400 = 1.400
    expect(pos.totalAReceberEmAberto).toBe(4500);
    expect(pos.totalAPagarEmAberto).toBe(1400);
    expect(pos.saldoProjetado).toBe(3100);
    expect(pos.totalRecebido).toBe(500);
    expect(pos.totalPago).toBe(800);
    expect(pos.saldoRealizado).toBe(-300);
  });

  /**
   * CA-2: Aging de recebíveis
   */
  it('CA-2: deve gerar aging de recebíveis distribuindo saldos em aberto por faixa de atraso', async () => {
    const resAging = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/financeiro/aging-recebiveis?dataReferencia=2026-11-18`
    );
    expect(resAging.status).toBe(200);
    const aging = resAging.body.dados;

    expect(aging.totalEmAberto).toBe(4500);

    const aVencer = aging.faixas.find((f: any) => f.faixa === 'A_VENCER');
    const d1a30 = aging.faixas.find((f: any) => f.faixa === '1_30_DIAS');
    const d61a90 = aging.faixas.find((f: any) => f.faixa === '61_90_DIAS');

    expect(aVencer.valorTotal).toBe(1500);
    expect(d1a30.valorTotal).toBe(1500);
    expect(d61a90.valorTotal).toBe(1500);
  });

  /**
   * CA-3: Previsão de pagamentos e relatório por centro de custo
   */
  it('CA-3: deve gerar previsão de pagamentos e relatório financeiro por centro de custo com totais exatos', async () => {
    const resPrev = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/financeiro/previsao-pagamentos?dataInicio=2026-11-01&dataFim=2026-11-30`
    );
    expect(resPrev.status).toBe(200);
    expect(resPrev.body.dados.totalPrevisto).toBe(1400);
    expect(resPrev.body.dados.itens).toHaveLength(2);

    const resPrevTi = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/financeiro/previsao-pagamentos?dataInicio=2026-11-01&dataFim=2026-11-30&centroCustoId=${ccTiId}`
    );
    expect(resPrevTi.status).toBe(200);
    expect(resPrevTi.body.dados.totalPrevisto).toBe(1000);

    const resCc = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/financeiro/por-centro-custo`
    );
    expect(resCc.status).toBe(200);
    const relCc = resCc.body.dados;

    expect(relCc.totalAbertoPagar).toBe(1400);
    expect(relCc.totalAbertoReceber).toBe(4500);

    const itemTi = relCc.itens.find((i: any) => i.centroCustoId === ccTiId);
    expect(itemTi.codigo).toBe('CC-TI');
    expect(itemTi.totalPagar).toBe(1800);
    expect(itemTi.totalPago).toBe(800);
    expect(itemTi.abertoPagar).toBe(1000);

    const itemCom = relCc.itens.find((i: any) => i.centroCustoId === ccComercialId);
    expect(itemCom.codigo).toBe('CC-COM');
    expect(itemCom.totalReceber).toBe(5000);
    expect(itemCom.abertoReceber).toBe(4500);
    expect(itemCom.abertoPagar).toBe(400);
    expect(itemCom.saldoLiquidoEmAberto).toBe(4100);
  });

  /**
   * CA-4: Validações de parâmetros
   */
  it('CA-4: deve recusar datas ausentes, formato inválido ou dataInicio > dataFim', async () => {
    const res1 = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/financeiro/fluxo-caixa?dataInicio=2026-11-30&dataFim=2026-11-01`
    );
    expect(res1.status).toBe(400);

    const res2 = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/financeiro/aging-recebiveis`
    );
    expect(res2.status).toBe(400);

    const res3 = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/financeiro/posicao?dataReferencia=invalida`
    );
    expect(res3.status).toBe(400);
  });
});
