# Plano de Continuidade de Negócios, Recuperação de Desastres e Resposta a Incidentes (RNF-008 / RNF-016)

Este documento estabelece as diretrizes operacionais de backup, recuperação e continuidade do **Sistema Integrado de Contabilidade, Fiscal e Imposto de Renda**.

---

## 1. Definição de RPO e RTO (RNF-008)

| Parâmetro | Meta Definida com o Negócio | Justificativa Operacional |
|---|---|---|
| **RPO (Recovery Point Objective)** | **Até 24 horas** (backups diários automáticos) / **1 hora** para logs transacionais | Limita a janela máxima de perda de dados aceitável em caso de falha grave. |
| **RTO (Recovery Time Objective)** | **Até 4 horas** | Tempo máximo tolerado para restabelecer o ambiente e restaurar os dados a partir do último backup íntegro. |

---

## 2. Política de Backup Automático Criptografado e Teste de Restauração

- **Periodicidade:** Execução automática diária em janela de baixo uso (ex.: 02:00 UTC) e antes de migrações estruturais críticas.
- **Criptografia e Integridade:** Todo snapshot de backup é cifrado em repouso com **AES-256-GCM** utilizando chave protegida em variável de ambiente (`DATA_ENCRYPTION_KEY`), acompanhado de hash **SHA-256** do conteúdo original para verificação de integridade.
- **Teste Periódico de Restauração:**
  - Executado mensalmente (ou via rotina automatizada `POST /api/operacao/backups/:id/testar-restauracao`).
  - O procedimento decifra o backup em ambiente isolado de validação, compara o hash `SHA-256` dos dados restaurados com o hash registrado e grava o resultado formal (`APROVADO` ou `FALHA`) com tempo de duração em milissegundos frente ao RTO.

---

## 3. Plano de Resposta a Incidentes (RNF-016)

1. **Detecção e Classificação:**
   - Identificação de indisponibilidade, falha de integridade ou incidente de segurança/dados.
   - Classificação da severidade (`BAIXA`, `MEDIA`, `ALTA`, `CRITICA`).
2. **Contenção Imediata:**
   - Isolar serviços afetados, revogar tokens/sessões comprometidos (SPEC-1.4 / SPEC-1.10) e preservar logs imutáveis de auditoria (SPEC-1.9).
3. **Erradicação e Recuperação:**
   - Corrigir a causa raiz e, se necessário, acionar o procedimento de Recuperação de Desastre (DR).
4. **Lições Aprendidas (Post-Mortem):**
   - Registrar causa, linha do tempo, impacto e ações preventivas.

---

## 4. Plano de Recuperação de Desastre (DR)

Em caso de perda ou corrupção severa da base de dados ou servidor principal:

1. Provisionar nova instância limpa da aplicação e do PostgreSQL (conforme `ADR-001` e `docker-compose.yml`).
2. Selecionar o último backup com status `CONCLUIDO` e último teste de restauração `APROVADO`.
3. Validar a integridade (`SHA-256`), decifrar o pacote e executar a restauração na base recuperada.
4. Validar o funcionamento básico (`healthcheck`, integridade referencial e contagem de registros) antes de liberar o acesso.

---

## 5. Plano de Comunicação com Clientes

| Etapa | Público | Prazo Referencial | Conteúdo Mínimo |
|---|---|---|---|
| **Aviso Inicial** | Clientes / Escritórios afetados | Até **1 hora** após confirmação de incidente crítico | Confirmação do incidente, módulos afetados, medidas de contenção em curso e canal de acompanhamento. |
| **Atualizações** | Clientes / Escritórios afetados | A cada **2 horas** durante indisponibilidade | Evolução da recuperação e previsão atualizada de restabelecimento (RTO). |
| **Comunicado de Normalização** | Clientes / Escritórios afetados | Imediatamente após restabelecimento | Confirmação de retorno operacional, integridade dos dados e orientações caso haja necessidade de reenvio no intervalo do RPO. |
