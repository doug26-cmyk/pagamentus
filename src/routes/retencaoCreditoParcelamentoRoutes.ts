import { Router } from 'express';
import { RetencaoCreditoParcelamentoController } from '../controllers/RetencaoCreditoParcelamentoController';

/**
 * Rotas HTTP para Retenções, Créditos, Compensações, Parcelamentos e Vencimentos
 * (SPEC-3.8 / RF-022)
 */
export function criarRetencaoCreditoParcelamentoRouter(
  controller: RetencaoCreditoParcelamentoController
): Router {
  const router = Router();

  router.post(
    '/empresas/:empresaId/fiscal/retencoes',
    controller.registrarRetencao
  );
  router.get(
    '/empresas/:empresaId/fiscal/retencoes',
    controller.listarRetencoes
  );

  router.post(
    '/empresas/:empresaId/fiscal/creditos',
    controller.registrarCredito
  );
  router.get(
    '/empresas/:empresaId/fiscal/creditos',
    controller.listarCreditos
  );

  router.post(
    '/empresas/:empresaId/fiscal/compensacoes',
    controller.aplicarCompensacao
  );

  router.post(
    '/empresas/:empresaId/fiscal/parcelamentos',
    controller.cadastrarParcelamento
  );
  router.get(
    '/empresas/:empresaId/fiscal/parcelamentos',
    controller.listarParcelamentos
  );
  router.patch(
    '/empresas/:empresaId/fiscal/parcelamentos/:parcelamentoId/parcelas/:numero/pagar',
    controller.pagarParcela
  );

  router.get(
    '/empresas/:empresaId/fiscal/vencimentos',
    controller.listarVencimentos
  );

  return router;
}
