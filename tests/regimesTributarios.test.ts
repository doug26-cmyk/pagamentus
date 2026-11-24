import request from 'supertest';
import { criarApp } from '../src/app';
import { InMemoryRegimeTributarioEmpresaRepository } from '../src/repositories/RegimeTributarioEmpresaRepository';

describe('SPEC-3.6: Regimes tributários (RF-025, RF-026)', () => {
  let app: any;
  let repo: InMemoryRegimeTributarioEmpresaRepository;

  const empresaFicticiaId = 'empresa-ficticia-regime-001';

  beforeEach(async () => {
    const instancia = criarApp();
    app = instancia.app;
    repo = instancia.regimeTributarioEmpresaRepo;
    await repo.limpar();
  });

  /**
   * CA-1: Parametrização de regime, anexo/faixa, atividades, segregação de receitas e parâmetros
   */
  it('CA-1: deve parametrizar regime tributário com anexo/faixa, atividades, segregação e vigência', async () => {
    const res = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/regimes`)
      .send({
        regime: 'SIMPLES_NACIONAL',
        vigenciaInicio: '2026-01-01',
        vigenciaFim: '2026-12-31',
        anexo: 'Anexo III',
        faixa: 'Faixa 2',
        atividades: ['Desenvolvimento de software', 'Consultoria em TI'],
        segregacaoReceitas: [
          { categoria: 'Serviços sujeitos ao Anexo III', percentual: 80 },
          { categoria: 'Serviços com retenção de ISS', percentual: 20 },
        ],
        parametros: {
          fatorR: 0.31,
          issRetidoFonte: false,
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados.empresaId).toBe(empresaFicticiaId);
    expect(res.body.dados.regime).toBe('SIMPLES_NACIONAL');
    expect(res.body.dados.anexo).toBe('Anexo III');
    expect(res.body.dados.faixa).toBe('Faixa 2');
    expect(res.body.dados.atividades).toHaveLength(2);
    expect(res.body.dados.segregacaoReceitas).toHaveLength(2);
    expect(res.body.dados.parametros.fatorR).toBe(0.31);
  });

  /**
   * CA-2: Histórico de opção por vigência temporal
   */
  it('CA-2: deve manter histórico de opções e retornar o regime vigente para cada data consultada', async () => {
    await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/regimes`)
      .send({
        regime: 'SIMPLES_NACIONAL',
        vigenciaInicio: '2025-01-01',
        vigenciaFim: '2025-12-31',
        anexo: 'Anexo I',
        faixa: 'Faixa 1',
        atividades: ['Comércio varejista'],
      });

    await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/regimes`)
      .send({
        regime: 'LUCRO_PRESUMIDO',
        vigenciaInicio: '2026-01-01',
        atividades: ['Comércio varejista', 'Prestação de serviços'],
        parametros: { presuncaoServicos: 32 },
      });

    const resHist = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/fiscal/regimes`
    );
    expect(resHist.status).toBe(200);
    expect(resHist.body.dados).toHaveLength(2);
    expect(resHist.body.dados[0].regime).toBe('SIMPLES_NACIONAL');
    expect(resHist.body.dados[1].regime).toBe('LUCRO_PRESUMIDO');

    const res2025 = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/fiscal/regimes/vigente?data=2025-08-15`
    );
    expect(res2025.status).toBe(200);
    expect(res2025.body.dados.regime).toBe('SIMPLES_NACIONAL');
    expect(res2025.body.dados.anexo).toBe('Anexo I');

    const res2026 = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/fiscal/regimes/vigente?data=2026-05-10`
    );
    expect(res2026.status).toBe(200);
    expect(res2026.body.dados.regime).toBe('LUCRO_PRESUMIDO');
  });

  /**
   * CA-3: Validações de enquadramento, vigência e ausência de opção vigente
   */
  it('CA-3: deve recusar enquadramento inválido, vigência invertida e data sem opção vigente', async () => {
    const resRegimeInvalido = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/regimes`)
      .send({
        regime: 'REGIME_INEXISTENTE',
        vigenciaInicio: '2026-01-01',
      });
    expect(resRegimeInvalido.status).toBe(400);

    const resVigenciaInvertida = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/regimes`)
      .send({
        regime: 'LUCRO_REAL',
        vigenciaInicio: '2026-12-31',
        vigenciaFim: '2026-01-01',
      });
    expect(resVigenciaInvertida.status).toBe(400);

    const resSemVigente = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/fiscal/regimes/vigente?data=2024-01-10`
    );
    expect(resSemVigente.status).toBe(404);
  });
});
