import request from 'supertest';
import { criarApp } from '../src/app';
import { InMemoryCalculoTributarioRepository } from '../src/repositories/CalculoTributarioRepository';

describe('SPEC-3.7: Cálculo e memória de cálculo (RF-020, RF-021, RF-027, RNF-012)', () => {
  let app: any;
  let repo: InMemoryCalculoTributarioRepository;

  const empresaFicticiaId = 'empresa-ficticia-calc-001';

  beforeEach(async () => {
    const instancia = criarApp();
    app = instancia.app;
    repo = instancia.calculoTributarioRepo;
    await repo.limpar();
  });

  /**
   * CA-1 e CA-2: Cálculo parametrizado por esfera e contexto com memória detalhada
   */
  it('CA-1 e CA-2: deve calcular tributos aplicáveis por esfera e retornar memória completa (base, alíquota, dedução, retenção, crédito e arredondamento)', async () => {
    // Regra Federal (PIS-DEMO 0.65%)
    await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/calculo-regras`)
      .send({
        tributo: 'PIS-DEMO',
        esfera: 'FEDERAL',
        regime: 'LUCRO_PRESUMIDO',
        atividade: 'SERVICOS_TI',
        uf: 'SP',
        municipio: 'Sao Paulo',
        tipoOperacao: 'SERVICO',
        vigenciaInicio: '2026-01-01',
        vigenciaFim: '2026-12-31',
        aliquotaPercentual: 0.65,
      });

    // Regra Municipal (ISS-DEMO 5%)
    await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/calculo-regras`)
      .send({
        tributo: 'ISS-DEMO',
        esfera: 'MUNICIPAL',
        regime: 'LUCRO_PRESUMIDO',
        atividade: 'SERVICOS_TI',
        uf: 'SP',
        municipio: 'Sao Paulo',
        tipoOperacao: 'SERVICO',
        vigenciaInicio: '2026-01-01',
        vigenciaFim: '2026-12-31',
        aliquotaPercentual: 5,
      });

    // Regra Estadual de VENDA (não aplicável a SERVICO)
    await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/calculo-regras`)
      .send({
        tributo: 'ICMS-DEMO',
        esfera: 'ESTADUAL',
        regime: 'LUCRO_PRESUMIDO',
        atividade: 'COMERCIO',
        uf: 'SP',
        municipio: 'Sao Paulo',
        tipoOperacao: 'VENDA',
        vigenciaInicio: '2026-01-01',
        vigenciaFim: '2026-12-31',
        aliquotaPercentual: 18,
      });

    // Caso de referência: valor 1005.55 - deducoes 5.55 = base 1000.00
    // PIS-DEMO: 1000 * 0.65% = 6.50 | retencoes 1.00 | creditos 0.50 => 5.00
    // ISS-DEMO: 1000 * 5% = 50.00 | retencoes 1.00 | creditos 0.50 => 48.50
    const res = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/calculos`)
      .send({
        regime: 'LUCRO_PRESUMIDO',
        atividade: 'SERVICOS_TI',
        uf: 'SP',
        municipio: 'Sao Paulo',
        dataOperacao: '2026-05-20',
        tipoOperacao: 'SERVICO',
        valorOperacao: 1005.55,
        deducoes: 5.55,
        retencoes: 1.0,
        creditos: 0.5,
      });

    expect(res.status).toBe(200);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados.memorias).toHaveLength(2);
    expect(res.body.dados.totalTributos).toBe(53.5);

    const memFederal = res.body.dados.memorias.find(
      (m: any) => m.esfera === 'FEDERAL'
    );
    expect(memFederal.tributo).toBe('PIS-DEMO');
    expect(memFederal.baseCalculoBruta).toBe(1005.55);
    expect(memFederal.deducoes).toBe(5.55);
    expect(memFederal.baseCalculoTributavel).toBe(1000);
    expect(memFederal.aliquotaPercentual).toBe(0.65);
    expect(memFederal.retencoes).toBe(1);
    expect(memFederal.creditos).toBe(0.5);
    expect(memFederal.valorFinalTributo).toBe(5);
    expect(memFederal.regraArredondamento).toBe('HALF_UP (2 casas decimais)');
    expect(memFederal.versaoRegra).toBe(1);
  });

  /**
   * CA-3: Reprodutibilidade determinística com regra versionada e arredondamento HALF_UP
   */
  it('CA-3: deve produzir exatamente o mesmo resultado e memória para o mesmo cenário', async () => {
    await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/calculo-regras`)
      .send({
        tributo: 'COFINS-DEMO',
        esfera: 'FEDERAL',
        regime: 'LUCRO_REAL',
        atividade: 'CONSULTORIA',
        uf: 'RJ',
        municipio: 'Rio de Janeiro',
        tipoOperacao: 'SERVICO',
        vigenciaInicio: '2026-01-01',
        vigenciaFim: '2026-12-31',
        aliquotaPercentual: 3.33,
      });

    const entrada = {
      regime: 'LUCRO_REAL',
      atividade: 'CONSULTORIA',
      uf: 'RJ',
      municipio: 'Rio de Janeiro',
      dataOperacao: '2026-07-10',
      tipoOperacao: 'SERVICO',
      valorOperacao: 100.15,
      deducoes: 0,
      retencoes: 0,
      creditos: 0,
    };

    const res1 = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/calculos`)
      .send(entrada);
    const res2 = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/calculos`)
      .send(entrada);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res1.body.dados.totalTributos).toBe(res2.body.dados.totalTributos);
    expect(res1.body.dados.memorias).toEqual(res2.body.dados.memorias);
  });

  /**
   * CA-4: Validações de entrada e ausência de regra vigente compatível
   */
  it('CA-4: deve recusar valores inválidos, vigência invertida e cenário sem regra vigente', async () => {
    const resVigInv = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/calculo-regras`)
      .send({
        tributo: 'ISS-ERR',
        esfera: 'MUNICIPAL',
        regime: 'SIMPLES_NACIONAL',
        atividade: 'SERVICOS',
        uf: 'MG',
        municipio: 'Belo Horizonte',
        tipoOperacao: 'SERVICO',
        vigenciaInicio: '2026-12-31',
        vigenciaFim: '2026-01-01',
        aliquotaPercentual: 2,
      });
    expect(resVigInv.status).toBe(400);

    const resDedNeg = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/calculos`)
      .send({
        regime: 'SIMPLES_NACIONAL',
        atividade: 'SERVICOS',
        uf: 'MG',
        municipio: 'Belo Horizonte',
        dataOperacao: '2026-05-01',
        tipoOperacao: 'SERVICO',
        valorOperacao: 500,
        deducoes: -10,
      });
    expect(resDedNeg.status).toBe(400);

    const resSemRegra = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/calculos`)
      .send({
        regime: 'SIMPLES_NACIONAL',
        atividade: 'SERVICOS',
        uf: 'MG',
        municipio: 'Belo Horizonte',
        dataOperacao: '2026-05-01',
        tipoOperacao: 'SERVICO',
        valorOperacao: 500,
      });
    expect(resSemRegra.status).toBe(404);
  });
});
