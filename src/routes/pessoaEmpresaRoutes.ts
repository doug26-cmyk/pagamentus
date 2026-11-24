import { Router } from 'express';
import { PessoaEmpresaController } from '../controllers/PessoaEmpresaController';

/**
 * Rotas de Cadastro de Pessoas (PF), Empresas (PJ) e Dados Fiscais com Vigência (SPEC-1.6)
 */
export function criarPessoaEmpresaRouter(controller: PessoaEmpresaController): Router {
  const router = Router();

  // Cadastro e listagem de Pessoa Física (PF) e Pessoa Jurídica (PJ) (RF-001)
  router.post('/cadastros/pessoas-empresas', controller.cadastrar);
  router.get('/cadastros/pessoas-empresas', controller.listar);

  // Registro e consulta de dados fiscais, enquadramentos e vigência (RF-002)
  router.post(
    '/cadastros/pessoas-empresas/:id/dados-fiscais',
    controller.registrarDadosFiscais
  );
  router.get(
    '/cadastros/pessoas-empresas/:id/dados-fiscais',
    controller.listarDadosFiscais
  );

  return router;
}
