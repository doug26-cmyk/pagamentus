# SPEC-1.4 – Autenticação, senhas e MFA

| Item | Responsável | Revisor (4º período) | Trello | Status |
|---|---|---|---|---|
| 1 – Plataforma | @joaovitor-webdev | A definir | https://trello.com/c/mraVbqk1 | Revisando |

## 1. Contexto e objetivo
Prover os mecanismos de administração de usuários, perfis, permissões, autenticação multifator (MFA) e controle de sessões ativas. A especificação garante a segurança no acesso ao sistema por meio da aplicação de política de senhas fortes, exigência de MFA para perfis privilegiados, limitação/bloqueio de tentativas de login malsucedidas e capacidade de encerramento de sessões ativas.

## 2. Requisitos relacionados
- **RF-075**: Administrar usuários, perfis, permissões, autenticação multifator e sessões ativas.
- **RNF-003 — Autenticação**: Permitir política de senhas fortes, MFA para perfis privilegiados, bloqueio/limitação de tentativas e encerramento de sessões.

## 3. Escopo
- **Dentro do escopo:**
  - Administração de usuários, perfis e permissões de acesso.
  - Validação de política de senhas fortes no cadastro e alteração de senha (recusa de senhas fracas).
  - Fluxo de autenticação multifator (MFA) obrigatório para usuários com perfis privilegiados.
  - Limitação e bloqueio de tentativas consecutivas de autenticação com falha.
  - Gestão e encerramento de sessões ativas de usuários.
- **Fora do escopo:**
  - Integração com provedores externos de identidade social (OAuth/OpenID Connect externos).
  - Trilha de auditoria detalhada de operações de domínio (pertencente à SPEC-1.5).
  - Regras de negócio contábeis, fiscais, financeiras ou de folha de pagamento.

## 4. Comportamento esperado
- **Fluxo normal (Cadastro e Senha Forte):** Ao criar ou atualizar a senha de um usuário, o sistema valida se a senha cumpre os critérios da política de senha forte e armazena apenas seu hash seguro.
- **Fluxo de erro (Senha Fraca):** Caso a senha informada não atenda aos requisitos mínimos de complexidade, a operação é recusada imediatamente com mensagem explicativa.
- **Fluxo normal/restrito (Login e MFA para Perfil Privilegiado):** Ao autenticar um usuário com perfil privilegiado, após validar credenciais primárias (e-mail e senha), o sistema exige a validação do código MFA antes de liberar a sessão ativa.
- **Fluxo de erro (Limitação/Bloqueio de Tentativas):** Quando um usuário excede o limite configurado de tentativas de autenticação inválidas, o sistema bloqueia novas tentativas temporariamente ou exige desbloqueio, impedindo ataques de força bruta.
- **Fluxo normal (Gestão e Encerramento de Sessão):** Um usuário ou administrador consulta as sessões ativas e solicita o encerramento de uma sessão específica ou de todas as sessões, invalidando imediatamente o respectivo token/sessão para novas requisições.

## 5. Critérios de aceite
- **CA-1:** Dado o cadastro ou alteração de senha de um usuário, quando for informada uma senha fraca que não atenda à política de senhas fortes, então o sistema deve recusar a operação e impedir o salvamento da senha.
- **CA-2:** Dado um usuário vinculado a um perfil privilegiado, quando realizar o login com credenciais válidas, então o sistema deve exigir a verificação de autenticação multifator (MFA) antes de conceder acesso à sessão ativa.
- **CA-3:** Dado o processo de autenticação, quando o número de tentativas consecutivas com falha atingir o limite máximo permitido, então o sistema deve bloquear novas tentativas de login para aquela conta/origem.
- **CA-4:** Dada uma sessão ativa de usuário, quando for acionado o encerramento da sessão pelo próprio usuário ou pela administração, então a sessão deve ser invalidada imediatamente, recusando requisições subsequentes que utilizem aquela sessão.
- **CA-5:** Dado um usuário autenticado, quando tentar administrar usuários, perfis, permissões ou sessões, então o sistema deve validar suas permissões de acesso de acordo com o perfil atribuído (RF-075).

## 6. Plano técnico
- **Política de Senhas e Criptografia:**
  - Validador de complexidade de senha (tamanho mínimo, letras maiúsculas, minúsculas, números e caracteres especiais) e armazenamento via hash seguro.
- **Autenticação, MFA e Limitação de Tentativas:**
  - Verificação de flag de perfil privilegiado para exigir etapa de validação de código MFA (ex.: TOTP/código de verificação) na emissão de sessão/token.
  - Controle de contador de falhas consecutivas de login com bloqueio ao atingir o limite.
- **Administração de Usuários, Perfis, Permissões e Sessões:**
  - Estrutura de controle de sessões ativas (registro de sessão com status ativo/revogado) e middlewares de verificação de sessão ativa e permissão por perfil.
  - Endpoints/serviços para administração de usuários, perfis, permissões e revogação de sessões.

## 7. Tarefas de implementação
- [x] Criar branch de trabalho `spec/1.4-autenticacao-senhas-mfa` a partir da `main`
- [x] Implementar validação de política de senhas fortes e hash de senha (CA-1)
- [x] Implementar controle de tentativas de login com bloqueio por excesso de falhas (CA-3)
- [x] Implementar verificação obrigatória de MFA para perfis privilegiados (CA-2)
- [x] Implementar gerenciamento e encerramento/revogação de sessões ativas (CA-4)
- [x] Implementar administração e validação de usuários, perfis e permissões (CA-5)
- [x] Implementar testes automatizados cobrindo os critérios CA-1 a CA-5
- [x] Atualizar `CHANGELOG.md` na seção `[Não lançado]`

## 8. Dependências
- `SPEC-1.1` (Repositório, documentação e padrões de contribuição).
- `SPEC-1.2` (Arquitetura, stack e ambientes).
- `SPEC-1.3` (Modelo de dados e integridade).

## 9. Como validar
1. **Validação de Senha Forte (CA-1):**
   - Tentar cadastrar ou alterar senha utilizando valor fraco (ex.: `123456` ou `senha`) e confirmar a recusa pelo sistema.
   - Informar senha forte compatível com a política e confirmar o sucesso da operação.
2. **Validação de MFA para Perfil Privilegiado (CA-2):**
   - Efetuar login com usuário de perfil privilegiado; verificar que o acesso completo não é liberado sem o código MFA válido e que é liberado após informar o código MFA correto.
3. **Validação de Limite de Tentativas (CA-3):**
   - Submeter credenciais incorretas repetidamente até atingir o limite configurado e verificar que a tentativa seguinte é bloqueada, mesmo informando a senha correta durante o bloqueio.
4. **Validação de Encerramento de Sessão (CA-4):**
   - Iniciar uma sessão válida, acionar o encerramento da sessão e tentar acessar um recurso protegido com a sessão encerrada, confirmando a negação do acesso.
5. **Validação de Administração de Usuários, Perfis e Permissões (CA-5):**
   - Testar a atribuição de perfis/permissões e verificar que ações administrativas são permitidas apenas a quem possui a permissão correspondente.

## 10. Evidências (preencher ao concluir)
- PR: https://github.com/joaovitor-webdev/pagamentus/pull/14
- Migração SQL: `src/database/migrations/002_auth_mfa_sessions.sql`
- Modelos, Repositório, Serviço, Controller e Rotas: `src/models/AutenticacaoModel.ts`, `src/repositories/AutenticacaoRepository.ts`, `src/services/AutenticacaoService.ts`, `src/controllers/AutenticacaoController.ts`, `src/routes/autenticacaoRoutes.ts`
- Suíte de testes automatizados (`tests/autenticacaoMfaSessoes.test.ts`): 7 testes aprovados cobrindo integralmente CA-1 a CA-5 (`PASS tests/autenticacaoMfaSessoes.test.ts`).

## 11. Histórico de revisão
*Nenhuma ressalva registrada até o momento.*
