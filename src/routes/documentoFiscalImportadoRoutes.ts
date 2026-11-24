import { Router } from 'express';
import { DocumentoFiscalImportadoController } from '../controllers/DocumentoFiscalImportadoController';

/**
 * Rotas HTTP para Importação de Documentos Fiscais (SPEC-3.1 / RF-016)
 */
export function criarDocumentoFiscalImportadoRouter(
  controller: DocumentoFiscalImportadoController
): Router {
  const router = Router();

  router.post(
    '/empresas/:empresaId/fiscal/documentos/importar',
    controller.importar
  );
  router.get('/empresas/:empresaId/fiscal/documentos', controller.listar);
  router.get(
    '/empresas/:empresaId/fiscal/documentos/:id',
    controller.buscarPorId
  );
  router.get(
    '/empresas/:empresaId/fiscal/documentos/:id/integridade',
    controller.verificarIntegridade
  );

  return router;
}
