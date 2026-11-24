import request from 'supertest';
import { criarApp } from '../src/app';
import { InMemoryCredencialTokenIntegracaoRepository } from '../src/repositories/CredencialTokenIntegracaoRepository';

describe('SPEC-1.10: Credenciais e tokens de integração (RF-076)', () => {
  let app: any;
  let repo: InMemoryCredencialTokenIntegracaoRepository;

  const organizacaoFicticiaId = 'org-ficticia-integracao-001';

  beforeEach(async () => {
    const instancia = criarApp();
    app = instancia.app;
    repo = instancia.credencialTokenRepo;
    await repo.limpar();
  });

  /**
   * CA-1: Dada a configuração de uma integração,
   * quando uma credencial secreta for salva,
   * então ela deve ser armazenada de forma protegida (criptografada/hasheada)
   * e nunca retornar em texto aberto nas consultas de configuração (RF-076).
   */
  describe('CA-1: Armazenamento protegido de credenciais de integração', () => {
    it('deve cifrar a credencial secreta no repositório e retornar apenas versão mascarada nas consultas', async () => {
      const segredoFicticio = 'segredo_integracao_ficticio_998877';

      const criacao = await request(app).post('/api/integracoes/credenciais').send({
        organizacaoId: organizacaoFicticiaId,
        nomeIntegracao: 'Integração Fiscal Fictícia',
        provedor: 'PROVEDOR_MOCK_SANDBOX',
        credencialSecreta: segredoFicticio,
        escoposPermitidos: ['fiscal:nfe:importar', 'contabil:lancamento:exportar'],
      });

      expect(criacao.status).toBe(201);
      expect(criacao.body.sucesso).toBe(true);
      // Não retorna segredo em texto aberto nem o valor cifrado na API
      expect(criacao.body.dados.credencialSecreta).toBeUndefined();
      expect(criacao.body.dados.credencialSecretaCifrada).toBeUndefined();
      expect(criacao.body.dados.credencialMascarada).toBe('********8877');

      // Verifica no repositório bruto que o valor salvo está criptografado (AES-256-GCM)
      const credencialId = criacao.body.dados.id;
      const bruto = await repo.buscarCredencialPorId(credencialId);
      expect(bruto).not.toBeNull();
      expect(bruto!.credencialSecretaCifrada).not.toContain(segredoFicticio);
      expect(bruto!.credencialSecretaCifrada.split(':')).toHaveLength(3);

      // Listagem pública também oculta o segredo
      const listagem = await request(app).get(
        `/api/integracoes/credenciais?organizacaoId=${organizacaoFicticiaId}`
      );
      expect(listagem.status).toBe(200);
      expect(listagem.body.dados[0].credencialMascarada).toBe('********8877');
      expect(listagem.body.dados[0].credencialSecretaCifrada).toBeUndefined();
    });
  });

  /**
   * CA-2: Dado um token de integração emitido com escopo mínimo específico,
   * quando utilizado para acessar uma operação dentro do seu escopo, então o acesso deve ser permitido;
   * quando utilizado para uma operação fora do seu escopo, então o acesso deve ser negado (RF-076).
   */
  describe('CA-2: Emissão e validação de token de integração com escopo mínimo', () => {
    it('deve permitir uso dentro do escopo concedido e negar uso fora do escopo mínimo', async () => {
      const credRes = await request(app).post('/api/integracoes/credenciais').send({
        organizacaoId: organizacaoFicticiaId,
        nomeIntegracao: 'Conector Contábil Fictício',
        provedor: 'ERP_MOCK',
        credencialSecreta: 'chave_ficticia_erp_123456',
        escoposPermitidos: ['fiscal:nfe:importar', 'contabil:extrato:importar'],
      });
      const credencialId = credRes.body.dados.id;

      // Emite token restrito APENAS ao escopo 'fiscal:nfe:importar'
      const tokenRes = await request(app).post('/api/integracoes/tokens').send({
        organizacaoId: organizacaoFicticiaId,
        credencialId,
        nome: 'Token Importador NFe',
        escopos: ['fiscal:nfe:importar'],
      });

      expect(tokenRes.status).toBe(201);
      const tokenBruto = tokenRes.body.dados.tokenBruto;
      expect(tokenBruto).toMatch(/^int_/);

      // 1. Uso dentro do escopo autorizado ('fiscal:nfe:importar') -> 200 Permitido
      const usoAutorizado = await request(app)
        .post('/api/integracoes/validar-uso')
        .set('Authorization', `Bearer ${tokenBruto}`)
        .send({ escopoExigido: 'fiscal:nfe:importar' });
      expect(usoAutorizado.status).toBe(200);
      expect(usoAutorizado.body.sucesso).toBe(true);

      // 2. Uso fora do escopo ('folha:esocial:enviar') -> 403 Negado
      const usoForaDoEscopo = await request(app)
        .post('/api/integracoes/validar-uso')
        .set('Authorization', `Bearer ${tokenBruto}`)
        .send({ escopoExigido: 'folha:esocial:enviar' });
      expect(usoForaDoEscopo.status).toBe(403);
      expect(usoForaDoEscopo.body.erro).toMatch(/escopo mínimo exigido/i);
    });
  });

  /**
   * CA-3: Dado um token de integração ativo,
   * quando for acionada sua rotação ou revogação,
   * então o token anterior deve ser invalidado imediatamente e recusado em novas requisições (RF-076).
   */
  describe('CA-3: Rotação e revogação imediata de tokens de integração', () => {
    it('deve invalidar o token antigo ao rotacionar e invalidar o novo token ao revogar', async () => {
      const credRes = await request(app).post('/api/integracoes/credenciais').send({
        organizacaoId: organizacaoFicticiaId,
        nomeIntegracao: 'Conector Bancário Fictício',
        provedor: 'BANCO_MOCK',
        credencialSecreta: 'segredo_banco_ficticio_001',
        escoposPermitidos: ['financeiro:extrato:sincronizar'],
      });
      const credencialId = credRes.body.dados.id;

      const emissaoInicial = await request(app).post('/api/integracoes/tokens').send({
        organizacaoId: organizacaoFicticiaId,
        credencialId,
        nome: 'Token Sincronização Bancária',
        escopos: ['financeiro:extrato:sincronizar'],
      });
      const tokenId1 = emissaoInicial.body.dados.id;
      const tokenBruto1 = emissaoInicial.body.dados.tokenBruto;

      // Rotaciona o token 1 -> invalida token 1 e retorna token 2
      const rotacaoRes = await request(app).post(
        `/api/integracoes/tokens/${tokenId1}/rotacionar`
      );
      expect(rotacaoRes.status).toBe(200);
      const tokenId2 = rotacaoRes.body.dados.id;
      const tokenBruto2 = rotacaoRes.body.dados.tokenBruto;
      expect(tokenBruto2).not.toBe(tokenBruto1);

      // Tentativa de usar o token 1 (anterior à rotação) -> recusado imediatamente (401)
      const usoTokenAntigo = await request(app)
        .post('/api/integracoes/validar-uso')
        .set('Authorization', `Bearer ${tokenBruto1}`)
        .send({ escopoExigido: 'financeiro:extrato:sincronizar' });
      expect(usoTokenAntigo.status).toBe(401);

      // Uso do novo token 2 -> funciona normalmente (200)
      const usoTokenNovo = await request(app)
        .post('/api/integracoes/validar-uso')
        .set('Authorization', `Bearer ${tokenBruto2}`)
        .send({ escopoExigido: 'financeiro:extrato:sincronizar' });
      expect(usoTokenNovo.status).toBe(200);

      // Revoga o token 2
      const revogacaoRes = await request(app).delete(`/api/integracoes/tokens/${tokenId2}`);
      expect(revogacaoRes.status).toBe(200);
      expect(revogacaoRes.body.dados.ativo).toBe(false);

      // Uso do token 2 após revogação -> recusado imediatamente (401)
      const usoAposRevogacao = await request(app)
        .post('/api/integracoes/validar-uso')
        .set('Authorization', `Bearer ${tokenBruto2}`)
        .send({ escopoExigido: 'financeiro:extrato:sincronizar' });
      expect(usoAposRevogacao.status).toBe(401);
    });
  });

  /**
   * CA-4: Dada a criação de uma credencial ou token de integração,
   * quando não for informado ao menos um escopo específico ou for informado escopo vazio/irrestrito,
   * então o sistema deve recusar a configuração (RF-076).
   */
  describe('CA-4: Recusa de escopo vazio ou curinga irrestrito', () => {
    it('deve recusar configuração com lista de escopos vazia ou com escopo curinga (*)', async () => {
      // Escopo vazio
      const semEscopo = await request(app).post('/api/integracoes/credenciais').send({
        organizacaoId: organizacaoFicticiaId,
        nomeIntegracao: 'Integração Sem Escopo',
        provedor: 'MOCK',
        credencialSecreta: 'segredo_ficticio_1234',
        escoposPermitidos: [],
      });
      expect(semEscopo.status).toBe(400);
      expect(semEscopo.body.erro).toMatch(/Escopo mínimo obrigatório/i);

      // Escopo curinga irrestrito '*'
      const escopoCuringa = await request(app).post('/api/integracoes/credenciais').send({
        organizacaoId: organizacaoFicticiaId,
        nomeIntegracao: 'Integração Curinga',
        provedor: 'MOCK',
        credencialSecreta: 'segredo_ficticio_1234',
        escoposPermitidos: ['*'],
      });
      expect(escopoCuringa.status).toBe(400);
      expect(escopoCuringa.body.erro).toMatch(/Escopo irrestrito/i);
    });
  });
});
