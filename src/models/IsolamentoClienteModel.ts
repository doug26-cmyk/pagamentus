/**
 * Modelos de domínio para Isolamento entre Clientes, Autorização Expressa e Dados Sensíveis
 * SPEC-1.5 (RB-008 e RNF-001)
 */

/**
 * Representa uma autorização expressa concedida a um usuário para acessar dados de outro cliente (RB-008 / CA-2)
 */
export interface AutorizacaoExpressaCliente {
  id: string;
  usuarioId: string;
  clienteId: string;
  concedidoPorUsuarioId: string;
  ativa: boolean;
  expiraEm: Date | null;
  criadoEm: Date;
}

/**
 * Representa um registro persistido de um cliente com o dado sensível criptografado em repouso (CA-4)
 */
export interface RegistroClienteArmazenado {
  id: string;
  clienteId: string;
  titulo: string;
  dadoSensivelCifrado: string;
  criadoPorUsuarioId: string;
  criadoEm: Date;
}

/**
 * Representa a visão descriptografada do registro entregue apenas a quem possui acesso ao cliente e permissão
 */
export interface RegistroClienteVisao {
  id: string;
  clienteId: string;
  titulo: string;
  dadoSensivel: string;
  criadoPorUsuarioId: string;
  criadoEm: Date;
}
