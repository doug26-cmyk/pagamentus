import * as crypto from 'crypto';
import {
  CredencialIntegracaoArmazenada,
  CredencialIntegracaoPublica,
  TokenIntegracaoArmazenado,
  TokenIntegracaoEmitido,
} from '../models/CredencialTokenIntegracaoModel';
import { ICredencialTokenIntegracaoRepository } from '../repositories/CredencialTokenIntegracaoRepository';
import { CriptografiaSegurancaService } from './CriptografiaSegurancaService';

/**
 * Serviço para Configuração de Credenciais Protegidas, Tokens de Integração
 * com Escopo Mínimo e Rotação/Revogação (SPEC-1.10 / RF-076)
 */
export class CredencialTokenIntegracaoService {
  constructor(
    private readonly repo: ICredencialTokenIntegracaoRepository,
    private readonly criptoService: CriptografiaSegurancaService
  ) {}

  /**
   * Calcula o hash SHA-256 de um token de integração
   */
  public gerarHashToken(tokenBruto: string): string {
    return crypto.createHash('sha256').update(tokenBruto).digest('hex');
  }

  /**
   * Mascara uma credencial secreta exibindo apenas os últimos 4 caracteres (CA-1)
   */
  private mascararCredencial(segredo: string): string {
    const limpo = segredo.trim();
    if (limpo.length <= 4) {
      return '********';
    }
    return `********${limpo.slice(-4)}`;
  }

  /**
   * Converte o registro interno para a visão pública segura (sem expor o segredo - CA-1)
   */
  private paraVisaoPublica(
    armazenada: CredencialIntegracaoArmazenada
  ): CredencialIntegracaoPublica {
    return {
      id: armazenada.id,
      organizacaoId: armazenada.organizacaoId,
      nomeIntegracao: armazenada.nomeIntegracao,
      provedor: armazenada.provedor,
      credencialMascarada: armazenada.credencialMascarada,
      escoposPermitidos: [...armazenada.escoposPermitidos],
      ativa: armazenada.ativa,
      criadoEm: armazenada.criadoEm,
      rotacionadoEm: armazenada.rotacionadoEm,
    };
  }

  /**
   * Valida se a lista de escopos obedece ao princípio de escopo mínimo explícito,
   * recusando listas vazias ou escopos curingas irrestritos (CA-4)
   */
  public validarEscoposMinimos(escopos: string[]): string[] {
    if (!Array.isArray(escopos) || escopos.length === 0) {
      throw new Error(
        'Escopo mínimo obrigatório: informe ao menos um escopo específico para a integração (RF-076).'
      );
    }

    const normalizados = escopos.map((e) => (e || '').trim()).filter(Boolean);
    if (normalizados.length === 0) {
      throw new Error('Os escopos informados não podem ser vazios.');
    }

    for (const escopo of normalizados) {
      if (escopo === '*' || escopo.includes('*') || escopo.toLowerCase() === 'all') {
        throw new Error(
          `Escopo irrestrito '${escopo}' recusado: defina escopos mínimos explícitos (ex.: 'fiscal:nfe:importar').`
        );
      }
    }

    return Array.from(new Set(normalizados));
  }

  // ============================================================================
  // CA-1 e CA-4: Armazenamento Protegido de Credenciais de Integração
  // ============================================================================

  /**
   * Configura uma credencial de integração criptografando o segredo em repouso (CA-1 e CA-4)
   */
  public async configurarCredencial(dados: {
    id?: string;
    organizacaoId: string;
    nomeIntegracao: string;
    provedor: string;
    credencialSecreta: string;
    escoposPermitidos: string[];
  }): Promise<CredencialIntegracaoPublica> {
    const organizacaoId = (dados.organizacaoId || '').trim();
    if (!organizacaoId) {
      throw new Error('O identificador da organização é obrigatório.');
    }

    const nomeIntegracao = (dados.nomeIntegracao || '').trim();
    const provedor = (dados.provedor || '').trim();
    if (!nomeIntegracao || !provedor) {
      throw new Error('O nome da integração e o provedor são obrigatórios.');
    }

    const segredo = (dados.credencialSecreta || '').trim();
    if (!segredo || segredo.length < 8) {
      throw new Error('A credencial secreta deve ter no mínimo 8 caracteres.');
    }

    const escoposValidados = this.validarEscoposMinimos(dados.escoposPermitidos);

    // Criptografa a credencial secreta antes de persistir (CA-1)
    const credencialSecretaCifrada = this.criptoService.cifrarDadoSensivel(segredo);

    const novaCredencial: CredencialIntegracaoArmazenada = {
      id: dados.id || crypto.randomUUID(),
      organizacaoId,
      nomeIntegracao,
      provedor,
      credencialSecretaCifrada,
      credencialMascarada: this.mascararCredencial(segredo),
      escoposPermitidos: escoposValidados,
      ativa: true,
      criadoEm: new Date(),
      rotacionadoEm: null,
    };

    const salva = await this.repo.salvarCredencial(novaCredencial);
    return this.paraVisaoPublica(salva);
  }

  /**
   * Lista as credenciais da organização exibindo apenas os dados mascarados (CA-1)
   */
  public async listarCredenciais(
    organizacaoId: string
  ): Promise<CredencialIntegracaoPublica[]> {
    const lista = await this.repo.listarCredenciaisPorOrganizacao(organizacaoId);
    return lista.map((item) => this.paraVisaoPublica(item));
  }

  // ============================================================================
  // CA-2, CA-3 e CA-4: Emissão, Validação de Escopo Mínimo, Rotação e Revogação de Tokens
  // ============================================================================

  /**
   * Emite um token de integração vinculado a uma credencial e restrito a escopos mínimos (CA-2 e CA-4)
   */
  public async emitirTokenIntegracao(dados: {
    organizacaoId: string;
    credencialId: string;
    nome: string;
    escopos: string[];
  }): Promise<TokenIntegracaoEmitido> {
    const credencial = await this.repo.buscarCredencialPorId(dados.credencialId);
    if (!credencial || !credencial.ativa || credencial.organizacaoId !== dados.organizacaoId) {
      throw new Error('Credencial de integração não encontrada ou inativa.');
    }

    const nome = (dados.nome || '').trim();
    if (!nome) {
      throw new Error('O nome de identificação do token é obrigatório.');
    }

    const escoposValidados = this.validarEscoposMinimos(dados.escopos);

    // Garante que o token só solicite escopos permitidos pela credencial
    for (const escopo of escoposValidados) {
      if (!credencial.escoposPermitidos.includes(escopo)) {
        throw new Error(
          `O escopo '${escopo}' não está autorizado na credencial de integração base.`
        );
      }
    }

    const sufixoAleatorio = crypto.randomBytes(24).toString('hex');
    const tokenBruto = `int_${sufixoAleatorio}`;
    const tokenHash = this.gerarHashToken(tokenBruto);
    const prefixoVisivel = `${tokenBruto.substring(0, 10)}...`;

    const novoToken: TokenIntegracaoArmazenado = {
      id: crypto.randomUUID(),
      organizacaoId: dados.organizacaoId,
      credencialId: dados.credencialId,
      nome,
      tokenHash,
      prefixoVisivel,
      escopos: escoposValidados,
      ativo: true,
      criadoEm: new Date(),
      revogadoEm: null,
      substituidoPorTokenId: null,
    };

    const salvo = await this.repo.salvarToken(novoToken);

    return {
      id: salvo.id,
      organizacaoId: salvo.organizacaoId,
      credencialId: salvo.credencialId,
      nome: salvo.nome,
      tokenBruto,
      prefixoVisivel: salvo.prefixoVisivel,
      escopos: salvo.escopos,
      ativo: salvo.ativo,
      criadoEm: salvo.criadoEm,
    };
  }

  /**
   * Valida se um token de integração está ativo e possui o escopo mínimo exigido para a operação (CA-2 e CA-3)
   */
  public async validarTokenComEscopo(
    tokenBruto: string,
    escopoExigido: string
  ): Promise<Omit<TokenIntegracaoArmazenado, 'tokenHash'>> {
    if (!tokenBruto || !tokenBruto.trim()) {
      throw new Error('Token de integração não informado.');
    }

    const hash = this.gerarHashToken(tokenBruto.trim());
    const token = await this.repo.buscarTokenPorHash(hash);

    if (!token || !token.ativo) {
      throw new Error('Token de integração inválido, rotacionado ou revogado.');
    }

    const credencial = await this.repo.buscarCredencialPorId(token.credencialId);
    if (!credencial || !credencial.ativa) {
      throw new Error('Credencial vinculada ao token está inativa.');
    }

    if (!token.escopos.includes(escopoExigido)) {
      throw new Error(
        `Acesso negado: o token não possui o escopo mínimo exigido ('${escopoExigido}').`
      );
    }

    const { tokenHash: _, ...tokenSemHash } = token;
    return tokenSemHash;
  }

  /**
   * Rotaciona um token de integração: invalida imediatamente o token anterior e emite um novo com o mesmo escopo (CA-3)
   */
  public async rotacionarToken(tokenId: string): Promise<TokenIntegracaoEmitido> {
    const tokenAtual = await this.repo.buscarTokenPorId(tokenId);
    if (!tokenAtual || !tokenAtual.ativo) {
      throw new Error('Token de integração não encontrado ou já inativo.');
    }

    // Emite o novo token com o mesmo escopo mínimo
    const novoEmitido = await this.emitirTokenIntegracao({
      organizacaoId: tokenAtual.organizacaoId,
      credencialId: tokenAtual.credencialId,
      nome: `${tokenAtual.nome} (Rotacionado)`,
      escopos: tokenAtual.escopos,
    });

    // Invalida o token anterior imediatamente
    tokenAtual.ativo = false;
    tokenAtual.revogadoEm = new Date();
    tokenAtual.substituidoPorTokenId = novoEmitido.id;
    await this.repo.salvarToken(tokenAtual);

    return novoEmitido;
  }

  /**
   * Revoga imediatamente um token de integração ativo (CA-3)
   */
  public async revogarToken(
    tokenId: string
  ): Promise<Omit<TokenIntegracaoArmazenado, 'tokenHash'>> {
    const token = await this.repo.buscarTokenPorId(tokenId);
    if (!token) {
      throw new Error('Token de integração não encontrado.');
    }

    token.ativo = false;
    token.revogadoEm = new Date();
    const salvo = await this.repo.salvarToken(token);
    const { tokenHash: _, ...semHash } = salvo;
    return semHash;
  }
}
