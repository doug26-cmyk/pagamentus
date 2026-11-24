# SPEC-5.9 — Desempenho e carga

## 1. Contexto e objetivo
Definir requisitos de desempenho e testes de carga para o Pagamentus, estabelecendo uma meta inicial de resposta para telas comuns e orientando a validação de cálculos e relatórios mais complexos em condições de carga acordadas.

## 2. Requisito relacionado
- RNF-006 — Desempenho: meta inicial sugerida de 95% das telas comuns em até 3 segundos sob carga acordada; cálculos e relatórios maiores devem informar progresso. Validar por testes.

## 3. Escopo
- Medição do desempenho das telas comuns.
- Definição e documentação do perfil de carga acordado.
- Testes de desempenho, carga e, quando aplicável, estresse.
- Avaliação de cálculos e relatórios mais complexos.
- Feedback de progresso para operações demoradas.
- Identificação de gargalos e registro de resultados.

## 4. Comportamento esperado
- Buscar que pelo menos 95% das telas comuns respondam em até 3 segundos, conforme meta inicial e sob carga acordada.
- Definir quais telas e operações são consideradas comuns e como o tempo de resposta será medido.
- Documentar o perfil de carga utilizado nos testes, incluindo usuários simultâneos, volume de dados e cenário.
- Para cálculos e relatórios demorados, apresentar indicação de progresso ou estado da operação.
- Registrar tempos de resposta, percentis, falhas e recursos observados.
- Identificar gargalos e propor melhorias.
- Evitar que testes de desempenho utilizem dados pessoais ou produção sem autorização e planejamento.
- Não declarar a meta atingida sem evidências de testes.

## 5. Critérios de aceite
- **CA-1:** As telas e operações consideradas comuns estão identificadas.
- **CA-2:** O perfil de carga e o cenário de teste estão documentados.
- **CA-3:** Testes medem tempos de resposta sob carga acordada.
- **CA-4:** A meta inicial de 95% das telas comuns em até 3 segundos é avaliada e os resultados registrados.
- **CA-5:** Resultados incluem métricas suficientes para avaliação, como percentis, volume e falhas.
- **CA-6:** Cálculos e relatórios maiores apresentam indicação de progresso ou estado da operação, conforme aplicável.
- **CA-7:** Operações demoradas e falhas de desempenho são identificadas e registradas.
- **CA-8:** Gargalos identificados possuem análise ou proposta de melhoria.
- **CA-9:** Testes são executados em ambiente e condições documentados.
- **CA-10:** Resultados não são apresentados como aprovação sem evidência verificável.
- **CA-11:** Testes respeitam segurança e proteção dos dados utilizados.

## 6. Plano técnico
- Definir telas, operações e fluxos representativos.
- Acordar carga, usuários simultâneos, volume de dados e ambiente.
- Estabelecer método de coleta e métricas (incluindo percentis e taxa de erro).
- Criar cenários de teste de carga e registrar resultados.
- Avaliar operações de cálculo e relatórios de maior duração.
- Implementar feedback de progresso para operações demoradas quando necessário.
- Identificar gargalos e priorizar otimizações.
- Repetir testes após alterações relevantes e comparar resultados.

## 7. Tarefas de implementação
- [ ] Identificar telas e operações comuns.
- [ ] Documentar perfil de carga acordado.
- [ ] Definir ambiente e ferramentas de teste.
- [ ] Criar cenários de desempenho e carga.
- [ ] Medir tempos de resposta e percentis.
- [ ] Avaliar meta de 95% em até 3 segundos.
- [ ] Testar cálculos e relatórios maiores.
- [ ] Implementar feedback de progresso para operações demoradas.
- [ ] Identificar gargalos e propor melhorias.
- [ ] Reexecutar testes após otimizações.
- [ ] Registrar evidências e resultados.

## 8. Dependências
- Ambiente de teste representativo.
- Definição de carga e cenários com partes interessadas.
- Telas, cálculos e relatórios implementados.
- Instrumentação para medir desempenho e falhas.
- SPEC-5.8 — Observabilidade e monitoramento, quando aplicável.

## 9. Validação
1. Documentar o ambiente, carga e cenário.
2. Executar testes nas telas comuns.
3. Coletar tempos de resposta e percentis.
4. Avaliar o percentual de telas/operações atendendo à meta.
5. Testar cálculos e relatórios maiores.
6. Conferir indicação de progresso nas operações demoradas.
7. Identificar falhas e gargalos.
8. Registrar resultados e evidências.
9. Repetir testes após melhorias e comparar.

## 10. Evidências
A preencher após implementação: cenários e perfis de carga, resultados de testes, métricas, registros de gargalos, prints de progresso e link do PR.

## 11. Revisão
Esta etapa documenta a especificação e os procedimentos de implementação e validação. Os critérios de aceite não devem ser marcados como concluídos antes da implementação e dos testes.
