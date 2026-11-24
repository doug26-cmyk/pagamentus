import { Router } from 'express';
import { NotaFiscalController } from '../controllers/NotaFiscalController';

/**
 * Rotas HTTP para Notas de Entrada, Saída e Serviços (SPEC-3.2 / RF-017)
 */
export function criarNotaFiscalRouter(controller: NotaFiscalController): Router {
  const router = Router();

  router.post('/empresas/:empresaId/fiscal/notas', controller.registrar);
  router.get('/empresas/:empresaId/fiscal/notas', controller.listar);
  router.get('/empresas/:empresaId/fiscal/notas/:notaId', controller.buscarPorId);
  router.post(
    '/empresas/:empresaId/fiscal/notas/:notaId/cancelar',
    controller.cancelar
  );
  router.post(
    '/empresas/:empresaId/fiscal/notas/:notaId/devolucoes',
    controller.registrarDevolucao
  );
  router.post(
    '/empresas/:empresaId/fiscal/notas/:notaId/ajustes',
    controller.registrarAjuste
  );

  return router;
}
