# Política de Privacidade, Governança LGPD e Procedimentos (RNF-002)

Este documento estabelece as diretrizes de privacidade e proteção de dados pessoais do **Sistema Integrado de Contabilidade, Fiscal e Imposto de Renda**, em conformidade com a Lei Geral de Proteção de Dados Pessoais (**Lei nº 13.709/2018 – LGPD**).

---

## 1. Finalidade e Minimização de Dados

O tratamento de dados pessoais no sistema ocorre exclusivamente para finalidades legítimas, explícitas e informadas ao controlador/titular:

- **Gestão Cadastral e Societária:** Identificação de pessoas físicas, sócios e responsáveis técnicos vinculados a organizações clientes.
- **Execução de Rotinas Contábeis, Fiscais e de Folha:** Apuração de tributos, emissão de obrigações acessórias e gestão trabalhista.
- **Segurança, Autenticação e Auditoria:** Controle de acesso (menor privilégio), prevenção a fraudes e trilha de auditoria imutável.

**Princípio da Minimização:**
- Somente são coletados e armazenados os atributos estritamente necessários ao cumprimento da finalidade contábil, fiscal ou de segurança.
- Ambientes de desenvolvimento e testes utilizam exclusivamente **dados 100% fictícios** (proibição estrita de CPF, CNPJ, salários ou nomes reais em código, sementes ou testes).

---

## 2. Bases Legais Aplicáveis

Cada operação de tratamento está vinculada a uma base legal prevista na LGPD:

| Categoria de Tratamento | Base Legal (Art. 7º / Art. 11 LGPD) |
|---|---|
| Obrigações fiscais, contábeis, previdenciárias e trabalhistas | **Cumprimento de obrigação legal ou regulatória** (Art. 7º, II) |
| Prestação de serviços pelo escritório contábil ao cliente | **Execução de contrato ou procedimentos preliminares** (Art. 7º, V) |
| Logs de segurança, prevenção a fraude e trilha de auditoria | **Legítimo interesse / Proteção do crédito e segurança** (Art. 7º, IX / Art. 10) |
| Comunicações opcionais ou autorizações específicas não legais | **Consentimento do titular** (Art. 7º, I) |

---

## 3. Direitos dos Titulares

O sistema e a operação garantem aos titulares os direitos previstos no **Art. 18 da LGPD**:

1. Confirmação da existência de tratamento.
2. Acesso aos dados pessoais tratados.
3. Correção de dados incompletos, inexatos ou desatualizados.
4. Anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade.
5. Portabilidade dos dados a outro fornecedor, mediante requisição expressa.
6. Eliminação dos dados pessoais tratados com consentimento (ressalvadas as hipóteses legais de guarda obrigatória).
7. Informação sobre entidades públicas e privadas com as quais houve uso compartilhado.
8. Revogação do consentimento a qualquer momento.

---

## 4. Fluxo de Pedido do Titular (Procedimento Aprovado)

O atendimento às solicitações dos titulares segue o fluxo padronizado abaixo:

1. **Recebimento e Protocolo (`ABERTA`):**
   - O titular (ou seu representante) registra o pedido via endpoint `/api/lgpd/solicitacoes-titulares` ou canal oficial do controlador, informando nome/identificação do titular, contato, tipo de direito (`CONFIRMACAO`, `ACESSO`, `CORRECAO`, `ELIMINACAO`, `ANONIMIZACAO`, `PORTABILIDADE`, `REVOGACAO_CONSENTIMENTO`) e descrição do pedido.
   - O sistema gera um protocolo único com data/hora de abertura e prazo legal de resposta (**15 dias** conforme Art. 19, II da LGPD).
2. **Triagem e Verificação de Identidade (`EM_ANALISE`):**
   - O responsável verifica a legitimidade do solicitante e avalia se há obrigação legal de retenção que impeça exclusão imediata (ex.: documentos fiscais e trabalhistas).
3. **Execução e Resposta (`ATENDIDA` ou `INDEFERIDA_COM_JUSTIFICATIVA`):**
   - Cumprida a ação (ex.: retificação, exportação ou anonimização) ou fundamentada a impossibilidade legal de exclusão, o sistema registra a justificativa da resposta e a data de conclusão.

---

## 5. Diretrizes para Contratos com Operadores

Todo operador terceiro contratado para hospedagem, armazenamento, mensageria ou processamento de dados deve possuir cláusulas contratuais contemplando:

- Tratamento dos dados estritamente segundo as instruções documentadas do Controlador.
- Dever de sigilo, confidencialidade e adoção de medidas técnicas de segurança (criptografia em trânsito TLS e em repouso, controle de acesso).
- Proibição de subcontratação sem autorização prévia e ciência do Controlador.
- Obrigação de notificação imediata em caso de incidente de segurança/vazamento.
- Devolução ou descarte seguro de todos os dados ao término do contrato.

---

## 6. Política de Retenção e Descarte

Os dados são mantidos apenas pelo período necessário ao cumprimento de sua finalidade ou obrigação legal/regulatória:

| Tipo de Dado / Registro | Prazo de Retenção Referencial | Destino Após o Prazo (Descarte) |
|---|---|---|
| Documentos fiscais, livros contábeis e comprovantes tributários | Conforme prazo prescricional/decadencial legal vigente | Anonimização ou eliminação segura controlada |
| Registros trabalhistas e previdenciários (eSocial/folha) | Conforme prazo legal trabalhista/previdenciário aplicável | Anonimização ou eliminação segura controlada |
| Logs de auditoria de segurança e acesso | Prazo mínimo de guarda de rastreabilidade operacional | Expurgo seguro ou arquivamento criptografado |
| Dados cadastrais sem vínculo ativo nem obrigação legal pendente | Até solicitação de eliminação ou fim da relação contratual | Exclusão definitiva ou anonimização irreversível |

**Procedimento de Descarte Seguro:**
- Dados em banco relacional são eliminados ou anonimizados de forma irreversível (substituição de identificadores pessoais por hashes/valores anônimos quando a integridade referencial contábil exigir).
- Backups expiram segundo a janela rotativa definida, sem restauração de dados já descartados.

---

## 7. Registro e Resposta a Incidentes de Privacidade

Qualquer suspeita ou confirmação de incidente envolvendo dados pessoais (acesso não autorizado, vazamento, perda ou alteração indevida) deve ser registrada imediatamente no sistema (`/api/lgpd/incidentes`) contendo:

- Título, descrição detalhada do ocorrido e categorias de dados afetados.
- Severidade (`BAIXA`, `MEDIA`, `ALTA`, `CRITICA`).
- Medidas imediatas de contenção adotadas e status do tratamento (`ABERTO`, `EM_CONTENCAO`, `RESOLVIDO`).
- Avaliação de necessidade de comunicação à ANPD e aos titulares afetados conforme procedimento aprovado.
