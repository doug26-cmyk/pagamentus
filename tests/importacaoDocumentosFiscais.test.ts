import * as crypto from 'crypto';
import request from 'supertest';
import { criarApp } from '../src/app';
import { InMemoryDocumentoFiscalImportadoRepository } from '../src/repositories/DocumentoFiscalImportadoRepository';

describe('SPEC-3.1: Importação de documentos fiscais (RF-016)', () => {
  let app: any;
  let repo: InMemoryDocumentoFiscalImportadoRepository;

  const empresaFicticiaId = 'empresa-ficticia-fis-001';
  const xmlOriginalFicticio =
    '<?xml version="1.0" encoding="UTF-8"?>\n<nfeProc><NFe><infNFe Id="NFe00000000000000000000000000000000000000000001"><ide><nNF>101</nNF></ide></infNFe></NFe></nfeProc>\n';

  beforeEach(async () => {
    const instancia = criarApp();
    app = instancia.app;
    repo = instancia.documentoFiscalImportadoRepo;
    await repo.limpar();
  });

  /**
   * CA-1: Importação preservando o original e calculando hash SHA-256
   */
  it('CA-1: deve importar documento fiscal preservando o conteúdo original e gravando o hash SHA-256', async () => {
    const hashEsperado = crypto
      .createHash('sha256')
      .update(xmlOriginalFicticio, 'utf8')
      .digest('hex');

    const res = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/documentos/importar`)
      .send({
        nomeArquivo: 'nfe-101.xml',
        tipoDocumento: 'NFE',
        sistemaAutorizadoOrigem: 'Emissor Fiscal Autorizado Fictício',
        chaveAcesso: '00000000000000000000000000000000000000000001',
        conteudoOriginal: xmlOriginalFicticio,
      });

    expect(res.status).toBe(201);
    expect(res.body.dados.empresaId).toBe(empresaFicticiaId);
    expect(res.body.dados.conteudoOriginal).toBe(xmlOriginalFicticio);
    expect(res.body.dados.hashSha256).toBe(hashEsperado);
  });

  /**
   * CA-2: Consulta do original e verificação de integridade (integro: true)
   */
  it('CA-2: deve retornar o documento original intacto e comprovar sua integridade via hash', async () => {
    const resImport = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/documentos/importar`)
      .send({
        nomeArquivo: 'nfse-202.xml',
        tipoDocumento: 'NFSE',
        sistemaAutorizadoOrigem: 'Prefeitura Fictícia WebService',
        conteudoOriginal: '<CompNfse><Nfse><Numero>202</Numero></Nfse></CompNfse>',
      });
    const docId = resImport.body.dados.id;

    const resGet = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/fiscal/documentos/${docId}`
    );
    expect(resGet.status).toBe(200);
    expect(resGet.body.dados.conteudoOriginal).toBe(
      '<CompNfse><Nfse><Numero>202</Numero></Nfse></CompNfse>'
    );

    const resIntegridade = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/fiscal/documentos/${docId}/integridade`
    );
    expect(resIntegridade.status).toBe(200);
    expect(resIntegridade.body.dados.integro).toBe(true);
    expect(resIntegridade.body.dados.hashRecalculado).toBe(
      resIntegridade.body.dados.hashArmazenado
    );
  });

  /**
   * CA-3: Detecção de divergência/adulteração de integridade (integro: false)
   */
  it('CA-3: deve sinalizar integro: false quando o hash esperado divergir ou o conteúdo for alterado', async () => {
    const resImport = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/documentos/importar`)
      .send({
        nomeArquivo: 'sped-fiscal.txt',
        tipoDocumento: 'ARQUIVO_FISCAL',
        sistemaAutorizadoOrigem: 'Sistema Autorizado Fictício',
        conteudoOriginal: '|0000|018|0|01112026|30112026|EMPRESA FICTICIA|',
      });
    const docId = resImport.body.dados.id;

    const resDivergente = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/fiscal/documentos/${docId}/integridade?hashEsperado=0000000000000000000000000000000000000000000000000000000000000000`
    );
    expect(resDivergente.status).toBe(200);
    expect(resDivergente.body.dados.integro).toBe(false);
  });

  /**
   * CA-4: Validações de entrada obrigatória
   */
  it('CA-4: deve recusar importação com conteúdo vazio, tipo inválido ou origem ausente', async () => {
    const resVazio = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/documentos/importar`)
      .send({
        nomeArquivo: 'vazio.xml',
        tipoDocumento: 'NFE',
        sistemaAutorizadoOrigem: 'Sistema Fictício',
        conteudoOriginal: '',
      });
    expect(resVazio.status).toBe(400);

    const resTipoInvalido = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/documentos/importar`)
      .send({
        nomeArquivo: 'doc.xml',
        tipoDocumento: 'INVALIDO',
        sistemaAutorizadoOrigem: 'Sistema Fictício',
        conteudoOriginal: '<xml/>',
      });
    expect(resTipoInvalido.status).toBe(400);

    const resSemOrigem = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/fiscal/documentos/importar`)
      .send({
        nomeArquivo: 'doc.xml',
        tipoDocumento: 'NFE',
        sistemaAutorizadoOrigem: '',
        conteudoOriginal: '<xml/>',
      });
    expect(resSemOrigem.status).toBe(400);
  });
});
