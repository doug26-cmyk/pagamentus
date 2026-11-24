# SPEC-1.8 – Anexos cadastrais com validade

| Item | Responsável | Revisor (4º período) | Trello | Status |
|---|---|---|---|---|
| 1 – Plataforma | @joaovitor-webdev | A definir | https://trello.com/c/pp9KANUa | Revisando |

## 1. Contexto e objetivo
Permitir anexar e controlar a validade de documentos vinculados ao cadastro de pessoas e empresas, tais como contrato social, procurações, documentos cadastrais, certificados e outros arquivos. A especificação garante o acompanhamento do ciclo de validade dos anexos e a geração de alertas para documentos vencidos ou próximos do vencimento (a vencer).

## 2. Requisitos relacionados
- **RF-003**: Anexar contrato social, procurações, documentos cadastrais, certificados e outros arquivos, com controle de validade.

## 3. Escopo
- **Dentro do escopo:**
  - Registro/anexação de arquivos vinculados ao cadastro (`CONTRATO_SOCIAL`, `PROCURACAO`, `DOCUMENTO_CADASTRAL`, `CERTIFICADO`, `OUTRO`), armazenando metadados do arquivo e data de validade opcional ou obrigatória conforme o tipo.
  - Controle de situação de validade de cada anexo (`VIGENTE`, `A_VENCER`, `VENCIDO`, `SEM_VALIDADE`).
  - Consulta e geração de alertas para documentos vencidos ou próximos do vencimento (dentro da janela configurável de dias a vencer).
- **Fora do escopo:**
  - Assinatura digital ICP-Brasil ou leitura criptográfica interna de certificados A1/A3 para transmissão em webservices governamentais.
  - Disparo de notificações externas por SMS ou WhatsApp.
  - OCR ou extração automática de cláusulas contratuais.

## 4. Comportamento esperado
- **Fluxo normal (Anexar arquivo com controle de validade):** O usuário anexa um contrato social, procuração, documento cadastral, certificado ou outro arquivo informando nome, categoria/tipo, referência do arquivo e data de validade; o sistema registra o anexo e calcula seu status de validade.
- **Fluxo normal (Alerta de documento vencido ou a vencer):** Ao consultar os anexos ou o painel de alertas de validade em uma data de referência, o sistema identifica e destaca como alerta todos os anexos cuja data de validade já expirou (`VENCIDO`) ou que vencerão dentro do prazo de antecedência parametrizado (`A_VENCER`).
- **Fluxo de erro (Dados obrigatórios ausentes ou inválidos):** Caso o cadastro tente anexar um arquivo sem informar o vínculo cadastral, nome do arquivo, categoria válida ou com formato de data de validade inválido, a operação é recusada.

## 5. Critérios de aceite
- **CA-1:** Dado um cadastro existente, quando for anexado um contrato social, procuração, documento cadastral, certificado ou outro arquivo com seus metadados e data de validade, então o anexo deve ser persistido com sucesso vinculado ao cadastro (RF-003).
- **CA-2:** Dado um anexo cadastrado cuja data de validade seja anterior à data de referência atual, quando consultados os anexos ou os alertas de validade, então o sistema deve classificar e alertar o documento como `VENCIDO` (RF-003).
- **CA-3:** Dado um anexo cadastrado cuja data de validade esteja dentro da janela de dias de antecedência em relação à data de referência, quando consultados os anexos ou os alertas de validade, então o sistema deve classificar e alertar o documento como `A_VENCER` (RF-003).
- **CA-4:** Dado o envio de um anexo cadastral, quando faltarem os campos obrigatórios (vínculo cadastral, tipo de documento ou nome do arquivo) ou a data de validade for inválida, então o sistema deve recusar a operação (RF-003).

## 6. Plano técnico
- **Modelos e Persistência:**
  - Tabela/entidade `anexos_cadastrais` (`id`, `organizacaoId`, `pessoaEmpresaId`, `tipoAnexo` (`CONTRATO_SOCIAL` | `PROCURACAO` | `DOCUMENTO_CADASTRAL` | `CERTIFICADO` | `OUTRO`), `nomeArquivo`, `mimeType`, `tamanhoBytes`, `caminhoOuHashArquivo`, `dataEmissao`, `dataValidade`, `criadoEm`).
- **Serviço de Controle de Validade e Alertas:**
  - Cálculo determinístico do status de validade (`VENCIDO`, `A_VENCER`, `VIGENTE`, `SEM_VALIDADE`) comparando `dataValidade` com a data de referência e o limite de dias para alerta (ex.: 30 dias padrão).
  - Endpoint específico para listar alertas de documentos vencidos e a vencer da organização/cadastro.
- **Rotas da API:**
  - `POST /api/cadastros/:pessoaEmpresaId/anexos` e `GET /api/cadastros/:pessoaEmpresaId/anexos`
  - `GET /api/anexos/alertas-validade`

## 7. Tarefas de implementação
- [x] Criar branch de trabalho `spec/1.8-anexos-cadastrais-validade` a partir da `main`
- [x] Criar migração SQL e modelos para anexos cadastrais e alertas de validade
- [x] Implementar repositório e serviço de anexação de documentos e cálculo de validade (CA-1 e CA-4)
- [x] Implementar classificação e consulta de alertas para documentos vencidos e a vencer (CA-2 e CA-3)
- [x] Expor controller e rotas Express para anexos cadastrais e alertas de validade
- [x] Implementar testes automatizados cobrindo os critérios CA-1 a CA-4
- [x] Atualizar `CHANGELOG.md` na seção `[Não lançado]`

## 8. Dependências
- `SPEC-1.1` (Repositório, documentação e padrões de contribuição).
- `SPEC-1.2` (Arquitetura, stack e ambientes).
- `SPEC-1.3` (Modelo de dados e integridade).
- `SPEC-1.6` (Cadastro de pessoas e empresas).

## 9. Como validar
1. **Validação de Anexação de Documentos (CA-1):**
   - Anexar arquivos das categorias `CONTRATO_SOCIAL`, `PROCURACAO`, `DOCUMENTO_CADASTRAL`, `CERTIFICADO` e `OUTRO` e verificar retorno HTTP 201.
2. **Validação de Alerta de Documento Vencido (CA-2):**
   - Anexar um certificado ou procuração com `dataValidade` passada e consultar a rota de alertas; confirmar que retorna com status `VENCIDO`.
3. **Validação de Alerta de Documento a Vencer (CA-3):**
   - Anexar um documento com `dataValidade` próxima (ex.: daqui a 10 dias dentro da janela de 30 dias) e consultar a rota de alertas; confirmar que retorna com status `A_VENCER`.
4. **Validação de Dados Obrigatórios (CA-4):**
   - Tentar anexar documento sem nome de arquivo, com tipo inválido ou data inválida e confirmar recusa com HTTP 400.

## 10. Evidências (preencher ao concluir)
- PR: https://github.com/joaovitor-webdev/pagamentus/pull/19
- Migração SQL: `src/database/migrations/006_anexos_cadastrais_validade.sql`
- Modelos, Repositório, Serviço, Controller e Rotas: `src/models/AnexoCadastralModel.ts`, `src/repositories/AnexoCadastralRepository.ts`, `src/services/AnexoCadastralService.ts`, `src/controllers/AnexoCadastralController.ts`, `src/routes/anexoCadastralRoutes.ts`
- Suíte de testes automatizados (`tests/anexosCadastraisValidade.test.ts`): 4 cenários aprovados cobrindo integralmente CA-1 a CA-4 (`PASS tests/anexosCadastraisValidade.test.ts`).

## 11. Histórico de revisão
*Nenhuma ressalva registrada até o momento.*
