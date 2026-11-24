import { Router } from 'express';
import { RelatorioFinanceiroController } from '../controllers/RelatorioFinanceiroController';

/**
 * Rotas HTTP para Fluxo de Caixa e Relatórios Financeiros (SPEC-2.12 / RF-049)
 */
export function criarRelatorioFinanceiroRouter(
  controller: RelatorioFinanceiroController
): Router {
  const router = Router();

  router.get(
    '/empresas/:empresaId/financeiro/fluxo-caixa',
    controller.obterFluxoCaixa
  );
  router.get(
    '/empresas/:empresaId/financeiro/posicao',
    controller.obterPosicaoFinanceira
  );
  router.get(
    '/empresas/:empresaId/financeiro/aging-recebiveis',
    controller.obterAgingRecebiveis
  );
  router.get(
    '/empresas/:empresaId/financeiro/previsao-pagamentos',
    controller.obterPrevisaoPagamentos
  );
  router.get(
    '/empresas/:empresaId/financeiro/por-centro-custo',
    controller.obterPorCentroCusto
  );

  return router;
}
