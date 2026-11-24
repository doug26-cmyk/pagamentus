# SPEC-1.6 – Cadastro de pessoas e empresas

| Item | Responsável | Revisor (4º período) | Trello | Status |
|---|---|---|---|---|
| 1 – Plataforma | @joaovitor-webdev | A definir | https://trello.com/c/xwPe0VCl | Revisando |

## 1. Contexto e objetivo
Disponibilizar o cadastro estruturado de clientes e entidades como Pessoa Física (PF) e Pessoa Jurídica (PJ), contemplando seus dados cadastrais (nome/razão social, nome fantasia, CPF/CNPJ, inscrições, contatos, endereços e responsáveis) e o registro de dados fiscais e tributários (regime tributário, atividade econômica, CNAE, natureza jurídica, município/UF, enquadramentos e datas de vigência).

## 2. Requisitos relacionados
- **RF-001**: Cadastrar pessoa física e jurídica com nome/razão social, nome fantasia, CPF/CNPJ, inscrições, contatos, endereços e responsáveis.
- **RF-002**: Registrar regime tributário, atividade econômica, CNAE, natureza jurídica, município/UF, enquadramentos e datas de vigência.

## 3. Escopo
- **Dentro do escopo:**
  - Cadastro e consulta de Pessoa Física (PF) e Pessoa Jurídica (PJ) contendo nome/razão social, nome fantasia, CPF/CNPJ (fictício e estruturalmente válido), inscrições (estadual/municipal), contatos, endereços e responsáveis (RF-001).
  - Validação estrutural de CPF e CNPJ e bloqueio de duplicidade de documento dentro da mesma organização.
  - Registro e consulta de dados fiscais vinculados ao cadastro: regime tributário, atividade econômica, CNAE, natureza jurídica, município/UF, enquadramentos e datas de vigência inicial/final (RF-002).
  - Validação de consistência das datas de vigência dos dados fiscais.
- **Fora do escopo:**
  - Consulta automatizada em APIs externas da Receita Federal ou Sintegra.
  - Apuração e cálculo de tributos ou emissão de guias (pertencentes ao Item 3).
  - Lançamentos contábeis ou folha de pagamento (pertencentes aos Itens 2 e 4).

## 4. Comportamento esperado
- **Fluxo normal (Cadastro de PF e PJ):** O usuário informa os dados cadastrais obrigatórios de uma Pessoa Física (com CPF fictício válido) ou Pessoa Jurídica (com CNPJ fictício válido), incluindo inscrições, contatos, endereços e responsáveis; o sistema valida o documento e persiste o cadastro.
- **Fluxo normal (Registro de Dados Fiscais com Vigência):** Para uma pessoa/empresa cadastrada, o usuário registra o perfil fiscal informando regime tributário, atividade econômica, CNAE, natureza jurídica, município/UF, enquadramentos e período de vigência (`vigenciaInicio` e opcionalmente `vigenciaFim`).
- **Fluxo de erro (CPF/CNPJ Inválido ou Duplicado):** Caso o CPF ou CNPJ informado seja estruturalmente inválido ou já esteja cadastrado na organização, o sistema recusa a operação com mensagem clara.
- **Fluxo de erro (Vigência Inválida):** Caso a data final de vigência seja anterior à data inicial de vigência ou faltem campos fiscais obrigatórios, o sistema rejeita o registro.

## 5. Critérios de aceite
- **CA-1:** Dado o cadastro de uma Pessoa Física (PF) ou Pessoa Jurídica (PJ), quando forem informados nome/razão social, nome fantasia, CPF/CNPJ fictício válido, inscrições, contatos, endereços e responsáveis, então o sistema deve salvar o cadastro com sucesso (RF-001).
- **CA-2:** Dado o cadastro de PF ou PJ, quando for informado um CPF/CNPJ inválido ou já existente na mesma organização, então o sistema deve recusar o cadastro e informar o motivo do erro (RF-001).
- **CA-3:** Dado um cadastro de PF ou PJ existente, quando forem registrados regime tributário, atividade econômica, CNAE, natureza jurídica, município/UF, enquadramentos e datas de vigência válidas, então o sistema deve persistir o registro fiscal vinculado com sucesso (RF-002).
- **CA-4:** Dado o registro de dados fiscais e enquadramentos, quando a data de fim de vigência for anterior à data de início de vigência ou dados obrigatórios estiverem ausentes, então o sistema deve recusar a operação (RF-002).

## 6. Plano técnico
- **Modelos e Persistência:**
  - Entidade/tabela `pessoas_empresas` contendo tipo (`PF` ou `PJ`), `organizacaoId`, `nomeRazaoSocial`, `nomeFantasia`, `documento` (CPF/CNPJ), `inscricaoEstadual`, `inscricaoMunicipal`, `contatos`, `enderecos` e `responsaveis`.
  - Entidade/tabela `enquadramentos_fiscais` vinculada a `pessoaEmpresaId`, contendo `regimeTributario`, `atividadeEconomica`, `cnae`, `naturezaJuridica`, `municipio`, `uf`, `enquadramentos`, `vigenciaInicio` e `vigenciaFim`.
- **Validações e Serviços:**
  - Algoritmo de validação estrutural de dígitos verificadores de CPF (11 dígitos) e CNPJ (14 dígitos) para aceitar apenas documentos fictícios matematicamente válidos.
  - Validação de datas de vigência (`vigenciaFim >= vigenciaInicio`) e campos obrigatórios.
- **Rotas da API:**
  - `POST /api/cadastros/pessoas-empresas` e `GET /api/cadastros/pessoas-empresas` (RF-001).
  - `POST /api/cadastros/pessoas-empresas/:id/dados-fiscais` e `GET /api/cadastros/pessoas-empresas/:id/dados-fiscais` (RF-002).

## 7. Tarefas de implementação
- [x] Criar branch de trabalho `spec/1.6-cadastro-pessoas-empresas` a partir da `main`
- [x] Criar migração SQL e modelos para cadastro de PF/PJ e dados fiscais com vigência
- [x] Implementar repositório e serviço com validação de CPF/CNPJ, inscrições, contatos, endereços e responsáveis (CA-1 e CA-2)
- [x] Implementar registro e validação de regime tributário, atividade econômica, CNAE, natureza jurídica, município/UF, enquadramentos e vigência (CA-3 e CA-4)
- [x] Expor controller e rotas Express para os cadastros de PF/PJ e dados fiscais
- [x] Implementar testes automatizados cobrindo os critérios CA-1 a CA-4
- [x] Atualizar `CHANGELOG.md` na seção `[Não lançado]`

## 8. Dependências
- `SPEC-1.1` (Repositório, documentação e padrões de contribuição).
- `SPEC-1.2` (Arquitetura, stack e ambientes).
- `SPEC-1.3` (Modelo de dados e integridade).

## 9. Como validar
1. **Validação de Cadastro PF e PJ (CA-1):**
   - Submeter cadastro de PF (com CPF fictício válido) e de PJ (com CNPJ fictício válido) contendo nome/razão social, nome fantasia, inscrições, contatos, endereços e responsáveis; verificar retorno HTTP 201 e persistência de todos os campos.
2. **Validação de Recusa de CPF/CNPJ Inválido ou Duplicado (CA-2):**
   - Submeter cadastro com CPF/CNPJ inválido (ex.: dígitos verificadores incorretos ou todos dígitos iguais) ou repetir documento já cadastrado na mesma organização; confirmar recusa com HTTP 400.
3. **Validação de Registro de Dados Fiscais com Vigência (CA-3):**
   - Registrar regime tributário, atividade econômica, CNAE, natureza jurídica, município/UF, enquadramentos e datas de vigência para o cadastro criado; confirmar retorno HTTP 201 e consulta dos dados vinculados.
4. **Validação de Consistência de Vigência (CA-4):**
   - Tentar registrar dados fiscais com `vigenciaFim` anterior a `vigenciaInicio` e confirmar recusa com HTTP 400.

## 10. Evidências (preencher ao concluir)
- PR: https://github.com/joaovitor-webdev/pagamentus/pull/17
- Migração SQL: `src/database/migrations/004_cadastro_pessoas_empresas.sql`
- Modelos, Repositório, Serviço, Controller e Rotas: `src/models/PessoaEmpresaModel.ts`, `src/repositories/PessoaEmpresaRepository.ts`, `src/services/PessoaEmpresaService.ts`, `src/controllers/PessoaEmpresaController.ts`, `src/routes/pessoaEmpresaRoutes.ts`
- Suíte de testes automatizados (`tests/cadastroPessoasEmpresas.test.ts`): 4 cenários aprovados cobrindo integralmente CA-1 a CA-4 (`PASS tests/cadastroPessoasEmpresas.test.ts`).

## 11. Histórico de revisão
*Nenhuma ressalva registrada até o momento.*
