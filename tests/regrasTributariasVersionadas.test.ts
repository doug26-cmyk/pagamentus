import request from 'supertest';
import { criarApp } from '../src/app';
import { InMemoryRegraTributariaVersionadaRepository } from '../src/repositories/RegraTributariaVersionadaRepository';

describe('SPEC-3.5: Regras tributárias versionadas (RF-080, RB-004)', () => {
  let app: any;
  let repo: InMemoryRegraTributariaVersionadaRepository;

  const empresaFicticiaId = 'empresa-ficticia-reg-001';

  beforeEach(async () => {
    const instancia = criarApp();
    app = instancia.app;
    repo = instancia.regraTributariaVersionadaRepo;
    await repo.limpar();
  });

  /**
   * CA-1: Parametrização e atualização controlada gerando nova versão sem perder histórico
   */
  it('CA-1: deve cadastrar regra versionada e gerar nova versão ao atualizar preservando o histórico', async () => {
    const resV1 = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/regras-versionadas`)
      .send({
        codigoRegra: 'IRPJ-DEMO',
        exercicio: 2026,
        vigenciaInicio: '2026-01-01',
        vigenciaFim: '2026-12-31',
        regime: 'LUCRO_PRESUMIDO',
        jurisdicao: 'FEDERAL',
        situacaoContribuinte: 'REGULAR',
        aliquotaPercentual: 15,
        parcelaDeduzir: 0,
        leiauteVersao: '1.0',
      });

    expect(resV1.status).toBe(201);
    expect(resV1.body.dados.versao).toBe(1);

    const resV2 = await request(app)
      .put(
        `/api/empresas/${empresaFicticiaId}/fiscal/regras-versionadas/IRPJ-DEMO`
      )
      .send({
        aliquotaPercentual: 16,
        leiauteVersao: '2.0',
      });

    expect(resV2.status).toBe(200);
    expect(resV2.body.dados.versao).toBe(2);

    const resHist = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/fiscal/regras-versionadas?codigoRegra=IRPJ-DEMO`
    );
    expect(resHist.status).toBe(200);
    expect(resHist.body.dados).toHaveLength(2);
    expect(resHist.body.dados[0].versao).toBe(1);
    expect(resHist.body.dados[1].versao).toBe(2);
  });

  /**
   * CA-2: Cálculo usa a regra do exercício e vigência corretos
   */
  it('CA-2: deve selecionar e aplicar exatamente a regra do exercício e vigência corretos', async () => {
    // Regra exercício 2025: 10%
    await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/regras-versionadas`)
      .send({
        codigoRegra: 'TRIB-EX',
        exercicio: 2025,
        vigenciaInicio: '2025-01-01',
        vigenciaFim: '2025-12-31',
        regime: 'LUCRO_REAL',
        jurisdicao: 'FEDERAL',
        situacaoContribuinte: 'REGULAR',
        aliquotaPercentual: 10,
        leiauteVersao: '2025.1',
      });

    // Regra exercício 2026: 15%
    await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/regras-versionadas`)
      .send({
        codigoRegra: 'TRIB-EX',
        exercicio: 2026,
        vigenciaInicio: '2026-01-01',
        vigenciaFim: '2026-12-31',
        regime: 'LUCRO_REAL',
        jurisdicao: 'FEDERAL',
        situacaoContribuinte: 'REGULAR',
        aliquotaPercentual: 15,
        leiauteVersao: '2026.1',
      });

    const res2025 = await request(app)
      .post(
        `/api/empresas/${empresaFicticiaId}/fiscal/regras-versionadas/calcular`
      )
      .send({
        exercicio: 2025,
        dataCalculo: '2025-06-15',
        regime: 'LUCRO_REAL',
        jurisdicao: 'FEDERAL',
        situacaoContribuinte: 'REGULAR',
        baseCalculo: 10000,
      });

    expect(res2025.status).toBe(200);
    expect(res2025.body.dados.exercicio).toBe(2025);
    expect(res2025.body.dados.valorImposto).toBe(1000);

    const res2026 = await request(app)
      .post(
        `/api/empresas/${empresaFicticiaId}/fiscal/regras-versionadas/calcular`
      )
      .send({
        exercicio: 2026,
        dataCalculo: '2026-06-15',
        regime: 'LUCRO_REAL',
        jurisdicao: 'FEDERAL',
        situacaoContribuinte: 'REGULAR',
        baseCalculo: 10000,
      });

    expect(res2026.status).toBe(200);
    expect(res2026.body.dados.exercicio).toBe(2026);
    expect(res2026.body.dados.valorImposto).toBe(1500);
  });

  /**
   * CA-3: Aplicação por regime, jurisdição e situação do contribuinte
   */
  it('CA-3: deve aplicar regra distinta conforme regime, jurisdição e situação do contribuinte', async () => {
    await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/regras-versionadas`)
      .send({
        codigoRegra: 'ISS-SP',
        exercicio: 2026,
        vigenciaInicio: '2026-01-01',
        vigenciaFim: '2026-12-31',
        regime: 'LUCRO_PRESUMIDO',
        jurisdicao: 'MUNICIPAL-SP',
        situacaoContribuinte: 'REGULAR',
        aliquotaPercentual: 5,
        leiauteVersao: '1.0',
      });

    await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/regras-versionadas`)
      .send({
        codigoRegra: 'ISS-SP-ISENTO',
        exercicio: 2026,
        vigenciaInicio: '2026-01-01',
        vigenciaFim: '2026-12-31',
        regime: 'LUCRO_PRESUMIDO',
        jurisdicao: 'MUNICIPAL-SP',
        situacaoContribuinte: 'ISENTO',
        aliquotaPercentual: 0,
        leiauteVersao: '1.0',
      });

    const resRegular = await request(app)
      .post(
        `/api/empresas/${empresaFicticiaId}/fiscal/regras-versionadas/calcular`
      )
      .send({
        exercicio: 2026,
        dataCalculo: '2026-11-18',
        regime: 'LUCRO_PRESUMIDO',
        jurisdicao: 'MUNICIPAL-SP',
        situacaoContribuinte: 'REGULAR',
        baseCalculo: 2000,
      });
    expect(resRegular.status).toBe(200);
    expect(resRegular.body.dados.valorImposto).toBe(100);

    const resIsento = await request(app)
      .post(
        `/api/empresas/${empresaFicticiaId}/fiscal/regras-versionadas/calcular`
      )
      .send({
        exercicio: 2026,
        dataCalculo: '2026-11-18',
        regime: 'LUCRO_PRESUMIDO',
        jurisdicao: 'MUNICIPAL-SP',
        situacaoContribuinte: 'ISENTO',
        baseCalculo: 2000,
      });
    expect(resIsento.status).toBe(200);
    expect(resIsento.body.dados.valorImposto).toBe(0);
  });

  /**
   * CA-4: Validações e bloqueios
   */
  it('CA-4: deve recusar vigência invertida e cálculo sem regra vigente compatível', async () => {
    const resVigInv = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/regras-versionadas`)
      .send({
        codigoRegra: 'ERR',
        exercicio: 2026,
        vigenciaInicio: '2026-12-31',
        vigenciaFim: '2026-01-01',
        regime: 'SIMPLES_NACIONAL',
        jurisdicao: 'FEDERAL',
        situacaoContribuinte: 'REGULAR',
        aliquotaPercentual: 6,
        leiauteVersao: '1.0',
      });
    expect(resVigInv.status).toBe(400);

    const resSemRegra = await request(app)
      .post(
        `/api/empresas/${empresaFicticiaId}/fiscal/regras-versionadas/calcular`
      )
      .send({
        exercicio: 2028,
        dataCalculo: '2028-05-01',
        regime: 'SIMPLES_NACIONAL',
        jurisdicao: 'FEDERAL',
        situacaoContribuinte: 'REGULAR',
        baseCalculo: 1000,
      });
    expect(resSemRegra.status).toBe(400);
  });
});
