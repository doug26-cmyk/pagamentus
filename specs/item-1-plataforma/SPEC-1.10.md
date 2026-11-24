# SPEC-1.10 – Credenciais e tokens de integração

| Item | Responsável | Revisor (4º período) | Trello | Status |
|---|---|---|---|---|
| 1 – Plataforma | @joaovitor-webdev | A definir | https://trello.com/c/7OqfFmVW | Revisando |

## 1. Contexto e objetivo
Disponibilizar a configuração segura de integrações externas e internas por meio do armazenamento protegido de credenciais, emissão de tokens de integração com escopo mínimo necessário e suporte a rotação e revogação imediata de credenciais/tokens.

## 2. Requisitos relacionados
- **RF-076**: Configurar integrações por credenciais protegidas, tokens com escopo mínimo e rotação/revogação.

## 3. Escopo
- **Dentro do escopo:**
  - Cadastro e armazenamento protegido (criptografado/hasheado, nunca exposto em texto puro nas listagens) de credenciais de integração por organização.
  - Emissão e validação de tokens de integração vinculados a escopos mínimos explícitos (recusando ações fora do escopo concedido ao token).
  - Rotação (substituição segura invalidando o anterior) e revogação imediata de tokens e credenciais de integração.
- **Fora do escopo:**
  - Implementação de conectores específicos de bancos comerciais, SEFAZ ou eSocial em ambiente produtivo externo.
  - Autenticação interativa de usuários finais e MFA (tratados na SPEC-1.4).

## 4. Comportamento esperado
- **Fluxo normal (Configuração de credencial protegida e emissão de token com escopo mínimo):** O administrador configura uma integração informando nome do provedor/serviço, credencial secreta e lista restrita de escopos permitidos; o sistema armazena a credencial de forma protegida (cifrada/hasheada) e emite um token de integração restrito apenas aos escopos definidos.
- **Fluxo normal (Rotação e Revogação):** Quando solicitada a rotação de um token de integração, o sistema invalida o token anterior e emite um novo mantendo o escopo configurado; quando solicitada a revogação, o token é imediatamente invalidado e qualquer chamada subsequente com ele é recusada.
- **Fluxo de erro (Uso fora do escopo mínimo ou token sem escopo):** Caso uma requisição de integração utilize um token válido para tentar executar uma operação não listada em seu escopo mínimo, ou tente criar um token sem escopo definido/com escopo curinga irrestrito, a operação é negada.

## 5. Critérios de aceite
- **CA-1:** Dada a configuração de uma integração, quando uma credencial secreta for salva, então ela deve ser armazenada de forma protegida (criptografada/hasheada) e nunca retornar em texto aberto nas consultas de configuração (RF-076).
- **CA-2:** Dado um token de integração emitido com escopo mínimo específico, quando utilizado para acessar uma operação dentro do seu escopo, então o acesso deve ser permitido; quando utilizado para uma operação fora do seu escopo, então o acesso deve ser negado (RF-076).
- **CA-3:** Dado um token de integração ativo, quando for acionada sua rotação ou revogação, então o token anterior deve ser invalidado imediatamente e recusado em novas requisições (RF-076).
- **CA-4:** Dada a criação de uma credencial ou token de integração, quando não for informado ao menos um escopo específico ou for informado escopo vazio/irrestrito, então o sistema deve recusar a configuração (RF-076).

## 6. Plano técnico
- **Modelos e Persistência:**
  - Tabela/entidade `credenciais_integracao` (`id`, `organizacaoId`, `nomeIntegracao`, `provedor`, `credencialSecretaCifrada`, ` credencialMascarada`, `ativa`, `criadoEm`, `rotacionadoEm`).
  - Tabela/entidade `tokens_integracao` (`id`, `organizacaoId`, `integracaoId`, `nome`, `tokenHash`, `prefixoVisivel`, `escopos`, `ativo`, `criadoEm`, `revogadoEm`, `substituidoPorTokenId`).
- **Serviço de Integrações e Escopo Mínimo:**
  - Cifragem da credencial secreta com `CriptografiaSegurancaService` (`AES-256-GCM`) e hash `SHA-256` do token de integração (retornando o valor do token apenas no momento da emissão ou rotação).
  - Validador `validarTokenIntegracao(tokenBruto, escopoExigido)` que verifica se o token está ativo/não revogado e se `escopos.includes(escopoExigido)`.
- **Rotas Express:**
  - `POST /api/integracoes/credenciais` e `GET /api/integracoes/credenciais`
  - `POST /api/integracoes/tokens`, `POST /api/integracoes/tokens/:id/rotacionar`, `DELETE /api/integracoes/tokens/:id` e `POST /api/integracoes/validar-uso`

## 7. Tarefas de implementação
- [x] Criar branch de trabalho `spec/1.10-credenciais-tokens-integracao` a partir da `main`
- [x] Criar migração SQL e modelos para credenciais protegidas e tokens de integração com escopo mínimo
- [x] Implementar repositório e serviço de armazenamento protegido de credenciais e emissão de tokens com escopo mínimo (CA-1, CA-2 e CA-4)
- [x] Implementar rotação e revogação imediata de tokens/credenciais (CA-3)
- [x] Expor controller e rotas Express para gestão e validação de credenciais e tokens de integração
- [x] Implementar testes automatizados cobrindo os critérios CA-1 a CA-4
- [x] Atualizar `CHANGELOG.md` na seção `[Não lançado]`

## 8. Dependências
- `SPEC-1.1` (Repositório, documentação e padrões de contribuição).
- `SPEC-1.2` (Arquitetura, stack e ambientes).
- `SPEC-1.3` (Modelo de dados e integridade).
- `SPEC-1.5` (Perfis, permissões e isolamento entre clientes).

## 9. Como validar
1. **Validação de Armazenamento Protegido (CA-1):**
   - Cadastrar uma credencial de integração e verificar no armazenamento e na rota de listagem que o segredo está cifrado/mascarado e não é exposto em texto aberto.
2. **Validação de Escopo Mínimo (CA-2 e CA-4):**
   - Emitir token apenas com escopo `fiscal:nfe:importar`; testar uso no escopo autorizado (200) e em escopo diferente como `folha:esocial:enviar` (403); tentar emitir token sem escopo ou com `*` e confirmar recusa (400).
3. **Validação de Rotação e Revogação (CA-3):**
   - Rotacionar um token ativo e confirmar que o token antigo passa a retornar 401 e o novo funciona; revogar o token e confirmar recusa imediata (401).

## 10. Evidências (preencher ao concluir)
- PR: https://github.com/joaovitor-webdev/pagamentus/pull/21
- Migração SQL: `src/database/migrations/008_credenciais_tokens_integracao.sql`
- Modelos, Repositório, Serviço, Controller e Rotas: `src/models/CredencialTokenIntegracaoModel.ts`, `src/repositories/CredencialTokenIntegracaoRepository.ts`, `src/services/CredencialTokenIntegracaoService.ts`, `src/controllers/CredencialTokenIntegracaoController.ts`, `src/routes/credencialTokenIntegracaoRoutes.ts`
- Suíte de testes automatizados (`tests/credenciaisTokensIntegracao.test.ts`): 4 cenários aprovados cobrindo integralmente CA-1 a CA-4 (`PASS tests/credenciaisTokensIntegracao.test.ts`).

## 11. Histórico de revisão
*Nenhuma ressalva registrada até o momento.*
