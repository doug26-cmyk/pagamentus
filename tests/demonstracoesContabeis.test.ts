import request from 'supertest';
import { criarApp } from '../src/app';
import { InMemoryLancamentoContabilRepository } from '../src/repositories/LancamentoContabilRepository';
import { InMemoryPlanoContasRepository } from '../src/repositories/PlanoContasRepository';

describe('SPEC-2.8: Balanço Patrimonial, DRE, DFC e DMPL/DLPA (RF-013)', () => {
  let app: any;
  let lancamentoRepo: InMemoryLancamentoContabilRepository;
  let planoContasRepo: InMemoryPlanoContasRepository;

  const empresaFicticiaId = 'empresa-ficticia-dem-001';
  let contaCaixaId: string;
  let contaFornecedorId: string;
  let contaCapitalId: string;
  let contaReceitaId: string;
  let contaDespesaId: string;

  beforeEach(async () => {
    const instancia = criarApp();
    app = instancia.app;
    lancamentoRepo = instancia.lancamentoRepo;
    planoContasRepo = instancia.planoContasRepo;

    await lancamentoRepo.limpar();
    await planoContasRepo.limpar();

    const criarConta = async (dados: any) => {
      const res = await request(app)
        .post(`/api/empresas/${empresaFicticiaId}/plano-contas`)
        .send(dados);
      return res.body.dados.id;
    };

    contaCaixaId = await criarConta({
      codigo: '1.1.01.001',
      nome: 'Caixa Geral Fictício',
      nivel: 4,
      tipo: 'ANALITICA',
      natureza: 'DEVEDORA',
      classificacao: 'ATIVO',
    });

    contaFornecedorId = await criarConta({
      codigo: '2.1.01.001',
      nome: 'Fornecedores Fictícios',
      nivel: 4,
      tipo: 'ANALITICA',
      natureza: 'CREDORA',
      classificacao: 'PASSIVO',
    });

    contaCapitalId = await criarConta({
      codigo: '2.3.01.001',
      nome: 'Capital Social Fictício',
      nivel: 4,
      tipo: 'ANALITICA',
      natureza: 'CREDORA',
      classificacao: 'PATRIMONIO_LIQUIDO',
    });

    contaReceitaId = await criarConta({
      codigo: '3.1.01.001',
      nome: 'Receita de Serviços Fictícia',
      nivel: 4,
      tipo: 'ANALITICA',
      natureza: 'CREDORA',
      classificacao: 'RECEITA',
    });

    contaDespesaId = await criarConta({
      codigo: '4.1.01.001',
      nome: 'Despesa Operacional Fictícia',
      nivel: 4,
      tipo: 'ANALITICA',
      natureza: 'DEVEDORA',
      classificacao: 'DESPESA',
    });

    // Cenário único:
    // 1) Outubro/2026: Integralização de capital R$ 10.000,00 (Caixa D 10.000 / Capital C 10.000)
    await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/lancamentos`)
      .send({
        dataLancamento: '2026-10-10',
        competencia: '2026-10',
        historico: 'Integralização inicial de capital',
        documentoOrigem: 'DOC-CAP-01',
        partidas: [
          { contaId: contaCaixaId, tipo: 'DEBITO', valor: 10000 },
          { contaId: contaCapitalId, tipo: 'CREDITO', valor: 10000 },
        ],
      });

    // 2) Novembro/2026: Receita à vista R$ 4.000,00 (Caixa D 4.000 / Receita C 4.000)
    await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/lancamentos`)
      .send({
        dataLancamento: '2026-11-05',
        competencia: '2026-11',
        historico: 'Receita de serviços prestados',
        documentoOrigem: 'NFS-01',
        partidas: [
          { contaId: contaCaixaId, tipo: 'DEBITO', valor: 4000 },
          { contaId: contaReceitaId, tipo: 'CREDITO', valor: 4000 },
        ],
      });

    // 3) Novembro/2026: Despesa a prazo com fornecedor R$ 1.500,00 (Despesa D 1.500 / Fornecedor C 1.500)
    await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/lancamentos`)
      .send({
        dataLancamento: '2026-11-12',
        competencia: '2026-11',
        historico: 'Serviço tomado de fornecedor',
        documentoOrigem: 'NF-02',
        partidas: [
          { contaId: contaDespesaId, tipo: 'DEBITO', valor: 1500 },
          { contaId: contaFornecedorId, tipo: 'CREDITO', valor: 1500 },
        ],
      });

    // 4) Novembro/2026: Pagamento parcial de fornecedor R$ 500,00 (Fornecedor D 500 / Caixa C 500)
    await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/lancamentos`)
      .send({
        dataLancamento: '2026-11-20',
        competencia: '2026-11',
        historico: 'Pagamento parcial a fornecedor',
        documentoOrigem: 'PAG-01',
        partidas: [
          { contaId: contaFornecedorId, tipo: 'DEBITO', valor: 500 },
          { contaId: contaCaixaId, tipo: 'CREDITO', valor: 500 },
        ],
      });
  });

  /**
   * CA-1: Balanço Patrimonial
   */
  it('CA-1: deve gerar o Balanço Patrimonial fechando Ativo = Passivo + Patrimônio Líquido', async () => {
    const res = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/demonstracoes/balanco?competencia=2026-11`
    );

    expect(res.status).toBe(200);
    const bp = res.body.dados;

    // Caixa: 10.000 + 4.000 - 500 = 13.500
    expect(bp.ativo.total).toBe(13500);
    // Fornecedores: 1.500 - 500 = 1.000
    expect(bp.passivo.total).toBe(1000);
    // PL: Capital (10.000) + Resultado (4.000 - 1.500 = 2.500) = 12.500
    expect(bp.patrimonioLiquido.totalSemResultado).toBe(10000);
    expect(bp.patrimonioLiquido.resultadoExercicio).toBe(2500);
    expect(bp.patrimonioLiquido.totalAjustado).toBe(12500);

    expect(bp.totalAtivo).toBe(13500);
    expect(bp.totalPassivoEPatrimonioLiquido).toBe(13500);
    expect(bp.equacaoPatrimonialFechada).toBe(true);
  });

  /**
   * CA-2: DRE
   */
  it('CA-2: deve gerar a DRE com receitas, despesas e resultado líquido do período', async () => {
    const res = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/demonstracoes/dre?competencia=2026-11`
    );

    expect(res.status).toBe(200);
    const dre = res.body.dados;

    expect(dre.receitas.total).toBe(4000);
    expect(dre.despesas.total).toBe(1500);
    expect(dre.resultadoLiquido).toBe(2500);
  });

  /**
   * CA-3: DFC e DMPL/DLPA quando aplicáveis (e sinalização quando não aplicáveis)
   */
  it('CA-3: deve gerar DFC e DMPL/DLPA aplicáveis com totais conferidos e indicar não aplicável quando sem dados', async () => {
    const resDfc = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/demonstracoes/dfc?competencia=2026-11`
    );
    expect(resDfc.status).toBe(200);
    const dfc = resDfc.body.dados;

    expect(dfc.aplicavel).toBe(true);
    expect(dfc.saldoInicial).toBe(10000);
    expect(dfc.entradas).toBe(4000);
    expect(dfc.saidas).toBe(500);
    expect(dfc.variacaoLiquida).toBe(3500);
    expect(dfc.saldoFinal).toBe(13500);

    const resDmpl = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/demonstracoes/dmpl?competencia=2026-11`
    );
    expect(resDmpl.status).toBe(200);
    const dmpl = resDmpl.body.dados;

    expect(dmpl.aplicavel).toBe(true);
    expect(dmpl.saldoInicial).toBe(10000);
    expect(dmpl.mutacoesNoPeriodo).toBe(0);
    expect(dmpl.resultadoPeriodo).toBe(2500);
    expect(dmpl.saldoFinal).toBe(12500);

    // Empresa sem contas/movimentações deve indicar aplicavel: false
    const resDfcVazia = await request(app).get(
      `/api/empresas/empresa-sem-caixa/demonstracoes/dfc?competencia=2026-11`
    );
    expect(resDfcVazia.status).toBe(200);
    expect(resDfcVazia.body.dados.aplicavel).toBe(false);

    const resDmplVazia = await request(app).get(
      `/api/empresas/empresa-sem-pl/demonstracoes/dmpl?competencia=2026-11`
    );
    expect(resDmplVazia.status).toBe(200);
    expect(resDmplVazia.body.dados.aplicavel).toBe(false);
  });

  /**
   * CA-4: Consistência entre demonstrações e validação de entrada
   */
  it('CA-4: deve manter consistência entre DRE, Balanço, DFC e DMPL e recusar competência inválida', async () => {
    const [resBp, resDre, resDfc, resDmpl] = await Promise.all([
      request(app).get(
        `/api/empresas/${empresaFicticiaId}/demonstracoes/balanco?competencia=2026-11`
      ),
      request(app).get(
        `/api/empresas/${empresaFicticiaId}/demonstracoes/dre?competencia=2026-11`
      ),
      request(app).get(
        `/api/empresas/${empresaFicticiaId}/demonstracoes/dfc?competencia=2026-11`
      ),
      request(app).get(
        `/api/empresas/${empresaFicticiaId}/demonstracoes/dmpl?competencia=2026-11`
      ),
    ]);

    expect(resDre.body.dados.resultadoLiquido).toBe(
      resBp.body.dados.patrimonioLiquido.resultadoExercicio
    );
    expect(resDre.body.dados.resultadoLiquido).toBe(
      resDmpl.body.dados.resultadoPeriodo
    );
    expect(resDmpl.body.dados.saldoFinal).toBe(
      resBp.body.dados.patrimonioLiquido.totalAjustado
    );
    expect(resDfc.body.dados.saldoFinal).toBe(resBp.body.dados.ativo.total);

    const resInvalido = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/demonstracoes/balanco?competencia=invalida`
    );
    expect(resInvalido.status).toBe(400);
  });
});
