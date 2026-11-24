import request from 'supertest';
import { criarApp } from '../src/app';
import { InMemoryEstabelecimentoSocioResponsavelRepository } from '../src/repositories/EstabelecimentoSocioResponsavelRepository';

describe('SPEC-1.7: Estabelecimentos, filiais, sócios e responsáveis (RF-005)', () => {
  let app: any;
  let repo: InMemoryEstabelecimentoSocioResponsavelRepository;
  const organizacaoFicticiaId = 'org-ficticia-corporativa-001';

  beforeEach(async () => {
    const instancia = criarApp();
    app = instancia.app;
    repo = instancia.estabelecimentoSocioRepo;
    await repo.limpar();
  });

  /**
   * CA-1: Dada uma organização existente,
   * quando forem cadastrados múltiplos estabelecimentos (matriz e filiais),
   * então todos os estabelecimentos e filiais devem ser persistidos e listados
   * vinculados à mesma organização (RF-005).
   */
  describe('CA-1: Múltiplos estabelecimentos (matriz e filiais) vinculados à mesma organização', () => {
    it('deve cadastrar e listar a matriz e múltiplas filiais vinculadas à mesma organização', async () => {
      // 1. Cadastra Matriz
      const resMatriz = await request(app)
        .post(`/api/organizacoes/${organizacaoFicticiaId}/estabelecimentos`)
        .send({
          tipoEstabelecimento: 'MATRIZ',
          nome: 'Unidade Matriz Fictícia Goiânia',
          cnpj: '11222333000181',
          inscricaoEstadual: 'IE-001-MATRIZ',
          inscricaoMunicipal: 'IM-001-MATRIZ',
        });
      expect(resMatriz.status).toBe(201);
      expect(resMatriz.body.dados.organizacaoId).toBe(organizacaoFicticiaId);

      // 2. Cadastra Filial 01
      const resFilial1 = await request(app)
        .post(`/api/organizacoes/${organizacaoFicticiaId}/estabelecimentos`)
        .send({
          tipoEstabelecimento: 'FILIAL',
          nome: 'Unidade Filial 01 Fictícia Anápolis',
          cnpj: '11222333000262',
          inscricaoEstadual: 'IE-002-FILIAL1',
          inscricaoMunicipal: 'IM-002-FILIAL1',
        });
      expect(resFilial1.status).toBe(201);

      // 3. Cadastra Filial 02
      const resFilial2 = await request(app)
        .post(`/api/organizacoes/${organizacaoFicticiaId}/estabelecimentos`)
        .send({
          tipoEstabelecimento: 'FILIAL',
          nome: 'Unidade Filial 02 Fictícia Aparecida',
          cnpj: '11222333000343',
          inscricaoEstadual: 'IE-003-FILIAL2',
          inscricaoMunicipal: 'IM-003-FILIAL2',
        });
      expect(resFilial2.status).toBe(201);

      // 4. Lista todos os estabelecimentos vinculados à organização
      const listagem = await request(app).get(
        `/api/organizacoes/${organizacaoFicticiaId}/estabelecimentos`
      );
      expect(listagem.status).toBe(200);
      expect(listagem.body.dados).toHaveLength(3);
      expect(
        listagem.body.dados.every((e: any) => e.organizacaoId === organizacaoFicticiaId)
      ).toBe(true);
    });
  });

  /**
   * CA-2: Dada uma organização existente,
   * quando forem cadastrados múltiplos sócios,
   * então todos os sócios devem ficar registrados e vinculados à mesma organização (RF-005).
   */
  describe('CA-2: Múltiplos sócios vinculados à mesma organização', () => {
    it('deve cadastrar e listar múltiplos sócios vinculados à mesma organização', async () => {
      const socio1 = await request(app)
        .post(`/api/organizacoes/${organizacaoFicticiaId}/socios`)
        .send({
          nome: 'Sócio Fictício Alfa',
          documento: '12345678909',
          qualificacao: 'Sócio-Administrador',
          percentualParticipacao: 60,
        });
      expect(socio1.status).toBe(201);

      const socio2 = await request(app)
        .post(`/api/organizacoes/${organizacaoFicticiaId}/socios`)
        .send({
          nome: 'Sócio Fictício Beta',
          documento: '98765432100',
          qualificacao: 'Sócio Quotista',
          percentualParticipacao: 40,
        });
      expect(socio2.status).toBe(201);

      const listagem = await request(app).get(
        `/api/organizacoes/${organizacaoFicticiaId}/socios`
      );
      expect(listagem.status).toBe(200);
      expect(listagem.body.dados).toHaveLength(2);
      expect(
        listagem.body.dados.every((s: any) => s.organizacaoId === organizacaoFicticiaId)
      ).toBe(true);
    });
  });

  /**
   * CA-3: Dada uma organização existente,
   * quando forem cadastrados múltiplos responsáveis técnicos,
   * então todos os responsáveis técnicos devem ficar registrados e vinculados à mesma organização (RF-005).
   */
  describe('CA-3: Múltiplos responsáveis técnicos vinculados à mesma organização', () => {
    it('deve cadastrar e listar múltiplos responsáveis técnicos e retornar estrutura consolidada da organização', async () => {
      const rt1 = await request(app)
        .post(`/api/organizacoes/${organizacaoFicticiaId}/responsaveis-tecnicos`)
        .send({
          nome: 'Contadora Responsável Fictícia 01',
          cpf: '11122233396',
          registroProfissional: 'CRC-GO-000111/O',
          ufRegistro: 'GO',
          qualificacao: 'Contadora Responsável Contábil',
        });
      expect(rt1.status).toBe(201);

      const rt2 = await request(app)
        .post(`/api/organizacoes/${organizacaoFicticiaId}/responsaveis-tecnicos`)
        .send({
          nome: 'Contador Responsável Fictício 02',
          cpf: '44455566600',
          registroProfissional: 'CRC-GO-000222/O',
          ufRegistro: 'GO',
          qualificacao: 'Contador Responsável Fiscal',
        });
      expect(rt2.status).toBe(201);

      const listagem = await request(app).get(
        `/api/organizacoes/${organizacaoFicticiaId}/responsaveis-tecnicos`
      );
      expect(listagem.status).toBe(200);
      expect(listagem.body.dados).toHaveLength(2);
      expect(
        listagem.body.dados.every((r: any) => r.organizacaoId === organizacaoFicticiaId)
      ).toBe(true);

      // Visão consolidada da estrutura da organização
      const estruturaRes = await request(app).get(
        `/api/organizacoes/${organizacaoFicticiaId}/estrutura`
      );
      expect(estruturaRes.status).toBe(200);
      expect(estruturaRes.body.dados.organizacaoId).toBe(organizacaoFicticiaId);
      expect(estruturaRes.body.dados.responsaveisTecnicos).toHaveLength(2);
    });
  });

  /**
   * CA-4: Dado o cadastro de estabelecimento/filial, sócio ou responsável técnico,
   * quando o identificador da organização estiver ausente ou o documento/identificador
   * já estiver duplicado para aquela função na mesma organização,
   * então o sistema deve recusar a operação (RF-005).
   */
  describe('CA-4: Recusa de duplicidade e validação de vínculo/dados obrigatórios', () => {
    it('deve recusar estabelecimento, sócio ou responsável técnico duplicado na mesma organização', async () => {
      // 1. Duplicidade de Filial
      await request(app)
        .post(`/api/organizacoes/${organizacaoFicticiaId}/estabelecimentos`)
        .send({
          tipoEstabelecimento: 'FILIAL',
          nome: 'Filial Única Fictícia',
          cnpj: '22333444000299',
        });

      const filialDuplicada = await request(app)
        .post(`/api/organizacoes/${organizacaoFicticiaId}/estabelecimentos`)
        .send({
          tipoEstabelecimento: 'FILIAL',
          nome: 'Filial Duplicada Fictícia',
          cnpj: '22333444000299',
        });
      expect(filialDuplicada.status).toBe(400);
      expect(filialDuplicada.body.erro).toMatch(/Já existe um estabelecimento/i);

      // 2. Duplicidade de Sócio
      await request(app)
        .post(`/api/organizacoes/${organizacaoFicticiaId}/socios`)
        .send({
          nome: 'Sócio Único Fictício',
          documento: '55566677788',
          qualificacao: 'Sócio-Administrador',
          percentualParticipacao: 100,
        });

      const socioDuplicado = await request(app)
        .post(`/api/organizacoes/${organizacaoFicticiaId}/socios`)
        .send({
          nome: 'Sócio Duplicado Fictício',
          documento: '55566677788',
          qualificacao: 'Sócio Quotista',
          percentualParticipacao: 50,
        });
      expect(socioDuplicado.status).toBe(400);
      expect(socioDuplicado.body.erro).toMatch(/já está vinculado/i);

      // 3. Duplicidade de Responsável Técnico
      await request(app)
        .post(`/api/organizacoes/${organizacaoFicticiaId}/responsaveis-tecnicos`)
        .send({
          nome: 'Responsável Único Fictício',
          cpf: '77788899900',
          registroProfissional: 'CRC-GO-999999/O',
          ufRegistro: 'GO',
          qualificacao: 'Contador',
        });

      const rtDuplicado = await request(app)
        .post(`/api/organizacoes/${organizacaoFicticiaId}/responsaveis-tecnicos`)
        .send({
          nome: 'Responsável Duplicado Fictício',
          cpf: '77788899900',
          registroProfissional: 'CRC-GO-999999/O',
          ufRegistro: 'GO',
          qualificacao: 'Contador',
        });
      expect(rtDuplicado.status).toBe(400);
      expect(rtDuplicado.body.erro).toMatch(/Já existe um responsável técnico/i);
    });
  });
});
