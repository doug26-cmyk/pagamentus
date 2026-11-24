# SPEC-5.5 — Relatórios de auditoria

## 1. Contexto e objetivo
Especificar relatórios de auditoria que permitam consultar e rastrear alterações, acessos, falhas de integração e aprovações no Pagamentus, contribuindo para transparência, segurança e rastreabilidade das operações.

## 2. Requisito relacionado
- RF-074 — Oferecer relatórios de auditoria, alterações, acessos, falhas de integração e aprovações.

## 3. Escopo
### Dentro do escopo
- Relatórios de alterações realizadas nos dados e configurações.
- Relatórios de acessos e eventos relevantes de autenticação.
- Relatórios de falhas de integração.
- Relatórios de aprovações e respectivos estados.
- Filtros de consulta, período e categorias de eventos.
- Respeito às permissões e proteção de informações sensíveis.
- Registro consistente dos eventos auditáveis.

### Fora do escopo
- Exibir senhas, tokens, segredos ou conteúdo sensível desnecessário.
- Permitir alteração de eventos ou registros de auditoria por usuários comuns.
- Expor eventos ou dados de outras organizações sem autorização.
- Substituir controles de segurança, monitoramento ou mecanismos de aprovação.

## 4. Comportamento esperado
- Disponibilizar relatórios de alterações, acessos, falhas de integração e aprovações.
- Permitir filtrar e consultar eventos por período e atributos disponíveis, como usuário, categoria, operação, status e módulo.
- Apresentar informações relevantes para rastreabilidade, como evento, usuário associado, data/hora, tipo de operação, resultado e contexto permitido.
- Registrar falhas de integração com informações suficientes para investigação, evitando expor segredos.
- Exibir eventos e estados de aprovação de maneira verificável.
- Respeitar autorização, segregação de dados e perfil de acesso.
- Tratar períodos sem registros com mensagem clara.
- Informar falhas na consulta e permitir nova tentativa quando aplicável.
- Proteger registros contra alteração indevida e limitar exposição de informações sensíveis.

## 5. Critérios de aceite
- **CA-1:** O sistema disponibiliza relatório de alterações.
- **CA-2:** O sistema disponibiliza relatório de acessos e eventos relevantes.
- **CA-3:** O sistema disponibiliza relatório de falhas de integração.
- **CA-4:** O sistema disponibiliza relatório de aprovações.
- **CA-5:** Os relatórios permitem filtros compatíveis com os dados auditados, incluindo período e, quando disponível, usuário, categoria, módulo, operação e status.
- **CA-6:** Os registros apresentam informações suficientes para rastreabilidade, incluindo evento, data/hora, resultado e usuário associado quando aplicável.
- **CA-7:** Os registros de falhas de integração apresentam informações úteis para análise, sem expor segredos ou dados sensíveis desnecessários.
- **CA-8:** Os relatórios respeitam permissões e segregação de dados.
- **CA-9:** Usuários sem autorização não acessam relatórios ou registros protegidos.
- **CA-10:** Os registros de auditoria não podem ser alterados indevidamente por usuários comuns.
- **CA-11:** Períodos sem eventos são apresentados de forma clara.
- **CA-12:** Falhas na consulta são informadas e, quando possível, permitem nova tentativa.
- **CA-13:** Os relatórios não expõem senhas, tokens, segredos ou informações sensíveis desnecessárias.

## 6. Plano técnico
- Implementar conforme arquitetura, autenticação, autorização e registro de eventos definidos nas SPEC-1.x.
- Identificar e reutilizar fontes de eventos auditáveis existentes.
- Definir campos, categorias e retenção dos registros em alinhamento com as regras do sistema.
- Aplicar filtros e controles de autorização na consulta.
- Proteger logs contra alteração e acesso indevidos.
- Minimizar exposição de dados sensíveis nos relatórios.
- Tratar carregamento, ausência de dados, erros e nova tentativa.
- Usar dados fictícios ou devidamente apropriados para testes e evidências.

## 7. Tarefas de implementação
- [ ] Mapear eventos auditáveis e fontes existentes.
- [ ] Definir campos e categorias de eventos.
- [ ] Implementar relatório de alterações.
- [ ] Implementar relatório de acessos.
- [ ] Implementar relatório de falhas de integração.
- [ ] Implementar relatório de aprovações.
- [ ] Implementar filtros e consultas.
- [ ] Aplicar autorização e segregação de dados.
- [ ] Proteger registros contra alterações indevidas.
- [ ] Revisar exposição de informações sensíveis.
- [ ] Tratar ausência de registros, erros e nova tentativa.
- [ ] Validar consistência e rastreabilidade dos resultados.
- [ ] Testar e registrar evidências.

## 8. Dependências
- Fontes e mecanismos de registro de eventos auditáveis.
- Autenticação, autorização e segregação conforme SPEC-1.x.
- Regras de aprovação e integrações dos módulos correspondentes.
- Regras de retenção e proteção de registros.

## 9. Validação
1. Consultar relatório de alterações e conferir os eventos apresentados.
2. Consultar relatório de acessos.
3. Consultar relatório de falhas de integração.
4. Consultar relatório de aprovações.
5. Aplicar filtros e conferir resultados.
6. Validar informações de rastreabilidade e data/hora.
7. Verificar acesso com perfis autorizados e não autorizados.
8. Verificar segregação de dados.
9. Confirmar que segredos e informações sensíveis desnecessárias não são exibidos.
10. Testar períodos sem registros e erros de consulta.
11. Verificar proteção dos registros contra alteração indevida.

## 10. Evidências
A preencher após implementação: prints, exemplos com dados fictícios, resultados de testes, link do PR e registros de validação.

## 11. Revisão
Esta etapa documenta a especificação e os procedimentos de implementação e validação. Os critérios de aceite não devem ser marcados como concluídos antes da implementação e dos testes.
