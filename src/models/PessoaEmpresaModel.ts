/**
 * Modelos de domínio para Cadastro de Pessoas (PF), Empresas (PJ) e Dados Fiscais com Vigência
 * SPEC-1.6 (RF-001 e RF-002)
 */

export type TipoPessoa = 'PF' | 'PJ';

/**
 * Contato vinculado à pessoa física ou jurídica (RF-001)
 */
export interface ContatoCadastro {
  tipo: string; // Ex.: 'EMAIL', 'TELEFONE', 'CELULAR'
  valor: string;
  principal?: boolean;
}

/**
 * Endereço vinculado à pessoa física ou jurídica (RF-001)
 */
export interface EnderecoCadastro {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
}

/**
 * Responsável legal ou técnico vinculado ao cadastro (RF-001)
 */
export interface ResponsavelCadastro {
  nome: string;
  cpf: string;
  qualificacao: string; // Ex.: 'Sócio-Administrador', 'Contador Responsável', 'Titular'
}

/**
 * Entidade de Pessoa Física (PF) ou Pessoa Jurídica (PJ) (RF-001 / CA-1 / CA-2)
 */
export interface PessoaEmpresa {
  id: string;
  organizacaoId: string;
  tipoPessoa: TipoPessoa;
  nomeRazaoSocial: string;
  nomeFantasia: string | null;
  documento: string; // CPF (11 dígitos) ou CNPJ (14 dígitos) apenas números
  inscricaoEstadual: string | null;
  inscricaoMunicipal: string | null;
  contatos: ContatoCadastro[];
  enderecos: EnderecoCadastro[];
  responsaveis: ResponsavelCadastro[];
  criadoEm: Date;
}

/**
 * Registro de dados fiscais, tributários e enquadramentos com vigência (RF-002 / CA-3 / CA-4)
 */
export interface DadosFiscaisVigencia {
  id: string;
  pessoaEmpresaId: string;
  regimeTributario: string; // Ex.: 'SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL', 'PF_CARNE_LEAO'
  atividadeEconomica: string;
  cnae: string;
  naturezaJuridica: string;
  municipio: string;
  uf: string;
  enquadramentos: string[];
  vigenciaInicio: string; // Formato YYYY-MM-DD
  vigenciaFim: string | null; // Formato YYYY-MM-DD ou null se vigente em aberto
  criadoEm: Date;
}
