import request from 'supertest';
import { criarApp } from '../src/app';
import { InMemoryAutenticacaoRepository } from '../src/repositories/AutenticacaoRepository';
import { AutenticacaoService } from '../src/services/AutenticacaoService';
import { InMemoryIsolamentoClienteRepository } from '../src/repositories/IsolamentoClienteRepository';
import { CriptografiaSegurancaService } from '../src/services/CriptografiaSegurancaService';

describe('SPEC-1.5: Perfis, permissões e isolamento entre clientes (RB-008, RNF-001)', () => {
  let app: any;
  let authRepo: InMemoryAutenticacaoRepository;
  let authService: AutenticacaoService;
  let isolamentoRepo: InMemoryIsolamentoClienteRepository;
  let criptoService: CriptografiaSegurancaService;

  const clienteAId = 'cliente-ficticio-alfa-001';
  const clienteBId = 'cliente-ficticio-beta-002';

  let perfilGestorId: string;
  let perfilApenasLeituraId: string;

  let tokenUsuarioClienteA: string;
  let usuarioClienteAId: string;

  let tokenUsuarioClienteB: string;
  let usuarioClienteBId: string;

  let tokenLeitorClienteA: string;

  beforeEach(async () => {
    const instancia = criarApp();
    app = instancia.app;
    authRepo = instancia.authRepo;
    authService = instancia.authService;
    isolamentoRepo = instancia.isolamentoRepo;
    criptoService = instancia.criptoService;

    await authRepo.limpar();
    await isolamentoRepo.limpar();

    // Cadastro das permissões granulares (Menor Privilégio - RNF-001)
    await authService.criarPermissao({
      chave: 'clientes:dados:ler',
      descricao: 'Permite visualizar registros do cliente autorizado',
    });
    await authService.criarPermissao({
      chave: 'clientes:dados:escrever',
      descricao: 'Permite criar registros no cliente autorizado',
    });
    await authService.criarPermissao({
      chave: 'clientes:dados:excluir',
      descricao: 'Permite excluir registros do cliente autorizado',
    });
    await authService.criarPermissao({
      chave: 'clientes:autorizacao:gerenciar',
      descricao: 'Permite conceder e revogar autorizações expressas do próprio cliente',
    });

    // Perfil Gestor (possui leitura, escrita, exclusão e gestão de autorização)
    const perfilGestor = await authService.criarPerfil({
      nome: 'Gestor Cliente',
      descricao: 'Perfil com permissões de leitura, escrita e gestão de autorização',
      privilegiado: false,
      permissoes: [
        'clientes:dados:ler',
        'clientes:dados:escrever',
        'clientes:dados:excluir',
        'clientes:autorizacao:gerenciar',
      ],
    });
    perfilGestorId = perfilGestor.id;

    // Perfil Apenas Leitura (Menor Privilégio: possui somente leitura, sem escrita nem exclusão)
    const perfilLeitor = await authService.criarPerfil({
      nome: 'Consultor Leitura',
      descricao: 'Perfil restrito apenas para visualização',
      privilegiado: false,
      permissoes: ['clientes:dados:ler'],
    });
    perfilApenasLeituraId = perfilLeitor.id;

    // Usuário vinculado ao Cliente A (Gestor)
    const userA = await authService.cadastrarUsuario({
      organizacaoId: clienteAId,
      perfilId: perfilGestorId,
      nome: 'Representante Cliente Alfa',
      email: 'alfa@exemplo.ficticio.local',
      senha: 'SenhaForteAlfa@2026',
    });
    usuarioClienteAId = userA.id;
    const loginA = await authService.login('alfa@exemplo.ficticio.local', 'SenhaForteAlfa@2026');
    tokenUsuarioClienteA = loginA.token;

    // Usuário vinculado ao Cliente B (Gestor)
    const userB = await authService.cadastrarUsuario({
      organizacaoId: clienteBId,
      perfilId: perfilGestorId,
      nome: 'Representante Cliente Beta',
      email: 'beta@exemplo.ficticio.local',
      senha: 'SenhaForteBeta@2026',
    });
    usuarioClienteBId = userB.id;
    const loginB = await authService.login('beta@exemplo.ficticio.local', 'SenhaForteBeta@2026');
    tokenUsuarioClienteB = loginB.token;

    // Usuário vinculado ao Cliente A com perfil restrito (Apenas Leitura)
    await authService.cadastrarUsuario({
      organizacaoId: clienteAId,
      perfilId: perfilApenasLeituraId,
      nome: 'Leitor Cliente Alfa',
      email: 'leitor.alfa@exemplo.ficticio.local',
      senha: 'SenhaLeitor@2026',
    });
    const loginLeitor = await authService.login(
      'leitor.alfa@exemplo.ficticio.local',
      'SenhaLeitor@2026'
    );
    tokenLeitorClienteA = loginLeitor.token;
  });

  /**
   * CA-1: Dado um usuário autenticado vinculado a um cliente,
   * quando tentar visualizar ou acessar dados pertencentes a outro cliente sem autorização expressa,
   * então o sistema deve negar o acesso e impedir a visualização dos dados (RB-008, RNF-001).
   */
  describe('CA-1: Segregação e bloqueio de acesso entre clientes distintos (RB-008)', () => {
    it('deve impedir que o usuário do Cliente B visualize ou crie registros no Cliente A sem autorização expressa', async () => {
      // Cliente A cria um registro próprio
      const criacaoAlfa = await request(app)
        .post(`/api/clientes/${clienteAId}/registros`)
        .set('Authorization', `Bearer ${tokenUsuarioClienteA}`)
        .send({
          titulo: 'Balancete Confidencial Alfa',
          dadoSensivel: 'CONTA-FICTICIA-0001-ALFA',
        });
      expect(criacaoAlfa.status).toBe(201);

      // Usuário do Cliente B tenta listar os registros do Cliente A -> deve ser negado (403)
      const leituraCruzadaNegada = await request(app)
        .get(`/api/clientes/${clienteAId}/registros`)
        .set('Authorization', `Bearer ${tokenUsuarioClienteB}`);

      expect(leituraCruzadaNegada.status).toBe(403);
      expect(leituraCruzadaNegada.body.sucesso).toBe(false);
      expect(leituraCruzadaNegada.body.erro).toMatch(/isolamento entre clientes|RB-008/i);
      expect(leituraCruzadaNegada.body.dados).toBeUndefined();

      // Usuário do Cliente B tenta inserir registro dentro do Cliente A -> deve ser negado (403)
      const escritaCruzadaNegada = await request(app)
        .post(`/api/clientes/${clienteAId}/registros`)
        .set('Authorization', `Bearer ${tokenUsuarioClienteB}`)
        .send({
          titulo: 'Tentativa Invasao Beta em Alfa',
          dadoSensivel: 'DADO-INDEVIDO',
        });

      expect(escritaCruzadaNegada.status).toBe(403);
    });
  });

  /**
   * CA-2: Dado um usuário com autorização expressa registrada para atuar em nome de outro cliente,
   * quando acessar os dados desse cliente dentro do escopo autorizado,
   * então o sistema deve permitir o acesso respeitando as permissões do seu perfil (RB-008).
   */
  describe('CA-2: Acesso permitido mediante autorização expressa ativa e revogação', () => {
    it('deve permitir o acesso aos dados de outro cliente somente enquanto houver autorização expressa ativa', async () => {
      // 1. Cliente A registra um dado confidencial
      await request(app)
        .post(`/api/clientes/${clienteAId}/registros`)
        .set('Authorization', `Bearer ${tokenUsuarioClienteA}`)
        .send({
          titulo: 'Declaração Fictícia Alfa',
          dadoSensivel: 'PROTOCOLO-SECRETO-ALFA-999',
        });

      // 2. Representante do Cliente A concede autorização expressa para o usuário do Cliente B
      const concessaoRes = await request(app)
        .post(`/api/clientes/${clienteAId}/autorizacoes`)
        .set('Authorization', `Bearer ${tokenUsuarioClienteA}`)
        .send({
          usuarioAutorizadoId: usuarioClienteBId,
        });

      expect(concessaoRes.status).toBe(201);
      const autorizacaoId = concessaoRes.body.dados.id;

      // 3. Agora o usuário do Cliente B consegue visualizar os dados do Cliente A (200)
      const leituraAutorizada = await request(app)
        .get(`/api/clientes/${clienteAId}/registros`)
        .set('Authorization', `Bearer ${tokenUsuarioClienteB}`);

      expect(leituraAutorizada.status).toBe(200);
      expect(leituraAutorizada.body.dados).toHaveLength(1);
      expect(leituraAutorizada.body.dados[0].dadoSensivel).toBe('PROTOCOLO-SECRETO-ALFA-999');

      // 4. Representante do Cliente A revoga a autorização expressa
      const revogacaoRes = await request(app)
        .delete(`/api/clientes/${clienteAId}/autorizacoes/${autorizacaoId}`)
        .set('Authorization', `Bearer ${tokenUsuarioClienteA}`);
      expect(revogacaoRes.status).toBe(200);

      // 5. Após revogação, o acesso do usuário do Cliente B volta a ser negado imediatamente (403)
      const leituraAposRevogacao = await request(app)
        .get(`/api/clientes/${clienteAId}/registros`)
        .set('Authorization', `Bearer ${tokenUsuarioClienteB}`);
      expect(leituraAposRevogacao.status).toBe(403);
    });
  });

  /**
   * CA-3: Dado um usuário autenticado,
   * quando tentar executar uma ação para a qual seu perfil não possui a permissão específica atribuída,
   * então o sistema deve negar a ação aplicando o princípio do menor privilégio (RNF-001).
   */
  describe('CA-3: Aplicação do princípio do menor privilégio por ação (RNF-001)', () => {
    it('deve permitir leitura mas negar criação, exclusão e concessão de autorização para perfil apenas leitura', async () => {
      // Gestor do Cliente A cria um registro
      const criado = await request(app)
        .post(`/api/clientes/${clienteAId}/registros`)
        .set('Authorization', `Bearer ${tokenUsuarioClienteA}`)
        .send({
          titulo: 'Documento Fiscal Fictício',
          dadoSensivel: 'CHAVE-ACESSO-FICTICIA-123',
        });
      const registroId = criado.body.dados.id;

      // Leitor do próprio Cliente A consegue ler (possui 'clientes:dados:ler') -> 200
      const leituraPermitida = await request(app)
        .get(`/api/clientes/${clienteAId}/registros`)
        .set('Authorization', `Bearer ${tokenLeitorClienteA}`);
      expect(leituraPermitida.status).toBe(200);

      // Leitor tenta criar um registro (não possui 'clientes:dados:escrever') -> 403 Negado
      const escritaNegada = await request(app)
        .post(`/api/clientes/${clienteAId}/registros`)
        .set('Authorization', `Bearer ${tokenLeitorClienteA}`)
        .send({
          titulo: 'Registro Nao Autorizado',
          dadoSensivel: 'SEGREDO-TESTE',
        });
      expect(escritaNegada.status).toBe(403);
      expect(escritaNegada.body.erro).toMatch(/clientes:dados:escrever/);

      // Leitor tenta excluir o registro (não possui 'clientes:dados:excluir') -> 403 Negado
      const exclusaoNegada = await request(app)
        .delete(`/api/clientes/${clienteAId}/registros/${registroId}`)
        .set('Authorization', `Bearer ${tokenLeitorClienteA}`);
      expect(exclusaoNegada.status).toBe(403);
      expect(exclusaoNegada.body.erro).toMatch(/clientes:dados:excluir/);

      // Leitor tenta conceder autorização expressa (não possui 'clientes:autorizacao:gerenciar') -> 403 Negado
      const autorizacaoNegada = await request(app)
        .post(`/api/clientes/${clienteAId}/autorizacoes`)
        .set('Authorization', `Bearer ${tokenLeitorClienteA}`)
        .send({ usuarioAutorizadoId: usuarioClienteBId });
      expect(autorizacaoNegada.status).toBe(403);
      expect(autorizacaoNegada.body.erro).toMatch(/clientes:autorizacao:gerenciar/);
    });
  });

  /**
   * CA-4: Dado um dado sensível a ser persistido pelo sistema,
   * quando armazenado, então seu conteúdo deve ser criptografado utilizando chave obtida de variável de ambiente protegida,
   * e o tráfego deve validar os requisitos de transporte seguro TLS (RNF-001).
   */
  describe('CA-4: Criptografia de dados sensíveis armazenados e validação de TLS (RNF-001)', () => {
    it('deve armazenar o dado sensível criptografado (AES-256-GCM) no repositório e validar transporte TLS', async () => {
      const valorSensivelOriginal = 'DADO-BANCARIO-SENSIVEL-FICTICIO-987654';

      const respostaCriacao = await request(app)
        .post(`/api/clientes/${clienteAId}/registros`)
        .set('Authorization', `Bearer ${tokenUsuarioClienteA}`)
        .send({
          titulo: 'Conta Bancária Fictícia',
          dadoSensivel: valorSensivelOriginal,
        });

      expect(respostaCriacao.status).toBe(201);
      expect(respostaCriacao.headers['strict-transport-security']).toContain('max-age=31536000');

      const registroId = respostaCriacao.body.dados.id;

      // Inspeciona diretamente o registro bruto armazenado no repositório
      const registroBrutoNoBanco = await isolamentoRepo.buscarRegistroPorId(registroId);
      expect(registroBrutoNoBanco).not.toBeNull();
      expect(registroBrutoNoBanco!.dadoSensivelCifrado).toBeDefined();
      // Garante que o texto puro NÃO está salvo em aberto no armazenamento
      expect(registroBrutoNoBanco!.dadoSensivelCifrado).not.toContain(valorSensivelOriginal);
      expect(registroBrutoNoBanco!.dadoSensivelCifrado.split(':')).toHaveLength(3);

      // Confirma que a descriptografia restaura o valor exato
      const decifrado = criptoService.decifrarDadoSensivel(
        registroBrutoNoBanco!.dadoSensivelCifrado
      );
      expect(decifrado).toBe(valorSensivelOriginal);

      // Verifica bloqueio de tráfego HTTP inseguro quando TLS é exigido e aceitação quando HTTPS
      const requisicaoHttpInsegura = await request(app)
        .get(`/api/clientes/${clienteAId}/registros`)
        .set('Authorization', `Bearer ${tokenUsuarioClienteA}`)
        .set('x-require-tls', 'true')
        .set('x-forwarded-proto', 'http');

      expect(requisicaoHttpInsegura.status).toBe(403);
      expect(requisicaoHttpInsegura.body.erro).toMatch(/TLS\/HTTPS/i);

      const requisicaoHttpsSegura = await request(app)
        .get(`/api/clientes/${clienteAId}/registros`)
        .set('Authorization', `Bearer ${tokenUsuarioClienteA}`)
        .set('x-require-tls', 'true')
        .set('x-forwarded-proto', 'https');

      expect(requisicaoHttpsSegura.status).toBe(200);
    });
  });
});
