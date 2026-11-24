/**
 * Modelos de domínio para Credenciais Protegidas e Tokens de Integração com Escopo Mínimo
 * SPEC-1.10 (RF-076)
 */

/**
 * Representa uma credencial de integração armazenada no banco com segredo cifrado (CA-1)
 */
export interface CredencialIntegracaoArmazenada {
  id: string;
  organizacaoId: string;
  nomeIntegracao: string;
  provedor: string;
  credencialSecretaCifrada: string;
  credencialMascarada: string;
  escoposPermitidos: string[];
  ativa: boolean;
  criadoEm: Date;
  rotacionadoEm: Date | null;
}

/**
 * Visão segura da credencial de integração (sem o segredo em texto aberto ou cifrado - CA-1)
 */
export interface CredencialIntegracaoPublica {
  id: string;
  organizacaoId: string;
  nomeIntegracao: string;
  provedor: string;
  credencialMascarada: string;
  escoposPermitidos: string[];
  ativa: boolean;
  criadoEm: Date;
  rotacionadoEm: Date | null;
}

/**
 * Representa um token de integração armazenado via hash SHA-256 com escopo mínimo (CA-2, CA-3)
 */
export interface TokenIntegracaoArmazenado {
  id: string;
  organizacaoId: string;
  credencialId: string;
  nome: string;
  tokenHash: string;
  prefixoVisivel: string;
  escopos: string[];
  ativo: boolean;
  criadoEm: Date;
  revogadoEm: Date | null;
  substituidoPorTokenId: string | null;
}

/**
 * Retorno único no momento da emissão ou rotação do token de integração
 */
export interface TokenIntegracaoEmitido {
  id: string;
  organizacaoId: string;
  credencialId: string;
  nome: string;
  tokenBruto: string; // Exibido apenas uma vez na emissão/rotação
  prefixoVisivel: string;
  escopos: string[];
  ativo: boolean;
  criadoEm: Date;
}
