import {
  CredencialIntegracaoArmazenada,
  TokenIntegracaoArmazenado,
} from '../models/CredencialTokenIntegracaoModel';

/**
 * Contrato do repositório para Credenciais Protegidas e Tokens de Integração (SPEC-1.10)
 */
export interface ICredencialTokenIntegracaoRepository {
  // Credenciais
  salvarCredencial(
    credencial: CredencialIntegracaoArmazenada
  ): Promise<CredencialIntegracaoArmazenada>;
  buscarCredencialPorId(id: string): Promise<CredencialIntegracaoArmazenada | null>;
  listarCredenciaisPorOrganizacao(
    organizacaoId: string
  ): Promise<CredencialIntegracaoArmazenada[]>;

  // Tokens
  salvarToken(token: TokenIntegracaoArmazenado): Promise<TokenIntegracaoArmazenado>;
  buscarTokenPorId(id: string): Promise<TokenIntegracaoArmazenado | null>;
  buscarTokenPorHash(tokenHash: string): Promise<TokenIntegracaoArmazenado | null>;
  listarTokensPorOrganizacao(organizacaoId: string): Promise<TokenIntegracaoArmazenado[]>;

  // Limpeza para testes
  limpar(): Promise<void>;
}

/**
 * Implementação em memória do repositório de Credenciais e Tokens de Integração
 */
export class InMemoryCredencialTokenIntegracaoRepository
  implements ICredencialTokenIntegracaoRepository
{
  private credenciais: Map<string, CredencialIntegracaoArmazenada> = new Map();
  private tokens: Map<string, TokenIntegracaoArmazenado> = new Map();

  public async salvarCredencial(
    credencial: CredencialIntegracaoArmazenada
  ): Promise<CredencialIntegracaoArmazenada> {
    const copia: CredencialIntegracaoArmazenada = {
      ...credencial,
      escoposPermitidos: [...credencial.escoposPermitidos],
    };
    this.credenciais.set(copia.id, copia);
    return { ...copia, escoposPermitidos: [...copia.escoposPermitidos] };
  }

  public async buscarCredencialPorId(
    id: string
  ): Promise<CredencialIntegracaoArmazenada | null> {
    const item = this.credenciais.get(id);
    return item
      ? { ...item, escoposPermitidos: [...item.escoposPermitidos] }
      : null;
  }

  public async listarCredenciaisPorOrganizacao(
    organizacaoId: string
  ): Promise<CredencialIntegracaoArmazenada[]> {
    return Array.from(this.credenciais.values())
      .filter((c) => c.organizacaoId === organizacaoId)
      .map((c) => ({ ...c, escoposPermitidos: [...c.escoposPermitidos] }));
  }

  public async salvarToken(
    token: TokenIntegracaoArmazenado
  ): Promise<TokenIntegracaoArmazenado> {
    const copia: TokenIntegracaoArmazenado = {
      ...token,
      escopos: [...token.escopos],
    };
    this.tokens.set(copia.id, copia);
    return { ...copia, escopos: [...copia.escopos] };
  }

  public async buscarTokenPorId(id: string): Promise<TokenIntegracaoArmazenado | null> {
    const item = this.tokens.get(id);
    return item ? { ...item, escopos: [...item.escopos] } : null;
  }

  public async buscarTokenPorHash(
    tokenHash: string
  ): Promise<TokenIntegracaoArmazenado | null> {
    for (const token of this.tokens.values()) {
      if (token.tokenHash === tokenHash) {
        return { ...token, escopos: [...token.escopos] };
      }
    }
    return null;
  }

  public async listarTokensPorOrganizacao(
    organizacaoId: string
  ): Promise<TokenIntegracaoArmazenado[]> {
    return Array.from(this.tokens.values())
      .filter((t) => t.organizacaoId === organizacaoId)
      .map((t) => ({ ...t, escopos: [...t.escopos] }));
  }

  public async limpar(): Promise<void> {
    this.credenciais.clear();
    this.tokens.clear();
  }
}
