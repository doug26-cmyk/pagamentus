import {
  AutorizacaoExpressaCliente,
  RegistroClienteArmazenado,
} from '../models/IsolamentoClienteModel';

/**
 * Contrato do repositório para Isolamento entre Clientes e Autorizações Expressas (SPEC-1.5)
 */
export interface IIsolamentoClienteRepository {
  // Autorizações Expressas (RB-008 / CA-2)
  salvarAutorizacao(autorizacao: AutorizacaoExpressaCliente): Promise<AutorizacaoExpressaCliente>;
  buscarAutorizacaoPorId(id: string): Promise<AutorizacaoExpressaCliente | null>;
  buscarAutorizacaoAtiva(
    usuarioId: string,
    clienteId: string
  ): Promise<AutorizacaoExpressaCliente | null>;

  // Registros Segregados por Cliente (RB-008 / RNF-001)
  salvarRegistro(registro: RegistroClienteArmazenado): Promise<RegistroClienteArmazenado>;
  buscarRegistroPorId(id: string): Promise<RegistroClienteArmazenado | null>;
  listarRegistrosPorCliente(clienteId: string): Promise<RegistroClienteArmazenado[]>;
  excluirRegistro(id: string): Promise<boolean>;

  // Limpeza para suíte de testes
  limpar(): Promise<void>;
}

/**
 * Implementação em memória do repositório de Isolamento entre Clientes
 */
export class InMemoryIsolamentoClienteRepository implements IIsolamentoClienteRepository {
  private autorizacoes: Map<string, AutorizacaoExpressaCliente> = new Map();
  private registros: Map<string, RegistroClienteArmazenado> = new Map();

  public async salvarAutorizacao(
    autorizacao: AutorizacaoExpressaCliente
  ): Promise<AutorizacaoExpressaCliente> {
    const copia: AutorizacaoExpressaCliente = { ...autorizacao };
    this.autorizacoes.set(copia.id, copia);
    return { ...copia };
  }

  public async buscarAutorizacaoPorId(id: string): Promise<AutorizacaoExpressaCliente | null> {
    const item = this.autorizacoes.get(id);
    return item ? { ...item } : null;
  }

  public async buscarAutorizacaoAtiva(
    usuarioId: string,
    clienteId: string
  ): Promise<AutorizacaoExpressaCliente | null> {
    const agora = new Date();
    for (const aut of this.autorizacoes.values()) {
      if (aut.usuarioId === usuarioId && aut.clienteId === clienteId && aut.ativa) {
        if (!aut.expiraEm || aut.expiraEm > agora) {
          return { ...aut };
        }
      }
    }
    return null;
  }

  public async salvarRegistro(
    registro: RegistroClienteArmazenado
  ): Promise<RegistroClienteArmazenado> {
    const copia: RegistroClienteArmazenado = { ...registro };
    this.registros.set(copia.id, copia);
    return { ...copia };
  }

  public async buscarRegistroPorId(id: string): Promise<RegistroClienteArmazenado | null> {
    const item = this.registros.get(id);
    return item ? { ...item } : null;
  }

  public async listarRegistrosPorCliente(
    clienteId: string
  ): Promise<RegistroClienteArmazenado[]> {
    return Array.from(this.registros.values())
      .filter((r) => r.clienteId === clienteId)
      .map((r) => ({ ...r }));
  }

  public async excluirRegistro(id: string): Promise<boolean> {
    return this.registros.delete(id);
  }

  public async limpar(): Promise<void> {
    this.autorizacoes.clear();
    this.registros.clear();
  }
}
