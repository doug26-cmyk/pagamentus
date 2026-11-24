# SPEC-2.3 – Recorrentes, rateios, provisões e estornos

| Item | Responsável | Revisor (4º período) | Trello | Status |
|---|---|---|---|---|
| 2 – Contabilidade | @italograu17-ai | 4º período | https://trello.com/c/wbgzApKt | Feito |

## 1. Contexto e objetivo
Permitir a criação e utilização de modelos de lançamentos contábeis recorrentes (para geração automatizada de rotinas periódicas como provisões, depreciações e apropriações com rateios) e a execução de estornos contábeis mantendo o estrito vínculo de rastreabilidade com o lançamento original.

## 2. Requisitos relacionados
- **RF-009**: Permitir modelos de lançamentos recorrentes, rateios, apropriações, provisões e estornos vinculados ao lançamento original.

## 3. Escopo
- **Dentro do escopo:**
  - Cadastro, consulta e manutenção de modelos pré-configurados de lançamentos contábeis (recorrentes, provisões e apropriações com rateio percentual ou por centros de custo).
  - Geração de lançamentos contábeis a partir de um modelo pré-definido, aplicando competência e data específicas.
  - Registro de estorno contábil (total ou parcial) invertendo as partidas ou anulando os efeitos do lançamento original, com vínculo obrigatório e explícito ao identificador do lançamento de origem (`lancamento_origem_id`).
  - Bloqueio de duplicidade indevida de estorno sobre o mesmo lançamento original.
- **Fora do escopo:**
  - Agendador automático/cron de segundo plano para disparar lançamentos sem comando (execução via endpoint/serviço da aplicação).
  - Importação de lançamentos por arquivo/planilha (RF-010).
  - Conciliação bancária (RF-011).

## 4. Comportamento esperado
- **Fluxo normal (Modelo e Geração Recorrente):** O usuário cadastra um modelo de lançamento recorrente (ex.: "Provisão Mensal de Aluguel" ou "Apropriação com Rateio entre Centros de Custo") com histórico base e regras de partidas (contas de débito/crédito e proporções/valores). Ao acionar a geração para uma competência e data, o sistema instancia um lançamento contábil efetivo baseado no modelo.
- **Fluxo normal (Estorno vinculado):** O usuário solicita o estorno de um lançamento contábil existente informando o ID original, a data do estorno e a justificativa/histórico. O sistema gera um novo lançamento do tipo estorno contendo o campo `lancamento_origem_id` apontando para o registro original e partidas invertidas correspondentes.
- **Fluxo de erro (Estorno sem origem válida):** Tentativa de realizar estorno informando um ID de lançamento inexistente é rejeitada.
- **Fluxo de erro (Modelo inconsistente):** Tentativa de cadastrar modelo desbalanceado ou com contas inválidas é bloqueada.

## 5. Critérios de aceite
- **CA-1:** Dado um modelo de lançamento recorrente devidamente configurado com histórico e partidas balanceadas, quando o usuário solicitar a geração para uma empresa, data e competência, então um novo lançamento contábil é criado e registrado com sucesso a partir das definições do modelo.
- **CA-2:** Dado um lançamento contábil previamente registrado, quando o usuário solicitar o seu estorno, então o sistema deve gerar um novo lançamento com partidas contábeis invertidas vinculado explicitamente ao identificador do lançamento original (`lancamento_origem_id`).
- **CA-3:** Dado um modelo de lançamento configurado com rateio (múltiplas partidas de débito ou crédito por percentual ou centro de custo), quando o lançamento for gerado a partir do modelo, então todas as partidas rateadas são criadas mantendo o balanceamento total de partidas dobradas.
- **CA-4:** Dado que um lançamento original já foi totalmente estornado, quando houver uma nova tentativa de estorno para o mesmo lançamento original, então o sistema deve rejeitar a operação informando que o lançamento já foi estornado.

## 6. Plano técnico
- **Modelo de Dados:**
  - Tabela `modelo_lancamento`:
    - `id`: Identificador único do modelo.
    - `empresa_id`: Chave da empresa vinculada.
    - `descricao`: Nome/identificação do modelo (ex.: "Provisão de Seguros", "Rateio de Energia").
    - `tipo`: Enum (`RECORRENTE`, `RATEIO`, `PROVISAO`, `APROPRIACAO`).
    - `historico_padrao`: Texto base para os lançamentos gerados.
    - `ativo`: Booleano.
  - Tabela `modelo_lancamento_partida`:
    - `id`: Identificador da partida do modelo.
    - `modelo_id`: FK para `modelo_lancamento`.
    - `conta_id`: FK para conta contábil analítica.
    - `tipo`: `'DEBITO'` ou `'CREDITO'`.
    - `percentual` ou `valor_fixo`: Para cálculo do rateio ou valor predeterminado.
    - `centro_custo_id`: Referência opcional de centro de custo.
  - Atualização na tabela `lancamento_contabil`:
    - Adição de `lancamento_origem_id` (FK auto-referencial opcional, preenchido quando for estorno).
    - Adição de `tipo_lancamento` (`NORMAL`, `ESTORNO`, `RECORRENTE`).
- **Serviços e Regras de Negócio:**
  - `ModeloLancamentoService`: Gerenciamento dos modelos e método `gerarLancamento(modeloId, parametros)`.
  - `EstornoService` ou extensão em `LancamentoContabilService`: Método `estornarLancamento(lancamentoOrigemId, dadosEstorno)` validando vínculo e inversão das partidas.
- **Endpoints / Rotas:**
  - `POST /api/empresas/{empresaId}/modelos-lancamento`: Cadastro de modelo recorrente/rateio.
  - `POST /api/empresas/{empresaId}/modelos-lancamento/{id}/gerar`: Geração de lançamento a partir do modelo.
  - `POST /api/empresas/{empresaId}/lancamentos/{id}/estornar`: Criação de lançamento de estorno vinculado ao original.

## 7. Tarefas de implementação
- [x] Criar entidades e interfaces para `ModeloLancamento`, `ModeloPartida` e atualizar `LancamentoContabil` com campo de vínculo `lancamentoOrigemId`.
- [x] Implementar repositório e serviços para cadastro de modelos recorrentes/rateios e provisões.
- [x] Implementar lógica de geração de lançamentos a partir de modelos.
- [x] Implementar lógica de estorno contábil com partidas invertidas e rastreabilidade ao lançamento de origem.
- [x] Implementar controladores e rotas REST para modelos, geração e estornos.
- [x] Criar testes automatizados com Jest validando os critérios de aceite CA-1, CA-2, CA-3 e CA-4.

## 8. Dependências
- `SPEC-2.1` (Plano de contas e validação de contas analíticas).
- `SPEC-2.2` (Estrutura de lançamentos e validação de partidas dobradas balanceadas).

## 9. Como validar
1. **Geração por modelo recorrente (CA-1):** Cadastrar modelo recorrente, acionar geração para competência aberta e verificar lançamento gerado com mesmas contas e valores.
2. **Estorno vinculado (CA-2):** Registrar um lançamento, chamar endpoint de estorno e verificar se o novo lançamento possui `lancamentoOrigemId` preenchido e partidas inversas (quem era débito virou crédito e vice-versa).
3. **Rateio proporcional (CA-3):** Criar modelo com débito rateado em 60% e 40% para dois centros de custo contra um crédito de 100%. Gerar lançamento e verificar integridade e balanceamento das partidas geradas.
4. **Bloqueio de reestorno (CA-4):** Tentar estornar o mesmo lançamento original uma segunda vez e validar rejeição com mensagem de erro.

## 10. Evidências (preencher ao concluir)
- **PR:** https://github.com/joaovitor-webdev/pagamentus/pull/12 (Mesclado na `main`)
- **CA-1:** Validado no teste `tests/recorrentesRateiosEstornos.test.ts` ("deve cadastrar modelo recorrente e gerar lançamento contábil efetivo"). Status HTTP 201 com lançamento gerado com valor total de R$ 3500,00 e tipo `RECORRENTE`.
- **CA-2:** Validado no teste `tests/recorrentesRateiosEstornos.test.ts` ("deve gerar lançamento de estorno invertendo débitos/créditos e com lancamentoOrigemId"). Status HTTP 201, `lancamentoOrigemId` apontando para o original e contas com partidas invertidas (débito original virou crédito e vice-versa).
- **CA-3:** Validado no teste `tests/recorrentesRateiosEstornos.test.ts` ("deve gerar lançamento com rateio em múltiplos centros de custo mantendo partidas dobradas"). Status HTTP 201 gerando 2 débitos rateados (R$ 6.000,00 e R$ 4.000,00 em centros de custo `CC-COM` e `CC-FAB`) contra crédito de R$ 10.000,00 balanceado.
- **CA-4:** Validado no teste `tests/recorrentesRateiosEstornos.test.ts` ("deve bloquear nova tentativa de estorno para lançamento já estornado"). Retorno HTTP 400 informando que o lançamento já foi estornado anteriormente.
- **Execução dos Testes Automatizados:** 20 testes passando (4 da SPEC-2.3 + 8 da SPEC-2.2 + 8 da SPEC-2.1) com 100% de sucesso via Jest.

## 11. Histórico de revisão
*(Nenhuma ressalva registrada até o momento).*
