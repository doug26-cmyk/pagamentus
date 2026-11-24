import request from 'supertest';
import { criarApp } from '../src/app';
import { InMemoryPatrimonioEstoqueRepository } from '../src/repositories/PatrimonioEstoqueRepository';

describe('SPEC-2.13: Patrimônio e estoque (RF-057, RF-058, RF-059, RF-060)', () => {
  let app: any;
  let repo: InMemoryPatrimonioEstoqueRepository;

  const empresaFicticiaId = 'empresa-ficticia-pat-001';

  beforeEach(async () => {
    const instancia = criarApp();
    app = instancia.app;
    repo = instancia.patrimonioEstoqueRepo;
    await repo.limpar();
  });

  /**
   * CA-1: Cadastro de bem e cálculo de depreciação pela vida útil
   */
  it('CA-1: deve cadastrar bem com vida útil e valor residual e calcular depreciação mensal', async () => {
    const resBem = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/patrimonio/bens`)
      .send({
        codigo: 'BEM-001',
        descricao: 'Servidor Corporativo Fictício',
        tipoEncargo: 'DEPRECIACAO',
        localizacao: 'Sala de TI - Matriz',
        responsavel: 'Ana Silva Fictícia',
        dataAquisicao: '2026-10-01',
        custoAquisicao: 13000,
        vidaUtilMeses: 60,
        valorResidual: 1000,
        politica: { metodo: 'LINEAR', permiteReavaliacao: true, taxaAnualFiscal: 20 },
        documentoReferencia: 'NF-5001',
      });

    expect(resBem.status).toBe(201);
    const bemId = resBem.body.dados.id;
    expect(resBem.body.dados.valorContabilLiquido).toBe(13000);

    // Quota mensal = (13.000 - 1.000) / 60 = 200,00
    const resDep = await request(app)
      .post(
        `/api/empresas/${empresaFicticiaId}/patrimonio/bens/${bemId}/depreciar`
      )
      .send({ competencia: '2026-11' });

    expect(resDep.status).toBe(200);
    expect(resDep.body.dados.encargo.valorEncargo).toBe(200);
    expect(resDep.body.dados.bem.depreciacaoAcumulada).toBe(200);
    expect(resDep.body.dados.bem.valorContabilLiquido).toBe(12800);
  });

  /**
   * CA-2: Transferência, reavaliação permitida, baixa e histórico documental
   */
  it('CA-2: deve controlar transferência, reavaliação permitida, baixa e histórico documental', async () => {
    const resBem = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/patrimonio/bens`)
      .send({
        codigo: 'BEM-002',
        descricao: 'Veículo Utilitário Fictício',
        localizacao: 'Garagem Matriz',
        responsavel: 'Carlos Souza Fictício',
        dataAquisicao: '2026-01-10',
        custoAquisicao: 50000,
        vidaUtilMeses: 60,
        valorResidual: 5000,
        politica: { metodo: 'LINEAR', permiteReavaliacao: true },
      });
    const bemId = resBem.body.dados.id;

    // 1. Transferência
    const resTransf = await request(app)
      .post(
        `/api/empresas/${empresaFicticiaId}/patrimonio/bens/${bemId}/transferir`
      )
      .send({
        data: '2026-11-05',
        novaLocalizacao: 'Filial Sul',
        novoResponsavel: 'Marcos Lima Fictício',
        documentoReferencia: 'TERMO-TRANSF-01',
      });
    expect(resTransf.status).toBe(200);
    expect(resTransf.body.dados.localizacao).toBe('Filial Sul');
    expect(resTransf.body.dados.responsavel).toBe('Marcos Lima Fictício');

    // 2. Reavaliação permitida
    const resReav = await request(app)
      .post(
        `/api/empresas/${empresaFicticiaId}/patrimonio/bens/${bemId}/reavaliar`
      )
      .send({
        data: '2026-11-10',
        novoValorContabil: 48000,
        documentoReferencia: 'LAUDO-AVAL-02',
      });
    expect(resReav.status).toBe(200);
    expect(resReav.body.dados.valorContabilLiquido).toBe(48000);

    // 3. Baixa patrimonial
    const resBaixa = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/patrimonio/bens/${bemId}/baixar`)
      .send({
        dataBaixa: '2026-11-18',
        motivo: 'Alienação por venda',
        documentoReferencia: 'NF-VENDA-99',
      });
    expect(resBaixa.status).toBe(200);
    expect(resBaixa.body.dados.status).toBe('BAIXADO');
    // Histórico: AQUISICAO + TRANSFERENCIA + REAVALIACAO + BAIXA = 4 eventos
    expect(resBaixa.body.dados.historicoDocumental).toHaveLength(4);
  });

  /**
   * CA-3: Importação de saldos e movimentações de estoque
   */
  it('CA-3: deve importar saldos iniciais e movimentações de estoque e consolidar saldos por SKU', async () => {
    const resImp = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/estoque/importar`)
      .send({
        itens: [
          {
            sku: 'PROD-001',
            descricao: 'Componente Eletrônico Fictício',
            data: '2026-11-01',
            tipo: 'SALDO_INICIAL',
            quantidade: 100,
            valorUnitario: 10,
            documentoReferencia: 'INV-INI',
          },
          {
            sku: 'PROD-001',
            descricao: 'Componente Eletrônico Fictício',
            data: '2026-11-05',
            tipo: 'ENTRADA',
            quantidade: 50,
            valorUnitario: 10,
            documentoReferencia: 'NFE-100',
          },
          {
            sku: 'PROD-001',
            descricao: 'Componente Eletrônico Fictício',
            data: '2026-11-10',
            tipo: 'SAIDA',
            quantidade: 30,
            valorUnitario: 10,
            documentoReferencia: 'REQ-200',
          },
        ],
      });

    expect(resImp.status).toBe(201);
    expect(resImp.body.dados).toHaveLength(3);

    const resSaldos = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/estoque/saldos`
    );
    expect(resSaldos.status).toBe(200);
    expect(resSaldos.body.dados).toHaveLength(1);
    expect(resSaldos.body.dados[0].quantidadeSaldo).toBe(120);
    expect(resSaldos.body.dados[0].valorTotalSaldo).toBe(1200);
  });

  /**
   * CA-4: Validações e bloqueios
   */
  it('CA-4: deve recusar residual >= custo, duplicidade de depreciação, reavaliação não permitida e estoque inválido', async () => {
    // 1. Residual >= custo -> 400
    const resResidual = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/patrimonio/bens`)
      .send({
        codigo: 'BEM-ERR',
        descricao: 'Bem Inválido',
        localizacao: 'Matriz',
        responsavel: 'Ana',
        dataAquisicao: '2026-11-01',
        custoAquisicao: 1000,
        vidaUtilMeses: 12,
        valorResidual: 1000,
      });
    expect(resResidual.status).toBe(400);

    // Bem sem permissão de reavaliação
    const resBem = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/patrimonio/bens`)
      .send({
        codigo: 'BEM-SEM-REAV',
        descricao: 'Notebook Fictício',
        localizacao: 'Matriz',
        responsavel: 'Ana',
        dataAquisicao: '2026-11-01',
        custoAquisicao: 5000,
        vidaUtilMeses: 24,
        valorResidual: 200,
        politica: { metodo: 'LINEAR', permiteReavaliacao: false },
      });
    const bemId = resBem.body.dados.id;

    // 2. Reavaliação não permitida -> 400
    const resReavBloq = await request(app)
      .post(
        `/api/empresas/${empresaFicticiaId}/patrimonio/bens/${bemId}/reavaliar`
      )
      .send({ data: '2026-11-15', novoValorContabil: 6000 });
    expect(resReavBloq.status).toBe(400);

    // 3. Depreciação duplicada na mesma competência -> 400
    await request(app)
      .post(
        `/api/empresas/${empresaFicticiaId}/patrimonio/bens/${bemId}/depreciar`
      )
      .send({ competencia: '2026-11' });
    const resDepDup = await request(app)
      .post(
        `/api/empresas/${empresaFicticiaId}/patrimonio/bens/${bemId}/depreciar`
      )
      .send({ competencia: '2026-11' });
    expect(resDepDup.status).toBe(400);

    // 4. Estoque vazio -> 400
    const resEstInv = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/estoque/importar`)
      .send({ itens: [] });
    expect(resEstInv.status).toBe(400);
  });
});
