import * as crypto from 'crypto';
import {
  AutorizacaoExpressaCliente,
  RegistroClienteArmazenado,
  RegistroClienteVisao,
} from '../models/IsolamentoClienteModel';
import { IAutenticacaoRepository } from '../repositories/AutenticacaoRepository';
import { IIsolamentoClienteRepository } from '../repositories/IsolamentoClienteRepository';
import { AutenticacaoService } from './AutenticacaoService';
import { CriptografiaSegurancaService } from './CriptografiaSegurancaService';

/**
 * Serviço de Segregação entre Clientes, Menor Privilégio e Proteção de Dados Sensíveis
 * Implementa a SPEC-1.5 (RB-008 e RNF-001)
 */
export class IsolamentoClienteService {
  constructor(
    private readonly isolamentoRepo: IIsolamentoClienteRepository,
    private readonly authRepo: IAutenticacaoRepository,
    private readonly authService: AutenticacaoService,
    private readonly criptoService: CriptografiaSegurancaService
  ) {}

  // ============================================================================
  // CA-1 e CA-2: Segregação entre Clientes e Autorização Expressa (RB-008)
  // ============================================================================

  /**
   * Verifica se o usuário pertence ao cliente/organização alvo ou se possui
   * autorização expressa ativa para acessar seus dados (RB-008 / CA-1 / CA-2).
   */
  public async validarAcessoAoCliente(usuarioId: string, clienteAlvoId: string): Promise<void> {
    const usuario = await this.authRepo.buscarUsuarioPorId(usuarioId);
    if (!usuario || !usuario.ativo) {
      throw new Error('Usuário inexistente ou inativo.');
    }

    // 1. Se o usuário pertence diretamente à organização/cliente alvo, acesso ao escopo do cliente é permitido
    if (usuario.organizacaoId === clienteAlvoId) {
      return;
    }

    // 2. Caso pertença a outro cliente, exige autorização expressa ativa (RB-008 / CA-2)
    const autorizacao = await this.isolamentoRepo.buscarAutorizacaoAtiva(
      usuarioId,
      clienteAlvoId
    );
    if (!autorizacao) {
      throw new Error(
        'Acesso negado: violação de isolamento entre clientes. Usuário não possui autorização expressa para visualizar ou manipular dados deste cliente (RB-008).'
      );
    }
  }

  /**
   * Concede uma autorização expressa para que um usuário externo possa atuar nos dados do cliente (CA-2).
   * Exige que o concedente pertença ao cliente que está concedendo o acesso e possua a permissão 'clientes:autorizacao:gerenciar' (CA-3).
   */
  public async concederAutorizacaoExpressa(dados: {
    solicitanteUsuarioId: string;
    clienteId: string;
    usuarioAutorizadoId: string;
    expiraEm?: Date | null;
  }): Promise<AutorizacaoExpressaCliente> {
    const solicitante = await this.authRepo.buscarUsuarioPorId(dados.solicitanteUsuarioId);
    if (!solicitante || solicitante.organizacaoId !== dados.clienteId) {
      throw new Error(
        'Acesso negado: apenas representantes do próprio cliente podem conceder autorização expressa sobre seus dados.'
      );
    }

    // Verifica menor privilégio (CA-3)
    await this.authService.exigirPermissao(
      dados.solicitanteUsuarioId,
      'clientes:autorizacao:gerenciar'
    );

    const novaAutorizacao: AutorizacaoExpressaCliente = {
      id: crypto.randomUUID(),
      usuarioId: dados.usuarioAutorizadoId,
      clienteId: dados.clienteId,
      concedidoPorUsuarioId: dados.solicitanteUsuarioId,
      ativa: true,
      expiraEm: dados.expiraEm ?? null,
      criadoEm: new Date(),
    };

    return this.isolamentoRepo.salvarAutorizacao(novaAutorizacao);
  }

  /**
   * Revoga uma autorização expressa existente
   */
  public async revogarAutorizacaoExpressa(
    autorizacaoId: string,
    clienteId: string,
    solicitanteUsuarioId: string
  ): Promise<AutorizacaoExpressaCliente> {
    const solicitante = await this.authRepo.buscarUsuarioPorId(solicitanteUsuarioId);
    if (!solicitante || solicitante.organizacaoId !== clienteId) {
      throw new Error(
        'Acesso negado: apenas representantes do próprio cliente podem revogar autorizações.'
      );
    }

    await this.authService.exigirPermissao(
      solicitanteUsuarioId,
      'clientes:autorizacao:gerenciar'
    );

    const autorizacao = await this.isolamentoRepo.buscarAutorizacaoPorId(autorizacaoId);
    if (!autorizacao || autorizacao.clienteId !== clienteId) {
      throw new Error('Autorização não encontrada para este cliente.');
    }

    autorizacao.ativa = false;
    return this.isolamentoRepo.salvarAutorizacao(autorizacao);
  }

  // ============================================================================
  // CA-1, CA-3 e CA-4: Operações Segregadas com Menor Privilégio e Criptografia
  // ============================================================================

  /**
   * Cria um registro para um cliente:
   * 1. Valida isolamento entre clientes (CA-1 / CA-2)
   * 2. Valida menor privilégio exigindo permissão 'clientes:dados:escrever' (CA-3)
   * 3. Criptografa o dado sensível antes de armazenar (CA-4)
   */
  public async criarRegistroCliente(dados: {
    solicitanteUsuarioId: string;
    clienteId: string;
    titulo: string;
    dadoSensivel: string;
  }): Promise<RegistroClienteArmazenado> {
    // 1. Segregação entre clientes (CA-1 / CA-2)
    await this.validarAcessoAoCliente(dados.solicitanteUsuarioId, dados.clienteId);

    // 2. Menor privilégio: exige permissão explícita de escrita (CA-3)
    await this.authService.exigirPermissao(
      dados.solicitanteUsuarioId,
      'clientes:dados:escrever'
    );

    // 3. Criptografia em repouso do dado sensível (CA-4 / RNF-001)
    const dadoSensivelCifrado = this.criptoService.cifrarDadoSensivel(dados.dadoSensivel);

    const novoRegistro: RegistroClienteArmazenado = {
      id: crypto.randomUUID(),
      clienteId: dados.clienteId,
      titulo: dados.titulo.trim(),
      dadoSensivelCifrado,
      criadoPorUsuarioId: dados.solicitanteUsuarioId,
      criadoEm: new Date(),
    };

    return this.isolamentoRepo.salvarRegistro(novoRegistro);
  }

  /**
   * Lista os registros de um cliente descriptografando os dados sensíveis apenas para
   * usuários autorizados para aquele cliente e com a permissão 'clientes:dados:ler' (CA-1, CA-2, CA-3, CA-4)
   */
  public async listarRegistrosDoCliente(
    solicitanteUsuarioId: string,
    clienteId: string
  ): Promise<RegistroClienteVisao[]> {
    // 1. Segregação entre clientes (CA-1 / CA-2)
    await this.validarAcessoAoCliente(solicitanteUsuarioId, clienteId);

    // 2. Menor privilégio: exige permissão explícita de leitura (CA-3)
    await this.authService.exigirPermissao(solicitanteUsuarioId, 'clientes:dados:ler');

    // 3. Busca apenas registros do cliente solicitado e decifra dados em memória
    const armazenados = await this.isolamentoRepo.listarRegistrosPorCliente(clienteId);
    return armazenados.map((item) => ({
      id: item.id,
      clienteId: item.clienteId,
      titulo: item.titulo,
      dadoSensivel: this.criptoService.decifrarDadoSensivel(item.dadoSensivelCifrado),
      criadoPorUsuarioId: item.criadoPorUsuarioId,
      criadoEm: item.criadoEm,
    }));
  }

  /**
   * Exclui um registro de um cliente exigindo isolamento e permissão explícita 'clientes:dados:excluir' (CA-1, CA-3)
   */
  public async excluirRegistroDoCliente(
    solicitanteUsuarioId: string,
    clienteId: string,
    registroId: string
  ): Promise<void> {
    // 1. Segregação entre clientes (CA-1 / CA-2)
    await this.validarAcessoAoCliente(solicitanteUsuarioId, clienteId);

    // 2. Menor privilégio: exige permissão explícita de exclusão (CA-3)
    await this.authService.exigirPermissao(solicitanteUsuarioId, 'clientes:dados:excluir');

    const registro = await this.isolamentoRepo.buscarRegistroPorId(registroId);
    if (!registro || registro.clienteId !== clienteId) {
      throw new Error('Registro não encontrado para o cliente informado.');
    }

    await this.isolamentoRepo.excluirRegistro(registroId);
  }
}
