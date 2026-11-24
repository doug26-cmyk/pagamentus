import request from 'supertest';
import { criarApp } from '../src/app';
import { InMemoryDocumentoFiscalImportadoRepository } from '../src/repositories/DocumentoFiscalImportadoRepository';
import { InMemoryNotaFiscalRepository } from '../src/repositories/NotaFiscalRepository';
import { InMemoryValidacaoFiscalRepository } from '../src/repositories/ValidacaoFiscalRepository';

describe('SPEC-3.3: Validação fiscal e duplicidades (RF-018)', () => {
  let app: any;
  let regraRepo: InMemoryValidacaoFiscalRepository;
  let notaRepo: InMemoryNotaFiscalRepository;
  let docRepo: InMemoryDocumentoFiscalImportadoRepository;

  const empresaFicticiaId = 'empresa-ficticia-val-001';

  beforeEach(async () => {
    const instancia = criarApp();
    app = instancia.app;
    regraRepo = instancia.validacaoFiscalRepo;
    notaRepo = instancia.notaFiscalRepo;
    docRepo = instancia.documentoFiscalImportadoRepo;

    await regraRepo.limpar();
    await notaRepo.limpar();
    await docRepo.limpar();
  });

  /**
   * CA-1: Configuração de regras e aprovação de documento válido
   */
  it('CA-1: deve configurar regras fiscais e aprovar documento válido sem duplicidade', async () => {
    const resRegra = await request(app)
      .put(`/api/empresas/${empresaFicticiaId}/fiscal/regras-validacao`)
      .send({
        exigirCoerenciaDataCompetencia: true,
        bloquearDuplicidade: true,
        cfopsPermitidos: ['5102', '6102', '1102'],
        cstsPermitidos: ['00', '102'],
        valorMaximoPermitido: 50000,
      });
    expect(resRegra.status).toBe(200);
    expect(resRegra.body.dados.cfopsPermitidos).toContain('5102');

    const resVal = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/validar-documento`)
      .send({
        tipo: 'SAIDA',
        numero: '5001',
        serie: '1',
        dataEmissao: '2026-11-18',
        competencia: '2026-11',
        valorTotal: 2500,
        participanteNome: 'Cliente Fictício Ltda',
        participanteDocumento: '00000000000100',
        cfop: '5102',
        cst: '00',
      });

    expect(resVal.status).toBe(200);
    expect(resVal.body.dados.valido).toBe(true);
    expect(resVal.body.dados.motivos).toHaveLength(0);
  });

  /**
   * CA-2: Rejeição por campos, datas, valores, participantes ou códigos tributários inválidos
   */
  it('CA-2: deve rejeitar documento com data incoerente, valor inválido, participante inválido e CFOP não permitido informando os motivos', async () => {
    await request(app)
      .put(`/api/empresas/${empresaFicticiaId}/fiscal/regras-validacao`)
      .send({
        cfopsPermitidos: ['5102'],
        cstsPermitidos: ['00'],
      });

    const resVal = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/validar-documento`)
      .send({
        tipo: 'SAIDA',
        numero: '5002',
        dataEmissao: '2026-10-15',
        competencia: '2026-11', // incoerente
        valorTotal: -10, // inválido
        participanteNome: 'Cliente Fictício',
        participanteDocumento: '123', // inválido
        cfop: '5999', // não permitido
        cst: '99', // não permitido
      });

    expect(resVal.status).toBe(422);
    expect(resVal.body.dados.valido).toBe(false);
    const codigos = resVal.body.dados.motivos.map((m: any) => m.codigoRegra);
    expect(codigos).toContain('DATA_INCOERENTE_COMPETENCIA');
    expect(codigos).toContain('VALOR_INVALIDO');
    expect(codigos).toContain('PARTICIPANTE_DOCUMENTO_INVALIDO');
    expect(codigos).toContain('CFOP_NAO_PERMITIDO');
    expect(codigos).toContain('CST_NAO_PERMITIDO');
  });

  /**
   * CA-3: Rejeição por duplicidade com o motivo
   */
  it('CA-3: deve rejeitar documento duplicado por chave de acesso ou por nota já registrada informando o motivo', async () => {
    // Registra nota prévia e documento importado prévio
    await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/notas`)
      .send({
        tipo: 'SAIDA',
        numero: '7001',
        serie: '1',
        dataEmissao: '2026-11-10',
        competencia: '2026-11',
        participanteNome: 'Cliente Duplicado Fictício',
        valorBruto: 1000,
      });

    await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/documentos/importar`)
      .send({
        nomeArquivo: 'nfe-7001.xml',
        tipoDocumento: 'NFE',
        sistemaAutorizadoOrigem: 'Emissor Fictício',
        chaveAcesso: '99990000000000000000000000000000000000000001',
        conteudoOriginal: '<xml/>',
      });

    const resDup = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/validar-documento`)
      .send({
        tipo: 'SAIDA',
        numero: '7001',
        serie: '1',
        chaveAcesso: '99990000000000000000000000000000000000000001',
        dataEmissao: '2026-11-10',
        competencia: '2026-11',
        valorTotal: 1000,
        participanteNome: 'Cliente Duplicado Fictício',
        participanteDocumento: '00000000000100',
        cfop: '5102',
        cst: '00',
      });

    expect(resDup.status).toBe(422);
    expect(resDup.body.dados.valido).toBe(false);
    const codigos = resDup.body.dados.motivos.map((m: any) => m.codigoRegra);
    expect(codigos).toContain('DOCUMENTO_DUPLICADO_CHAVE');
    expect(codigos).toContain('DOCUMENTO_DUPLICADO_NOTA');
  });

  /**
   * CA-4: Validação da configuração de regras
   */
  it('CA-4: deve recusar configuração de regra fiscal com CFOP inválido ou valorMaximo <= 0', async () => {
    const resCfopInv = await request(app)
      .put(`/api/empresas/${empresaFicticiaId}/fiscal/regras-validacao`)
      .send({ cfopsPermitidos: ['ABC'] });
    expect(resCfopInv.status).toBe(400);

    const resValInv = await request(app)
      .put(`/api/empresas/${empresaFicticiaId}/fiscal/regras-validacao`)
      .send({ valorMaximoPermitido: 0 });
    expect(resValInv.status).toBe(400);
  });
});
