# SPEC-5.3 — Relatórios em PDF, XLSX e CSV

| Item | Responsável | Trello | Status |
|---|---|---|---|
| 5 — Experiência, integrações, relatórios e qualidade | Pablo (conforme cartão) | SPEC-5.3 — Relatórios em PDF, XLSX e CSV | Em especificação |

## 1. Contexto e objetivo
Permitir que usuários autorizados gerem e exportem relatórios do Pagamentus nos formatos PDF, XLSX e CSV, utilizando os mesmos filtros e dados para que os resultados sejam consistentes entre os formatos.

## 2. Requisito relacionado
- RF-071 — Gerar relatórios em PDF, XLSX e CSV, com filtros por cliente, período, conta, centro de custo e status.

## 3. Escopo
### Dentro do escopo
- Exportação de relatórios nos formatos PDF, XLSX e CSV.
- Aplicação dos filtros por cliente, período, conta, centro de custo e status.
- Consistência do conjunto de dados e dos filtros entre os formatos.
- Identificação do relatório, filtros utilizados e período abrangido.
- Tratamento de geração, download, erros e ausência de dados.
- Respeito à autenticação, autorização e segregação de informações.

### Fora do escopo
- Criar ou alterar lançamentos contábeis durante a exportação.
- Modificar registros de origem ou regras contábeis.
- Disponibilizar dados a usuários sem autorização.
- Criar novos filtros ou regras não definidos nos requisitos.

## 4. Comportamento esperado
- Permitir selecionar o formato PDF, XLSX ou CSV.
- Aplicar os filtros selecionados antes da geração.
- Garantir que o relatório exportado nos três formatos represente o mesmo conjunto de registros e filtros.
- Identificar os filtros aplicados no relatório, quando apropriado ao formato.
- O PDF deve apresentar conteúdo legível e organizado para visualização e impressão.
- O XLSX deve apresentar dados estruturados em planilha, com cabeçalhos apropriados.
- O CSV deve apresentar dados tabulares, com cabeçalhos e delimitadores consistentes.
- Tratar relatório sem registros com mensagem clara, sem inventar ou omitir dados silenciosamente.
- Informar falhas de geração ou download e permitir nova tentativa quando possível.
- Respeitar as permissões do usuário e a segregação de dados.
- A exportação não deve alterar dados de origem.

## 5. Critérios de aceite
- **CA-1:** O usuário autorizado consegue gerar relatório em PDF.
- **CA-2:** O usuário autorizado consegue gerar relatório em XLSX.
- **CA-3:** O usuário autorizado consegue gerar relatório em CSV.
- **CA-4:** Os filtros por cliente, período, conta, centro de custo e status estão disponíveis conforme o requisito e são aplicados corretamente.
- **CA-5:** O mesmo conjunto de dados e filtros é refletido nos três formatos exportados.
- **CA-6:** Os relatórios apresentam cabeçalhos e identificação apropriados, incluindo filtros e período quando aplicável.
- **CA-7:** O PDF apresenta conteúdo legível e organizado, sem cortes indevidos de conteúdo relevante.
- **CA-8:** O XLSX apresenta dados organizados em células e colunas, com cabeçalhos claros.
- **CA-9:** O CSV apresenta dados tabulares com cabeçalhos e estrutura consistente, permitindo abertura em ferramentas compatíveis.
- **CA-10:** Quando não existem registros para os filtros selecionados, o sistema informa claramente e não apresenta dados fictícios.
- **CA-11:** Falhas de geração ou download são informadas e, quando possível, permitem nova tentativa.
- **CA-12:** Usuários sem permissão não conseguem exportar ou acessar dados protegidos.
- **CA-13:** A geração dos relatórios não altera os dados de origem.
- **CA-14:** Os resultados exportados são verificáveis quanto à integridade e correspondem aos dados retornados pela fonte para os filtros selecionados.

## 6. Plano técnico
- Implementar a funcionalidade conforme arquitetura e stack aprovadas nas SPEC-1.x.
- Reutilizar a consulta e a lógica de filtragem para os três formatos, evitando divergência entre exportações.
- Separar a preparação dos dados da formatação específica de PDF, XLSX e CSV.
- Utilizar bibliotecas e recursos compatíveis com a stack aprovada.
- Tratar carregamento, geração, download, estados vazios e erros.
- Validar autorização e segregação de dados antes da exportação.
- Evitar dados reais ou sensíveis nos testes e evidências.

## 7. Tarefas de implementação
- [ ] Confirmar fonte de dados e campos disponíveis para o relatório.
- [ ] Confirmar regras e permissões de cada filtro.
- [ ] Implementar filtros por cliente, período, conta, centro de custo e status.
- [ ] Implementar geração de PDF.
- [ ] Implementar geração de XLSX.
- [ ] Implementar geração de CSV.
- [ ] Reutilizar a mesma consulta/conjunto de dados nos formatos.
- [ ] Identificar os filtros aplicados e o período no relatório.
- [ ] Tratar ausência de dados, erros e nova tentativa.
- [ ] Validar autorização e segregação de dados.
- [ ] Conferir integridade e consistência entre os três formatos.
- [ ] Testar e registrar evidências.

## 8. Dependências
- Stack e arquitetura definidas nas SPEC-1.x.
- Fontes de dados e campos disponíveis nos módulos correspondentes.
- Regras de acesso, autenticação e autorização.
- Definições dos filtros e status nos módulos de origem.

## 9. Validação
1. Acessar a funcionalidade com usuário autorizado.
2. Selecionar filtros por cliente, período, conta, centro de custo e status.
3. Gerar o relatório em PDF e conferir organização, legibilidade e conteúdo.
4. Gerar o relatório em XLSX e conferir cabeçalhos, colunas e dados.
5. Gerar o relatório em CSV e conferir cabeçalhos, delimitadores e dados.
6. Comparar os registros e filtros entre os três formatos.
7. Testar combinações de filtros e ausência de resultados.
8. Validar falha de geração ou download e nova tentativa, quando disponível.
9. Testar permissões com usuário sem acesso.
10. Comparar os dados exportados com a fonte para verificar integridade.
11. Confirmar que a exportação não alterou os registros de origem.

## 10. Evidências
A preencher após implementação: arquivos de exemplo com dados fictícios, prints, resultados dos testes, link do PR e registros de validação.

## 11. Revisão
Os critérios de aceite não devem ser marcados como concluídos antes da implementação e validação. Esta etapa registra a especificação e o plano de implementação e testes.
