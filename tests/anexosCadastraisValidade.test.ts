import request from 'supertest';
import { criarApp } from '../src/app';
import { InMemoryAnexoCadastralRepository } from '../src/repositories/AnexoCadastralRepository';

describe('SPEC-1.8: Anexos cadastrais com validade (RF-003)', () => {
  let app: any;
  let repo: InMemoryAnexoCadastralRepository;

  const organizacaoFicticiaId = 'org-ficticia-anexos-001';
  const cadastroFicticioId = 'cadastro-ficticio-pj-001';
  const dataReferenciaTeste = '2026-11-18';

  beforeEach(async () => {
    const instancia = criarApp();
    app = instancia.app;
    repo = instancia.anexoCadastralRepo;
    await repo.limpar();
  });

  /**
   * CA-1: Dado um cadastro existente,
   * quando for anexado um contrato social, procuração, documento cadastral,
   * certificado ou outro arquivo com seus metadados e data de validade,
   * então o anexo deve ser persistido com sucesso vinculado ao cadastro (RF-003).
   */
  describe('CA-1: Anexação de contrato social, procuração, documento cadastral, certificado e outros arquivos', () => {
    it('deve anexar e listar os documentos cadastrais vinculados ao cadastro com sucesso', async () => {
      // 1. Contrato Social (sem data de vencimento ou vigente)
      const resContrato = await request(app)
        .post(`/api/cadastros/${cadastroFicticioId}/anexos`)
        .send({
          organizacaoId: organizacaoFicticiaId,
          tipoAnexo: 'CONTRATO_SOCIAL',
          nomeArquivo: 'contrato_social_ficticio_consolidado.pdf',
          mimeType: 'application/pdf',
          tamanhoBytes: 204800,
          dataEmissao: '2025-01-10',
          dataValidade: null,
          dataReferencia: dataReferenciaTeste,
        });
      expect(resContrato.status).toBe(201);
      expect(resContrato.body.dados.tipoAnexo).toBe('CONTRATO_SOCIAL');
      expect(resContrato.body.dados.statusValidade).toBe('SEM_VALIDADE');

      // 2. Procuração com validade futura distante (VIGENTE)
      const resProcuracao = await request(app)
        .post(`/api/cadastros/${cadastroFicticioId}/anexos`)
        .send({
          organizacaoId: organizacaoFicticiaId,
          tipoAnexo: 'PROCURACAO',
          nomeArquivo: 'procuracao_eletronica_ficticia.pdf',
          mimeType: 'application/pdf',
          tamanhoBytes: 102400,
          dataEmissao: '2026-01-01',
          dataValidade: '2027-06-30',
          dataReferencia: dataReferenciaTeste,
        });
      expect(resProcuracao.status).toBe(201);
      expect(resProcuracao.body.dados.statusValidade).toBe('VIGENTE');

      // Consulta anexos do cadastro
      const listagem = await request(app).get(
        `/api/cadastros/${cadastroFicticioId}/anexos?dataReferencia=${dataReferenciaTeste}`
      );
      expect(listagem.status).toBe(200);
      expect(listagem.body.dados).toHaveLength(2);
    });
  });

  /**
   * CA-2: Dado um anexo cadastrado cuja data de validade seja anterior à data de referência atual,
   * quando consultados os anexos ou os alertas de validade,
   * então o sistema deve classificar e alertar o documento como VENCIDO (RF-003).
   */
  describe('CA-2: Classificação e alerta de documento VENCIDO', () => {
    it('deve classificar e retornar alerta para certificado com data de validade expirada', async () => {
      const resCertificadoVencido = await request(app)
        .post(`/api/cadastros/${cadastroFicticioId}/anexos`)
        .send({
          organizacaoId: organizacaoFicticiaId,
          tipoAnexo: 'CERTIFICADO',
          nomeArquivo: 'certificado_digital_ficticio_expirado.pfx',
          mimeType: 'application/x-pkcs12',
          tamanhoBytes: 4096,
          dataEmissao: '2025-10-01',
          dataValidade: '2026-10-01', // Anterior a 2026-11-18
          dataReferencia: dataReferenciaTeste,
        });

      expect(resCertificadoVencido.status).toBe(201);
      expect(resCertificadoVencido.body.dados.statusValidade).toBe('VENCIDO');
      expect(resCertificadoVencido.body.dados.alertaMensagem).toMatch(/VENCIDO/i);

      // Consulta painel de alertas
      const alertasRes = await request(app).get(
        `/api/anexos/alertas-validade?organizacaoId=${organizacaoFicticiaId}&dataReferencia=${dataReferenciaTeste}`
      );
      expect(alertasRes.status).toBe(200);
      expect(alertasRes.body.dados).toHaveLength(1);
      expect(alertasRes.body.dados[0].statusValidade).toBe('VENCIDO');
    });
  });

  /**
   * CA-3: Dado um anexo cadastrado cuja data de validade esteja dentro da janela de dias de antecedência
   * em relação à data de referência, quando consultados os anexos ou os alertas de validade,
   * então o sistema deve classificar e alertar o documento como A_VENCER (RF-003).
   */
  describe('CA-3: Classificação e alerta de documento A_VENCER', () => {
    it('deve classificar e retornar alerta para documento que vence nos próximos dias dentro da janela de alerta', async () => {
      const resProcuracaoAVencer = await request(app)
        .post(`/api/cadastros/${cadastroFicticioId}/anexos`)
        .send({
          organizacaoId: organizacaoFicticiaId,
          tipoAnexo: 'PROCURACAO',
          nomeArquivo: 'procuracao_ficticia_proxima_vencimento.pdf',
          dataEmissao: '2026-01-01',
          dataValidade: '2026-11-28', // 10 dias após 2026-11-18 (dentro da janela padrão de 30 dias)
          dataReferencia: dataReferenciaTeste,
        });

      expect(resProcuracaoAVencer.status).toBe(201);
      expect(resProcuracaoAVencer.body.dados.statusValidade).toBe('A_VENCER');
      expect(resProcuracaoAVencer.body.dados.diasParaVencimento).toBe(10);
      expect(resProcuracaoAVencer.body.dados.alertaMensagem).toMatch(/A VENCER/i);

      // Consulta painel de alertas
      const alertasRes = await request(app).get(
        `/api/anexos/alertas-validade?pessoaEmpresaId=${cadastroFicticioId}&dataReferencia=${dataReferenciaTeste}`
      );
      expect(alertasRes.status).toBe(200);
      expect(alertasRes.body.dados).toHaveLength(1);
      expect(alertasRes.body.dados[0].statusValidade).toBe('A_VENCER');
    });
  });

  /**
   * CA-4: Dado o envio de um anexo cadastral,
   * quando faltarem os campos obrigatórios (vínculo cadastral, tipo de documento ou nome do arquivo)
   * ou a data de validade for inválida,
   * então o sistema deve recusar a operação (RF-003).
   */
  describe('CA-4: Validação de campos obrigatórios e consistência das datas do anexo', () => {
    it('deve recusar anexo com tipo inválido, sem nome de arquivo ou com data de validade anterior à emissão', async () => {
      // 1. Tipo inválido
      const tipoInvalido = await request(app)
        .post(`/api/cadastros/${cadastroFicticioId}/anexos`)
        .send({
          organizacaoId: organizacaoFicticiaId,
          tipoAnexo: 'TIPO_INEXISTENTE',
          nomeArquivo: 'arquivo.pdf',
        });
      expect(tipoInvalido.status).toBe(400);

      // 2. Sem nome de arquivo
      const semNome = await request(app)
        .post(`/api/cadastros/${cadastroFicticioId}/anexos`)
        .send({
          organizacaoId: organizacaoFicticiaId,
          tipoAnexo: 'DOCUMENTO_CADASTRAL',
          nomeArquivo: '',
        });
      expect(semNome.status).toBe(400);

      // 3. Data de validade anterior à data de emissão
      const validadeAnteriorEmissao = await request(app)
        .post(`/api/cadastros/${cadastroFicticioId}/anexos`)
        .send({
          organizacaoId: organizacaoFicticiaId,
          tipoAnexo: 'CERTIFICADO',
          nomeArquivo: 'certificado_ficticio.pfx',
          dataEmissao: '2026-06-01',
          dataValidade: '2026-01-01',
        });
      expect(validadeAnteriorEmissao.status).toBe(400);
      expect(validadeAnteriorEmissao.body.erro).toMatch(/anterior à data de emissão/i);
    });
  });
});
