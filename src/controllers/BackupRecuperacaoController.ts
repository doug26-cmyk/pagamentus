import { Request, Response } from 'express';
import { BackupRecuperacaoService } from '../services/BackupRecuperacaoService';

/**
 * Controller HTTP para Backup Automático Criptografado e Testes de Restauração
 * SPEC-1.12 (RNF-008 e RNF-016)
 */
export class BackupRecuperacaoController {
  constructor(private readonly service: BackupRecuperacaoService) {}

  /**
   * POST /api/operacao/backups (Executa e registra backup criptografado - CA-1)
   */
  public executarBackup = async (req: Request, res: Response): Promise<void> => {
    try {
      const { organizacaoId, origemTipo, conteudoJson, rpoHoras, rtoHoras } = req.body;

      const backup = await this.service.executarBackup({
        organizacaoId,
        origemTipo,
        conteudoJson,
        rpoHoras,
        rtoHoras,
      });

      res.status(201).json({
        sucesso: true,
        dados: backup,
      });
    } catch (erro: any) {
      res.status(400).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };

  /**
   * GET /api/operacao/backups (Lista backups da organização - CA-1)
   */
  public listarBackups = async (req: Request, res: Response): Promise<void> => {
    try {
      const organizacaoId = String(req.query.organizacaoId || '');
      const lista = await this.service.listarBackups(organizacaoId);

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
   * POST /api/operacao/backups/:id/testar-restauracao (Executa e registra teste de restauração - CA-2 e CA-3)
   */
  public testarRestauracao = async (req: Request, res: Response): Promise<void> => {
    try {
      const backupId = String(req.params.id || '');
      const resultado = await this.service.testarRestauracao(backupId);

      if (resultado.testeRegistrado.statusTeste === 'FALHA') {
        res.status(422).json({
          sucesso: false,
          erro: resultado.testeRegistrado.detalhes,
          dados: resultado.testeRegistrado,
        });
        return;
      }

      res.status(200).json({
        sucesso: true,
        dados: resultado,
      });
    } catch (erro: any) {
      res.status(404).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };

  /**
   * GET /api/operacao/backups/:id/testes-restauracao (Lista histórico de testes de restauração - CA-2)
   */
  public listarTestesRestauracao = async (req: Request, res: Response): Promise<void> => {
    try {
      const backupId = String(req.params.id || '');
      const testes = await this.service.listarTestesRestauracao(backupId);

      res.status(200).json({
        sucesso: true,
        dados: testes,
      });
    } catch (erro: any) {
      res.status(400).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };
}
