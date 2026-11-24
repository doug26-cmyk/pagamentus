import { Router } from 'express';
import { BackupRecuperacaoController } from '../controllers/BackupRecuperacaoController';

/**
 * Rotas de Backup Criptografado e Testes de Restauração (SPEC-1.12 / RNF-008)
 */
export function criarBackupRecuperacaoRouter(
  controller: BackupRecuperacaoController
): Router {
  const router = Router();

  // Execução e listagem de backups criptografados (CA-1)
  router.post('/operacao/backups', controller.executarBackup);
  router.get('/operacao/backups', controller.listarBackups);

  // Execução e consulta de testes periódicos de restauração (CA-2 e CA-3)
  router.post(
    '/operacao/backups/:id/testar-restauracao',
    controller.testarRestauracao
  );
  router.get(
    '/operacao/backups/:id/testes-restauracao',
    controller.listarTestesRestauracao
  );

  return router;
}
