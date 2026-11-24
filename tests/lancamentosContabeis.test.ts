import request from 'supertest';
import { criarApp } from '../src/app';

describe('SPEC-2.2: Lançamentos Manuais com Partidas Dobradas (RF-007, RF-008, RB-001)', () => {
  let app: any;
  let planoContasService: any;
  let periodoRepo: any;
  let lancamentoRepo: any;

  const empresaId = 'empresa_teste_001';
  let contaCaixaId: string;
  let contaCapitalId: string;
  let contaSinteticaId: string;
  let contaInativaId: string;

  beforeEach(async () => {
    const instancia = criarApp();
    app = instancia.app;
    planoContasService = instancia.planoContasService;
    periodoRepo = instancia.periodoRepo;
    lancamentoRepo = instancia.lancamentoRepo;

    // Cadastra contas contábeis para apoio aos testes
    // 1. Conta analítica ativa (Caixa)
    const contaCaixa = await planoContasService.criarConta({
      empresaId,
      codigo: '1.1.01.001',
      nome: 'Caixa Geral',
      nivel: 4,
      tipo: 'ANALITICA',
      natureza: 'DEVEDORA',
      classificacao: 'ATIVO',
    });
    contaCaixaId = contaCaixa.id;

    // 2. Conta analítica ativa (Capital Social)
    const contaCapital = await planoContasService.criarConta({
      empresaId,
      codigo: '2.3.01.001',
      nome: 'Capital Social Integralizado',
      nivel: 4,
      tipo: 'ANALITICA',
      natureza: 'CREDORA',
      classificacao: 'PATRIMONIO_LIQUIDO',
    });
    contaCapitalId = contaCapital.id;

    // 3. Conta sintética
    const contaSintetica = await planoContasService.criarConta({
      empresaId,
      codigo: '1.1',
      nome: 'Ativo Circulante',
      nivel: 2,
      tipo: 'SINTETICA',
      natureza: 'DEVEDORA',
      classificacao: 'ATIVO',
    });
    contaSinteticaId = contaSintetica.id;

    // 4. Conta inativa
    const contaInativa = await planoContasService.criarConta({
      empresaId,
      codigo: '1.1.01.099',
      nome: 'Conta Bloqueada',
      nivel: 4,
      tipo: 'ANALITICA',
      natureza: 'DEVEDORA',
      classificacao: 'ATIVO',
      ativo: false,
    });
    contaInativaId = contaInativa.id;

    // 5. Centro de custo ativo para os testes de lançamento com vínculo
    await instancia.centroCustoService.cadastrarDimensao({
      id: 'CC-ADM',
      empresaId,
      codigo: 'CC-ADM',
      nome: 'Centro de Custo Administrativo',
      tipo: 'CENTRO_CUSTO',
    });
  });

  /**
   * CA-1: Dado um lançamento manual com data, competência, histórico, documento de origem,
   * partidas de débito e crédito balanceadas, contas ativas e período aberto,
   * quando o usuário solicitar a gravação, então o lançamento é registrado com sucesso.
   */
  describe('CA-1: Registro de lançamento com partidas dobradas balanceadas', () => {
    it('deve registrar com sucesso um lançamento contábil balanceado', async () => {
      const payload = {
        dataLancamento: '2026-11-17',
        competencia: '2026-11',
        historico: 'Integralização de capital em moeda corrente',
        documentoOrigem: 'DOC-001/2026',
        centroCustoId: 'CC-ADM',
        partidas: [
          { contaId: contaCaixaId, tipo: 'DEBITO', valor: 5000.0 },
          { contaId: contaCapitalId, tipo: 'CREDITO', valor: 5000.0 },
        ],
      };

      const res = await request(app)
        .post(`/api/empresas/${empresaId}/lancamentos`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados).toHaveProperty('id');
      expect(res.body.dados.empresaId).toBe(empresaId);
      expect(res.body.dados.valorTotal).toBe(5000.0);
      expect(res.body.dados.partidas).toHaveLength(2);
      expect(res.body.dados.partidas[0].lancamentoId).toBe(res.body.dados.id);
    });
  });

  /**
   * CA-2: Dado um lançamento manual cujas partidas tenham soma de débitos diferente da soma de créditos,
   * quando houver a tentativa de gravação, então o sistema deve rejeitar o lançamento
   * com mensagem clara de desbalanceamento e nenhuma partida deve ser persistida.
   */
  describe('CA-2: Rejeição de lançamento desbalanceado (RB-001)', () => {
    it('deve rejeitar lançamento onde débitos são diferentes de créditos', async () => {
      const payload = {
        dataLancamento: '2026-11-17',
        competencia: '2026-11',
        historico: 'Lançamento com valores desiguais',
        documentoOrigem: 'DOC-ERR-001',
        partidas: [
          { contaId: contaCaixaId, tipo: 'DEBITO', valor: 5000.0 },
          { contaId: contaCapitalId, tipo: 'CREDITO', valor: 4500.0 },
        ],
      };

      const res = await request(app)
        .post(`/api/empresas/${empresaId}/lancamentos`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toContain('Lançamento desbalanceado');
      expect(res.body.mensagem).toContain('Diferença: R$ 500.00');

      // Verifica que nada foi persistido
      const listagem = await request(app).get(`/api/empresas/${empresaId}/lancamentos`);
      expect(listagem.body.dados).toHaveLength(0);
    });
  });

  /**
   * CA-3: Dado um lançamento contábil direcionado a uma competência cujo período contábil esteja fechado/encerrado,
   * quando o usuário tentar gravar o lançamento, então o sistema deve bloquear o registro informando que o período está encerrado.
   */
  describe('CA-3: Bloqueio de lançamentos em período contábil fechado', () => {
    it('deve rejeitar lançamento quando o período contábil estiver encerrado', async () => {
      // Encerra a competência 2026-10
      await periodoRepo.definirStatus(empresaId, '2026-10', 'ENCERRADO');

      const payload = {
        dataLancamento: '2026-10-31',
        competencia: '2026-10',
        historico: 'Tentativa de lançamento em mês encerrado',
        documentoOrigem: 'DOC-ENC-001',
        partidas: [
          { contaId: contaCaixaId, tipo: 'DEBITO', valor: 100.0 },
          { contaId: contaCapitalId, tipo: 'CREDITO', valor: 100.0 },
        ],
      };

      const res = await request(app)
        .post(`/api/empresas/${empresaId}/lancamentos`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toContain('está encerrado');
    });
  });

  /**
   * CA-4: Dado um lançamento contábil em que uma ou mais partidas estejam vinculadas a contas inativas ou sintéticas,
   * quando houver a tentativa de gravação, então o sistema deve rejeitar a operação informando que a conta não está apta.
   */
  describe('CA-4: Bloqueio de contas inativas ou sintéticas em partidas', () => {
    it('deve rejeitar lançamento com conta sintética', async () => {
      const payload = {
        dataLancamento: '2026-11-17',
        competencia: '2026-11',
        historico: 'Lançamento em conta sintética',
        documentoOrigem: 'DOC-SINT-001',
        partidas: [
          { contaId: contaSinteticaId, tipo: 'DEBITO', valor: 200.0 },
          { contaId: contaCapitalId, tipo: 'CREDITO', valor: 200.0 },
        ],
      };

      const res = await request(app)
        .post(`/api/empresas/${empresaId}/lancamentos`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toContain('Apenas contas analíticas recebem lançamentos');
    });

    it('deve rejeitar lançamento com conta inativa', async () => {
      const payload = {
        dataLancamento: '2026-11-17',
        competencia: '2026-11',
        historico: 'Lançamento em conta inativa',
        documentoOrigem: 'DOC-INAT-001',
        partidas: [
          { contaId: contaInativaId, tipo: 'DEBITO', valor: 300.0 },
          { contaId: contaCapitalId, tipo: 'CREDITO', valor: 300.0 },
        ],
      };

      const res = await request(app)
        .post(`/api/empresas/${empresaId}/lancamentos`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toContain('está inativa e não pode receber lançamentos');
    });
  });

  /**
   * CA-5: Dado um lançamento com partidas que possuam valores zerados ou negativos,
   * quando houver a tentativa de gravação, então o sistema deve rejeitar o registro indicando inconsistência de valores.
   */
  describe('CA-5: Bloqueio de partidas com valores inconsistentes (zero ou negativos)', () => {
    it('deve rejeitar lançamento com partida de valor zero', async () => {
      const payload = {
        dataLancamento: '2026-11-17',
        competencia: '2026-11',
        historico: 'Lançamento com valor zero',
        documentoOrigem: 'DOC-VAL-001',
        partidas: [
          { contaId: contaCaixaId, tipo: 'DEBITO', valor: 0 },
          { contaId: contaCapitalId, tipo: 'CREDITO', valor: 0 },
        ],
      };

      const res = await request(app)
        .post(`/api/empresas/${empresaId}/lancamentos`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toContain('Inconsistência de valores');
    });

    it('deve rejeitar lançamento com partida de valor negativo', async () => {
      const payload = {
        dataLancamento: '2026-11-17',
        competencia: '2026-11',
        historico: 'Lançamento com valor negativo',
        documentoOrigem: 'DOC-NEG-001',
        partidas: [
          { contaId: contaCaixaId, tipo: 'DEBITO', valor: -50.0 },
          { contaId: contaCapitalId, tipo: 'CREDITO', valor: -50.0 },
        ],
      };

      const res = await request(app)
        .post(`/api/empresas/${empresaId}/lancamentos`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toContain('Inconsistência de valores');
    });
  });

  describe('Consultas de Lançamentos Registrados', () => {
    it('deve listar lançamentos e consultar lançamento específico por ID', async () => {
      const payload = {
        dataLancamento: '2026-11-17',
        competencia: '2026-11',
        historico: 'Depósito inicial de sócios',
        documentoOrigem: 'DOC-1234',
        partidas: [
          { contaId: contaCaixaId, tipo: 'DEBITO', valor: 1000.0 },
          { contaId: contaCapitalId, tipo: 'CREDITO', valor: 1000.0 },
        ],
      };

      const resCriacao = await request(app)
        .post(`/api/empresas/${empresaId}/lancamentos`)
        .send(payload);

      const lancamentoId = resCriacao.body.dados.id;

      // Listar lançamentos
      const resLista = await request(app).get(`/api/empresas/${empresaId}/lancamentos`);
      expect(resLista.status).toBe(200);
      expect(resLista.body.dados).toHaveLength(1);

      // Buscar por ID
      const resBusca = await request(app).get(`/api/empresas/${empresaId}/lancamentos/${lancamentoId}`);
      expect(resBusca.status).toBe(200);
      expect(resBusca.body.dados.id).toBe(lancamentoId);
      expect(resBusca.body.dados.historico).toBe('Depósito inicial de sócios');
    });
  });
});
