import request from 'supertest';
import { criarApp } from '../src/app';
import { InMemoryCentroCustoRepository } from '../src/repositories/CentroCustoRepository';
import { InMemoryLancamentoContabilRepository } from '../src/repositories/LancamentoContabilRepository';
import { InMemoryPlanoContasRepository } from '../src/repositories/PlanoContasRepository';

describe('SPEC-2.6: Centros de custo e comparativos (RF-014)', () => {
  let app: any;
  let centroCustoRepo: InMemoryCentroCustoRepository;
  let lancamentoRepo: InMemoryLancamentoContabilRepository;
  let planoContasRepo: InMemoryPlanoContasRepository;

  const empresaFicticiaId = 'empresa-ficticia-cc-001';
  let contaDespesaId: string;
  let contaCaixaId: string;

  beforeEach(async () => {
    const instancia = criarApp();
    app = instancia.app;
    centroCustoRepo = instancia.centroCustoRepo;
    lancamentoRepo = instancia.lancamentoRepo;
    planoContasRepo = instancia.planoContasRepo;

    await centroCustoRepo.limpar();
    await lancamentoRepo.limpar();
    await planoContasRepo.limpar();

    const resDespesa = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/plano-contas`)
      .send({
        codigo: '4.1.01.001',
        nome: 'Despesas Operacionais Fictícias',
        nivel: 4,
        tipo: 'ANALITICA',
        natureza: 'DEVEDORA',
        classificacao: 'DESPESA',
      });
    contaDespesaId = resDespesa.body.dados.id;

    const resCaixa = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/plano-contas`)
      .send({
        codigo: '1.1.01.001',
        nome: 'Caixa Geral Fictício',
        nivel: 4,
        tipo: 'ANALITICA',
        natureza: 'DEVEDORA',
        classificacao: 'ATIVO',
      });
    contaCaixaId = resCaixa.body.dados.id;
  });

  /**
   * CA-1: Dada uma empresa existente, quando forem cadastrados centros de custo,
   * departamentos, projetos ou unidades com código único, nome e tipo válido,
   * então os registros devem ser persistidos e listados vinculados à empresa (RF-014).
   */
  describe('CA-1: Cadastro de centros de custo, departamentos, projetos e unidades', () => {
    it('deve cadastrar e listar as 4 dimensões gerenciais vinculadas à empresa', async () => {
      const dimensoes = [
        { codigo: 'CC-01', nome: 'Centro de Custo Comercial', tipo: 'CENTRO_CUSTO' },
        { codigo: 'DEP-01', nome: 'Departamento Fiscal', tipo: 'DEPARTAMENTO' },
        { codigo: 'PRJ-01', nome: 'Projeto Implantação ERP', tipo: 'PROJETO' },
        { codigo: 'UNI-01', nome: 'Unidade Goiânia', tipo: 'UNIDADE' },
      ];

      for (const dim of dimensoes) {
        const res = await request(app)
          .post(`/api/empresas/${empresaFicticiaId}/centros-custo`)
          .send(dim);
        expect(res.status).toBe(201);
        expect(res.body.dados.empresaId).toBe(empresaFicticiaId);
        expect(res.body.dados.tipo).toBe(dim.tipo);
      }

      const listagem = await request(app).get(
        `/api/empresas/${empresaFicticiaId}/centros-custo`
      );
      expect(listagem.status).toBe(200);
      expect(listagem.body.dados).toHaveLength(4);
    });
  });

  /**
   * CA-2: Dado um centro de custo ativo cadastrado para a empresa,
   * quando um lançamento contábil for registrado associando esse centro de custo,
   * então o lançamento e suas partidas devem persistir o vínculo com o centro de custo (RF-014).
   */
  describe('CA-2: Associação de centro de custo em lançamento contábil', () => {
    it('deve registrar lançamento contábil associando centro de custo ativo no cabeçalho e partidas', async () => {
      const ccRes = await request(app)
        .post(`/api/empresas/${empresaFicticiaId}/centros-custo`)
        .send({
          codigo: 'CC-TI',
          nome: 'Tecnologia da Informação',
          tipo: 'CENTRO_CUSTO',
        });
      const ccId = ccRes.body.dados.id;

      const lancRes = await request(app)
        .post(`/api/empresas/${empresaFicticiaId}/lancamentos`)
        .send({
          dataLancamento: '2026-10-15',
          competencia: '2026-10',
          historico: 'Assinatura de software fictício',
          documentoOrigem: 'NF-1001',
          centroCustoId: ccId,
          partidas: [
            { contaId: contaDespesaId, tipo: 'DEBITO', valor: 1200, centroCustoId: ccId },
            { contaId: contaCaixaId, tipo: 'CREDITO', valor: 1200 },
          ],
        });

      expect(lancRes.status).toBe(201);
      expect(lancRes.body.dados.centroCustoId).toBe(ccId);
      expect(lancRes.body.dados.partidas[0].centroCustoId).toBe(ccId);
    });
  });

  /**
   * CA-3: Dados dois períodos (competência inicial e competência comparada)
   * com lançamentos associados a centros de custo, quando for solicitado o relatório comparativo por período,
   * então o sistema deve retornar os valores consolidados de ambos os períodos e a variação calculada (RF-014).
   */
  describe('CA-3: Relatório comparativo entre dois períodos por centro de custo', () => {
    it('deve consolidar os lançamentos de dois períodos e calcular variação absoluta e percentual', async () => {
      const ccRes = await request(app)
        .post(`/api/empresas/${empresaFicticiaId}/centros-custo`)
        .send({
          codigo: 'DEP-OPS',
          nome: 'Operações Contábeis',
          tipo: 'DEPARTAMENTO',
        });
      const ccId = ccRes.body.dados.id;

      // Lançamento em 2026-10 (R$ 1.000,00 a débito no DEP-OPS)
      await request(app)
        .post(`/api/empresas/${empresaFicticiaId}/lancamentos`)
        .send({
          dataLancamento: '2026-10-20',
          competencia: '2026-10',
          historico: 'Despesa Operacional Outubro',
          documentoOrigem: 'NF-OUT',
          partidas: [
            { contaId: contaDespesaId, tipo: 'DEBITO', valor: 1000, centroCustoId: ccId },
            { contaId: contaCaixaId, tipo: 'CREDITO', valor: 1000 },
          ],
        });

      // Lançamento em 2026-11 (R$ 1.500,00 a débito no DEP-OPS -> +50%)
      await request(app)
        .post(`/api/empresas/${empresaFicticiaId}/lancamentos`)
        .send({
          dataLancamento: '2026-11-20',
          competencia: '2026-11',
          historico: 'Despesa Operacional Novembro',
          documentoOrigem: 'NF-NOV',
          partidas: [
            { contaId: contaDespesaId, tipo: 'DEBITO', valor: 1500, centroCustoId: ccId },
            { contaId: contaCaixaId, tipo: 'CREDITO', valor: 1500 },
          ],
        });

      const compRes = await request(app).get(
        `/api/empresas/${empresaFicticiaId}/centros-custo/comparativo?periodoBase=2026-10&periodoComparado=2026-11`
      );

      expect(compRes.status).toBe(200);
      expect(compRes.body.dados.periodoBase).toBe('2026-10');
      expect(compRes.body.dados.periodoComparado).toBe('2026-11');
      expect(compRes.body.dados.itens).toHaveLength(1);

      const item = compRes.body.dados.itens[0];
      expect(item.codigo).toBe('DEP-OPS');
      expect(item.periodoBase.totalDebitos).toBe(1000);
      expect(item.periodoComparado.totalDebitos).toBe(1500);
      expect(item.variacaoAbsolutaDebitos).toBe(500);
      expect(item.variacaoPercentualDebitos).toBe(50);
    });
  });

  /**
   * CA-4: Dado o cadastro de centro de custo ou lançamento contábil,
   * quando o código for duplicado na mesma empresa, o centro de custo associado não existir/estiver inativo
   * ou faltar um dos períodos no comparativo, então o sistema deve recusar a operação (RF-014).
   */
  describe('CA-4: Recusa de código duplicado, centro de custo inválido/inativo e comparativo incompleto', () => {
    it('deve recusar código duplicado, lançamento com centro de custo inexistente/inativo e comparativo sem período', async () => {
      const ccRes = await request(app)
        .post(`/api/empresas/${empresaFicticiaId}/centros-custo`)
        .send({
          codigo: 'CC-UNICO',
          nome: 'Centro Único',
          tipo: 'CENTRO_CUSTO',
        });
      const ccId = ccRes.body.dados.id;

      // 1. Código duplicado na mesma empresa -> 400
      const dupRes = await request(app)
        .post(`/api/empresas/${empresaFicticiaId}/centros-custo`)
        .send({
          codigo: 'CC-UNICO',
          nome: 'Outro Nome',
          tipo: 'CENTRO_CUSTO',
        });
      expect(dupRes.status).toBe(400);
      expect(dupRes.body.erro).toMatch(/Já existe/i);

      // 2. Lançamento com centro de custo inexistente -> 400
      const ccInexistenteRes = await request(app)
        .post(`/api/empresas/${empresaFicticiaId}/lancamentos`)
        .send({
          dataLancamento: '2026-11-18',
          competencia: '2026-11',
          historico: 'Tentativa CC inexistente',
          documentoOrigem: 'DOC-ERR-1',
          centroCustoId: 'cc-inexistente',
          partidas: [
            { contaId: contaDespesaId, tipo: 'DEBITO', valor: 100 },
            { contaId: contaCaixaId, tipo: 'CREDITO', valor: 100 },
          ],
        });
      expect(ccInexistenteRes.status).toBe(400);
      expect(ccInexistenteRes.body.mensagem).toMatch(/não encontrado/i);

      // 3. Inativa o centro de custo e tenta associar -> 400
      await request(app).patch(
        `/api/empresas/${empresaFicticiaId}/centros-custo/${ccId}/inativar`
      );
      const ccInativoRes = await request(app)
        .post(`/api/empresas/${empresaFicticiaId}/lancamentos`)
        .send({
          dataLancamento: '2026-11-18',
          competencia: '2026-11',
          historico: 'Tentativa CC inativo',
          documentoOrigem: 'DOC-ERR-2',
          centroCustoId: ccId,
          partidas: [
            { contaId: contaDespesaId, tipo: 'DEBITO', valor: 100 },
            { contaId: contaCaixaId, tipo: 'CREDITO', valor: 100 },
          ],
        });
      expect(ccInativoRes.status).toBe(400);
      expect(ccInativoRes.body.mensagem).toMatch(/inativo/i);

      // 4. Comparativo faltando períodoComparado -> 400
      const compInvalido = await request(app).get(
        `/api/empresas/${empresaFicticiaId}/centros-custo/comparativo?periodoBase=2026-10`
      );
      expect(compInvalido.status).toBe(400);
    });

    it('deve recusar centro de custo inexistente mesmo quando a empresa ainda não possui centros de custo cadastrados', async () => {
      const res = await request(app)
        .post(`/api/empresas/${empresaFicticiaId}/lancamentos`)
        .send({
          dataLancamento: '2026-11-18',
          competencia: '2026-11',
          historico: 'Tentativa CC sem nenhum cadastro prévio',
          documentoOrigem: 'DOC-ERR-SEM-CC',
          centroCustoId: 'cc-inexistente-sem-cadastro',
          partidas: [
            { contaId: contaDespesaId, tipo: 'DEBITO', valor: 100 },
            { contaId: contaCaixaId, tipo: 'CREDITO', valor: 100 },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.mensagem).toMatch(/não encontrado/i);
    });
  });
});
