import { Router } from 'express';
import { BaixaTituloController } from '../controllers/BaixaTituloController';

/**
 * Rotas HTTP para Baixas, Juros, Multas, Descontos, Estornos e Inadimplência (SPEC-2.10)
 */
export function criarBaixaTituloRouter(
  controller: BaixaTituloController
): Router {
  const router = Router();

  router.post(
    '/empresas/:empresaId/titulos/:tituloId/parcelas/:numeroParcela/baixas',
    controller.registrarBaixa
  );
  router.post(
    '/empresas/:empresaId/baixas/:baixaId/estorno',
    controller.estornarBaixa
  );
  router.get(
    '/empresas/:empresaId/titulos/:tituloId/parcelas/situacao',
    controller.obterSituacaoParcelas
  );
  router.post(
    '/empresas/:empresaId/inadimplencia/verificar',
    controller.verificarInadimplencia
  );

  return router;
}
