import { Router } from 'express';
import { AnexoCadastralController } from '../controllers/AnexoCadastralController';

/**
 * Rotas de Anexos Cadastrais e Controle/Alerta de Validade (SPEC-1.8 / RF-003)
 */
export function criarAnexoCadastralRouter(controller: AnexoCadastralController): Router {
  const router = Router();

  // Anexação e consulta de documentos cadastrais por cadastro (CA-1 e CA-4)
  router.post('/cadastros/:pessoaEmpresaId/anexos', controller.anexar);
  router.get('/cadastros/:pessoaEmpresaId/anexos', controller.listarPorCadastro);

  // Consulta de alertas de documentos vencidos e a vencer (CA-2 e CA-3)
  router.get('/anexos/alertas-validade', controller.listarAlertas);

  return router;
}
