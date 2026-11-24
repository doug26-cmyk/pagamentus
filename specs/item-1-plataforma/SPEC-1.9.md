# SPEC-1.9 – Auditoria e histórico cadastral

| Item | Responsável | Revisor (4º período) | Trello | Status |
|---|---|---|---|---|
| 1 – Plataforma | @joaovitor-webdev | A definir | https://trello.com/c/XvoCa5RL | Revisando |

## 1. Contexto e objetivo
Prover a trilha de auditoria imutável para operações relevantes do sistema (inclusão, alteração, exclusão lógica, estorno e aprovação) e o histórico de alterações cadastrais contendo o usuário responsável, data/horário, objeto afetado, resultado e justificativa. A especificação garante que correções sejam rastreáveis preservando registros históricos e que os logs de auditoria sejam protegidos contra edição ou exclusão indevida.

## 2. Requisitos relacionados
- **RF-015**: Manter trilha de auditoria de inclusão, alteração, exclusão lógica, estorno e aprovação.
- **RF-004**: Manter histórico de alterações cadastrais, usuário responsável, data e justificativa.
- **RNF-004 — Auditoria**: Registrar ações relevantes com usuário, horário, objeto, operação e resultado; logs protegidos contra alteração indevida.
- **RB-007**: Correções devem ser rastreáveis; quando aplicável, preferir estorno ou retificação em vez de apagar registros históricos.

## 3. Escopo
- **Dentro do escopo:**
  - Registro de trilha de auditoria para as operações de `INCLUSAO`, `ALTERACAO`, `EXCLUSAO_LOGICA`, `ESTORNO` e `APROVACAO` contendo usuário responsável, horário, objeto/entidade, operação, resultado e justificativa (RF-015, RNF-004).
  - Registro e consulta do histórico de alterações cadastrais com estado anterior/novo, usuário responsável, data e justificativa obrigatória em alterações/correções/exclusões lógicas/estornos (RF-004, RB-007).
  - Proteção dos registros de auditoria e histórico contra edição ou exclusão (logs somente de acréscimo / *append-only* e imutáveis - RNF-004, RB-007).
- **Fora do escopo:**
  - Integração com ferramentas externas de SIEM ou coleta centralizada de logs em nuvem.
  - Regras de cálculo contábil, fiscal ou de folha de pagamento (pertencentes aos Itens 2, 3 e 4).

## 4. Comportamento esperado
- **Fluxo normal (Registro de Auditoria e Histórico Cadastral):** Quando uma operação de inclusão, alteração, exclusão lógica, estorno ou aprovação é realizada, o sistema grava automaticamente um registro na trilha de auditoria com usuário, data/hora, objeto, operação, resultado e justificativa, mantendo o histórico anterior preservado para rastreabilidade.
- **Fluxo de erro (Tentativa de Alterar ou Apagar Log de Auditoria):** Caso qualquer chamada ou operação tente editar ou remover um registro da trilha de auditoria ou do histórico cadastral, o sistema recusa a operação imediatamente, garantindo a imutabilidade do log.
- **Fluxo de erro (Ausência de Justificativa em Correção/Alteração/Exclusão Lógica/Estorno):** Caso uma alteração cadastral, exclusão lógica ou estorno seja submetida sem usuário responsável ou sem justificativa, o sistema recusa a operação.

## 5. Critérios de aceite
- **CA-1:** Dada a execução de uma operação de inclusão, alteração, exclusão lógica, estorno ou aprovação, quando a ação for registrada, então o sistema deve gerar um log de auditoria contendo usuário responsável, data/horário, objeto, operação, resultado e justificativa (RF-015, RF-004, RNF-004).
- **CA-2:** Dado um cadastro existente, quando sofrer alteração, retificação, exclusão lógica ou estorno com justificativa informada, então o histórico cadastral deve preservar os estados anterior e posterior vinculados ao usuário, data e justificativa, sem apagar o registro histórico original (RF-004, RB-007).
- **CA-3:** Dado um log de auditoria ou item do histórico já registrado, quando houver qualquer tentativa de editar ou excluir esse log, então a operação deve ser bloqueada e recusada pelo sistema, assegurando que o log não seja editável (RNF-004, RB-007).
- **CA-4:** Dada uma operação de alteração cadastral, exclusão lógica ou estorno, quando a justificativa ou o usuário responsável não forem informados, então o sistema deve recusar a operação (RF-004, RB-007).

## 6. Plano técnico
- **Modelos e Persistência (*Append-Only*):**
  - Tabela/entidade `logs_auditoria` (`id`, `organizacaoId`, `usuarioId`, `dataHora`, `objetoTipo`, `objetoId`, `operacao` (`INCLUSAO` | `ALTERACAO` | `EXCLUSAO_LOGICA` | `ESTORNO` | `APROVACAO`), `resultado` (`SUCESSO` | `FALHA`), `justificativa`, `dadosAnteriores`, `dadosNovos`, `hashIntegridade`).
  - Triggers/restrições SQL e bloqueio na camada de repositório/serviço e rotas HTTP (`PUT`/`PATCH`/`DELETE` em `/api/auditoria/logs/:id`) que rejeitam qualquer modificação ou deleção de logs existentes.
- **Serviço e Rotas:**
  - `AuditoriaHistoricoService` para registrar eventos de auditoria e alterações cadastrais rastreáveis, consultar trilha por objeto/organização e bloquear mutações em logs.
  - Endpoints Express sob `/api/auditoria/logs` e `/api/auditoria/objetos/:objetoId/historico`.

## 7. Tarefas de implementação
- [x] Criar branch de trabalho `spec/1.9-auditoria-historico-cadastral` a partir da `main`
- [x] Criar migração SQL e modelos para trilha de auditoria e histórico cadastral imutável
- [x] Implementar repositório e serviço de registro e consulta de auditoria e histórico cadastral (CA-1, CA-2 e CA-4)
- [x] Implementar proteção de imutabilidade bloqueando edição e exclusão de logs de auditoria (CA-3)
- [x] Expor controller e rotas Express para auditoria e histórico cadastral
- [x] Implementar testes automatizados cobrindo os critérios CA-1 a CA-4
- [x] Atualizar `CHANGELOG.md` na seção `[Não lançado]`

## 8. Dependências
- `SPEC-1.1` (Repositório, documentação e padrões de contribuição).
- `SPEC-1.2` (Arquitetura, stack e ambientes).
- `SPEC-1.3` (Modelo de dados e integridade).
- `SPEC-1.6` (Cadastro de pessoas e empresas).

## 9. Como validar
1. **Validação de Geração de Log por Operação (CA-1):**
   - Registrar eventos de `INCLUSAO`, `ALTERACAO`, `EXCLUSAO_LOGICA`, `ESTORNO` e `APROVACAO`; consultar a trilha de auditoria e verificar a presença de usuário, data/horário, objeto, operação, resultado e justificativa.
2. **Validação de Histórico Cadastral Rastreável (CA-2):**
   - Realizar alteração, exclusão lógica e estorno sobre um objeto cadastral informando justificativa e verificar que o histórico preserva os registros anteriores e novos em ordem cronológica sem perda de histórico.
3. **Validação de Imutabilidade do Log (CA-3):**
   - Tentar atualizar (`PUT`/`PATCH`) ou excluir (`DELETE`) um log de auditoria existente via serviço ou endpoint HTTP e confirmar que a operação é recusada (HTTP 403/405) e o registro permanece inalterado.
4. **Validação de Obrigatoriedade de Usuário e Justificativa (CA-4):**
   - Tentar registrar uma alteração, exclusão lógica ou estorno sem justificativa ou sem usuário responsável e confirmar recusa com HTTP 400.

## 10. Evidências (preencher ao concluir)
- PR: https://github.com/joaovitor-webdev/pagamentus/pull/20
- Migração SQL: `src/database/migrations/007_auditoria_historico_cadastral.sql`
- Modelos, Repositório, Serviço, Controller e Rotas: `src/models/AuditoriaHistoricoModel.ts`, `src/repositories/AuditoriaHistoricoRepository.ts`, `src/services/AuditoriaHistoricoService.ts`, `src/controllers/AuditoriaHistoricoController.ts`, `src/routes/auditoriaHistoricoRoutes.ts`
- Suíte de testes automatizados (`tests/auditoriaHistoricoCadastral.test.ts`): 4 cenários aprovados cobrindo integralmente CA-1 a CA-4 (`PASS tests/auditoriaHistoricoCadastral.test.ts`).

## 11. Histórico de revisão
*Nenhuma ressalva registrada até o momento.*
