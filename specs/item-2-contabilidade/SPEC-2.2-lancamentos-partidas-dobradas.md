# SPEC-2.2 – Lançamentos manuais com partidas dobradas

| Item | Responsável | Revisor (4º período) | Trello | Status |
|---|---|---|---|---|
| 2 – Contabilidade | @italograu17-ai | 4º período | https://trello.com/c/tSPGBhjF | Feito |

## 1. Contexto e objetivo
Permitir o registro de lançamentos contábeis manuais estruturados pelo método das partidas dobradas (débitos iguais a créditos), assegurando a consistência contábil antes da gravação através da validação obrigatória de balanceamento, contas analíticas ativas e período contábil aberto.

## 2. Requisitos relacionados
- **RF-007**: Registrar lançamentos manuais e automáticos com data, competência, histórico, documento de origem, centro de custo e partidas de débito/crédito.
- **RF-008**: Validar partidas dobradas, período aberto, contas ativas e consistência dos valores antes de gravar.
- **RB-001**: Todo lançamento contábil deve estar balanceado; débitos e créditos devem ser iguais.

## 3. Escopo
- **Dentro do escopo:**
  - Registro de lançamentos contábeis manuais contendo: empresa vinculada, data do lançamento, período/mês de competência, histórico descritivo, número/identificador do documento de origem, centro de custo (opcional/configurável) e partidas individuais.
  - Composição de partidas contendo: conta contábil analítica, tipo de partida (Débito ou Crédito) e valor monetário positivo.
  - Validação estrita do método das partidas dobradas: a soma dos valores a débito deve ser exatamente igual à soma dos valores a crédito ($\sum \text{Débitos} = \sum \text{Créditos}$).
  - Validação prévia de período contábil: bloquear lançamentos caso o período correspondente esteja encerrado/fechado.
  - Validação de contas contábeis: exigir que todas as contas informadas nas partidas estejam ativas e aptas para receber lançamento (analíticas, conforme SPEC-2.1).
  - Validação de consistência de valores: impedir partidas com valor zerado ou negativo.
- **Fora do escopo:**
  - Geração de lançamentos contábeis automáticos a partir de módulos externos/integrações (futuras specs).
  - Rotinas de reabertura de períodos encerrados com justificativa (RF-012).
  - Modelos de lançamentos recorrentes, rateios e estornos vinculados (RF-009).
  - Importação de lançamentos via planilha/arquivo (RF-010).
  - Emissão de relatórios e livros contábeis (Diário, Razão, Balancete) (RF-013).

## 4. Comportamento esperado
- **Fluxo normal:** O usuário informa os dados do cabeçalho do lançamento (data, competência, histórico, documento de origem, centro de custo) e adiciona ao menos duas partidas (ou múltiplas partidas) onde o somatório de débitos é igual ao somatório de créditos. O sistema valida que as contas são analíticas e ativas, que o período está aberto e grava o lançamento contábil com sucesso.
- **Fluxo de erro (Desbalanceamento):** Caso a soma dos débitos divirja da soma dos créditos ($\sum \text{Débitos} \neq \sum \text{Créditos}$), o lançamento é bloqueado e uma mensagem de erro indicando a diferença é exibida.
- **Fluxo de erro (Período fechado):** Caso a data/competência pertença a um período contábil encerrado, o registro é bloqueado com mensagem informando que o período está fechado para lançamentos.
- **Fluxo de erro (Conta inativa ou sintética):** Caso alguma das contas vinculadas às partidas esteja inativa ou seja sintética, o sistema rejeita a operação indicando a conta inválida.
- **Fluxo de erro (Valores inconsistentes):** Partidas com valores iguais ou inferiores a zero são rejeitadas.

## 5. Critérios de aceite
- **CA-1:** Dado um lançamento manual com data, competência, histórico, documento de origem, partidas de débito e crédito balanceadas ($\sum \text{Débitos} = \sum \text{Créditos}$), contas ativas e período contábil aberto, quando o usuário solicitar a gravação, então o lançamento é registrado com sucesso.
- **CA-2:** Dado um lançamento manual cujas partidas tenham soma de débitos diferente da soma de créditos ($\sum \text{Débitos} \neq \sum \text{Créditos}$), quando houver a tentativa de gravação, então o sistema deve rejeitar o lançamento com mensagem clara de desbalanceamento e nenhuma partida deve ser persistida.
- **CA-3:** Dado um lançamento contábil direcionado a uma competência cujo período contábil esteja fechado/encerrado, quando o usuário tentar gravar o lançamento, então o sistema deve bloquear o registro informando que o período está encerrado.
- **CA-4:** Dado um lançamento contábil em que uma ou mais partidas estejam vinculadas a contas inativas ou sintéticas, quando houver a tentativa de gravação, então o sistema deve rejeitar a operação informando que a conta não está apta para receber lançamentos.
- **CA-5:** Dado um lançamento com partidas que possuam valores zerados ou negativos, quando houver a tentativa de gravação, então o sistema deve rejeitar o registro indicando inconsistência de valores.

## 6. Plano técnico
- **Modelo de Dados:**
  - Tabela `lancamento_contabil`:
    - `id`: Identificador único (UUID ou string).
    - `empresa_id`: Chave da empresa titular.
    - `data_lancamento`: Data do fato contábil.
    - `competencia`: Período contábil (formato `YYYY-MM`).
    - `historico`: Texto descritivo do lançamento.
    - `documento_origem`: Identificador/número do documento de suporte.
    - `centro_custo_id`: Referência opcional de centro de custo.
    - `valor_total`: Valor consolidado do lançamento balanceado.
  - Tabela `partida_contabil`:
    - `id`: Identificador único da partida.
    - `lancamento_id`: FK para `lancamento_contabil`.
    - `conta_id`: FK para a conta contábil (SPEC-2.1).
    - `tipo`: `'DEBITO'` ou `'CREDITO'`.
    - `valor`: Valor monetário decimal positivo.
  - Controle de `periodo_contabil`:
    - Tabela ou estrutura com `empresa_id`, `competencia` e status (`ABERTO` / `ENCERRADO`).
- **Regras de Negócio e Serviços:**
  - `LancamentoContabilService`:
    - Validação de atomicidade e consistência antes da persistência.
    - Soma de débitos vs. créditos com precisão decimal.
    - Integração com `PlanoContasService` para validar se a conta está ativa e se `permiteLancamento()` é verdadeiro.
    - Consulta de status do período contábil para a competência informada.
- **Endpoints / Rotas:**
  - `POST /api/empresas/{empresaId}/lancamentos`: Criação e validação de novo lançamento contábil manual.
  - `GET /api/empresas/{empresaId}/lancamentos`: Consulta dos lançamentos contábeis registrados da empresa.
  - `GET /api/empresas/{empresaId}/lancamentos/{id}`: Detalhamento do lançamento e suas partidas.

## 7. Tarefas de implementação
- [x] Criar modelos de dados e interfaces para `LancamentoContabil`, `PartidaContabil` e `PeriodoContabil`.
- [x] Implementar repositórios de persistência para lançamentos e controle de status de períodos contábeis.
- [x] Implementar serviço de validação das regras essenciais: partidas dobradas balanceadas (RB-001), período aberto (RF-008), contas analíticas ativas (RF-008 e SPEC-2.1) e valores positivos.
- [x] Criar controladores e endpoints da API REST para lançamentos manuais.
- [x] Implementar suíte de testes automatizados cobrindo os critérios de aceite CA-1 a CA-5.

## 8. Dependências
- `SPEC-2.1` (Plano de contas: validação de contas sintéticas/analíticas e ativas).
- Estrutura base de organização/empresa.

## 9. Como validar
1. **Lançamento válido (CA-1):** Enviar payload com Débito de 100,00 e Crédito de 100,00 em contas analíticas ativas com período aberto. Verificar resposta HTTP 201 e persistência.
2. **Desbalanceamento (CA-2):** Enviar Débito de 150,00 e Crédito de 100,00. Verificar recusa (HTTP 400/422) informando diferença de 50,00 e verificar que nada foi salvo.
3. **Período fechado (CA-3):** Enviar lançamento para uma competência com período marcado como encerrado. Verificar recusa com mensagem de período fechado.
4. **Conta inativa ou sintética (CA-4):** Enviar partida apontando para conta sintética ou conta inativada. Verificar recusa e mensagem específica.
5. **Valor inconsistente (CA-5):** Enviar partida com valor 0 ou negativo. Verificar recusa por inconsistência de valores.

## 10. Evidências (preencher ao concluir)
- **PR:** https://github.com/joaovitor-webdev/pagamentus/pull/12 (Mesclado na `main`)
- **CA-1:** Validado no teste `tests/lancamentosContabeis.test.ts` ("deve registrar com sucesso um lançamento contábil balanceado"). Status HTTP 201 com payload consolidado, IDs vinculados e valor total igual a R$ 5000,00.
- **CA-2:** Validado no teste `tests/lancamentosContabeis.test.ts` ("deve rejeitar lançamento onde débitos são diferentes de créditos"). Bloqueado com status HTTP 400 informando a diferença de R$ 500,00, sem persistir nenhuma partida no banco.
- **CA-3:** Validado no teste `tests/lancamentosContabeis.test.ts` ("deve rejeitar lançamento quando o período contábil estiver encerrado"). Retorno HTTP 400 com mensagem explicativa de período encerrado.
- **CA-4:** Validado no teste `tests/lancamentosContabeis.test.ts` ("deve rejeitar lançamento com conta sintética" e "deve rejeitar lançamento com conta inativa"). Bloqueio com erro explicativo de validação contábil.
- **CA-5:** Validado no teste `tests/lancamentosContabeis.test.ts` ("deve rejeitar lançamento com partida de valor zero" e "deve rejeitar lançamento com partida de valor negativo"). Retorno HTTP 400 por inconsistência de valores.
- **Execução dos Testes Automatizados:** 16 testes passando (8 de lançamentos contábeis + 8 de plano de contas) com 100% de sucesso via Jest.

## 11. Histórico de revisão
*(Nenhuma ressalva registrada até o momento).*
