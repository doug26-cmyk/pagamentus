/**
 * Modelos de domínio para Autenticação, Senhas, MFA, Perfis, Permissões e Sessões
 * SPEC-1.4 (RF-075 e RNF-003)
 */

/**
 * Representa uma permissão granular no sistema (ex.: 'usuarios:administrar')
 */
export interface PermissaoAcesso {
  id: string;
  chave: string;
  descricao: string;
  criadoEm: Date;
}

/**
 * Representa um perfil de acesso (ex.: Administrador, Contador, Operador)
 * Perfis marcados como `privilegiado = true` exigem autenticação multifator (MFA) obrigatória (CA-2).
 */
export interface PerfilAcesso {
  id: string;
  nome: string;
  descricao: string;
  privilegiado: boolean;
  permissoes: string[]; // Lista de chaves de permissão atribuídas ao perfil
  criadoEm: Date;
}

/**
 * Representa um usuário do sistema com controle de senha, MFA e tentativas de login
 */
export interface UsuarioSistema {
  id: string;
  organizacaoId: string;
  perfilId: string;
  nome: string;
  email: string;
  senhaHash: string;
  ativo: boolean;
  mfaHabilitado: boolean;
  mfaSegredo: string | null;
  tentativasFalhas: number;
  bloqueadoAte: Date | null;
  criadoEm: Date;
}

/**
 * Representa uma sessão de usuário (ativa, pendente de MFA ou encerrada)
 */
export interface SessaoUsuario {
  id: string;
  usuarioId: string;
  token: string;
  ativa: boolean;
  requerMfa: boolean;
  mfaVerificado: boolean;
  criadoEm: Date;
  encerradoEm: Date | null;
}

/**
 * Resultado da validação da política de senhas fortes (CA-1)
 */
export interface ResultadoValidacaoSenha {
  valida: boolean;
  erros: string[];
}
