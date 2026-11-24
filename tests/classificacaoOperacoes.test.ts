import request from 'supertest';
import { criarApp } from '../src/app';
import { InMemoryClassificacaoOperacaoRepository } from '../src/repositories/ClassificacaoOperacaoRepository';

describe('SPEC-3.4: Classificação das operações (RF-019)', () => {
  let app: any;
  let repo: InMemoryClassificacaoOperacaoRepository;

  const empresaFicticiaId = 'empresa-ficticia-cls-001';

  beforeEach(async () => {
    const instancia = criarApp();
    app = instancia.app;
    repo = instancia.classificacaoOperacaoRepo;
    await repo.limpar();

    // Tabelas fictícias configuradas por regime para testes
    await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/classificacao/regras`)
      .send({
        regime: 'SIMPLES_NACIONAL',
        tipoOperacao: 'SAIDA',
        natureza: 'Venda de mercadoria',
        ncmPrefixo: '8471',
        cfop: '5102',
        cstCsosn: '102',
      });

    await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/classificacao/regras`)
      .send({
        regime: 'LUCRO_PRESUMIDO',
        tipoOperacao: 'SAIDA',
        natureza: 'Venda de mercadoria',
        ncmPrefixo: '8471',
        cfop: '5102',
        cstCsosn: '00',
      });
  });

  /**
   * CA-1 e CA-2: Classificação por natureza, CFOP, NCM e CST/CSOSN conforme regime
   */
  it('CA-1 e CA-2: deve classificar operação por natureza, CFOP, NCM e CST/CSOSN diferenciando por regime', async () => {
    const resSimples = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/classificar`)
      .send({
        regime: 'SIMPLES_NACIONAL',
        tipoOperacao: 'SAIDA',
        natureza: 'Venda de mercadoria',
        ncm: '84713012',
      });

    expect(resSimples.status).toBe(201);
    expect(resSimples.body.dados.cfop).toBe('5102');
    expect(resSimples.body.dados.cstCsosn).toBe('102');
    expect(resSimples.body.dados.ncm).toBe('84713012');
    expect(resSimples.body.dados.avisoTabelaFicticia).toMatch(/fictícia/i);

    const resPresumido = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/classificar`)
      .send({
        regime: 'LUCRO_PRESUMIDO',
        tipoOperacao: 'SAIDA',
        natureza: 'Venda de mercadoria',
        ncm: '84713012',
      });

    expect(resPresumido.status).toBe(201);
    expect(resPresumido.body.dados.cfop).toBe('5102');
    expect(resPresumido.body.dados.cstCsosn).toBe('00');
  });

  /**
   * CA-3: Consulta de classificações registradas
   */
  it('CA-3: deve listar classificações registradas para a empresa', async () => {
    await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/classificar`)
      .send({
        regime: 'SIMPLES_NACIONAL',
        tipoOperacao: 'SAIDA',
        natureza: 'Venda de mercadoria',
        ncm: '84713012',
      });

    const resList = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/fiscal/classificacoes`
    );
    expect(resList.status).toBe(200);
    expect(resList.body.dados).toHaveLength(1);
    expect(resList.body.dados[0].cstCsosn).toBe('102');
  });

  /**
   * CA-4: Validação de entrada e ausência de regra compatível
   */
  it('CA-4: deve recusar NCM inválido, regime inválido e operação sem regra compatível', async () => {
    const resNcmInvalido = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/classificar`)
      .send({
        regime: 'SIMPLES_NACIONAL',
        tipoOperacao: 'SAIDA',
        natureza: 'Venda de mercadoria',
        ncm: '8471', // precisa de 8 dígitos
      });
    expect(resNcmInvalido.status).toBe(400);

    const resSemRegra = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/classificar`)
      .send({
        regime: 'LUCRO_REAL',
        tipoOperacao: 'ENTRADA',
        natureza: 'Compra para uso e consumo',
        ncm: '99999999',
      });
    expect(resSemRegra.status).toBe(400);
  });
});
