import request from 'supertest';
import { criarApp } from '../src/app';
import { InMemoryPessoaEmpresaRepository } from '../src/repositories/PessoaEmpresaRepository';

/**
 * Gera os 2 dígitos verificadores para uma base sintética de 9 dígitos (CPF fictício para teste)
 */
function gerarCpfFicticioValido(noveDigitosBase: string): string {
  const calcular = (base: string, pesoInicial: number): number => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += parseInt(base.charAt(i), 10) * (pesoInicial - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 || resto === 11 ? 0 : resto;
  };
  const d1 = calcular(noveDigitosBase, 10);
  const d2 = calcular(`${noveDigitosBase}${d1}`, 11);
  return `${noveDigitosBase}${d1}${d2}`;
}

/**
 * Gera os 2 dígitos verificadores para uma base sintética de 12 dígitos (CNPJ fictício para teste)
 */
function gerarCnpjFicticioValido(dozeDigitosBase: string): string {
  const calcular = (base: string, pesos: number[]): number => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += parseInt(base.charAt(i), 10) * pesos[i];
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = calcular(dozeDigitosBase, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calcular(`${dozeDigitosBase}${d1}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return `${dozeDigitosBase}${d1}${d2}`;
}

describe('SPEC-1.6: Cadastro de pessoas e empresas (RF-001, RF-002)', () => {
  let app: any;
  let pessoaEmpresaRepo: InMemoryPessoaEmpresaRepository;

  const organizacaoFicticiaId = 'org-ficticia-cadastro-001';
  const cpfFicticioValido = gerarCpfFicticioValido('123456789');
  const cnpjFicticioValido = gerarCnpjFicticioValido('112223330001');

  beforeEach(async () => {
    const instancia = criarApp();
    app = instancia.app;
    pessoaEmpresaRepo = instancia.pessoaEmpresaRepo;
    await pessoaEmpresaRepo.limpar();
  });

  /**
   * CA-1: Dado o cadastro de uma Pessoa Física (PF) ou Pessoa Jurídica (PJ),
   * quando forem informados nome/razão social, nome fantasia, CPF/CNPJ fictício válido,
   * inscrições, contatos, endereços e responsáveis,
   * então o sistema deve salvar o cadastro com sucesso (RF-001).
   */
  describe('CA-1: Cadastro completo de Pessoa Física (PF) e Pessoa Jurídica (PJ) (RF-001)', () => {
    it('deve cadastrar com sucesso uma Pessoa Física (PF) e uma Pessoa Jurídica (PJ) com todos os dados obrigatórios', async () => {
      // 1. Cadastro de Pessoa Física (PF)
      const resPf = await request(app)
        .post('/api/cadastros/pessoas-empresas')
        .send({
          organizacaoId: organizacaoFicticiaId,
          tipoPessoa: 'PF',
          nomeRazaoSocial: 'Contribuinte Fictício Teste PF',
          nomeFantasia: 'Consultoria Autônoma Fictícia',
          documento: cpfFicticioValido,
          inscricaoEstadual: null,
          inscricaoMunicipal: 'IM-PF-001',
          contatos: [{ tipo: 'EMAIL', valor: 'pf.ficticio@exemplo.local', principal: true }],
          enderecos: [
            {
              logradouro: 'Rua das Acácias Fictícia',
              numero: '100',
              bairro: 'Centro',
              municipio: 'Goiânia',
              uf: 'GO',
              cep: '74000000',
            },
          ],
          responsaveis: [
            {
              nome: 'Contribuinte Fictício Teste PF',
              cpf: cpfFicticioValido,
              qualificacao: 'Titular',
            },
          ],
        });

      expect(resPf.status).toBe(201);
      expect(resPf.body.sucesso).toBe(true);
      expect(resPf.body.dados.tipoPessoa).toBe('PF');
      expect(resPf.body.dados.documento).toBe(cpfFicticioValido);

      // 2. Cadastro de Pessoa Jurídica (PJ)
      const resPj = await request(app)
        .post('/api/cadastros/pessoas-empresas')
        .send({
          organizacaoId: organizacaoFicticiaId,
          tipoPessoa: 'PJ',
          nomeRazaoSocial: 'Empresa Exemplo Fictícia LTDA',
          nomeFantasia: 'Exemplo Tech Fictício',
          documento: cnpjFicticioValido,
          inscricaoEstadual: 'IE-123456789',
          inscricaoMunicipal: 'IM-987654',
          contatos: [{ tipo: 'TELEFONE', valor: '6230000000', principal: true }],
          enderecos: [
            {
              logradouro: 'Avenida Comercial Fictícia',
              numero: '500',
              complemento: 'Sala 10',
              bairro: 'Setor Sul',
              municipio: 'Goiânia',
              uf: 'GO',
              cep: '74080000',
            },
          ],
          responsaveis: [
            {
              nome: 'Sócio Administrador Fictício',
              cpf: cpfFicticioValido,
              qualificacao: 'Sócio-Administrador',
            },
          ],
        });

      expect(resPj.status).toBe(201);
      expect(resPj.body.sucesso).toBe(true);
      expect(resPj.body.dados.tipoPessoa).toBe('PJ');
      expect(resPj.body.dados.documento).toBe(cnpjFicticioValido);
      expect(resPj.body.dados.nomeFantasia).toBe('Exemplo Tech Fictício');
    });
  });

  /**
   * CA-2: Dado o cadastro de PF ou PJ,
   * quando for informado um CPF/CNPJ inválido ou já existente na mesma organização,
   * então o sistema deve recusar o cadastro e informar o motivo do erro (RF-001).
   */
  describe('CA-2: Recusa de CPF/CNPJ inválido ou duplicado na organização (RF-001)', () => {
    it('deve recusar CPF ou CNPJ com dígitos verificadores inválidos ou duplicados', async () => {
      // Tentativa com CPF inválido (todos os dígitos iguais)
      const cpfInvalidoRes = await request(app)
        .post('/api/cadastros/pessoas-empresas')
        .send({
          organizacaoId: organizacaoFicticiaId,
          tipoPessoa: 'PF',
          nomeRazaoSocial: 'Pessoa Documento Inválido',
          documento: '111.111.111-11',
          contatos: [{ tipo: 'EMAIL', valor: 'invalido@exemplo.local' }],
          enderecos: [
            {
              logradouro: 'Rua A',
              numero: '1',
              bairro: 'Centro',
              municipio: 'Goiânia',
              uf: 'GO',
              cep: '74000000',
            },
          ],
          responsaveis: [{ nome: 'Titular', cpf: cpfFicticioValido, qualificacao: 'Titular' }],
        });

      expect(cpfInvalidoRes.status).toBe(400);
      expect(cpfInvalidoRes.body.erro).toMatch(/CPF inválido/i);

      // Primeiro cadastro PJ válido
      const primeiroPj = await request(app)
        .post('/api/cadastros/pessoas-empresas')
        .send({
          organizacaoId: organizacaoFicticiaId,
          tipoPessoa: 'PJ',
          nomeRazaoSocial: 'Empresa Única Fictícia S/A',
          documento: cnpjFicticioValido,
          contatos: [{ tipo: 'EMAIL', valor: 'empresa@exemplo.local' }],
          enderecos: [
            {
              logradouro: 'Rua B',
              numero: '2',
              bairro: 'Centro',
              municipio: 'Goiânia',
              uf: 'GO',
              cep: '74000000',
            },
          ],
          responsaveis: [{ nome: 'Diretor', cpf: cpfFicticioValido, qualificacao: 'Diretor' }],
        });
      expect(primeiroPj.status).toBe(201);

      // Tentativa de cadastrar novamente o mesmo CNPJ na mesma organização -> recusado (400)
      const pjDuplicado = await request(app)
        .post('/api/cadastros/pessoas-empresas')
        .send({
          organizacaoId: organizacaoFicticiaId,
          tipoPessoa: 'PJ',
          nomeRazaoSocial: 'Empresa Duplicada Fictícia',
          documento: cnpjFicticioValido,
          contatos: [{ tipo: 'EMAIL', valor: 'dup@exemplo.local' }],
          enderecos: [
            {
              logradouro: 'Rua B',
              numero: '2',
              bairro: 'Centro',
              municipio: 'Goiânia',
              uf: 'GO',
              cep: '74000000',
            },
          ],
          responsaveis: [{ nome: 'Diretor', cpf: cpfFicticioValido, qualificacao: 'Diretor' }],
        });

      expect(pjDuplicado.status).toBe(400);
      expect(pjDuplicado.body.erro).toMatch(/Já existe um cadastro/i);
    });
  });

  /**
   * CA-3: Dado um cadastro de PF ou PJ existente,
   * quando forem registrados regime tributário, atividade econômica, CNAE,
   * natureza jurídica, município/UF, enquadramentos e datas de vigência válidas,
   * então o sistema deve persistir o registro fiscal vinculado com sucesso (RF-002).
   */
  describe('CA-3: Registro de regime tributário, CNAE, natureza jurídica, enquadramentos e vigência (RF-002)', () => {
    it('deve registrar e consultar os dados fiscais com vigência vinculados à empresa cadastrada', async () => {
      const cadastroPj = await request(app)
        .post('/api/cadastros/pessoas-empresas')
        .send({
          organizacaoId: organizacaoFicticiaId,
          tipoPessoa: 'PJ',
          nomeRazaoSocial: 'Contabilidade Modelo Fictícia LTDA',
          nomeFantasia: 'Modelo Contábil',
          documento: cnpjFicticioValido,
          inscricaoEstadual: 'ISENTO',
          inscricaoMunicipal: 'IM-2026001',
          contatos: [{ tipo: 'EMAIL', valor: 'fiscal@exemplo.local' }],
          enderecos: [
            {
              logradouro: 'Av. Brasil Fictícia',
              numero: '10',
              bairro: 'Centro',
              municipio: 'Goiânia',
              uf: 'GO',
              cep: '74000000',
            },
          ],
          responsaveis: [
            { nome: 'Responsável Técnico', cpf: cpfFicticioValido, qualificacao: 'Contador' },
          ],
        });

      const pessoaEmpresaId = cadastroPj.body.dados.id;

      // Registra dados fiscais com vigência (RF-002)
      const resFiscal = await request(app)
        .post(`/api/cadastros/pessoas-empresas/${pessoaEmpresaId}/dados-fiscais`)
        .send({
          regimeTributario: 'SIMPLES_NACIONAL',
          atividadeEconomica: 'Atividades de contabilidade, consultoria e auditoria contábil',
          cnae: '6920-6/01',
          naturezaJuridica: '206-2 - Sociedade Empresária Limitada',
          municipio: 'Goiânia',
          uf: 'GO',
          enquadramentos: ['ANEXO_III', 'FATOR_R', 'ISS_FIXO'],
          vigenciaInicio: '2026-01-01',
          vigenciaFim: '2026-12-31',
        });

      expect(resFiscal.status).toBe(201);
      expect(resFiscal.body.sucesso).toBe(true);
      expect(resFiscal.body.dados.regimeTributario).toBe('SIMPLES_NACIONAL');
      expect(resFiscal.body.dados.cnae).toBe('6920-6/01');
      expect(resFiscal.body.dados.enquadramentos).toContain('ANEXO_III');
      expect(resFiscal.body.dados.vigenciaInicio).toBe('2026-01-01');
      expect(resFiscal.body.dados.vigenciaFim).toBe('2026-12-31');

      // Consulta dados fiscais vinculados
      const consultaFiscal = await request(app).get(
        `/api/cadastros/pessoas-empresas/${pessoaEmpresaId}/dados-fiscais`
      );
      expect(consultaFiscal.status).toBe(200);
      expect(consultaFiscal.body.dados).toHaveLength(1);
    });
  });

  /**
   * CA-4: Dado o registro de dados fiscais e enquadramentos,
   * quando a data de fim de vigência for anterior à data de início de vigência
   * ou dados obrigatórios estiverem ausentes,
   * então o sistema deve recusar a operação (RF-002).
   */
  describe('CA-4: Validação de consistência das datas de vigência e campos fiscais obrigatórios (RF-002)', () => {
    it('deve recusar o registro fiscal quando a data de fim de vigência for anterior ao início', async () => {
      const cadastroPj = await request(app)
        .post('/api/cadastros/pessoas-empresas')
        .send({
          organizacaoId: organizacaoFicticiaId,
          tipoPessoa: 'PJ',
          nomeRazaoSocial: 'Empresa Vigência Teste LTDA',
          documento: cnpjFicticioValido,
          contatos: [{ tipo: 'EMAIL', valor: 'vigencia@exemplo.local' }],
          enderecos: [
            {
              logradouro: 'Av. Teste',
              numero: '10',
              bairro: 'Centro',
              municipio: 'Goiânia',
              uf: 'GO',
              cep: '74000000',
            },
          ],
          responsaveis: [{ nome: 'Sócio', cpf: cpfFicticioValido, qualificacao: 'Sócio' }],
        });

      const pessoaEmpresaId = cadastroPj.body.dados.id;

      // Data final (2025-12-31) anterior à data inicial (2026-01-01) -> deve recusar (400)
      const resInvalido = await request(app)
        .post(`/api/cadastros/pessoas-empresas/${pessoaEmpresaId}/dados-fiscais`)
        .send({
          regimeTributario: 'LUCRO_PRESUMIDO',
          atividadeEconomica: 'Desenvolvimento de programas de computador sob encomenda',
          cnae: '6201-5/01',
          naturezaJuridica: '206-2 - Sociedade Empresária Limitada',
          municipio: 'Goiânia',
          uf: 'GO',
          enquadramentos: ['REGIME_COMPETENCIA'],
          vigenciaInicio: '2026-01-01',
          vigenciaFim: '2025-12-31',
        });

      expect(resInvalido.status).toBe(400);
      expect(resInvalido.body.sucesso).toBe(false);
      expect(resInvalido.body.erro).toMatch(/Vigência inválida/i);
    });
  });
});
