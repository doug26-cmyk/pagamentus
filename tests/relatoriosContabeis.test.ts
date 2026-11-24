import request from 'supertest';
import { criarApp } from '../src/app';
import { InMemoryLancamentoContabilRepository } from '../src/repositories/LancamentoContabilRepository';
import { InMemoryPlanoContasRepository } from '../src/repositories/PlanoContasRepository';

describe('SPEC-2.7: Balancete, razão, diário e relatório auxiliar (RF-013)', () => {
  let app: any;
  let lancamentoRepo: InMemoryLancamentoContabilRepository;
  let planoContasRepo: InMemoryPlanoContasRepository;

  const empresaFicticiaId = 'empresa-ficticia-rel-001';
  let contaCaixaId: string;
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
      nome: 'Despesa Administrativa Fictícia',
      nivel: 4,
      tipo: 'ANALITICA',
      natureza: 'DEVEDORA',
      classificacao: 'DESPESA',
    });

    // Cenário de lançamentos:
    // 1) Outubro/2026: Integralização de capital R$ 10.000,00 (Caixa D 10.000 / Capital C 10.000)
    await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/lancamentos`)
      .send({
        dataLancamento: '2026-10-15',
        competencia: '2026-10',
        historico: 'Integralização inicial de capital',
        documentoOrigem: 'DOC-001',
        partidas: [
          { contaId: contaCaixaId, tipo: 'DEBITO', valor: 10000 },
          { contaId: contaCapitalId, tipo: 'CREDITO', valor: 10000 },
        ],
      });

    // 2) Novembro/2026 (dia 05): Recebimento de serviços R$ 3.000,00 (Caixa D 3.000 / Receita C 3.000)
    await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/lancamentos`)
      .send({
        dataLancamento: '2026-11-05',
        competencia: '2026-11',
        historico: 'Recebimento por prestação de serviços',
        documentoOrigem: 'NFS-101',
        partidas: [
          { contaId: contaCaixaId, tipo: 'DEBITO', valor: 3000 },
          { contaId: contaReceitaId, tipo: 'CREDITO', valor: 3000 },
        ],
      });

    // 3) Novembro/2026 (dia 12): Pagamento de despesa R$ 1.200,00 (Despesa D 1.200 / Caixa C 1.200)
    await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/lancamentos`)
      .send({
        dataLancamento: '2026-11-12',
        competencia: '2026-11',
        historico: 'Pagamento de despesa operacional',
        documentoOrigem: 'NF-202',
        partidas: [
          { contaId: contaDespesaId, tipo: 'DEBITO', valor: 1200 },
          { contaId: contaCaixaId, tipo: 'CREDITO', valor: 1200 },
        ],
      });
  });

  /**
   * CA-1: Balancete de Verificação
   */
  it('CA-1: deve gerar o balancete de verificação com saldos e totais batendo com os lançamentos', async () => {
    const res = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/relatorios/balancete?competencia=2026-11`
    );

    expect(res.status).toBe(200);
    const balancete = res.body.dados;

    expect(balancete.totalDebitos).toBe(4200);
    expect(balancete.totalCreditos).toBe(4200);
    expect(balancete.contas).toHaveLength(4);

    const caixa = balancete.contas.find((c: any) => c.contaId === contaCaixaId);
    expect(caixa.saldoAnterior).toBe(10000);
    expect(caixa.totalDebitos).toBe(3000);
    expect(caixa.totalCreditos).toBe(1200);
    expect(caixa.saldoFinal).toBe(11800);

    const capital = balancete.contas.find((c: any) => c.contaId === contaCapitalId);
    expect(capital.saldoAnterior).toBe(10000);
    expect(capital.totalDebitos).toBe(0);
    expect(capital.totalCreditos).toBe(0);
    expect(capital.saldoFinal).toBe(10000);

    const receita = balancete.contas.find((c: any) => c.contaId === contaReceitaId);
    expect(receita.saldoAnterior).toBe(0);
    expect(receita.totalCreditos).toBe(3000);
    expect(receita.saldoFinal).toBe(3000);

    const despesa = balancete.contas.find((c: any) => c.contaId === contaDespesaId);
    expect(despesa.saldoAnterior).toBe(0);
    expect(despesa.totalDebitos).toBe(1200);
    expect(despesa.saldoFinal).toBe(1200);
  });

  /**
   * CA-2: Livro Razão
   */
  it('CA-2: deve gerar o livro razão cronológico da conta Caixa com saldo progressivo correto', async () => {
    const res = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/relatorios/razao?contaId=${contaCaixaId}&competencia=2026-11`
    );

    expect(res.status).toBe(200);
    const razao = res.body.dados;

    expect(razao.conta.codigo).toBe('1.1.01.001');
    expect(razao.saldoAnterior).toBe(10000);
    expect(razao.movimentos).toHaveLength(2);
    expect(razao.movimentos[0].dataLancamento).toBe('2026-11-05');
    expect(razao.movimentos[0].debito).toBe(3000);
    expect(razao.movimentos[0].saldoAcumulado).toBe(13000);

    expect(razao.movimentos[1].dataLancamento).toBe('2026-11-12');
    expect(razao.movimentos[1].credito).toBe(1200);
    expect(razao.movimentos[1].saldoAcumulado).toBe(11800);

    expect(razao.totalDebitos).toBe(3000);
    expect(razao.totalCreditos).toBe(1200);
    expect(razao.saldoFinal).toBe(11800);
  });

  /**
   * CA-3: Livro Diário
   */
  it('CA-3: deve gerar o livro diário cronológico com partidas e totais do período', async () => {
    const res = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/relatorios/diario?competencia=2026-11`
    );

    expect(res.status).toBe(200);
    const diario = res.body.dados;

    expect(diario.lancamentos).toHaveLength(2);
    expect(diario.lancamentos[0].dataLancamento).toBe('2026-11-05');
    expect(diario.lancamentos[0].documentoOrigem).toBe('NFS-101');
    expect(diario.lancamentos[0].partidas).toHaveLength(2);

    expect(diario.lancamentos[1].dataLancamento).toBe('2026-11-12');
    expect(diario.lancamentos[1].documentoOrigem).toBe('NF-202');

    expect(diario.totalDebitos).toBe(4200);
    expect(diario.totalCreditos).toBe(4200);
  });

  /**
   * CA-4: Relatório Auxiliar e validações de consulta
   */
  it('CA-4: deve gerar o relatório auxiliar consistente e recusar parâmetros inválidos ou conta inexistente', async () => {
    const resAux = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/relatorios/auxiliar?competencia=2026-11`
    );

    expect(resAux.status).toBe(200);
    const auxiliar = resAux.body.dados;

    expect(auxiliar.totalDebitos).toBe(4200);
    expect(auxiliar.totalCreditos).toBe(4200);
    expect(auxiliar.itens).toHaveLength(3);

    const caixaAux = auxiliar.itens.find((i: any) => i.contaId === contaCaixaId);
    expect(caixaAux.quantidadePartidas).toBe(2);
    expect(caixaAux.totalDebitos).toBe(3000);
    expect(caixaAux.totalCreditos).toBe(1200);
    expect(caixaAux.saldoMovimento).toBe(1800);

    // Recusa competência ausente/inválida
    const resSemComp = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/relatorios/balancete`
    );
    expect(resSemComp.status).toBe(400);

    // Recusa conta inexistente no Razão
    const resContaInexistente = await request(app).get(
      `/api/empresas/${empresaFicticiaId}/relatorios/razao?contaId=conta-inexistente&competencia=2026-11`
    );
    expect(resContaInexistente.status).toBe(400);
  });
});
