import {
  PerfilAcesso,
  PermissaoAcesso,
  SessaoUsuario,
  UsuarioSistema,
} from '../models/AutenticacaoModel';

/**
 * Contrato do repositório de Autenticação, Perfis, Permissões e Sessões (SPEC-1.4)
 */
export interface IAutenticacaoRepository {
  // Permissões
  salvarPermissao(permissao: PermissaoAcesso): Promise<PermissaoAcesso>;
  buscarPermissaoPorChave(chave: string): Promise<PermissaoAcesso | null>;
  listarPermissoes(): Promise<PermissaoAcesso[]>;

  // Perfis
  salvarPerfil(perfil: PerfilAcesso): Promise<PerfilAcesso>;
  buscarPerfilPorId(id: string): Promise<PerfilAcesso | null>;
  buscarPerfilPorNome(nome: string): Promise<PerfilAcesso | null>;
  listarPerfis(): Promise<PerfilAcesso[]>;

  // Usuários
  salvarUsuario(usuario: UsuarioSistema): Promise<UsuarioSistema>;
  buscarUsuarioPorId(id: string): Promise<UsuarioSistema | null>;
  buscarUsuarioPorEmail(email: string): Promise<UsuarioSistema | null>;
  listarUsuariosPorOrganizacao(organizacaoId: string): Promise<UsuarioSistema[]>;

  // Sessões
  salvarSessao(sessao: SessaoUsuario): Promise<SessaoUsuario>;
  buscarSessaoPorId(id: string): Promise<SessaoUsuario | null>;
  buscarSessaoPorToken(token: string): Promise<SessaoUsuario | null>;
  listarSessoesPorUsuario(usuarioId: string): Promise<SessaoUsuario[]>;

  // Utilitário de limpeza para testes
  limpar(): Promise<void>;
}

/**
 * Implementação em memória do repositório de Autenticação para execução de testes e API
 */
export class InMemoryAutenticacaoRepository implements IAutenticacaoRepository {
  private permissoes: Map<string, PermissaoAcesso> = new Map();
  private perfis: Map<string, PerfilAcesso> = new Map();
  private usuarios: Map<string, UsuarioSistema> = new Map();
  private sessoes: Map<string, SessaoUsuario> = new Map();

  public async salvarPermissao(permissao: PermissaoAcesso): Promise<PermissaoAcesso> {
    const copia: PermissaoAcesso = { ...permissao };
    this.permissoes.set(copia.chave, copia);
    return { ...copia };
  }

  public async buscarPermissaoPorChave(chave: string): Promise<PermissaoAcesso | null> {
    const item = this.permissoes.get(chave);
    return item ? { ...item } : null;
  }

  public async listarPermissoes(): Promise<PermissaoAcesso[]> {
    return Array.from(this.permissoes.values()).map((p) => ({ ...p }));
  }

  public async salvarPerfil(perfil: PerfilAcesso): Promise<PerfilAcesso> {
    const copia: PerfilAcesso = {
      ...perfil,
      permissoes: [...perfil.permissoes],
    };
    this.perfis.set(copia.id, copia);
    return { ...copia, permissoes: [...copia.permissoes] };
  }

  public async buscarPerfilPorId(id: string): Promise<PerfilAcesso | null> {
    const item = this.perfis.get(id);
    return item ? { ...item, permissoes: [...item.permissoes] } : null;
  }

  public async buscarPerfilPorNome(nome: string): Promise<PerfilAcesso | null> {
    for (const perfil of this.perfis.values()) {
      if (perfil.nome.toLowerCase() === nome.toLowerCase()) {
        return { ...perfil, permissoes: [...perfil.permissoes] };
      }
    }
    return null;
  }

  public async listarPerfis(): Promise<PerfilAcesso[]> {
    return Array.from(this.perfis.values()).map((p) => ({
      ...p,
      permissoes: [...p.permissoes],
    }));
  }

  public async salvarUsuario(usuario: UsuarioSistema): Promise<UsuarioSistema> {
    const copia: UsuarioSistema = { ...usuario };
    this.usuarios.set(copia.id, copia);
    return { ...copia };
  }

  public async buscarUsuarioPorId(id: string): Promise<UsuarioSistema | null> {
    const item = this.usuarios.get(id);
    return item ? { ...item } : null;
  }

  public async buscarUsuarioPorEmail(email: string): Promise<UsuarioSistema | null> {
    const emailNormalizado = email.trim().toLowerCase();
    for (const usuario of this.usuarios.values()) {
      if (usuario.email.toLowerCase() === emailNormalizado) {
        return { ...usuario };
      }
    }
    return null;
  }

  public async listarUsuariosPorOrganizacao(organizacaoId: string): Promise<UsuarioSistema[]> {
    return Array.from(this.usuarios.values())
      .filter((u) => u.organizacaoId === organizacaoId)
      .map((u) => ({ ...u }));
  }

  public async salvarSessao(sessao: SessaoUsuario): Promise<SessaoUsuario> {
    const copia: SessaoUsuario = { ...sessao };
    this.sessoes.set(copia.id, copia);
    return { ...copia };
  }

  public async buscarSessaoPorId(id: string): Promise<SessaoUsuario | null> {
    const item = this.sessoes.get(id);
    return item ? { ...item } : null;
  }

  public async buscarSessaoPorToken(token: string): Promise<SessaoUsuario | null> {
    for (const sessao of this.sessoes.values()) {
      if (sessao.token === token) {
        return { ...sessao };
      }
    }
    return null;
  }

  public async listarSessoesPorUsuario(usuarioId: string): Promise<SessaoUsuario[]> {
    return Array.from(this.sessoes.values())
      .filter((s) => s.usuarioId === usuarioId)
      .map((s) => ({ ...s }));
  }

  public async limpar(): Promise<void> {
    this.permissoes.clear();
    this.perfis.clear();
    this.usuarios.clear();
    this.sessoes.clear();
  }
}
