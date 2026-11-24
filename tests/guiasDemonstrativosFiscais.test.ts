import request from 'supertest';
import { criarApp } from '../src/app';

describe('SPEC-3.9: Guias e demonstrativos para conferência (RF-023)', () => {
  const app = criarApp().app;
  const empresaFicticiaId = 'empresa-ficticia-guias-001';

  it('CA-1: prepara guia para conferência marcada como não transmitida', async () => {
    const resposta = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/guias`)
      .send({ dados: { referencia: 'cenario-ficticio' } });

    expect(resposta.status).toBe(201);
    expect(resposta.body.sucesso).toBe(true);
    expect(resposta.body.dados.statusTransmissao).toBe('NAO_TRANSMITIDA');
    expect(resposta.body.dados.dados).toEqual({
      referencia: 'cenario-ficticio',
    });
  });

  it('CA-2: disponibiliza demonstrativo preparado para conferência', async () => {
    const conteudo = { referencia: 'cenario-ficticio' };
    const resposta = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/demonstrativos`)
      .send({ dados: conteudo });

    expect(resposta.status).toBe(201);
    expect(resposta.body.sucesso).toBe(true);
    expect(resposta.body.dados.dados).toEqual(conteudo);
  });

  it('CA-3: não transmite automaticamente nem indica a guia como transmitida', async () => {
    const resposta = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/guias`)
      .send({
        dados: { referencia: 'cenario-ficticio' },
        statusTransmissao: 'TRANSMITIDA',
      });

    expect(resposta.status).toBe(201);
    expect(resposta.body.dados.statusTransmissao).toBe('NAO_TRANSMITIDA');
  });
});
