# SPEC-2.1 – Plano de contas

| Item | Responsável | Revisor (4º período) | Trello | Status |
|---|---|---|---|---|
| 2 – Contabilidade | @italograu17-ai | 4º período | https://trello.com/c/piZHXcEu | Feito |

## 1. Contexto e objetivo
Permitir a estruturação e manutenção do plano de contas contábil configurável por empresa, definindo a hierarquia entre contas sintéticas (agrupadoras) e analíticas (escriturais), garantindo que apenas contas analíticas estejam aptas a receber lançamentos contábeis.

## 2. Requisitos relacionados
- **RF-006**: Manter plano de contas configurável por empresa, com códigos, níveis, natureza, classificação e contas sintéticas/analíticas.

## 3. Escopo
- **Dentro do escopo:**
  - Cadastro, consulta, alteração e inativação de contas contábeis vinculadas a uma empresa.
  - Definição dos atributos da conta: empresa vinculada, código estruturado, nome/descrição da conta, nível hierárquico, tipo (sintética ou analítica), natureza (devedora ou credora) e classificação contábil (ativo, passivo, patrimônio líquido, receitas, despesas, etc.).
  - Validação da estrutura hierárquica por código e nível.
  - Regra de bloqueio garantindo que apenas contas analíticas possam receber lançamentos contábeis.
- **Fora do escopo:**
  - Registro de lançamentos contábeis manuais ou automáticos (objeto da SPEC-2.2).
  - Importação de planos de contas ou lançamentos por planilha/arquivo (RF-010).
  - Emissão de relatórios contábeis, balancetes e demonstrações (RF-013).
  - Gestão de centros de custo (RF-014).

## 4. Comportamento esperado
- **Fluxo normal (Cadastro/Manutenção):** O usuário seleciona a empresa e cadastra contas contábeis informando código estruturado (ex.: 1, 1.1, 1.1.1, 1.1.1.01), nome, nível hierárquico correspondente, tipo (sintética ou analítica), natureza (devedora ou credora) e classificação. O sistema valida se o código é único para aquela empresa e se os dados obrigatórios estão preenchidos.
- **Fluxo de validação de lançamento:** Ao tentar associar uma conta contábil a uma partida de lançamento contábil, o sistema verifica o tipo da conta; se for analítica, a operação é autorizada; se for sintética, a operação é rejeitada.
- **Fluxo de erro:** Tentativa de cadastro de conta com código duplicado na mesma empresa, sem preenchimento de campos obrigatórios (código, nível, tipo, natureza, classificação) ou tentativa de realizar lançamento em conta sintética resulta em mensagem clara de validação.

## 5. Critérios de aceite
- **CA-1:** Dado que o usuário deseja cadastrar uma conta contábil para uma empresa, quando informar código estruturado, nível hierárquico, natureza (devedora/credora), classificação e tipo (sintética ou analítica), então a conta é registrada com sucesso vinculada à respectiva empresa.
- **CA-2:** Dado que uma conta contábil está cadastrada com o tipo "sintética", quando houver uma tentativa de vinculá-la a um lançamento contábil, então o sistema deve bloquear o registro e exibir uma mensagem informando que apenas contas analíticas recebem lançamentos.
- **CA-3:** Dado que uma conta contábil está cadastrada com o tipo "analítica", quando houver uma tentativa de vinculá-la a um lançamento contábil válido, então o sistema deve permitir a vinculação da conta ao lançamento.
- **CA-4:** Dado que já existe uma conta com determinado código cadastrada para uma empresa, quando o usuário tentar cadastrar outra conta com o mesmo código para essa mesma empresa, então o sistema deve rejeitar o cadastro informando duplicidade de código.

## 6. Plano técnico
- **Modelo de Dados (Tabela `plano_contas` / `conta_contabil`):**
  - `id`: Identificador único (UUID ou serial).
  - `empresa_id`: Chave estrangeira referenciando a empresa (isolamento por empresa).
  - `codigo`: Código contábil estruturado (string, ex.: "1.1.01.001").
  - `nome`: Descrição da conta (string).
  - `nivel`: Inteiro representando a profundidade hierárquica (ex.: 1, 2, 3...).
  - `tipo`: Enum ou string (`SINTETICA`, `ANALITICA`).
  - `natureza`: Enum ou string (`DEVEDORA`, `CREDORA`).
  - `classificacao`: Categoria contábil (ex.: `ATIVO`, `PASSIVO`, `PATRIMONIO_LIQUIDO`, `RECEITA`, `DESPESA`).
  - `ativo`: Booleano para controle de status da conta.
- **Regras e Validações:**
  - Unicidade: `UNIQUE(empresa_id, codigo)`.
  - Método de validação de elegibilidade para lançamentos: `permite_lancamento()` retornando verdadeiro apenas se `tipo == 'ANALITICA'` e `ativo == true`.
- **Endpoints / Operações:**
  - `GET /api/empresas/{empresa_id}/plano-contas`: Listagem hierárquica das contas da empresa.
  - `POST /api/empresas/{empresa_id}/plano-contas`: Criação de nova conta contábil com validação de unicidade e campos obrigatórios.
  - `PUT /api/empresas/{empresa_id}/plano-contas/{id}`: Atualização de conta contábil existente.
  - `DELETE /api/empresas/{empresa_id}/plano-contas/{id}`: Inativação lógica da conta.

## 7. Tarefas de implementação
- [x] Criar migração do banco de dados com a tabela de contas contábeis configurável por empresa (`empresa_id`, `codigo`, `nome`, `nivel`, `tipo`, `natureza`, `classificacao`, `ativo`).
- [x] Implementar modelo de dados e restrição de unicidade por empresa e código.
- [x] Implementar regra de negócio/serviço que valida se a conta é analítica antes de permitir lançamento.
- [x] Implementar rotas e controladores para CRUD/manutenção do plano de contas por empresa.
- [x] Escrever testes unitários e de integração validando os critérios de aceite CA-1, CA-2, CA-3 e CA-4.

## 8. Dependências
- Estrutura de empresa/organização cadastrada (módulo base/plataforma).

## 9. Como validar
1. Cadastrar uma conta sintética (ex.: código `1`, nível `1`, tipo `SINTETICA`, natureza `DEVEDORA`, classificação `ATIVO`) e verificar persistência.
2. Cadastrar uma conta analítica (ex.: código `1.1.01.001`, nível `4`, tipo `ANALITICA`, natureza `DEVEDORA`, classificação `ATIVO`) e verificar persistência.
3. Tentar efetuar lançamento contábil apontando para a conta sintética e verificar se a operação é bloqueada com mensagem explicativa.
4. Tentar efetuar lançamento contábil apontando para a conta analítica e verificar se a operação é aceita.
5. Tentar cadastrar uma conta com código já existente na mesma empresa e validar mensagem de erro de duplicidade.

## 10. Evidências (preencher ao concluir)
- **PR:** https://github.com/joaovitor-webdev/pagamentus/pull/6 (Mesclado na `main`)
- **CA-1:** Validado no teste `tests/planoContas.test.ts` ("deve registrar com sucesso uma conta sintética/analítica vinculada à empresa"). Status HTTP 201 com payload contendo `codigo`, `nivel`, `tipo`, `natureza`, `classificacao` e `empresaId`.
- **CA-2:** Validado no teste `tests/planoContas.test.ts` ("deve rejeitar tentativa de validar conta sintética para lançamento contábil"). Bloqueado com status HTTP 422 e mensagem `Apenas contas analíticas recebem lançamentos`.
- **CA-3:** Validado no teste `tests/planoContas.test.ts` ("deve autorizar com sucesso conta analítica ativa para receber lançamento"). Retorno status HTTP 200 com mensagem `Conta analítica válida para receber lançamento.`
- **CA-4:** Validado no teste `tests/planoContas.test.ts` ("deve bloquear cadastro com mesmo código na mesma empresa" e permitir mesmo código em empresas distintas). Retorno de erro HTTP 400 com mensagem de duplicidade.
- **Execução dos Testes Automatizados:** 8 testes passaram em `tests/planoContas.test.ts` com 100% de sucesso via Jest.

## 11. Histórico de revisão
*(Nenhuma ressalva registrada até o momento).*
