import { Router } from 'express';
import { EstabelecimentoSocioResponsavelController } from '../controllers/EstabelecimentoSocioResponsavelController';

/**
 * Rotas de Estabelecimentos (Matriz e Filiais), Sócios e Responsáveis Técnicos (SPEC-1.7 / RF-005)
 */
export function criarEstabelecimentoSocioResponsavelRouter(
  controller: EstabelecimentoSocioResponsavelController
): Router {
  const router = Router();

  // Estabelecimentos e Filiais vinculados à organização (CA-1 e CA-4)
  router.post(
    '/organizacoes/:organizacaoId/estabelecimentos',
    controller.cadastrarEstabelecimento
  );
  router.get(
    '/organizacoes/:organizacaoId/estabelecimentos',
    controller.listarEstabelecimentos
  );

  // Sócios vinculados à organização (CA-2 e CA-4)
  router.post('/organizacoes/:organizacaoId/socios', controller.cadastrarSocio);
  router.get('/organizacoes/:organizacaoId/socios', controller.listarSocios);

  // Responsáveis Técnicos vinculados à organização (CA-3 e CA-4)
  router.post(
    '/organizacoes/:organizacaoId/responsaveis-tecnicos',
    controller.cadastrarResponsavelTecnico
  );
  router.get(
    '/organizacoes/:organizacaoId/responsaveis-tecnicos',
    controller.listarResponsaveisTecnicos
  );

  // Visão consolidada da estrutura da organização (RF-005)
  router.get(
    '/organizacoes/:organizacaoId/estrutura',
    controller.obterEstruturaOrganizacao
  );

  return router;
}
