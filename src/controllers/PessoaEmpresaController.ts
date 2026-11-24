import { Request, Response } from 'express';
import { PessoaEmpresaService } from '../services/PessoaEmpresaService';

/**
 * Controller HTTP para Cadastro de Pessoas (PF), Empresas (PJ) e Dados Fiscais com Vigência
 * SPEC-1.6 (RF-001 e RF-002)
 */
export class PessoaEmpresaController {
  constructor(private readonly service: PessoaEmpresaService) {}

  /**
   * POST /api/cadastros/pessoas-empresas (Cadastra PF ou PJ - RF-001 / CA-1 / CA-2)
   */
  public cadastrar = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        organizacaoId,
        tipoPessoa,
        nomeRazaoSocial,
        nomeFantasia,
        documento,
        inscricaoEstadual,
        inscricaoMunicipal,
        contatos,
        enderecos,
        responsaveis,
      } = req.body;

      const entidade = await this.service.cadastrarPessoaEmpresa({
        organizacaoId,
        tipoPessoa,
        nomeRazaoSocial,
        nomeFantasia,
        documento,
        inscricaoEstadual,
        inscricaoMunicipal,
        contatos,
        enderecos,
        responsaveis,
      });

      res.status(201).json({
        sucesso: true,
        dados: entidade,
      });
    } catch (erro: any) {
      res.status(400).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };

  /**
   * GET /api/cadastros/pessoas-empresas?organizacaoId=... (Lista cadastros da organização)
   */
  public listar = async (req: Request, res: Response): Promise<void> => {
    try {
      const organizacaoId = String(req.query.organizacaoId || '');
      const lista = await this.service.listarPorOrganizacao(organizacaoId);

      res.status(200).json({
        sucesso: true,
        dados: lista,
      });
    } catch (erro: any) {
      res.status(400).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };

  /**
   * POST /api/cadastros/pessoas-empresas/:id/dados-fiscais (Registra dados fiscais com vigência - RF-002 / CA-3 / CA-4)
   */
  public registrarDadosFiscais = async (req: Request, res: Response): Promise<void> => {
    try {
      const pessoaEmpresaId = String(req.params.id);
      const {
        regimeTributario,
        atividadeEconomica,
        cnae,
        naturezaJuridica,
        municipio,
        uf,
        enquadramentos,
        vigenciaInicio,
        vigenciaFim,
      } = req.body;

      const registro = await this.service.registrarDadosFiscais({
        pessoaEmpresaId,
        regimeTributario,
        atividadeEconomica,
        cnae,
        naturezaJuridica,
        municipio,
        uf,
        enquadramentos,
        vigenciaInicio,
        vigenciaFim,
      });

      res.status(201).json({
        sucesso: true,
        dados: registro,
      });
    } catch (erro: any) {
      res.status(400).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };

  /**
   * GET /api/cadastros/pessoas-empresas/:id/dados-fiscais (Consulta dados fiscais e vigências)
   */
  public listarDadosFiscais = async (req: Request, res: Response): Promise<void> => {
    try {
      const pessoaEmpresaId = String(req.params.id);
      const registros = await this.service.listarDadosFiscais(pessoaEmpresaId);

      res.status(200).json({
        sucesso: true,
        dados: registros,
      });
    } catch (erro: any) {
      res.status(404).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };
}
