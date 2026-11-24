import request from 'supertest';
import { criarApp } from '../src/app';
import { InMemoryBaixaTituloRepository } from '../src/repositories/BaixaTituloRepository';
import { InMemoryConciliacaoRepository } from '../src/repositories/ConciliacaoRepository';
import { InMemoryLancamentoContabilRepository } from '../src/repositories/LancamentoContabilRepository';
import { InMemoryPlanoContasRepository } from '../src/repositories/PlanoContasRepository';
import { InMemoryTituloFinanceiroRepository } from '../src/repositories/TituloFinanceiroRepository';

describe('SPEC-2.11: Conciliação contábil e bancária (RF-011, RF-048)', () => {
  let app: any;
  let conciliacaoRepo: InMemoryConciliacaoRepository;
  let lancamentoRepo: InMemoryLancamentoContabilRepository;
  let planoContasRepo: InMemoryPlanoContasRepository;
  let tituloRepo: InMemoryTituloFinanceiroRepository;
  let baixaRepo: InMemoryBaixaTituloRepository;

  const empresaFicticiaId = 'empresa-ficticia-conc-001';
  let contaBancoId: string;
  let contaReceitaId: string;
  let contaFornecedorId: string;
  let contaFolhaId: string;
  let contaFiscalId: string;
  let lancamentoRecebimentoId: string;

  beforeEach(async () => {
    const instancia = criarApp();
    app = instancia.app;
    conciliacaoRepo = instancia.conciliacaoRepo;
    lancamentoRepo = instancia.lancamentoRepo;
    planoContasRepo = instancia.planoContasRepo;
    tituloRepo = instancia.tituloFinanceiroRepo;
    baixaRepo = instancia.baixaTituloRepo;

    await conciliacaoRepo.limpar();
    await baixaRepo.limpar();
    await tituloRepo.limpar();
    await lancamentoRepo.limpar();
    await planoContasRepo.limpar();

    const criarConta = async (dados: any) => {
      const res = await request(app)
        .post(`/api/empresas/${empresaFicticiaId}/plano-contas`)
        .send(dados);
      return res.body.dados.id;
    };

    contaBancoId = await criarConta({
      codigo: '1.1.01.002',
      nome: 'Banco Conta Movimento Fictício',
      nivel: 4,
      tipo: 'ANALITICA',
      natureza: 'DEVEDORA',
      classificacao: 'ATIVO',
    });

    contaReceitaId = await criarConta({
      codigo: '3.1.01.001',
      nome: 'Receita de Serviços Fictícia',
      nivel: 4,
      tipo: 'ANALITICA',
      natureza: 'CREDORA',
      classificacao: 'RECEITA',
    });

    contaFornecedorId = await criarConta({
      codigo: '2.1.01.001',
      nome: 'Fornecedores a Pagar Fictício',
      nivel: 4,
      tipo: 'ANALITICA',
      natureza: 'CREDORA',
      classificacao: 'PASSIVO',
    });

    contaFolhaId = await criarConta({
      codigo: '2.1.02.001',
      nome: 'Salários a Pagar Fictício',
      nivel: 4,
      tipo: 'ANALITICA',
      natureza: 'CREDORA',
      classificacao: 'PASSIVO',
    });

    contaFiscalId = await criarConta({
      codigo: '2.1.03.001',
      nome: 'Tributos a Recolher Fictício',
      nivel: 4,
      tipo: 'ANALITICA',
      natureza: 'CREDORA',
      classificacao: 'PASSIVO',
    });

    const resLanc = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/lancamentos`)
      .send({
        dataLancamento: '2026-11-10',
        competencia: '2026-11',
        historico: 'Recebimento de cliente via TED',
        documentoOrigem: 'TED-771',
        partidas: [
          { contaId: contaBancoId, tipo: 'DEBITO', valor: 2500 },
          { contaId: contaReceitaId, tipo: 'CREDITO', valor: 2500 },
        ],
      });
    lancamentoRecebimentoId = resLanc.body.dados.id;
  });

  /**
   * CA-1 e CA-2: Importação de extrato sugere conciliações e usuário confirma manualmente
   */
  it('CA-1 e CA-2: deve importar extrato sugerindo conciliação e permitir confirmação manual', async () => {
    const resImport = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/conciliacao/extratos`)
      .send({
        contaBancariaCodigo: '001-12345-6',
        contaContabilId: contaBancoId,
        saldoInicial: 0,
        itens: [
          {
            data: '2026-11-11',
            historico: 'TED RECEBIDA CLIENTE',
            tipo: 'CREDITO',
            valor: 2500,
          },
          {
            data: '2026-11-12',
            historico: 'TARIFA BANCARIA',
            tipo: 'DEBITO',
            valor: 45,
          },
        ],
      });

    expect(resImport.status).toBe(201);
    const extrato = resImport.body.dados;
    expect(extrato.saldoFinal).toBe(2455);

    const itemSugerido = extrato.itens[0];
    expect(itemSugerido.status).toBe('SUGERIDA');
    expect(itemSugerido.sugestoes.length).toBeGreaterThanOrEqual(1);
    expect(itemSugerido.sugestoes[0].origemId).toBe(lancamentoRecebimentoId);

    const itemPendente = extrato.itens[1];
    expect(itemPendente.status).toBe('PENDENTE');

    // Usuário confirma manualmente a conciliação sugerida (CA-2)
    const resConfirm = await request(app)
      .post(
        `/api/empresas/${empresaFicticiaId}/conciliacao/itens/${itemSugerido.id}/confirmar`
      )
      .send({
        origemTipo: 'LANCAMENTO',
        origemId: lancamentoRecebimentoId,
        confirmadoPor: 'analista.contabil@empresa-ficticia.com',
      });

    expect(resConfirm.status).toBe(200);
    expect(resConfirm.body.dados.status).toBe('CONCILIADA');
    expect(resConfirm.body.dados.vinculoConfirmado.origemId).toBe(
      lancamentoRecebimentoId
    );
  });

  /**
   * CA-3: Conciliação de saldos contábeis com extrato, pagar/receber, folha e fiscal
   */
  it('CA-3: deve conciliar saldos contábeis com extrato bancário, pagar/receber, folha e módulos fiscais', async () => {
    // Cria título a pagar de R$ 1.000 e contabiliza em Fornecedores (1.000), Folha (3.000) e Fiscal (800)
    await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/titulos`)
      .send({
        tipo: 'PAGAR',
        contraparte: { nome: 'Fornecedor Fictício', tipo: 'FORNECEDOR' },
        categoria: 'Serviços',
        condicaoPagamento: '30 dias',
        valorTotal: 1000,
        parcelas: [{ numero: 1, valor: 1000, vencimento: '2026-12-10' }],
      });

    await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/lancamentos`)
      .send({
        dataLancamento: '2026-11-15',
        competencia: '2026-11',
        historico: 'Provisão fornecedor, folha e tributos',
        documentoOrigem: 'PROV-11',
        partidas: [
          { contaId: contaBancoId, tipo: 'DEBITO', valor: 4800 },
          { contaId: contaFornecedorId, tipo: 'CREDITO', valor: 1000 },
          { contaId: contaFolhaId, tipo: 'CREDITO', valor: 3000 },
          { contaId: contaFiscalId, tipo: 'CREDITO', valor: 800 },
        ],
      });

    // Saldo contábil do banco agora é 2500 + 4800 = 7300
    const resSaldos = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/conciliacao/saldos`)
      .send({
        competencia: '2026-11',
        saldoExtratoInformado: 7300,
        saldoFolhaInformado: 3000,
        saldoFiscalInformado: 750, // divergência proposital de R$ 50 no módulo fiscal
      });

    expect(resSaldos.status).toBe(200);
    const body = resSaldos.body.dados;
    expect(body.tudoConciliado).toBe(false);

    const bancario = body.comparativos.find((c: any) => c.modulo === 'BANCARIO');
    expect(bancario.conciliado).toBe(true);
    expect(bancario.diferenca).toBe(0);

    const pagar = body.comparativos.find((c: any) => c.modulo === 'CONTAS_PAGAR');
    expect(pagar.conciliado).toBe(true);

    const folha = body.comparativos.find((c: any) => c.modulo === 'FOLHA');
    expect(folha.conciliado).toBe(true);

    const fiscal = body.comparativos.find((c: any) => c.modulo === 'FISCAL');
    expect(fiscal.conciliado).toBe(false);
    expect(fiscal.diferenca).toBe(50);
  });

  /**
   * CA-4: Validações e bloqueios
   */
  it('CA-4: deve recusar extrato vazio, valor inválido, competência inválida e confirmação duplicada', async () => {
    const resVazio = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/conciliacao/extratos`)
      .send({ contaBancariaCodigo: '001-123', itens: [] });
    expect(resVazio.status).toBe(400);

    const resValorInvalido = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/conciliacao/extratos`)
      .send({
        contaBancariaCodigo: '001-123',
        itens: [{ data: '2026-11-10', historico: 'X', tipo: 'CREDITO', valor: 0 }],
      });
    expect(resValorInvalido.status).toBe(400);

    const resImport = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/conciliacao/extratos`)
      .send({
        contaBancariaCodigo: '001-123',
        itens: [{ data: '2026-11-10', historico: 'Y', tipo: 'CREDITO', valor: 100 }],
      });
    const itemId = resImport.body.dados.itens[0].id;

    await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/conciliacao/itens/${itemId}/confirmar`)
      .send({
        origemTipo: 'LANCAMENTO',
        origemId: lancamentoRecebimentoId,
        confirmadoPor: 'usuario.ficticio',
      });

    // Tentativa de confirmar item já conciliado -> 400
    const resDuplicada = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/conciliacao/itens/${itemId}/confirmar`)
      .send({
        origemTipo: 'LANCAMENTO',
        origemId: lancamentoRecebimentoId,
        confirmadoPor: 'usuario.ficticio',
      });
    expect(resDuplicada.status).toBe(400);

    const resSaldosInvalido = await request(app)
      .post(`/api/empresas/${empresaFicticiaId}/conciliacao/saldos`)
      .send({ competencia: 'invalida' });
    expect(resSaldosInvalido.status).toBe(400);
  });
});
