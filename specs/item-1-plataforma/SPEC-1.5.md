# SPEC-1.5 – Perfis, permissões e isolamento entre clientes

| Item | Responsável | Revisor (4º período) | Trello | Status |
|---|---|---|---|---|
| 1 – Plataforma | @joaovitor-webdev | A definir | https://trello.com/c/0XhuydEv | Revisando |

## 1. Contexto e objetivo
Estabelecer o controle de acesso baseado no princípio do menor privilégio, a segregação de dados entre clientes/organizações e os mecanismos de proteção de dados sensíveis e segredos. A especificação garante que um usuário vinculado a um cliente não possa visualizar ou manipular dados pertencentes a outro cliente sem autorização expressa, além de negar qualquer ação para a qual o perfil do usuário não possua permissão atribuída.

## 2. Requisitos relacionados
- **RB-008**: Acesso a dados de um cliente não pode permitir visualizar dados de outro cliente sem autorização expressa.
- **RNF-001 — Segurança**: Criptografar tráfego com TLS e dados sensíveis armazenados; proteger segredos; aplicar menor privilégio e segregação entre clientes.

## 3. Escopo
- **Dentro do escopo:**
  - Segregação lógica entre clientes/organizações em todas as consultas e operações sobre dados de clientes, exigindo vínculo com o cliente ou autorização expressa.
  - Aplicação do princípio do menor privilégio por meio da verificação de perfis e permissões granulares para cada ação solicitada.
  - Criptografia de dados sensíveis armazenados, exigência/configuração de tráfego seguro (TLS/HTTPS) e proteção de segredos via variáveis de ambiente.
- **Fora do escopo:**
  - Fluxo de login primário, política de senhas fortes e MFA (já tratados na SPEC-1.4).
  - Regras de cálculo tributário, contábil ou de folha de pagamento específicas de outros itens.
  - Provisionamento de certificados TLS comerciais em infraestrutura externa de nuvem.

## 4. Comportamento esperado
- **Fluxo normal (Acesso autorizado ao próprio cliente):** Um usuário autenticado solicita visualização ou operação sobre dados do cliente ao qual está vinculado (ou para o qual possui autorização expressa) e seu perfil detém a permissão necessária; o sistema processa a requisição e retorna apenas os dados daquele cliente.
- **Fluxo de erro (Tentativa de acesso a dados de outro cliente):** Um usuário autenticado vinculado ao Cliente A tenta consultar ou modificar dados pertencentes ao Cliente B sem autorização expressa; o sistema bloqueia a operação imediatamente e impede o vazamento de dados entre clientes.
- **Fluxo de erro (Ação sem permissão / Menor privilégio):** Um usuário tenta executar uma ação para a qual seu perfil não possui a permissão específica; o sistema nega a execução da ação.
- **Fluxo normal (Segurança de dados sensíveis e tráfego):** Dados sensíveis armazenados são gravados de forma criptografada, segredos são lidos exclusivamente de variáveis de ambiente protegidas e conexões inseguras (sem TLS quando exigido) são rejeitadas ou redirecionadas.

## 5. Critérios de aceite
- **CA-1:** Dado um usuário autenticado vinculado a um cliente, quando tentar visualizar ou acessar dados pertencentes a outro cliente sem autorização expressa, então o sistema deve negar o acesso e impedir a visualização dos dados (RB-008, RNF-001).
- **CA-2:** Dado um usuário com autorização expressa registrada para atuar em nome de outro cliente, quando acessar os dados desse cliente dentro do escopo autorizado, então o sistema deve permitir o acesso respeitando as permissões do seu perfil (RB-008).
- **CA-3:** Dado um usuário autenticado, quando tentar executar uma ação para a qual seu perfil não possui a permissão específica atribuída, então o sistema deve negar a ação aplicando o princípio do menor privilégio (RNF-001).
- **CA-4:** Dado um dado sensível a ser persistido pelo sistema, quando armazenado, então seu conteúdo deve ser criptografado utilizando chave obtida de variável de ambiente protegida, e o tráfego deve validar os requisitos de transporte seguro TLS (RNF-001).

## 6. Plano técnico
- **Segregação entre Clientes e Autorização Expressa (RB-008 / RNF-001):**
  - Vinculação obrigatória dos registros de clientes ao identificador da organização/cliente (`organizacaoId` / `clienteId`).
  - Estrutura de procuração/autorização expressa permitindo conceder e revogar acesso temporário ou específico a outro cliente.
  - Filtro e middleware/serviço de isolamento multi-inquilino que valida se o usuário pertence ao cliente alvo ou possui autorização expressa ativa antes de retornar ou alterar qualquer registro.
- **Menor Privilégio (RNF-001):**
  - Verificação estrita de permissão por operação; perfis iniciam sem permissões implícitas e só executam ações explicitamente concedidas.
- **Criptografia de Dados Sensíveis, Segredos e TLS (RNF-001):**
  - Utilitário de criptografia simétrica autenticada (`AES-256-GCM` via módulo `crypto` nativo) para proteger campos sensíveis em repouso, lendo chaves apenas de variáveis de ambiente.
  - Middleware de verificação de transporte seguro (TLS/HTTPS) e cabeçalhos de segurança (`Strict-Transport-Security`).

## 7. Tarefas de implementação
- [x] Criar branch de trabalho `spec/1.5-perfis-permissoes-isolamento` a partir da `main`
- [x] Implementar modelo e repositório de isolamento de dados de clientes e autorizações expressas (CA-1 e CA-2)
- [x] Implementar validação de segregação entre clientes e checagem de menor privilégio por ação (CA-1, CA-2 e CA-3)
- [x] Implementar criptografia de dados sensíveis armazenados, proteção de segredos e validação de TLS (CA-4)
- [x] Expor rotas e middlewares de controle de acesso, isolamento entre clientes e criptografia
- [x] Implementar testes automatizados cobrindo os critérios CA-1 a CA-4
- [x] Atualizar `CHANGELOG.md` na seção `[Não lançado]`

## 8. Dependências
- `SPEC-1.1` (Repositório, documentação e padrões de contribuição).
- `SPEC-1.2` (Arquitetura, stack e ambientes).
- `SPEC-1.3` (Modelo de dados e integridade).
- `SPEC-1.4` (Autenticação, senhas e MFA).

## 9. Como validar
1. **Validação de Isolamento entre Clientes (CA-1):**
   - Autenticar com um usuário do Cliente A e requisitar dados do Cliente B sem autorização expressa; confirmar que a resposta nega o acesso (HTTP 403) e não exibe dados do Cliente B.
2. **Validação de Autorização Expressa (CA-2):**
   - Conceder autorização expressa para um usuário acessar um cliente específico e confirmar que o acesso passa a ser permitido apenas dentro do escopo autorizado.
3. **Validação de Menor Privilégio / Ação sem Permissão (CA-3):**
   - Com um usuário vinculado ao próprio cliente, mas sem a permissão específica da ação (ex.: leitura permitida, mas escrita/exclusão não atribuída ao perfil), tentar executar a ação restrita e confirmar a recusa (HTTP 403).
4. **Validação de Criptografia, Segredos e TLS (CA-4):**
   - Persistir um registro com dado sensível e verificar no armazenamento interno que o valor gravado está cifrado (não legível em texto puro) e que é decifrado corretamente apenas para quem tem permissão e acesso ao cliente; verificar rejeição de requisição insegura quando TLS é exigido.

## 10. Evidências (preencher ao concluir)
- PR: https://github.com/joaovitor-webdev/pagamentus/pull/15
- Migração SQL: `src/database/migrations/003_isolamento_clientes_seguranca.sql`
- Modelos, Repositório, Serviços, Controller e Rotas: `src/models/IsolamentoClienteModel.ts`, `src/repositories/IsolamentoClienteRepository.ts`, `src/services/CriptografiaSegurancaService.ts`, `src/services/IsolamentoClienteService.ts`, `src/controllers/IsolamentoClienteController.ts`, `src/routes/isolamentoClienteRoutes.ts`
- Suíte de testes automatizados (`tests/isolamentoClientesSeguranca.test.ts`): 4 cenários aprovados cobrindo integralmente CA-1 a CA-4 (`PASS tests/isolamentoClientesSeguranca.test.ts`).

## 11. Histórico de revisão
*Nenhuma ressalva registrada até o momento.*
