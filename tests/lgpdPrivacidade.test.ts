import * as fs from 'fs';
import * as path from 'path';
import request from 'supertest';
import { criarApp } from '../src/app';
import { InMemoryLgpdPrivacidadeRepository } from '../src/repositories/LgpdPrivacidadeRepository';

describe('SPEC-1.11: Privacidade e LGPD (RNF-002)', () => {
  let app: any;
  let repo: InMemoryLgpdPrivacidadeRepository;

  const organizacaoFicticiaId = 'org-ficticia-lgpd-001';
  const usuarioResponsavelFicticioId = 'usuario-dpo-ficticio-001';

  beforeEach(async () => {
    const instancia = criarApp();
    app = instancia.app;
    repo = instancia.lgpdRepo;
    await repo.limpar();
  });

  /**
   * CA-1: Dado o repositório do projeto,
   * quando inspecionada a documentação de privacidade/LGPD,
   * então deve existir documento formal definindo finalidade, base legal, minimização,
   * direitos dos titulares, diretrizes de contratos com operadores, retenção e descarte (RNF-002).
   */
  describe('CA-1: Documento formal de privacidade e governança LGPD', () => {
    it('deve existir o documento LGPD contendo todas as seções exigidas pelo RNF-002', () => {
      const caminhoDoc = path.join(
        __dirname,
        '..',
        'docs',
        'privacidade',
        'LGPD-politica-e-procedimentos.md'
      );

      expect(fs.existsSync(caminhoDoc)).toBe(true);
      const conteudo = fs.readFileSync(caminhoDoc, 'utf-8');

      expect(conteudo).toMatch(/Finalidade/i);
      expect(conteudo).toMatch(/Minimização/i);
      expect(conteudo).toMatch(/Bases Legais/i);
      expect(conteudo).toMatch(/Direitos dos Titulares/i);
      expect(conteudo).toMatch(/Fluxo de Pedido do Titular/i);
      expect(conteudo).toMatch(/Contratos com Operadores/i);
      expect(conteudo).toMatch(/Retenção e Descarte/i);
    });
  });

  /**
   * CA-2: Dada a necessidade de atendimento aos direitos dos titulares,
   * quando consultado o fluxo de pedido do titular ou executado o registro de solicitação,
   * então o fluxo deve estar descrito e o sistema deve permitir registrar e atualizar
   * o atendimento da solicitação conforme procedimento aprovado (RNF-002).
   */
  describe('CA-2: Fluxo de solicitação e atendimento de pedido do titular', () => {
    it('deve registrar o pedido do titular com protocolo e atualizar o status até conclusão', async () => {
      // 1. Abertura da solicitação do titular
      const aberturaRes = await request(app)
        .post('/api/lgpd/solicitacoes-titulares')
        .send({
          organizacaoId: organizacaoFicticiaId,
          titularNome: 'Titular Fictício Teste',
          titularContato: 'titular.ficticio@exemplo.local',
          tipoDireito: 'ACESSO',
          descricao: 'Solicito cópia dos meus dados cadastrais tratados pela organização.',
        });

      expect(aberturaRes.status).toBe(201);
      expect(aberturaRes.body.sucesso).toBe(true);
      expect(aberturaRes.body.dados.protocolo).toMatch(/^LGPD-/);
      expect(aberturaRes.body.dados.status).toBe('ABERTA');
      expect(aberturaRes.body.dados.prazoLimite).toBeDefined();

      const solicitacaoId = aberturaRes.body.dados.id;

      // 2. Evolução do atendimento conforme procedimento aprovado (EM_ANALISE -> ATENDIDA)
      const analiseRes = await request(app)
        .patch(`/api/lgpd/solicitacoes-titulares/${solicitacaoId}`)
        .send({ status: 'EM_ANALISE' });
      expect(analiseRes.status).toBe(200);
      expect(analiseRes.body.dados.status).toBe('EM_ANALISE');

      const conclusaoRes = await request(app)
        .patch(`/api/lgpd/solicitacoes-titulares/${solicitacaoId}`)
        .send({
          status: 'ATENDIDA',
          justificativaResposta:
            'Relatório cadastral exportado e entregue ao titular dentro do prazo legal.',
        });

      expect(conclusaoRes.status).toBe(200);
      expect(conclusaoRes.body.dados.status).toBe('ATENDIDA');
      expect(conclusaoRes.body.dados.concluidoEm).not.toBeNull();
    });
  });

  /**
   * CA-3: Dado um incidente envolvendo privacidade ou dados pessoais,
   * quando registrado no sistema, então o incidente deve ser armazenado
   * com data, descrição, severidade e status de tratamento (RNF-002).
   */
  describe('CA-3: Registro e tratamento de incidentes de privacidade', () => {
    it('deve registrar, atualizar e listar incidente de privacidade com data, severidade e status', async () => {
      const registroRes = await request(app)
        .post('/api/lgpd/incidentes')
        .send({
          organizacaoId: organizacaoFicticiaId,
          titulo: 'Tentativa de acesso indevido detectada em ambiente de homologação',
          descricao: 'Identificada tentativa anômala de leitura bloqueada por controle de acesso.',
          dadosAfetados: 'Metadados de sessão (sem exposição de dados reais)',
          severidade: 'MEDIA',
          medidasAdotadas: 'Sessão encerrada e token revogado preventivamente.',
          registradoPorUsuarioId: usuarioResponsavelFicticioId,
        });

      expect(registroRes.status).toBe(201);
      expect(registroRes.body.dados.status).toBe('ABERTO');
      expect(registroRes.body.dados.severidade).toBe('MEDIA');
      expect(registroRes.body.dados.registradoEm).toBeDefined();

      const incidenteId = registroRes.body.dados.id;

      // Atualiza para RESOLVIDO
      const resolucaoRes = await request(app)
        .patch(`/api/lgpd/incidentes/${incidenteId}`)
        .send({
          status: 'RESOLVIDO',
          medidasAdotadas: 'Sessão revogada, logs auditados e incidente encerrado.',
        });
      expect(resolucaoRes.status).toBe(200);
      expect(resolucaoRes.body.dados.status).toBe('RESOLVIDO');
      expect(resolucaoRes.body.dados.resolvidoEm).not.toBeNull();
    });
  });

  /**
   * CA-4: Dado o registro de uma solicitação de titular ou de um incidente de privacidade,
   * quando faltarem campos obrigatórios ou tipo inválido for informado,
   * então o sistema deve recusar o registro (RNF-002).
   */
  describe('CA-4: Validação de campos obrigatórios e tipos permitidos', () => {
    it('deve recusar solicitação ou incidente com dados obrigatórios ausentes ou inválidos', async () => {
      // Solicitação com tipo de direito inválido
      const direitoInvalido = await request(app)
        .post('/api/lgpd/solicitacoes-titulares')
        .send({
          organizacaoId: organizacaoFicticiaId,
          titularNome: 'Titular Teste',
          titularContato: 'titular@exemplo.local',
          tipoDireito: 'DIREITO_INEXISTENTE',
          descricao: 'Descrição válida',
        });
      expect(direitoInvalido.status).toBe(400);

      // Incidente com campos obrigatórios vazios
      const incidenteIncompleto = await request(app)
        .post('/api/lgpd/incidentes')
        .send({
          organizacaoId: organizacaoFicticiaId,
          titulo: '',
          descricao: '',
          dadosAfetados: 'Nenhum',
          severidade: 'ALTA',
          medidasAdotadas: 'Nenhuma',
          registradoPorUsuarioId: usuarioResponsavelFicticioId,
        });
      expect(incidenteIncompleto.status).toBe(400);
    });
  });
});
