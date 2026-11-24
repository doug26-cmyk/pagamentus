import request from 'supertest';
import { criarApp } from '../src/app';
import { InMemoryAuditoriaHistoricoRepository } from '../src/repositories/AuditoriaHistoricoRepository';
import { AuditoriaHistoricoService } from '../src/services/AuditoriaHistoricoService';

describe('SPEC-1.9: Auditoria e histórico cadastral (RF-015, RF-004, RNF-004, RB-007)', () => {
  let app: any;
  let repo: InMemoryAuditoriaHistoricoRepository;
  let service: AuditoriaHistoricoService;

  const organizacaoFicticiaId = 'org-ficticia-auditoria-001';
  const usuarioResponsavelFicticioId = 'usuario-ficticio-auditor-001';
  const objetoCadastralFicticioId = 'empresa-ficticia-001';

  beforeEach(async () => {
    const instancia = criarApp();
    app = instancia.app;
    repo = instancia.auditoriaRepo;
    service = instancia.auditoriaService;
    await repo.limparParaTeste();
  });

  /**
   * CA-1: Dada a execução de uma operação de inclusão, alteração, exclusão lógica,
   * estorno ou aprovação, quando a ação for registrada,
   * então o sistema deve gerar um log de auditoria contendo usuário responsável,
   * data/horário, objeto, operação, resultado e justificativa (RF-015, RF-004, RNF-004).
   */
  describe('CA-1: Registro de auditoria para inclusão, alteração, exclusão lógica, estorno e aprovação', () => {
    it('deve gerar logs de auditoria completos para todas as operações exigidas', async () => {
      const operacoes = [
        'INCLUSAO',
        'ALTERACAO',
        'EXCLUSAO_LOGICA',
        'ESTORNO',
        'APROVACAO',
      ] as const;

      for (const operacao of operacoes) {
        const res = await request(app).post('/api/auditoria/logs').send({
          organizacaoId: organizacaoFicticiaId,
          usuarioId: usuarioResponsavelFicticioId,
          objetoTipo: 'CADASTRO_EMPRESA',
          objetoId: `${objetoCadastralFicticioId}-${operacao}`,
          operacao,
          resultado: 'SUCESSO',
          justificativa: `Execução fictícia de teste da operação ${operacao}`,
          dadosAnteriores: operacao === 'INCLUSAO' ? null : { status: 'ANTERIOR' },
          dadosNovos: { status: operacao },
        });

        expect(res.status).toBe(201);
        expect(res.body.sucesso).toBe(true);
        expect(res.body.dados.usuarioId).toBe(usuarioResponsavelFicticioId);
        expect(res.body.dados.operacao).toBe(operacao);
        expect(res.body.dados.resultado).toBe('SUCESSO');
        expect(res.body.dados.justificativa).toContain(operacao);
        expect(res.body.dados.dataHora).toBeDefined();
        expect(res.body.dados.hashIntegridade).toHaveLength(64);
      }

      const listagem = await request(app).get(
        `/api/auditoria/logs?organizacaoId=${organizacaoFicticiaId}`
      );
      expect(listagem.status).toBe(200);
      expect(listagem.body.dados).toHaveLength(5);
    });
  });

  /**
   * CA-2: Dado um cadastro existente,
   * quando sofrer alteração, retificação, exclusão lógica ou estorno com justificativa informada,
   * então o histórico cadastral deve preservar os estados anterior e posterior
   * vinculados ao usuário, data e justificativa, sem apagar o registro histórico original (RF-004, RB-007).
   */
  describe('CA-2: Preservação do histórico cadastral em alterações, exclusões lógicas e estornos (RB-007)', () => {
    it('deve preservar toda a linha do tempo de estados anteriores e novos do cadastro sem perda de histórico', async () => {
      // 1. Inclusão inicial do cadastro
      await request(app).post('/api/auditoria/logs').send({
        organizacaoId: organizacaoFicticiaId,
        usuarioId: usuarioResponsavelFicticioId,
        objetoTipo: 'PESSOA_EMPRESA',
        objetoId: objetoCadastralFicticioId,
        operacao: 'INCLUSAO',
        justificativa: 'Cadastro inicial da empresa fictícia',
        dadosAnteriores: null,
        dadosNovos: { razaoSocial: 'Empresa Fictícia Versão 1 LTDA', ativo: true },
      });

      // 2. Alteração cadastral com justificativa
      await request(app).post('/api/auditoria/logs').send({
        organizacaoId: organizacaoFicticiaId,
        usuarioId: usuarioResponsavelFicticioId,
        objetoTipo: 'PESSOA_EMPRESA',
        objetoId: objetoCadastralFicticioId,
        operacao: 'ALTERACAO',
        justificativa: 'Retificação de razão social conforme alteração contratual fictícia',
        dadosAnteriores: { razaoSocial: 'Empresa Fictícia Versão 1 LTDA', ativo: true },
        dadosNovos: { razaoSocial: 'Empresa Fictícia Versão 2 S/A', ativo: true },
      });

      // 3. Exclusão lógica (sem apagar o histórico)
      await request(app).post('/api/auditoria/logs').send({
        organizacaoId: organizacaoFicticiaId,
        usuarioId: usuarioResponsavelFicticioId,
        objetoTipo: 'PESSOA_EMPRESA',
        objetoId: objetoCadastralFicticioId,
        operacao: 'EXCLUSAO_LOGICA',
        justificativa: 'Inativação lógica a pedido do representante fictício',
        dadosAnteriores: { razaoSocial: 'Empresa Fictícia Versão 2 S/A', ativo: true },
        dadosNovos: { razaoSocial: 'Empresa Fictícia Versão 2 S/A', ativo: false },
      });

      // 4. Estorno/reativação rastreável
      await request(app).post('/api/auditoria/logs').send({
        organizacaoId: organizacaoFicticiaId,
        usuarioId: usuarioResponsavelFicticioId,
        objetoTipo: 'PESSOA_EMPRESA',
        objetoId: objetoCadastralFicticioId,
        operacao: 'ESTORNO',
        justificativa: 'Estorno da inativação lógica para reabertura cadastral',
        dadosAnteriores: { razaoSocial: 'Empresa Fictícia Versão 2 S/A', ativo: false },
        dadosNovos: { razaoSocial: 'Empresa Fictícia Versão 2 S/A', ativo: true },
      });

      const historicoRes = await request(app).get(
        `/api/auditoria/objetos/${objetoCadastralFicticioId}/historico`
      );
      expect(historicoRes.status).toBe(200);
      expect(historicoRes.body.dados).toHaveLength(4);
      expect(historicoRes.body.dados[0].operacao).toBe('INCLUSAO');
      expect(historicoRes.body.dados[1].operacao).toBe('ALTERACAO');
      expect(historicoRes.body.dados[1].dadosAnteriores.razaoSocial).toBe(
        'Empresa Fictícia Versão 1 LTDA'
      );
      expect(historicoRes.body.dados[1].dadosNovos.razaoSocial).toBe(
        'Empresa Fictícia Versão 2 S/A'
      );
      expect(historicoRes.body.dados[2].operacao).toBe('EXCLUSAO_LOGICA');
      expect(historicoRes.body.dados[3].operacao).toBe('ESTORNO');
    });
  });

  /**
   * CA-3: Dado um log de auditoria ou item do histórico já registrado,
   * quando houver qualquer tentativa de editar ou excluir esse log,
   * então a operação deve ser bloqueada e recusada pelo sistema,
   * assegurando que o log não seja editável (RNF-004, RB-007).
   */
  describe('CA-3: Imutabilidade da trilha de auditoria (bloqueio de edição e exclusão)', () => {
    it('deve recusar qualquer tentativa de editar (PUT/PATCH) ou excluir (DELETE) um log de auditoria', async () => {
      const criacao = await request(app).post('/api/auditoria/logs').send({
        organizacaoId: organizacaoFicticiaId,
        usuarioId: usuarioResponsavelFicticioId,
        objetoTipo: 'LANCAMENTO_CONTABIL',
        objetoId: 'lancamento-ficticio-999',
        operacao: 'APROVACAO',
        justificativa: 'Aprovação de fechamento mensal fictício',
      });

      const logId = criacao.body.dados.id;

      // 1. Tentativa de edição via PUT -> deve retornar 403
      const resPut = await request(app)
        .put(`/api/auditoria/logs/${logId}`)
        .send({ justificativa: 'Tentativa de adulterar log' });
      expect(resPut.status).toBe(403);
      expect(resPut.body.erro).toMatch(/imutáveis/i);

      // 2. Tentativa de edição via PATCH -> deve retornar 403
      const resPatch = await request(app)
        .patch(`/api/auditoria/logs/${logId}`)
        .send({ usuarioId: 'outro-usuario' });
      expect(resPatch.status).toBe(403);

      // 3. Tentativa de exclusão via DELETE -> deve retornar 403
      const resDelete = await request(app).delete(`/api/auditoria/logs/${logId}`);
      expect(resDelete.status).toBe(403);
      expect(resDelete.body.erro).toMatch(/imutáveis/i);

      // 4. Tentativa direta via serviço/repositório -> deve lançar exceção
      await expect(
        service.editarLog(logId, { justificativa: 'Adulterado' })
      ).rejects.toThrow(/imutáveis/i);
      await expect(service.excluirLog(logId)).rejects.toThrow(/imutáveis/i);

      // Confirma que o log original continua intacto
      const logPersistido = await repo.buscarLogPorId(logId);
      expect(logPersistido?.justificativa).toBe('Aprovação de fechamento mensal fictício');
    });
  });

  /**
   * CA-4: Dada uma operação de alteração cadastral, exclusão lógica ou estorno,
   * quando a justificativa ou o usuário responsável não forem informados,
   * então o sistema deve recusar a operação (RF-004, RB-007).
   */
  describe('CA-4: Recusa de operação sem justificativa ou sem usuário responsável', () => {
    it('deve recusar o registro quando a justificativa ou o usuário responsável estiverem ausentes', async () => {
      // Sem justificativa
      const semJustificativa = await request(app).post('/api/auditoria/logs').send({
        organizacaoId: organizacaoFicticiaId,
        usuarioId: usuarioResponsavelFicticioId,
        objetoTipo: 'PESSOA_EMPRESA',
        objetoId: objetoCadastralFicticioId,
        operacao: 'ALTERACAO',
        justificativa: '   ',
      });
      expect(semJustificativa.status).toBe(400);
      expect(semJustificativa.body.erro).toMatch(/justificativa/i);

      // Sem usuário responsável
      const semUsuario = await request(app).post('/api/auditoria/logs').send({
        organizacaoId: organizacaoFicticiaId,
        usuarioId: '',
        objetoTipo: 'PESSOA_EMPRESA',
        objetoId: objetoCadastralFicticioId,
        operacao: 'EXCLUSAO_LOGICA',
        justificativa: 'Justificativa preenchida sem usuário',
      });
      expect(semUsuario.status).toBe(400);
      expect(semUsuario.body.erro).toMatch(/usuário responsável/i);
    });
  });
});
