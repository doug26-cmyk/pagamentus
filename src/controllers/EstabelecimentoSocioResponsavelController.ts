import { Request, Response } from 'express';
import { EstabelecimentoSocioResponsavelService } from '../services/EstabelecimentoSocioResponsavelService';

/**
 * Controller HTTP para Estabelecimentos (Matriz e Filiais), Sócios e Responsáveis Técnicos
 * SPEC-1.7 (RF-005)
 */
export class EstabelecimentoSocioResponsavelController {
  constructor(private readonly service: EstabelecimentoSocioResponsavelService) {}

  /**
   * POST /api/organizacoes/:organizacaoId/estabelecimentos (CA-1 e CA-4)
   */
  public cadastrarEstabelecimento = async (req: Request, res: Response): Promise<void> => {
    try {
      const organizacaoId = String(req.params.organizacaoId || req.body.organizacaoId || '');
      const {
        tipoEstabelecimento,
        nome,
        cnpj,
        inscricaoEstadual,
        inscricaoMunicipal,
      } = req.body;

      const estabelecimento = await this.service.cadastrarEstabelecimento({
        organizacaoId,
        tipoEstabelecimento,
        nome,
        cnpj,
        inscricaoEstadual,
        inscricaoMunicipal,
      });

      res.status(201).json({
        sucesso: true,
        dados: estabelecimento,
      });
    } catch (erro: any) {
      res.status(400).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };

  /**
   * GET /api/organizacoes/:organizacaoId/estabelecimentos (CA-1)
   */
  public listarEstabelecimentos = async (req: Request, res: Response): Promise<void> => {
    try {
      const organizacaoId = String(req.params.organizacaoId || '');
      const lista = await this.service.listarEstabelecimentos(organizacaoId);

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
   * POST /api/organizacoes/:organizacaoId/socios (CA-2 e CA-4)
   */
  public cadastrarSocio = async (req: Request, res: Response): Promise<void> => {
    try {
      const organizacaoId = String(req.params.organizacaoId || req.body.organizacaoId || '');
      const { nome, documento, qualificacao, percentualParticipacao } = req.body;

      const socio = await this.service.cadastrarSocio({
        organizacaoId,
        nome,
        documento,
        qualificacao,
        percentualParticipacao,
      });

      res.status(201).json({
        sucesso: true,
        dados: socio,
      });
    } catch (erro: any) {
      res.status(400).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };

  /**
   * GET /api/organizacoes/:organizacaoId/socios (CA-2)
   */
  public listarSocios = async (req: Request, res: Response): Promise<void> => {
    try {
      const organizacaoId = String(req.params.organizacaoId || '');
      const lista = await this.service.listarSocios(organizacaoId);

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
   * POST /api/organizacoes/:organizacaoId/responsaveis-tecnicos (CA-3 e CA-4)
   */
  public cadastrarResponsavelTecnico = async (req: Request, res: Response): Promise<void> => {
    try {
      const organizacaoId = String(req.params.organizacaoId || req.body.organizacaoId || '');
      const { nome, cpf, registroProfissional, ufRegistro, qualificacao } = req.body;

      const responsavel = await this.service.cadastrarResponsavelTecnico({
        organizacaoId,
        nome,
        cpf,
        registroProfissional,
        ufRegistro,
        qualificacao,
      });

      res.status(201).json({
        sucesso: true,
        dados: responsavel,
      });
    } catch (erro: any) {
      res.status(400).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };

  /**
   * GET /api/organizacoes/:organizacaoId/responsaveis-tecnicos (CA-3)
   */
  public listarResponsaveisTecnicos = async (req: Request, res: Response): Promise<void> => {
    try {
      const organizacaoId = String(req.params.organizacaoId || '');
      const lista = await this.service.listarResponsaveisTecnicos(organizacaoId);

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
   * GET /api/organizacoes/:organizacaoId/estrutura (Visão consolidada da organização - RF-005)
   */
  public obterEstruturaOrganizacao = async (req: Request, res: Response): Promise<void> => {
    try {
      const organizacaoId = String(req.params.organizacaoId || '');
      const estrutura = await this.service.obterEstruturaOrganizacao(organizacaoId);

      res.status(200).json({
        sucesso: true,
        dados: estrutura,
      });
    } catch (erro: any) {
      res.status(400).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };
}
