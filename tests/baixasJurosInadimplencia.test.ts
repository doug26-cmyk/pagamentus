import request from 'supertest';
import { criarApp } from '../src/app';
import { InMemoryBaixaTituloRepository } from '../src/repositories/BaixaTituloRepository';
import { InMemoryTituloFinanceiroRepository } from '../src/repositories/TituloFinanceiroRepository';

describe('SPEC-2.10: Baixas, juros, multas, descontos, estornos e inadimplência (RF-047)', () => {
  let app: any;
  let tituloRepo: InMemoryTituloFinanceiroRepository;
  let baixaRepo: InMemoryBaixaTituloRepository;

  const empresaFicticiaId = 'empresa-ficticia-baixa-001';
  let tituloReceberId: string;

  beforeEach(async () => {
    const instancia = criarApp();
    app = instancia.app;
    tituloRepo = instancia.tituloFinanceiroRepo;
    baixaRepo = instancia.baixaTituloRepo;

    await baixaRepo.limpar();
    await tituloRepo.limpar();

    const resTitulo = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/titulos`)
      .send({
        tipo: 'RECEBER',
        contraparte: { nome: 'Cliente Fictício Delta Ltda', tipo: 'CLIENTE' },
        categoria: 'Serviços Mensais',
        condicaoPagamento: '2x',
        valorTotal: 2000,
        parcelas: [
          { numero: 1, valor: 1000, vencimento: '2026-11-10' },
          { numero: 2, valor: 1000, vencimento: '2026-12-10' },
        ],
      });
    tituloReceberId = resTitulo.body.dados.id;
  });

  /**
   * CA-1: Baixa parcial e total com juros, multa e desconto
   */
  it('CA-1: deve registrar baixa parcial e depois total com juros, multa e desconto atualizando saldo e status', async () => {
    // 1. Baixa parcial de R$ 400 com desconto de R$ 20 -> líquido R$ 380
    const resParcial = await request(app)
      .post(
        `/api/empresas/${empresaFicticiaId}/titulos/${tituloReceberId}/parcelas/1/baixas`
      )
      .send({
        dataBaixa: '2026-11-08',
        principalBaixado: 400,
        juros: 0,
        multa: 0,
        desconto: 20,
      });

    expect(resParcial.status).toBe(201);
    expect(resParcial.body.dados.baixa.tipoOperacao).toBe('RECEBIMENTO');
    expect(resParcial.body.dados.baixa.valorLiquido).toBe(380);
    expect(resParcial.body.dados.parcela.saldoEmAberto).toBe(600);
    expect(resParcial.body.dados.parcela.status).toBe('PARCIAL');

    // 2. Baixa total do restante (R$ 600) com juros R$ 30 e multa R$ 12 -> líquido R$ 642
    const resTotal = await request(app)
      .post(
        `/api/empresas/${empresaFicticiaId}/titulos/${tituloReceberId}/parcelas/1/baixas`
      )
      .send({
        dataBaixa: '2026-11-15',
        principalBaixado: 600,
        juros: 30,
        multa: 12,
        desconto: 0,
      });

    expect(resTotal.status).toBe(201);
    expect(resTotal.body.dados.baixa.valorLiquido).toBe(642);
    expect(resTotal.body.dados.parcela.saldoEmAberto).toBe(0);
    expect(resTotal.body.dados.parcela.status).toBe('LIQUIDADA');
  });

  /**
   * CA-2: Estorno de baixa
   */
  it('CA-2: deve estornar baixa registrada e recompor o saldo em aberto da parcela', async () => {
    const resBaixa = await request(app)
      .post(
        `/api/empresas/${empresaFicticiaId}/titulos/${tituloReceberId}/parcelas/1/baixas`
      )
      .send({
        dataBaixa: '2026-11-10',
        principalBaixado: 1000,
      });
    const baixaId = resBaixa.body.dados.baixa.id;
    expect(resBaixa.body.dados.parcela.status).toBe('LIQUIDADA');

    const resEstorno = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/baixas/${baixaId}/estorno`)
      .send({ motivo: 'Lançamento em duplicidade' });

    expect(resEstorno.status).toBe(200);
    expect(resEstorno.body.dados.baixa.estornada).toBe(true);
    expect(resEstorno.body.dados.parcela.saldoEmAberto).toBe(1000);
    expect(resEstorno.body.dados.parcela.status).toBe('ABERTA');
  });

  /**
   * CA-3: Marcação de inadimplência por atraso
   */
  it('CA-3: deve marcar como inadimplente apenas parcelas não liquidadas vencidas antes da data de referência', async () => {
    // Liquida parcela 1 (vencimento 2026-11-10) e deixa parcela 2 (vencimento 2026-12-10) em aberto
    await request(app)
      .post(
        `/api/empresas/${empresaFicticiaId}/titulos/${tituloReceberId}/parcelas/1/baixas`
      )
      .send({ dataBaixa: '2026-11-10', principalBaixado: 1000 });

    // Em 2026-11-20: parcela 1 liquidada (não inadimplente) e parcela 2 vence só em 2026-12-10 (não inadimplente)
    const resAntes = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/inadimplencia/verificar`)
      .send({ dataReferencia: '2026-11-20' });
    expect(resAntes.status).toBe(200);
    expect(resAntes.body.dados.parcelasInadimplentes).toHaveLength(0);

    // Em 2026-12-15: parcela 2 está vencida e em aberto -> inadimplente
    const resDepois = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/inadimplencia/verificar`)
      .send({ dataReferencia: '2026-12-15' });
    expect(resDepois.status).toBe(200);
    expect(resDepois.body.dados.parcelasInadimplentes).toHaveLength(1);
    expect(resDepois.body.dados.parcelasInadimplentes[0].numeroParcela).toBe(2);
    expect(resDepois.body.dados.parcelasInadimplentes[0].inadimplente).toBe(true);
  });

  /**
   * CA-4: Validações e bloqueios
   */
  it('CA-4: deve recusar principal acima do saldo, valores negativos, desconto excessivo e estorno duplicado', async () => {
    // 1. Principal maior que o saldo em aberto (1000) -> 400
    const resExcesso = await request(app)
      .post(
        `/api/empresas/${empresaFicticiaId}/titulos/${tituloReceberId}/parcelas/1/baixas`
      )
      .send({ dataBaixa: '2026-11-10', principalBaixado: 1500 });
    expect(resExcesso.status).toBe(400);

    // 2. Juros negativo -> 400
    const resNegativo = await request(app)
      .post(
        `/api/empresas/${empresaFicticiaId}/titulos/${tituloReceberId}/parcelas/1/baixas`
      )
      .send({ dataBaixa: '2026-11-10', principalBaixado: 500, juros: -10 });
    expect(resNegativo.status).toBe(400);

    // 3. Desconto superior ao devido -> 400
    const resDescExcessivo = await request(app)
      .post(
        `/api/empresas/${empresaFicticiaId}/titulos/${tituloReceberId}/parcelas/1/baixas`
      )
      .send({ dataBaixa: '2026-11-10', principalBaixado: 200, desconto: 300 });
    expect(resDescExcessivo.status).toBe(400);

    // 4. Estorno duplicado -> 400
    const resBaixa = await request(app)
      .post(
        `/api/empresas/${empresaFicticiaId}/titulos/${tituloReceberId}/parcelas/1/baixas`
      )
      .send({ dataBaixa: '2026-11-10', principalBaixado: 500 });
    const baixaId = resBaixa.body.dados.baixa.id;

    await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/baixas/${baixaId}/estorno`)
      .send({ motivo: 'Primeiro estorno' });

    const resEstornoDuplicado = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/baixas/${baixaId}/estorno`)
      .send({ motivo: 'Segundo estorno' });
    expect(resEstornoDuplicado.status).toBe(400);
  });
});
