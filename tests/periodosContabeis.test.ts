import request from 'supertest';
import { criarApp } from '../src/app';
import { InMemoryAutenticacaoRepository } from '../src/repositories/AutenticacaoRepository';
import { AutenticacaoService } from '../src/services/AutenticacaoService';
import { InMemoryAuditoriaHistoricoRepository } from '../src/repositories/AuditoriaHistoricoRepository';
import { InMemoryPeriodoContabilRepository } from '../src/repositories/PeriodoContabilRepository';
import { InMemoryPlanoContasRepository } from '../src/repositories/PlanoContasRepository';

describe('SPEC-2.5: Períodos contábeis (RF-012, RB-002)', () => {
  let app: any;
  let authRepo: InMemoryAutenticacaoRepository;
  let authService: AutenticacaoService;
  let auditoriaRepo: InMemoryAuditoriaHistoricoRepository;
  let periodoRepo: InMemoryPeriodoContabilRepository;
  let planoContasRepo: InMemoryPlanoContasRepository;

  const empresaFicticiaId = 'empresa-ficticia-periodos-001';
  const competencia = '2026-11';

  let usuarioAutorizadoId: string;
  let usuarioSemPermissaoId: string;
  let contaDebitoId: string;
  let contaCreditoId: string;

  beforeEach(async () => {
    const instancia = criarApp();
    app = instancia.app;
    authRepo = instancia.authRepo;
    authService = instancia.authService;
    auditoriaRepo = instancia.auditoriaRepo;
    periodoRepo = instancia.periodoRepo;
    planoContasRepo = instancia.planoContasRepo;

    await authRepo.limpar();
    await auditoriaRepo.limparParaTeste();
    await periodoRepo.limpar();
    await planoContasRepo.limpar();

    // Cria permissão especial para reabertura de período contábil encerrado
    await authService.criarPermissao({
      chave: 'contabil:periodo:reabrir',
      descricao: 'Permite reabrir períodos contábeis encerrados mediante justificativa',
    });

    const perfilControladoria = await authService.criarPerfil({
      nome: 'Contador Responsável',
      privilegiado: true,
      permissoes: ['contabil:periodo:reabrir'],
    });

    const perfilAssistente = await authService.criarPerfil({
      nome: 'Assistente Contábil',
      privilegiado: false,
      permissoes: [],
    });

    const userAutorizado = await authService.cadastrarUsuario({
      organizacaoId: empresaFicticiaId,
      perfilId: perfilControladoria.id,
      nome: 'Contador Fictício',
      email: 'contador.ficticio@exemplo.local',
      senha: 'SenhaForte@2026',
    });
    usuarioAutorizadoId = userAutorizado.id;

    const userSemPermissao = await authService.cadastrarUsuario({
      organizacaoId: empresaFicticiaId,
      perfilId: perfilAssistente.id,
      nome: 'Assistente Fictício',
      email: 'assistente.ficticio@exemplo.local',
      senha: 'SenhaForte@2026',
    });
    usuarioSemPermissaoId = userSemPermissao.id;

    // Cria duas contas analíticas válidas para testar bloqueio/liberação de lançamento
    const resCaixa = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/plano-contas`)
      .send({
        codigo: '1.1.01.001',
        nome: 'Caixa Geral Fictício',
        nivel: 4,
        tipo: 'ANALITICA',
        natureza: 'DEVEDORA',
        classificacao: 'ATIVO',
      });
    contaDebitoId = resCaixa.body.dados.id;

    const resReceita = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/plano-contas`)
      .send({
        codigo: '3.1.01.001',
        nome: 'Receita de Serviços Fictícia',
        nivel: 4,
        tipo: 'ANALITICA',
        natureza: 'CREDORA',
        classificacao: 'RECEITA',
      });
    contaCreditoId = resReceita.body.dados.id;
  });

  /**
   * CA-1: Dada uma empresa e uma competência, quando o período contábil for criado
   * ou transicionado entre ABERTO, EM_FECHAMENTO e ENCERRADO,
   * então o sistema deve persistir e consultar corretamente o status do período (RF-012).
   */
  describe('CA-1: Ciclo de vida ABERTO -> EM_FECHAMENTO -> ENCERRADO', () => {
    it('deve transicionar o período contábil entre ABERTO, EM_FECHAMENTO e ENCERRADO', async () => {
      // 1. Inicia fechamento -> EM_FECHAMENTO
      const resFechamento = await request(app)
        .post(`/api/empresas/${empresaFicticiaId}/periodos/${competencia}/fechamento`)
        .send({ usuarioId: usuarioAutorizadoId });

      expect(resFechamento.status).toBe(200);
      expect(resFechamento.body.dados.status).toBe('EM_FECHAMENTO');

      // 2. Encerra período -> ENCERRADO
      const resEncerrar = await request(app)
        .post(`/api/empresas/${empresaFicticiaId}/periodos/${competencia}/encerrar`)
        .send({ usuarioId: usuarioAutorizadoId });

      expect(resEncerrar.status).toBe(200);
      expect(resEncerrar.body.dados.status).toBe('ENCERRADO');

      // 3. Lista períodos da empresa
      const listagem = await request(app).get(
        `/api/empresas/${empresaFicticiaId}/periodos`
      );
      expect(listagem.status).toBe(200);
      expect(listagem.body.dados).toHaveLength(1);
      expect(listagem.body.dados[0].status).toBe('ENCERRADO');
    });
  });

  /**
   * CA-2: Dado um período contábil com status ENCERRADO,
   * quando houver tentativa de incluir ou alterar lançamento contábil naquela competência,
   * então o sistema deve bloquear a operação (RF-012, RB-002).
   */
  describe('CA-2: Bloqueio de lançamento em período encerrado', () => {
    it('deve bloquear a gravação de lançamento contábil quando o período estiver ENCERRADO', async () => {
      await request(app)
        .post(`/api/empresas/${empresaFicticiaId}/periodos/${competencia}/encerrar`)
        .send({ usuarioId: usuarioAutorizadoId });

      const lancamentoBloqueado = await request(app)
        .post(`/api/empresas/${empresaFicticiaId}/lancamentos`)
        .send({
          dataLancamento: '2026-11-18',
          competencia,
          historico: 'Tentativa em período encerrado',
          documentoOrigem: 'DOC-001',
          partidas: [
            { contaId: contaDebitoId, tipo: 'DEBITO', valor: 500 },
            { contaId: contaCreditoId, tipo: 'CREDITO', valor: 500 },
          ],
        });

      expect(lancamentoBloqueado.status).toBe(400);
      expect(lancamentoBloqueado.body.mensagem).toMatch(/encerrado/i);
    });
  });

  /**
   * CA-3: Dado um período contábil ENCERRADO,
   * quando um usuário sem a permissão especial ('contabil:periodo:reabrir')
   * ou sem informar justificativa tentar reabri-lo,
   * então o sistema deve recusar a reabertura mantendo o período ENCERRADO (RF-012, RB-002).
   */
  describe('CA-3: Recusa de reabertura sem permissão especial ou sem justificativa', () => {
    it('deve recusar reabertura por usuário sem permissão (403) ou sem justificativa (400)', async () => {
      await request(app)
        .post(`/api/empresas/${empresaFicticiaId}/periodos/${competencia}/encerrar`)
        .send({ usuarioId: usuarioAutorizadoId });

      // 1. Usuário sem permissão -> 403 Forbidden
      const semPermissaoRes = await request(app)
        .post(`/api/empresas/${empresaFicticiaId}/periodos/${competencia}/reabrir`)
        .send({
          usuarioId: usuarioSemPermissaoId,
          justificativa: 'Tentativa sem permissão',
        });
      expect(semPermissaoRes.status).toBe(403);
      expect(semPermissaoRes.body.erro).toMatch(/Acesso negado/i);

      // 2. Usuário autorizado mas sem justificativa -> 400 Bad Request
      const semJustificativaRes = await request(app)
        .post(`/api/empresas/${empresaFicticiaId}/periodos/${competencia}/reabrir`)
        .send({
          usuarioId: usuarioAutorizadoId,
          justificativa: '   ',
        });
      expect(semJustificativaRes.status).toBe(400);
      expect(semJustificativaRes.body.erro).toMatch(/Justificativa obrigatória/i);

      // Confirma que o período continua ENCERRADO
      const statusAtual = await periodoRepo.obterStatus(empresaFicticiaId, competencia);
      expect(statusAtual).toBe('ENCERRADO');
    });
  });

  /**
   * CA-4: Dado um período contábil ENCERRADO,
   * quando um usuário com permissão especial informar uma justificativa válida para reabertura,
   * então o sistema deve reabrir o período para ABERTO e registrar a justificativa e o usuário
   * responsável na trilha de auditoria (RF-012, RB-002).
   */
  describe('CA-4: Reabertura autorizada com justificativa e registro na trilha de auditoria', () => {
    it('deve reabrir o período para ABERTO, gravar log de auditoria e permitir novo lançamento', async () => {
      await request(app)
        .post(`/api/empresas/${empresaFicticiaId}/periodos/${competencia}/encerrar`)
        .send({ usuarioId: usuarioAutorizadoId });

      // Reabre com usuário autorizado e justificativa válida
      const reaberturaRes = await request(app)
        .post(`/api/empresas/${empresaFicticiaId}/periodos/${competencia}/reabrir`)
        .send({
          usuarioId: usuarioAutorizadoId,
          justificativa: 'Ajuste de lançamento de provisão contábil aprovado pela diretoria.',
        });

      expect(reaberturaRes.status).toBe(200);
      expect(reaberturaRes.body.dados.status).toBe('ABERTO');

      // Verifica registro automático na trilha de auditoria (RB-002)
      const logsAuditoria = await auditoriaRepo.listarPorObjetoId(
        `${empresaFicticiaId}:${competencia}`
      );
      expect(logsAuditoria).toHaveLength(1);
      expect(logsAuditoria[0].usuarioId).toBe(usuarioAutorizadoId);
      expect(logsAuditoria[0].justificativa).toMatch(/provisão contábil/i);
      expect(logsAuditoria[0].dadosAnteriores).toEqual({ status: 'ENCERRADO' });
      expect(logsAuditoria[0].dadosNovos).toEqual({ status: 'ABERTO' });

      // Novo lançamento no período reaberto deve ser aceito (201)
      const novoLancamento = await request(app)
        .post(`/api/empresas/${empresaFicticiaId}/lancamentos`)
        .send({
          dataLancamento: '2026-11-18',
          competencia,
          historico: 'Lançamento após reabertura autorizada',
          documentoOrigem: 'DOC-002',
          partidas: [
            { contaId: contaDebitoId, tipo: 'DEBITO', valor: 500 },
            { contaId: contaCreditoId, tipo: 'CREDITO', valor: 500 },
          ],
        });
      expect(novoLancamento.status).toBe(201);
    });
  });
});
