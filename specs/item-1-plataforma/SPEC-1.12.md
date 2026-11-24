# SPEC-1.12 – Backup, recuperação e continuidade

| Item | Responsável | Revisor (4º período) | Trello | Status |
|---|---|---|---|---|
| 1 – Plataforma | @joaovitor-webdev | A definir | https://trello.com/c/p7KBPr9c | Revisando |

## 1. Contexto e objetivo
Estabelecer os mecanismos e documentos operacionais de backup automático criptografado, testes periódicos de restauração com registro de evidências, definição de RPO/RTO e o plano formal de continuidade de negócios, resposta a incidentes, recuperação de desastres e comunicação com clientes.

## 2. Requisitos relacionados
- **RNF-008 — Backup e recuperação**: Executar backups automáticos, criptografados e testados; definir RPO/RTO com o negócio e testar restauração periodicamente.
- **RNF-016 — Continuidade**: Documentar plano de resposta a incidentes, recuperação de desastre e comunicação com clientes.

## 3. Escopo
- **Dentro do escopo:**
  - Execução e registro de backups automáticos criptografados (`AES-256-GCM`) com verificação de integridade.
  - Execução e registro formal de testes periódicos de restauração, validando que o dado restaurado corresponde integralmente ao original e respeita os parâmetros de RPO/RTO definidos.
  - Documentação formal do plano de resposta a incidentes, recuperação de desastre (DR), definição de RPO/RTO e comunicação com clientes.
- **Fora do escopo:**
  - Contratação de infraestrutura de nuvem paga multi-região ou provedores comerciais externos.
  - Disparo automático de e-mails ou SMS em massa para clientes durante incidentes reais.

## 4. Comportamento esperado
- **Fluxo normal (Backup Automático Criptografado):** O serviço executa ou agenda um backup do conteúdo especificado, criptografa os dados antes do armazenamento (usando chave protegida de variável de ambiente), gera hash de integridade e registra o backup com data/hora e status.
- **Fluxo normal (Teste de Restauração Registrado):** Um teste periódico de restauração decifra um backup existente, valida a integridade e fidelidade em relação ao conteúdo original, mede o tempo de recuperação e registra o resultado formal do teste de restauração.
- **Fluxo normal (Plano de Continuidade e Incidentes):** A documentação do repositório apresenta de forma clara as metas de RPO/RTO, o fluxo de resposta a incidentes, os passos de recuperação de desastre e os modelos/canais de comunicação com clientes.
- **Fluxo de erro (Backup Corrompido ou Chave Incorreta):** Caso o backup esteja corrompido ou falhe na verificação de integridade durante o teste de restauração, o sistema registra o teste como falho e recusa a restauração sem corromper o ambiente.

## 5. Critérios de aceite
- **CA-1:** Dado um conjunto de dados para backup, quando executado o processo de backup automático, então o arquivo/registro gerado deve ser armazenado de forma criptografada com hash de integridade e metadados de execução (RNF-008).
- **CA-2:** Dado um backup criptografado existente, quando executado o teste de restauração, então o sistema deve restaurar e validar os dados originais, registrando formalmente o teste de restauração com data, status e tempo de execução frente ao RPO/RTO (RNF-008).
- **CA-3:** Dado um backup adulterado ou corrompido, quando submetido ao teste de restauração, então o sistema deve detectar a falha de integridade, recusar a restauração e registrar o resultado negativo do teste (RNF-008).
- **CA-4:** Dado o repositório do projeto, quando inspecionada a documentação operacional/arquitetural, então deve existir o plano documentado contendo definição de RPO/RTO, plano de resposta a incidentes, recuperação de desastre e comunicação com clientes (RNF-008, RNF-016).

## 6. Plano técnico
- **Documentação de Continuidade e DR:**
  - Criar `docs/operacao/plano-continuidade-e-incidentes.md` definindo metas de RPO/RTO, rotina de backup automático criptografado, procedimento periódico de teste de restauração, plano de resposta a incidentes, recuperação de desastre e comunicação com clientes.
- **Módulo de Backup e Teste de Restauração:**
  - Migração SQL `010_backup_recuperacao_continuidade.sql` com tabelas `registros_backup` e `testes_restauracao_backup`.
  - Serviço `BackupRecuperacaoService` utilizando `CriptografiaSegurancaService` (`AES-256-GCM`) para cifrar/decifrar backups, calcular/validar `SHA-256` e registrar execuções e testes periódicos de restauração.
  - Rotas Express sob `/api/operacao/backups` e `/api/operacao/backups/:id/testar-restauracao`.

## 7. Tarefas de implementação
- [x] Criar branch de trabalho `spec/1.12-backup-recuperacao-continuidade` a partir da `main`
- [x] Elaborar `docs/operacao/plano-continuidade-e-incidentes.md` com RPO/RTO, resposta a incidentes, recuperação de desastre e comunicação com clientes (CA-4)
- [x] Criar migração SQL e modelos para registros de backup criptografado e testes de restauração
- [x] Implementar repositório, serviço, controller e rotas Express para backup automático criptografado e teste de restauração registrado (CA-1, CA-2 e CA-3)
- [x] Implementar testes automatizados cobrindo os critérios CA-1 a CA-4
- [x] Atualizar `CHANGELOG.md` na seção `[Não lançado]`

## 8. Dependências
- `SPEC-1.1` (Repositório, documentação e padrões de contribuição).
- `SPEC-1.2` (Arquitetura, stack e ambientes).
- `SPEC-1.3` (Modelo de dados e integridade).
- `SPEC-1.5` (Criptografia de dados sensíveis em repouso).

## 9. Como validar
1. **Validação de Backup Criptografado (CA-1):**
   - Acionar `POST /api/operacao/backups` com dados fictícios e confirmar que o conteúdo persistido está criptografado e acompanhado de hash SHA-256.
2. **Validação de Teste de Restauração Registrado (CA-2 e CA-3):**
   - Acionar `POST /api/operacao/backups/:id/testar-restauracao` e confirmar sucesso (200), restauração fiel dos dados e gravação do log de teste de restauração; testar também com backup adulterado e confirmar detecção de falha.
3. **Validação do Plano de Continuidade e Incidentes (CA-4):**
   - Verificar a existência de `docs/operacao/plano-continuidade-e-incidentes.md` e a presença das seções de RPO/RTO, resposta a incidentes, recuperação de desastre e comunicação com clientes.

## 10. Evidências (preencher ao concluir)
- PR: https://github.com/joaovitor-webdev/pagamentus/pull/23
- Plano de Continuidade e Incidentes: `docs/operacao/plano-continuidade-e-incidentes.md`
- Migração SQL: `src/database/migrations/010_backup_recuperacao_continuidade.sql`
- Modelos, Repositório, Serviço, Controller e Rotas: `src/models/BackupRecuperacaoModel.ts`, `src/repositories/BackupRecuperacaoRepository.ts`, `src/services/BackupRecuperacaoService.ts`, `src/controllers/BackupRecuperacaoController.ts`, `src/routes/backupRecuperacaoRoutes.ts`
- Suíte de testes automatizados (`tests/backupRecuperacaoContinuidade.test.ts`): 4 cenários aprovados cobrindo integralmente CA-1 a CA-4 (`PASS tests/backupRecuperacaoContinuidade.test.ts`).

## 11. Histórico de revisão
*Nenhuma ressalva registrada até o momento.*
