import request from 'supertest';
import { criarApp } from '../src/app';
import { InMemoryLancamentoContabilRepository } from '../src/repositories/LancamentoContabilRepository';
import { InMemoryPlanoContasRepository } from '../src/repositories/PlanoContasRepository';
import { InMemoryTituloFinanceiroRepository } from '../src/repositories/TituloFinanceiroRepository';

describe('SPEC-2.9: Títulos a pagar e a receber e vínculos (RF-046, RF-050)', () => {
  let app: any;
  let tituloFinanceiroRepo: InMemoryTituloFinanceiroRepository;
  let lancamentoRepo: InMemoryLancamentoContabilRepository;
  let planoContasRepo: InMemoryPlanoContasRepository;

  const empresaFicticiaId = 'empresa-ficticia-tit-001';
  let contaDespesaId: string;
  let contaFornecedorId: string;
  let lancamentoId: string;

  beforeEach(async () => {
    const instancia = criarApp();
    app = instancia.app;
    tituloFinanceiroRepo = instancia.tituloFinanceiroRepo;
    lancamentoRepo = instancia.lancamentoRepo;
    planoContasRepo = instancia.planoContasRepo;

    await tituloFinanceiroRepo.limpar();
    await lancamentoRepo.limpar();
    await planoContasRepo.limpar();

    const resDesp = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/plano-contas`)
      .send({
        codigo: '4.1.01.001',
        nome: 'Despesa de Fornecedor Fictício',
        nivel: 4,
        tipo: 'ANALITICA',
        natureza: 'DEVEDORA',
        classificacao: 'DESPESA',
      });
    contaDespesaId = resDesp.body.dados.id;

    const resForn = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/plano-contas`)
      .send({
        codigo: '2.1.01.001',
        nome: 'Fornecedores a Pagar Fictício',
        nivel: 4,
        tipo: 'ANALITICA',
        natureza: 'CREDORA',
        classificacao: 'PASSIVO',
      });
    contaFornecedorId = resForn.body.dados.id;

    const resLanc = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/lancamentos`)
      .send({
        dataLancamento: '2026-11-18',
        competencia: '2026-11',
        historico: 'Apropriação de NF-e 9001',
        documentoOrigem: 'NFE-9001',
        partidas: [
          { contaId: contaDespesaId, tipo: 'DEBITO', valor: 2000 },
          { contaId: contaFornecedorId, tipo: 'CREDITO', valor: 2000 },
        ],
      });
    lancamentoId = resLanc.body.dados.id;
  });

  /**
   * CA-1: Cadastro de título com parcelas e vencimentos
   */
  it('CA-1: deve cadastrar títulos a pagar e a receber com parcelas, vencimentos, categoria e condição de pagamento', async () => {
    const resPagar = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/titulos`)
      .send({
        tipo: 'PAGAR',
        contraparte: { nome: 'Fornecedor Alpha Fictício Ltda', tipo: 'FORNECEDOR' },
        categoria: 'Serviços de TI',
        condicaoPagamento: '2x 30/60 dias',
        valorTotal: 2000,
        parcelas: [
          { numero: 1, valor: 1000, vencimento: '2026-12-18' },
          { numero: 2, valor: 1000, vencimento: '2027-01-18' },
        ],
      });

    expect(resPagar.status).toBe(201);
    expect(resPagar.body.dados.tipo).toBe('PAGAR');
    expect(resPagar.body.dados.parcelas).toHaveLength(2);
    expect(resPagar.body.dados.parcelas[0].vencimento).toBe('2026-12-18');

    const resReceber = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/titulos`)
      .send({
        tipo: 'RECEBER',
        contraparte: { nome: 'Cliente Beta Fictício S/A', tipo: 'CLIENTE' },
        categoria: 'Receita de Consultoria',
        condicaoPagamento: 'À vista',
        valorTotal: 3500,
        parcelas: [{ numero: 1, valor: 3500, vencimento: '2026-11-30' }],
      });

    expect(resReceber.status).toBe(201);
    expect(resReceber.body.dados.tipo).toBe('RECEBER');
    expect(resReceber.body.dados.contraparte.tipo).toBe('CLIENTE');
  });

  /**
   * CA-2 e CA-3: Registro de anexos e vínculos e consulta por empresa/ID
   */
  it('CA-2 e CA-3: deve registrar anexos e vínculo com documento fiscal, lançamento contábil e comprovante e retornar na consulta', async () => {
    const resTitulo = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/titulos`)
      .send({
        tipo: 'PAGAR',
        contraparte: { nome: 'Fornecedor Alpha Fictício Ltda', tipo: 'FORNECEDOR' },
        categoria: 'Serviços de TI',
        condicaoPagamento: '30 dias',
        valorTotal: 2000,
        parcelas: [{ numero: 1, valor: 2000, vencimento: '2026-12-18' }],
      });

    const tituloId = resTitulo.body.dados.id;

    const resVinculo = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/titulos/${tituloId}/vinculos`)
      .send({
        documentoFiscalId: 'df-9001',
        documentoFiscalNumero: 'NFE-9001',
        lancamentoContabilId: lancamentoId,
        comprovanteReferencia: 'comp-pagamento-9001.pdf',
        anexos: [
          {
            nomeArquivo: 'nfe-9001.xml',
            tipoConteudo: 'application/xml',
            referenciaUri: 'storage://anexos/nfe-9001.xml',
          },
          {
            nomeArquivo: 'comprovante-9001.pdf',
            tipoConteudo: 'application/pdf',
            referenciaUri: 'storage://anexos/comprovante-9001.pdf',
          },
        ],
      });

    expect(resVinculo.status).toBe(200);
    expect(resVinculo.body.dados.vinculos.documentoFiscalNumero).toBe('NFE-9001');
    expect(resVinculo.body.dados.vinculos.lancamentoContabilId).toBe(lancamentoId);
    expect(resVinculo.body.dados.vinculos.comprovanteReferencia).toBe(
      'comp-pagamento-9001.pdf'
    );
    expect(resVinculo.body.dados.anexos).toHaveLength(2);

    // Consulta individual e listagem (CA-3)
    const resGet = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/titulos/${tituloId}`
    );
    expect(resGet.status).toBe(200);
    expect(resGet.body.dados.id).toBe(tituloId);
    expect(resGet.body.dados.anexos).toHaveLength(2);

    const resList = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/titulos`
    );
    expect(resList.status).toBe(200);
    expect(resList.body.dados).toHaveLength(1);
  });

  /**
   * CA-4: Validações de entrada e integridade
   */
  it('CA-4: deve recusar parcelas divergentes do total, dados obrigatórios ausentes e lançamento contábil inexistente', async () => {
    // 1. Soma das parcelas != valorTotal -> 400
    const resDivergente = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/titulos`)
      .send({
        tipo: 'PAGAR',
        contraparte: { nome: 'Fornecedor Alpha Fictício', tipo: 'FORNECEDOR' },
        categoria: 'Serviços',
        condicaoPagamento: '2x',
        valorTotal: 2000,
        parcelas: [
          { numero: 1, valor: 1000, vencimento: '2026-12-18' },
          { numero: 2, valor: 500, vencimento: '2027-01-18' },
        ],
      });
    expect(resDivergente.status).toBe(400);

    // 2. Categoria ausente -> 400
    const resSemCategoria = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/titulos`)
      .send({
        tipo: 'PAGAR',
        contraparte: { nome: 'Fornecedor Alpha Fictício', tipo: 'FORNECEDOR' },
        categoria: '',
        condicaoPagamento: 'À vista',
        valorTotal: 500,
        parcelas: [{ numero: 1, valor: 500, vencimento: '2026-12-01' }],
      });
    expect(resSemCategoria.status).toBe(400);

    // 3. Vínculo com lançamento contábil inexistente -> 400
    const resTitulo = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/titulos`)
      .send({
        tipo: 'PAGAR',
        contraparte: { nome: 'Fornecedor Alpha Fictício', tipo: 'FORNECEDOR' },
        categoria: 'Serviços',
        condicaoPagamento: 'À vista',
        valorTotal: 500,
        parcelas: [{ numero: 1, valor: 500, vencimento: '2026-12-01' }],
      });

    const resVinculoInvalido = await request(app)
      .post(
        `/api/empresas/${empresaFicticiaId}/titulos/${resTitulo.body.dados.id}/vinculos`
      )
      .send({
        documentoFiscalNumero: 'NFE-9999',
        lancamentoContabilId: 'lancamento-inexistente',
      });
    expect(resVinculoInvalido.status).toBe(400);
  });
});
