# SPEC-1.7 – Estabelecimentos, filiais, sócios e responsáveis

| Item | Responsável | Revisor (4º período) | Trello | Status |
|---|---|---|---|---|
| 1 – Plataforma | @joaovitor-webdev | A definir | https://trello.com/c/GAZKwOOv | Revisando |

## 1. Contexto e objetivo
Permitir o cadastro e a gestão de múltiplos estabelecimentos (matriz e filiais), sócios e responsáveis técnicos vinculados a uma mesma organização. A especificação garante que uma organização possa manter sua estrutura societária, técnica e de unidades operacionais centralizada sob o mesmo vínculo organizacional.

## 2. Requisitos relacionados
- **RF-005**: Permitir múltiplos estabelecimentos, filiais, sócios e responsáveis técnicos vinculados à mesma organização.

## 3. Escopo
- **Dentro do escopo:**
  - Cadastro e consulta de múltiplos estabelecimentos (matriz e filiais) vinculados a uma mesma organização.
  - Cadastro e consulta de múltiplos sócios vinculados à organização.
  - Cadastro e consulta de múltiplos responsáveis técnicos vinculados à organização.
  - Validação do vínculo obrigatório com a organização e impedimento de registros órfãos ou duplicados dentro da mesma organização.
- **Fora do escopo:**
  - Cálculo de distribuição de lucros, dividendos ou pró-labore (pertencentes aos Itens 2 e 4).
  - Apuração consolidada ou descentralizada de tributos por filial (pertencente ao Item 3).
  - Integração automática com Juntas Comerciais ou conselhos de classe (CRC/OAB).

## 4. Comportamento esperado
- **Fluxo normal (Múltiplos estabelecimentos e filiais):** Uma organização cadastra seu estabelecimento matriz e uma ou mais filiais; todos os estabelecimentos ficam vinculados ao mesmo `organizacaoId` e podem ser listados de forma consolidada.
- **Fluxo normal (Múltiplos sócios e responsáveis técnicos):** A organização registra dois ou mais sócios e um ou mais responsáveis técnicos; todos permanecem vinculados à mesma organização e disponíveis para consulta.
- **Fluxo de erro (Dados obrigatórios ausentes ou duplicidade):** Caso o vínculo com a organização (`organizacaoId`) ou os dados de identificação do estabelecimento/filial, sócio ou responsável técnico não sejam informados ou já estejam duplicados na mesma organização, a operação é recusada.

## 5. Critérios de aceite
- **CA-1:** Dada uma organização existente, quando forem cadastrados múltiplos estabelecimentos (matriz e filiais), então todos os estabelecimentos e filiais devem ser persistidos e listados vinculados à mesma organização (RF-005).
- **CA-2:** Dada uma organização existente, quando forem cadastrados múltiplos sócios, então todos os sócios devem ficar registrados e vinculados à mesma organização (RF-005).
- **CA-3:** Dada uma organização existente, quando forem cadastrados múltiplos responsáveis técnicos, então todos os responsáveis técnicos devem ficar registrados e vinculados à mesma organização (RF-005).
- **CA-4:** Dado o cadastro de estabelecimento/filial, sócio ou responsável técnico, quando o identificador da organização estiver ausente ou o documento/identificador já estiver duplicado para aquela função na mesma organização, então o sistema deve recusar a operação (RF-005).

## 6. Plano técnico
- **Modelos e Banco de Dados:**
  - Tabela/entidade `estabelecimentos` (`id`, `organizacaoId`, `tipoEstabelecimento` (`MATRIZ` | `FILIAL`), `nome`, `cnpj`, `inscricaoEstadual`, `inscricaoMunicipal`, `criadoEm`).
  - Tabela/entidade `socios_organizacao` (`id`, `organizacaoId`, `nome`, `documento`, `qualificacao`, `percentualParticipacao`, `criadoEm`).
  - Tabela/entidade `responsaveis_tecnicos` (`id`, `organizacaoId`, `nome`, `cpf`, `registroProfissional`, `ufRegistro`, `qualificacao`, `criadoEm`).
- **Serviços e Rotas:**
  - `EstabelecimentoSocioResponsavelService` validando campos obrigatórios, unicidade por organização e vínculo com `organizacaoId`.
  - Endpoints Express sob `/api/organizacoes/:organizacaoId/estabelecimentos`, `/api/organizacoes/:organizacaoId/socios` e `/api/organizacoes/:organizacaoId/responsaveis-tecnicos` (além de visão consolidada da estrutura da organização).

## 7. Tarefas de implementação
- [x] Criar branch de trabalho `spec/1.7-estabelecimentos-filiais-socios-responsaveis` a partir da `main`
- [x] Criar migração SQL e modelos para estabelecimentos/filiais, sócios e responsáveis técnicos vinculados à organização
- [x] Implementar repositório e serviço para múltiplos estabelecimentos/filiais (CA-1 e CA-4)
- [x] Implementar repositório e serviço para múltiplos sócios e responsáveis técnicos na mesma organização (CA-2, CA-3 e CA-4)
- [x] Expor controller e rotas Express para cadastro e consulta por organização
- [x] Implementar testes automatizados cobrindo os critérios CA-1 a CA-4
- [x] Atualizar `CHANGELOG.md` na seção `[Não lançado]`

## 8. Dependências
- `SPEC-1.1` (Repositório, documentação e padrões de contribuição).
- `SPEC-1.2` (Arquitetura, stack e ambientes).
- `SPEC-1.3` (Modelo de dados e integridade).
- `SPEC-1.6` (Cadastro de pessoas e empresas).

## 9. Como validar
1. **Validação de Múltiplos Estabelecimentos e Filiais (CA-1):**
   - Cadastrar 1 matriz e 2 filiais para o mesmo `organizacaoId`; listar os estabelecimentos da organização e confirmar que todos os 3 retornam vinculados à mesma organização.
2. **Validação de Múltiplos Sócios (CA-2):**
   - Cadastrar 2 ou mais sócios para a mesma organização; consultar a lista de sócios da organização e confirmar o vínculo.
3. **Validação de Múltiplos Responsáveis Técnicos (CA-3):**
   - Cadastrar 2 ou mais responsáveis técnicos para a mesma organização; consultar a lista e confirmar o vínculo.
4. **Validação de Obrigatoriedade e Duplicidade (CA-4):**
   - Tentar cadastrar filial, sócio ou responsável técnico duplicado na mesma organização ou sem os campos obrigatórios e confirmar recusa com HTTP 400.

## 10. Evidências (preencher ao concluir)
- PR: https://github.com/joaovitor-webdev/pagamentus/pull/18
- Migração SQL: `src/database/migrations/005_estabelecimentos_socios_responsaveis.sql`
- Modelos, Repositório, Serviço, Controller e Rotas: `src/models/EstabelecimentoSocioResponsavelModel.ts`, `src/repositories/EstabelecimentoSocioResponsavelRepository.ts`, `src/services/EstabelecimentoSocioResponsavelService.ts`, `src/controllers/EstabelecimentoSocioResponsavelController.ts`, `src/routes/estabelecimentoSocioResponsavelRoutes.ts`
- Suíte de testes automatizados (`tests/estabelecimentosSociosResponsaveis.test.ts`): 4 cenários aprovados cobrindo integralmente CA-1 a CA-4 (`PASS tests/estabelecimentosSociosResponsaveis.test.ts`).

## 11. Histórico de revisão
*Nenhuma ressalva registrada até o momento.*
