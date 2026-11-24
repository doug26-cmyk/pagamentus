# SPEC-1.11 – Privacidade e LGPD

| Item | Responsável | Revisor (4º período) | Trello | Status |
|---|---|---|---|---|
| 1 – Plataforma | @joaovitor-webdev | A definir | https://trello.com/c/haic1hl2 | Revisando |

## 1. Contexto e objetivo
Estabelecer as diretrizes documentais e os fluxos operacionais de conformidade com a Lei Geral de Proteção de Dados (LGPD) para o sistema, definindo finalidade, base legal, minimização de dados, direitos dos titulares, regras de contratos com operadores, prazos de retenção e descarte, além do registro de incidentes e do atendimento às solicitações de titulares conforme procedimento aprovado.

## 2. Requisitos relacionados
- **RNF-002 — LGPD e privacidade**: Definir finalidade, base legal, minimização, direitos dos titulares, contratos com operadores, retenção e descarte; registrar incidentes e atender solicitações conforme procedimento aprovado.

## 3. Escopo
- **Dentro do escopo:**
  - Documento formal de privacidade e governança LGPD contemplando finalidade, base legal, minimização, direitos dos titulares, diretrizes para contratos com operadores, tabela de retenção e procedimento de descarte.
  - Descrição do fluxo e implementação do registro e atendimento de solicitações de titulares de dados (ex.: confirmação, acesso, correção, eliminação/anonimização) conforme procedimento aprovado.
  - Descrição e registro de incidentes de segurança/privacidade relacionados a dados pessoais.
- **Fora do escopo:**
  - Assessoria jurídica externa ou assinatura física de contratos comerciais com operadores terceiros.
  - Implementação de rotinas de exportação contábil/fiscal de domínio (pertencentes aos Itens 2 e 3).
  - Envio automático de comunicações oficiais à ANPD por integração externa.

## 4. Comportamento esperado
- **Fluxo normal (Documentação de Privacidade e Governança):** A documentação oficial do projeto detalha a finalidade do tratamento de cada categoria de dado, a respectiva base legal, as regras de minimização, os direitos dos titulares, as cláusulas mínimas para operadores e a política de retenção e descarte.
- **Fluxo normal (Solicitação do Titular):** Um titular (ou representante) registra uma solicitação de exercício de direitos (ex.: acesso, correção, exclusão/anonimização); o sistema registra o protocolo com prazo e permite acompanhar e concluir o atendimento conforme procedimento aprovado.
- **Fluxo normal (Registro de Incidente):** Quando identificado um incidente envolvendo dados pessoais, o responsável registra a ocorrência com descrição, dados afetados, severidade e medidas adotadas.
- **Fluxo de erro (Solicitação ou Incidente Incompleto):** Caso uma solicitação de titular ou registro de incidente seja submetido sem os campos obrigatórios (identificação, tipo de solicitação/severidade ou descrição), a operação é recusada.

## 5. Critérios de aceite
- **CA-1:** Dado o repositório do projeto, quando inspecionada a documentação de privacidade/LGPD, então deve existir documento formal definindo finalidade, base legal, minimização, direitos dos titulares, diretrizes de contratos com operadores, retenção e descarte (RNF-002).
- **CA-2:** Dada a necessidade de atendimento aos direitos dos titulares, quando consultado o fluxo de pedido do titular ou executado o registro de solicitação, então o fluxo deve estar descrito e o sistema deve permitir registrar e atualizar o atendimento da solicitação conforme procedimento aprovado (RNF-002).
- **CA-3:** Dado um incidente envolvendo privacidade ou dados pessoais, quando registrado no sistema, então o incidente deve ser armazenado com data, descrição, severidade e status de tratamento (RNF-002).
- **CA-4:** Dado o registro de uma solicitação de titular ou de um incidente de privacidade, quando faltarem campos obrigatórios ou tipo inválido for informado, então o sistema deve recusar o registro (RNF-002).

## 6. Plano técnico
- **Documentação LGPD:**
  - Criar `docs/privacidade/LGPD-politica-e-procedimentos.md` contendo: Finalidade e Minimização, Bases Legais, Direitos dos Titulares e Fluxo de Pedido do Titular, Diretrizes para Contratos com Operadores, Política de Retenção e Descarte e Procedimento de Resposta a Incidentes.
- **Modelos, Persistência e API de Atendimento/Incidentes:**
  - Migração SQL `009_lgpd_solicitacoes_incidentes.sql` com tabelas `solicitacoes_titulares_lgpd` e `incidentes_privacidade_lgpd`.
  - Serviço `LgpdPrivacidadeService` e rotas Express sob `/api/lgpd/solicitacoes-titulares` e `/api/lgpd/incidentes` para registro, consulta e atualização de atendimento conforme procedimento aprovado.

## 7. Tarefas de implementação
- [x] Criar branch de trabalho `spec/1.11-privacidade-lgpd` a partir da `main`
- [x] Elaborar documento `docs/privacidade/LGPD-politica-e-procedimentos.md` com finalidade, base legal, minimização, direitos dos titulares, operadores, retenção, descarte e fluxo do pedido do titular (CA-1 e CA-2)
- [x] Criar migração SQL e modelos para solicitações de titulares e registro de incidentes LGPD
- [x] Implementar repositório, serviço, controller e rotas Express para fluxo de solicitação de titular e registro de incidentes (CA-2, CA-3 e CA-4)
- [x] Implementar testes automatizados cobrindo os critérios CA-1 a CA-4
- [x] Atualizar `CHANGELOG.md` na seção `[Não lançado]`

## 8. Dependências
- `SPEC-1.1` (Repositório, documentação e padrões de contribuição).
- `SPEC-1.2` (Arquitetura, stack e ambientes).
- `SPEC-1.3` (Modelo de dados e integridade).

## 9. Como validar
1. **Validação Documental (CA-1):**
   - Verificar a existência de `docs/privacidade/LGPD-politica-e-procedimentos.md` e confirmar a presença das seções de finalidade, base legal, minimização, direitos dos titulares, contratos com operadores, retenção, descarte e fluxo de pedido do titular.
2. **Validação do Fluxo de Solicitação do Titular (CA-2 e CA-4):**
   - Registrar uma solicitação de titular via `POST /api/lgpd/solicitacoes-titulares`, atualizar o status de atendimento e validar recusa (HTTP 400) quando faltarem campos obrigatórios.
3. **Validação de Registro de Incidentes (CA-3 e CA-4):**
   - Registrar um incidente de privacidade via `POST /api/lgpd/incidentes` e verificar consulta e recusa de dados inválidos.

## 10. Evidências (preencher ao concluir)
- PR: https://github.com/joaovitor-webdev/pagamentus/pull/22
- Documentação LGPD: `docs/privacidade/LGPD-politica-e-procedimentos.md`
- Migração SQL: `src/database/migrations/009_lgpd_solicitacoes_incidentes.sql`
- Modelos, Repositório, Serviço, Controller e Rotas: `src/models/LgpdPrivacidadeModel.ts`, `src/repositories/LgpdPrivacidadeRepository.ts`, `src/services/LgpdPrivacidadeService.ts`, `src/controllers/LgpdPrivacidadeController.ts`, `src/routes/lgpdPrivacidadeRoutes.ts`
- Suíte de testes automatizados (`tests/lgpdPrivacidade.test.ts`): 4 cenários aprovados cobrindo integralmente CA-1 a CA-4 (`PASS tests/lgpdPrivacidade.test.ts`).

## 11. Histórico de revisão
*Nenhuma ressalva registrada até o momento.*
