# SPEC-5.2 — Painéis de indicadores

| Item | Responsável | Trello | Status |
|---|---|---|---|
| 5 — Experiência, integrações, relatórios e qualidade | Conforme divisão/Trello | SPEC-5.2 — Painéis de indicadores | Em especificação |

## 1. Contexto e objetivo
Disponibilizar painéis de indicadores no Pagamentus que apresentem informações consolidadas sobre tarefas, faturamento do escritório, inadimplência, obrigações, fechamentos e produtividade.

## 2. Requisito relacionado
- RF-072 — Disponibilizar painéis de tarefas, faturamento do escritório, inadimplência, obrigações, fechamentos e produtividade.

## 3. Escopo
### Dentro do escopo
- Painel de tarefas e status.
- Indicadores de faturamento.
- Indicadores de inadimplência.
- Acompanhamento de obrigações e prazos.
- Acompanhamento de fechamentos.
- Indicadores de produtividade, conforme dados e permissões disponíveis.
- Visualização organizada dos indicadores.

### Fora do escopo
- Alterar registros contábeis/financeiros diretamente pelos painéis.
- Realizar pagamentos, transmissões ou fechamentos automaticamente.
- Criar regras de negócio não definidas em requisitos próprios.
- Expor informações a usuários sem autorização.

## 4. Comportamento esperado
- Exibir dados consolidados dos módulos correspondentes e respeitar permissões.
- Identificar claramente cada indicador, período e unidade.
- Quando houver filtros suportados, atualizar indicadores de acordo com a seleção.
- Exibir estado vazio informativo quando não houver dados.
- Exibir mensagens apropriadas em falhas de carregamento e permitir nova tentativa quando possível.
- Não alterar registros de origem.
- Respeitar as permissões e a segregação de dados.
- Identificar claramente dados fictícios de demonstração.

## 5. Critérios de aceite
- **CA-1:** O painel de tarefas exibe os dados e status disponíveis.
- **CA-2:** O painel de faturamento apresenta dados consistentes com a fonte e indica o período.
- **CA-3:** O painel de inadimplência permite identificar valores/registros em atraso conforme os dados disponíveis.
- **CA-4:** O painel de obrigações apresenta prazos e status disponíveis.
- **CA-5:** O painel de fechamentos apresenta os status dos fechamentos registrados.
- **CA-6:** O painel de produtividade apresenta dados disponíveis, respeitando permissões.
- **CA-7:** Filtros disponíveis refletem-se corretamente nos indicadores.
- **CA-8:** Ausência de dados é apresentada como estado vazio informativo, sem valores inventados.
- **CA-9:** Falhas de consulta são informadas e, quando possível, permitem tentar novamente.
- **CA-10:** Usuários sem permissão não conseguem visualizar ou obter dados protegidos.
- **CA-11:** Indicadores agregados são consistentes com os dados de origem e não os alteram.

## 6. Plano técnico
- Implementar a área de painéis conforme arquitetura e stack definidas nas SPEC-1.x.
- Consumir serviços/APIs dos módulos de origem, evitando duplicar regras de negócio na interface.
- Organizar indicadores em componentes visuais claros.
- Implementar filtros somente quando suportados.
- Tratar carregamento, estados vazios e erros.
- Respeitar autenticação, autorização e segregação de dados.
- Evitar dados sensíveis em ambientes de teste.

## 7. Tarefas de implementação
- [ ] Confirmar APIs/fontes de dados de cada indicador.
- [ ] Criar estrutura da área de painéis.
- [ ] Implementar painel de tarefas.
- [ ] Implementar painel de faturamento.
- [ ] Implementar painel de inadimplência.
- [ ] Implementar painel de obrigações.
- [ ] Implementar painel de fechamentos.
- [ ] Implementar produtividade, se os dados estiverem disponíveis.
- [ ] Implementar filtros suportados.
- [ ] Tratar carregamento, vazio e erro.
- [ ] Validar permissões e segregação de dados.
- [ ] Testar e registrar evidências.

## 8. Dependências
- Stack e arquitetura definidas nas SPEC-1.x.
- APIs e dados dos módulos de tarefas, financeiro, obrigações e fechamentos.
- Autenticação e autorização.
- Requisitos dos indicadores definidos pelos módulos relacionados.

## 9. Validação
1. Acessar a área de painéis com usuário autorizado.
2. Conferir painel de tarefas.
3. Conferir faturamento com dados de teste.
4. Conferir inadimplência com dados de teste.
5. Conferir obrigações e prazos.
6. Conferir fechamentos.
7. Conferir produtividade, quando disponível.
8. Aplicar filtros e conferir os resultados.
9. Validar estado vazio.
10. Validar falha de consulta.
11. Testar permissões com usuário sem acesso.
12. Comparar indicadores com registros de origem.

## 10. Evidências
A preencher após implementação: prints, resultados de testes, link do PR e registros de validação.

## 11. Revisão
Os critérios não devem ser marcados como concluídos antes da implementação e validação.
