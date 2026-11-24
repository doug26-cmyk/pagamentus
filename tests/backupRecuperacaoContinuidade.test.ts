import * as fs from 'fs';
import * as path from 'path';
import request from 'supertest';
import { criarApp } from '../src/app';
import { InMemoryBackupRecuperacaoRepository } from '../src/repositories/BackupRecuperacaoRepository';

describe('SPEC-1.12: Backup, recuperação e continuidade (RNF-008, RNF-016)', () => {
  let app: any;
  let repo: InMemoryBackupRecuperacaoRepository;

  const organizacaoFicticiaId = 'org-ficticia-backup-001';

  beforeEach(async () => {
    const instancia = criarApp();
    app = instancia.app;
    repo = instancia.backupRepo;
    await repo.limpar();
  });

  /**
   * CA-1: Dado um conjunto de dados para backup,
   * quando executado o processo de backup automático,
   * então o arquivo/registro gerado deve ser armazenado de forma criptografada
   * com hash de integridade e metadados de execução (RNF-008).
   */
  describe('CA-1: Execução de backup automático criptografado com hash de integridade', () => {
    it('deve executar e armazenar o backup cifrado (AES-256-GCM) com hash SHA-256 e metas de RPO/RTO', async () => {
      const payloadFicticio = {
        organizacao: 'Organização Fictícia Contábil',
        lancamentos: [{ id: 'lanc-001', valor: 1500.5 }],
      };

      const res = await request(app).post('/api/operacao/backups').send({
        organizacaoId: organizacaoFicticiaId,
        origemTipo: 'AUTOMATICO',
        conteudoJson: payloadFicticio,
      });

      expect(res.status).toBe(201);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.origemTipo).toBe('AUTOMATICO');
      expect(res.body.dados.status).toBe('CONCLUIDO');
      expect(res.body.dados.hashSha256).toHaveLength(64);
      expect(res.body.dados.rpoHoras).toBe(24);
      expect(res.body.dados.rtoHoras).toBe(4);
      // Garante que o conteúdo salvo está criptografado e não em texto aberto
      expect(res.body.dados.conteudoCifrado).not.toContain('Organização Fictícia Contábil');
      expect(res.body.dados.conteudoCifrado.split(':')).toHaveLength(3);
    });
  });

  /**
   * CA-2: Dado um backup criptografado existente,
   * quando executado o teste de restauração,
   * então o sistema deve restaurar e validar os dados originais,
   * registrando formalmente o teste de restauração com data, status e tempo de execução frente ao RPO/RTO (RNF-008).
   */
  describe('CA-2: Teste periódico de restauração com registro formal de evidência', () => {
    it('deve restaurar os dados originais do backup criptografado e registrar o teste como APROVADO', async () => {
      const payloadOriginal = {
        empresa: 'Empresa Fictícia Recuperação LTDA',
        saldo: 9980.0,
      };

      const backupRes = await request(app).post('/api/operacao/backups').send({
        organizacaoId: organizacaoFicticiaId,
        origemTipo: 'AUTOMATICO',
        conteudoJson: payloadOriginal,
      });
      const backupId = backupRes.body.dados.id;

      // Executa teste de restauração
      const testeRes = await request(app).post(
        `/api/operacao/backups/${backupId}/testar-restauracao`
      );

      expect(testeRes.status).toBe(200);
      expect(testeRes.body.sucesso).toBe(true);
      expect(testeRes.body.dados.testeRegistrado.statusTeste).toBe('APROVADO');
      expect(testeRes.body.dados.testeRegistrado.integridadeVerificada).toBe(true);
      expect(testeRes.body.dados.testeRegistrado.testadoEm).toBeDefined();
      expect(JSON.parse(testeRes.body.dados.dadosRestaurados)).toEqual(payloadOriginal);

      // Verifica se o histórico de testes do backup foi registrado
      const historicoTestes = await request(app).get(
        `/api/operacao/backups/${backupId}/testes-restauracao`
      );
      expect(historicoTestes.status).toBe(200);
      expect(historicoTestes.body.dados).toHaveLength(1);
      expect(historicoTestes.body.dados[0].statusTeste).toBe('APROVADO');
    });
  });

  /**
   * CA-3: Dado um backup adulterado ou corrompido,
   * quando submetido ao teste de restauração,
   * então o sistema deve detectar a falha de integridade,
   * recusar a restauração e registrar o resultado negativo do teste (RNF-008).
   */
  describe('CA-3: Detecção de backup adulterado ou corrompido no teste de restauração', () => {
    it('deve detectar corrupção/adulteração, retornar erro (422) e registrar o teste como FALHA', async () => {
      const backupRes = await request(app).post('/api/operacao/backups').send({
        organizacaoId: organizacaoFicticiaId,
        origemTipo: 'AUTOMATICO',
        conteudoJson: { registro: 'Dado íntegro original' },
      });
      const backupId = backupRes.body.dados.id;

      // Simula corrupção do pacote criptografado armazenado
      const backupSalvo = await repo.buscarBackupPorId(backupId);
      backupSalvo!.conteudoCifrado = `${backupSalvo!.conteudoCifrado.slice(0, -4)}ffff`;
      await repo.salvarBackup(backupSalvo!);

      // Executa teste de restauração -> deve falhar e registrar FALHA
      const testeFalho = await request(app).post(
        `/api/operacao/backups/${backupId}/testar-restauracao`
      );

      expect(testeFalho.status).toBe(422);
      expect(testeFalho.body.sucesso).toBe(false);
      expect(testeFalho.body.dados.statusTeste).toBe('FALHA');
      expect(testeFalho.body.dados.integridadeVerificada).toBe(false);

      const historicoTestes = await request(app).get(
        `/api/operacao/backups/${backupId}/testes-restauracao`
      );
      expect(historicoTestes.body.dados).toHaveLength(1);
      expect(historicoTestes.body.dados[0].statusTeste).toBe('FALHA');
    });
  });

  /**
   * CA-4: Dado o repositório do projeto,
   * quando inspecionada a documentação operacional/arquitetural,
   * então deve existir o plano documentado contendo definição de RPO/RTO,
   * plano de resposta a incidentes, recuperação de desastre e comunicação com clientes (RNF-008, RNF-016).
   */
  describe('CA-4: Documentação do plano de continuidade, DR, RPO/RTO e comunicação com clientes', () => {
    it('deve existir o documento de plano de continuidade e incidentes com todas as seções obrigatórias', () => {
      const caminhoDoc = path.join(
        __dirname,
        '..',
        'docs',
        'operacao',
        'plano-continuidade-e-incidentes.md'
      );

      expect(fs.existsSync(caminhoDoc)).toBe(true);
      const conteudo = fs.readFileSync(caminhoDoc, 'utf-8');

      expect(conteudo).toMatch(/RPO/i);
      expect(conteudo).toMatch(/RTO/i);
      expect(conteudo).toMatch(/Plano de Resposta a Incidentes/i);
      expect(conteudo).toMatch(/Plano de Recuperação de Desastre/i);
      expect(conteudo).toMatch(/Plano de Comunicação com Clientes/i);
    });
  });
});
