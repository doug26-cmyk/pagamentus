import { Router } from 'express';
import { AuditoriaHistoricoController } from '../controllers/AuditoriaHistoricoController';

/**
 * Rotas de Trilha de Auditoria e Histórico Cadastral Imutável (SPEC-1.9)
 */
export function criarAuditoriaHistoricoRouter(
  controller: AuditoriaHistoricoController
): Router {
  const router = Router();

  // Registro e consulta da trilha de auditoria (CA-1 e CA-4)
  router.post('/auditoria/logs', controller.registrar);
  router.get('/auditoria/logs', controller.listar);

  // Histórico completo de alterações, exclusão lógica e estorno por objeto (CA-2)
  router.get(
    '/auditoria/objetos/:objetoId/historico',
    controller.obterHistoricoObjeto
  );

  // Proteção explícita contra edição ou exclusão de logs de auditoria (CA-3)
  router.put('/auditoria/logs/:id', controller.tentarEditar);
  router.patch('/auditoria/logs/:id', controller.tentarEditar);
  router.delete('/auditoria/logs/:id', controller.tentarExcluir);

  return router;
}
