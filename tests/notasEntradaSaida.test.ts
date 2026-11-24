import request from 'supertest';
import { criarApp } from '../src/app';
import { InMemoryNotaFiscalRepository } from '../src/repositories/NotaFiscalRepository';

describe('SPEC-3.2: Notas de entrada e saída (RF-017)', () => {
  let app: any;
  let repo: InMemoryNotaFiscalRepository;

  const empresaFicticiaId = 'empresa-ficticia-nf-001';

  beforeEach(async () => {
    const instancia = criarApp();
    app = instancia.app;
    repo = instancia.notaFiscalRepo;
    await repo.limpar();
  });

  /**
   * CA-1: Registro de entrada, saída, serviço e retenções
   */
  it('CA-1: deve registrar notas de entrada, saída e serviço com cálculo de retenções e valor líquido', async () => {
    const resEntrada = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/notas`)
      .send({
        tipo: 'ENTRADA',
        numero: '1001',
        dataEmissao: '2026-11-02',
        competencia: '2026-11',
        participanteNome: 'Fornecedor Alpha Fictício Ltda',
        valorBruto: 2000,
      });
    expect(resEntrada.status).toBe(201);
    expect(resEntrada.body.dados.tipo).toBe('ENTRADA');
    expect(resEntrada.body.dados.valorLiquido).toBe(2000);

    const resSaida = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/notas`)
      .send({
        tipo: 'SAIDA',
        numero: '2001',
        dataEmissao: '2026-11-05',
        competencia: '2026-11',
        participanteNome: 'Cliente Beta Fictício S/A',
        valorBruto: 5000,
      });
    expect(resSaida.status).toBe(201);
    expect(resSaida.body.dados.tipo).toBe('SAIDA');

    const resServico = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/notas`)
      .send({
        tipo: 'SERVICO',
        numero: '3001',
        dataEmissao: '2026-11-10',
        competencia: '2026-11',
        participanteNome: 'Prestador Gama Fictício Ltda',
        valorBruto: 10000,
        retencoes: [
          { tributo: 'ISS', valor: 500 },
          { tributo: 'IRRF', valor: 150 },
        ],
      });
    expect(resServico.status).toBe(201);
    expect(resServico.body.dados.totalRetencoes).toBe(650);
    expect(resServico.body.dados.valorLiquido).toBe(9350);

    const resList = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/fiscal/notas`
    );
    expect(resList.status).toBe(200);
    expect(resList.body.dados).toHaveLength(3);
  });

  /**
   * CA-2: Cancelamento de nota fiscal
   */
  it('CA-2: deve cancelar nota fiscal ativa registrando data e motivo', async () => {
    const resNota = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/notas`)
      .send({
        tipo: 'SAIDA',
        numero: '2002',
        dataEmissao: '2026-11-08',
        competencia: '2026-11',
        participanteNome: 'Cliente Fictício',
        valorBruto: 1500,
      });
    const notaId = resNota.body.dados.id;

    const resCancel = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/notas/${notaId}/cancelar`)
      .send({ data: '2026-11-09', motivo: 'Erro de preenchimento de destinatário' });

    expect(resCancel.status).toBe(200);
    expect(resCancel.body.dados.status).toBe('CANCELADA');
    expect(resCancel.body.dados.cancelamento.motivo).toMatch(/destinatário/i);
  });

  /**
   * CA-3: Devolução e ajustes aplicáveis
   */
  it('CA-3: deve registrar devolução e ajuste aplicável vinculados à nota', async () => {
    const resNota = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/notas`)
      .send({
        tipo: 'ENTRADA',
        numero: '1002',
        dataEmissao: '2026-11-10',
        competencia: '2026-11',
        participanteNome: 'Fornecedor Fictício',
        valorBruto: 1000,
      });
    const notaId = resNota.body.dados.id;

    // Ajuste aplicável
    const resAjuste = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/notas/${notaId}/ajustes`)
      .send({
        data: '2026-11-12',
        tipo: 'REDUCAO',
        descricao: 'Abatimento comercial em nota',
        valor: 100,
      });
    expect(resAjuste.status).toBe(200);
    expect(resAjuste.body.dados.valorAjustes).toBe(-100);
    expect(resAjuste.body.dados.ajustes).toHaveLength(1);

    // Devolução parcial (400) e depois complementar (600) -> status DEVOLVIDA
    const resDev1 = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/notas/${notaId}/devolucoes`)
      .send({
        data: '2026-11-14',
        valorDevolvido: 400,
        motivo: 'Mercadoria avariada',
        documentoReferencia: 'NF-DEV-01',
      });
    expect(resDev1.status).toBe(200);
    expect(resDev1.body.dados.totalDevolvido).toBe(400);
    expect(resDev1.body.dados.status).toBe('ATIVA');

    const resDev2 = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/notas/${notaId}/devolucoes`)
      .send({
        data: '2026-11-15',
        valorDevolvido: 600,
        motivo: 'Devolução do saldo restante',
        documentoReferencia: 'NF-DEV-02',
      });
    expect(resDev2.status).toBe(200);
    expect(resDev2.body.dados.totalDevolvido).toBe(1000);
    expect(resDev2.body.dados.status).toBe('DEVOLVIDA');
  });

  /**
   * CA-4: Validações e bloqueios
   */
  it('CA-4: deve recusar retenções > bruto, devolução excedente e operações em nota cancelada', async () => {
    const resRetMaior = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/notas`)
      .send({
        tipo: 'SERVICO',
        numero: '3009',
        dataEmissao: '2026-11-10',
        competencia: '2026-11',
        participanteNome: 'Prestador Fictício',
        valorBruto: 500,
        retencoes: [{ tributo: 'ISS', valor: 600 }],
      });
    expect(resRetMaior.status).toBe(400);

    const resNota = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/notas`)
      .send({
        tipo: 'SAIDA',
        numero: '2009',
        dataEmissao: '2026-11-10',
        competencia: '2026-11',
        participanteNome: 'Cliente Fictício',
        valorBruto: 500,
      });
    const notaId = resNota.body.dados.id;

    // Devolução excedente -> 400
    const resDevExcesso = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/notas/${notaId}/devolucoes`)
      .send({
        data: '2026-11-11',
        valorDevolvido: 700,
        motivo: 'Excesso',
      });
    expect(resDevExcesso.status).toBe(400);

    // Cancela a nota e tenta devolver -> 400
    await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/notas/${notaId}/cancelar`)
      .send({ data: '2026-11-12', motivo: 'Cancelamento' });

    const resDevCancelada = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/notas/${notaId}/devolucoes`)
      .send({
        data: '2026-11-13',
        valorDevolvido: 100,
        motivo: 'Tentativa em cancelada',
      });
    expect(resDevCancelada.status).toBe(400);
  });
});
