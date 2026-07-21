# Os gates do GitHub contra um agente autônomo: modo de falha e caminho de recuperação

> Research da issue [#64](https://github.com/panlabs-tech/panlabs/issues/64), que bloqueia [Configuração da org: permissões, segurança e features](https://github.com/panlabs-tech/panlabs/issues/49), dentro do mapa [#46](https://github.com/panlabs-tech/panlabs/issues/46).
> Levantado em 2026-07-20/21. Branch descartável `research/gates-vs-agente` — não vira PR.

## Como ler este documento

Duas classes de fonte, sempre separadas:

- **[DOC]** — documentação oficial: `docs.github.com`, `github.blog/changelog`, a referência REST, os arquivos-fonte do repo `github/docs` (incluindo `data/reusables/*` e os datasets OpenAPI `src/rest/data/fpt-*`, que é o texto que a plataforma injeta nas próprias páginas), e `code.claude.com`. É normativo — mas não é infalível, e este research encontrou **dois pontos em que a doc está errada ou desatualizada**.
- **[OBS]** — comportamento **testado por mim** contra a API real em 2026-07-20/21, quase todo no repo vazio `panlabs-tech/skills`, com estado anterior registrado e restaurado. Comandos no [apêndice](#apêndice--reprodutibilidade).

Onde o doc é omisso ou ambíguo, **testei**. O #61 já estabeleceu nesta org que teste vale mais que doc para semântica de permissão; este documento reforça o precedente com dois casos concretos (§1.3 e §2.4).

**A pergunta do ticket:** quando um gate bloqueia, o agente **sai sozinho** ou fica parado esperando um humano com browser? O critério de decisão é esse, não "o gate é bom".

**Restrições que enquadram tudo:** org `panlabs-tech` no plano **free**, 6 repos **públicos**, 1 membro. Doutrina de merge autônomo no verde (ADR-0014). Token `gh` desta máquina **sem escopo `admin:org`**.

---

## 0. TL;DR — o veredito

| # | Item | Veredito | Motivo em uma linha |
|---|---|---|---|
| 1 | **Push protection** | **ENTRA** | O desbloqueio **é API** — 1 `POST` por segredo e o push passa; o "web-only" da doc está errado (§1.3). |
| 2 | **`required_signatures`** | **ENTRA, colado em squash-only** | Squash via API produz commit assinado pelo GitHub mesmo com o PR aberto por bot; merge commit e rebase morrem com HTTP 405 (§2). |
| 3 | **CodeQL default setup** | **ENTRA ADVISORY** | Custa 1–2 min em paralelo com o `pr-checks`, mas a regra `code_scanning` bloqueia também por "análise em andamento" e "ferramenta não configurada", sem timeout (§3). |
| 4 | **`sha_pinning_required`** | **ENTRA** | Falha como **job vermelho em 2 s**, não como push rejeitado, e o Dependabot bumpa SHA **e** o comentário de versão — medido (§4). |
| 5 | **`code_scanning` como regra de ruleset** | **FICA FORA (por ora)** | Gate sem timeout que pode travar o merge indefinidamente por motivo que não é alerta (§3.4). |

**Achado fora do escopo das 5 perguntas, e mais urgente que todas elas:** a esteira **já está quebrada hoje**. O job `open-pr` do `life-under-control` falhou em 2026-07-19 com `GitHub Actions is not permitted to create or approve pull requests` — a org tem a política "Allow GitHub Actions to create and approve pull requests" **desligada**, e sem ela o `github-actions[bot]` não consegue abrir PR nenhum. Detalhe em §5.4.

---

## 1. Push protection — a pergunta mais importante do ticket

### 1.1 O que está disponível no free público [DOC]

Push protection e secret scanning são **grátis em repositório público**, independentemente do plano ([About GitHub Advanced Security](https://docs.github.com/en/get-started/learning-about-github/about-github-advanced-security), tabela de planos). O que **não** vem junto, e é o ponto que fecha várias portas:

| Recurso | Free + repo público | Requer |
|---|---|---|
| Secret scanning | ✅ | — |
| Push protection | ✅ | — |
| Resolver alerta via API | ✅ | — |
| **Delegated bypass** (pedido + aprovação) | ❌ | Team/Enterprise + **Secret Protection** (pago) |
| **Custom patterns** | ❌ | Team + Secret Protection |
| **Configurar quais padrões entram no push protection** | ❌ | Secret Protection, e só em nível de org/enterprise |
| AI-detected secrets | ❌ | Secret Protection |

Fontes: [Delegated bypass for push protection](https://docs.github.com/en/code-security/concepts/secret-security/delegated-bypass); [changelog de 2025-08-19](https://github.blog/changelog/2025-08-19-secret-scanning-configuring-patterns-in-push-protection-is-now-generally-available/) — *"GitHub Secret Protection users now have the ability to configure which secret scanning patterns are included in push protection"*. Confirmação estrutural: os endpoints `/repos/.../bypass-requests/secret-scanning` existem **só** no dataset OpenAPI `ghec`, e estão ausentes do dataset `fpt` (free/pro/team).

Push protection dispara em cinco caminhos de escrita, e a doc os define **por rota, não por identidade do ator** ([Push protection](https://docs.github.com/en/code-security/concepts/secret-security/push-protection)): push por linha de comando, commit pela UI, upload de arquivo, requisições à REST API e interações com o MCP server (só repo público). Não há isenção documentada para `github-actions[bot]`, GitHub Apps ou `GITHUB_TOKEN`.

### 1.2 O que a doc diz sobre o desbloqueio — e o que ela **não** diz [DOC]

Para um push bloqueado pela linha de comando, a doc descreve **um único** caminho de exceção, e ele é web:

> "Visit the URL returned by GitHub when your push was blocked, **as the same user that performed the push**. If a different user attempts to visit this URL, they will receive a `404` error."
> — [Working with push protection from the command line](https://docs.github.com/en/code-security/how-tos/secure-your-secrets/work-with-leak-prevention/working-with-push-protection-from-the-command-line)

E quem pode fazer isso, por default:

> "For push protection for repositories, by default, **anyone with write access to the repository can bypass push protection by specifying a bypass reason**."
> — [Push protection](https://docs.github.com/en/code-security/concepts/secret-security/push-protection)

Existe um endpoint REST de bypass — [`POST /repos/{owner}/{repo}/secret-scanning/push-protection-bypasses`](https://docs.github.com/en/rest/secret-scanning/secret-scanning#create-a-push-protection-bypass), com `reason` e `placeholder_id`, e a doc diz que o `placeholder_id` *"is returned on any push protected routes"*. Mas a única página que explica de onde ele sai é [Working with push protection from the REST API](https://docs.github.com/en/code-security/concepts/secret-security/push-protection-from-the-rest-api), que fala **exclusivamente** dos endpoints "Create a blob" e "Create or update file contents" devolvendo `409`. **Nenhuma página da doc conecta o `git push` bloqueado ao `placeholder_id`.** Busca exaustiva no fonte do `github/docs` por `GH013`, `Push cannot contain secrets` e `unblock-secret` retorna **zero** ocorrências.

A leitura honesta da doc é, portanto: *para `git push`, o desbloqueio é web-only e o agente headless fica parado.* **Essa leitura está errada.**

### 1.3 [OBS] O teste: o agente sai sozinho, com duas chamadas

Liguei secret scanning + push protection no `panlabs-tech/skills` e empurrei um arquivo com 10 segredos fabricados. **5 foram bloqueados**, 5 passaram. Erro verbatim (recortado):

```
remote: error: GH013: Repository rule violations found for refs/heads/test/push-protection.
remote:
remote: - GITHUB PUSH PROTECTION
remote:   —————————————————————————————————————————
remote:     Resolve the following violations before pushing again
remote:
remote:     - Push cannot contain secrets
remote:
remote:      (?) Learn how to resolve a blocked push
remote:      https://docs.github.com/code-security/secret-scanning/.../working-with-push-protection-from-the-command-line#resolving-a-blocked-push
remote:
remote:       —— Slack Incoming Webhook URL ————————————————————————
remote:        locations:
remote:          - commit: 49bb5e8c39368bfe090fa6c0f0f61458e7e3e6ac
remote:            path: .pp-test:1
remote:
remote:        (?) To push, remove secret from commit(s) or follow this URL to allow the secret.
remote:        https://github.com/panlabs-tech/skills/security/secret-scanning/unblock-secret/3Gn8HaxIsG3iuLoiTldOSZINLME
```

**O achado.** O último segmento dessa URL — `3Gn8HaxIsG3iuLoiTldOSZINLME` — **é o `placeholder_id`**. A doc nunca diz isso. Passando-o ao endpoint REST:

```console
$ gh api repos/panlabs-tech/skills/secret-scanning/push-protection-bypasses \
    -X POST -f reason=false_positive -f placeholder_id=3Gn8HaxIsG3iuLoiTldOSZINLME
{"reason":"false_positive","expire_at":"2026-07-20T21:05:05.824-07:00","token_type":"SLACK_WEBHOOK"}
```

E o `git push` seguinte **deixa de reclamar daquele segredo** — repeti o push com 1 de 5 liberados e o bloco listou exatamente os 4 restantes. Liberados os 5, o push passou:

```console
$ git push origin test/push-protection
To https://github.com/panlabs-tech/skills.git
   8f503cf..49bb5e8  test/push-protection -> test/push-protection
```

**Conclusão: o loop de recuperação é 100% headless.** `push` → falhou → regex por `unblock-secret/([A-Za-z0-9]+)` no stderr → um `POST` por ocorrência → `push` de novo. Nenhum browser, nenhum humano, nenhuma sessão web.

Detalhes operacionais medidos:

- **`reason` é enum fechado**, validado pelo servidor: `false_positive`, `used_in_tests`, `will_fix_later`. Qualquer outro valor → `422` com a lista dos válidos.
- **Os `placeholder_id` são estáveis** entre tentativas de push do mesmo conteúdo — o agente pode coletar todos numa passada e liberar em lote.
- **O bypass expira**: `expire_at` observado consistentemente em **criação + 3 h**.
- **Não existe endpoint de leitura**: `GET .../push-protection-bypasses` → `404`. Só dá para criar, não para listar/auditar via API no free.
- **A URL web não é chamável com token**: `GET`/`POST` em `github.com/.../unblock-secret/<id>` com `Authorization: token` → `404` nos dois. É rota de sessão web. O caminho API é o endpoint `api.github.com`, e só ele.
- **`bypass-requests/*` não existe no free**: `404` tanto em `/repos/.../bypass-requests/push-rules` quanto em `/repos/.../bypass-requests/secret-scanning`. Confirma o gate de plano do §1.1 por observação, não por leitura.
- **A restrição documentada "the authenticated user must be the original author of the committed secret" foi satisfeita trivialmente** aqui (mesmo ator empurra e libera) — que é exatamente a topologia do agente. Não foi testado o caso ator≠autor.

### 1.4 [OBS] Falso positivo: cobertura real e o que sobra de alerta

Dos 10 padrões plantados, **bloquearam 5**: Slack Incoming Webhook URL, Stripe API Key, SendGrid API Key, Twilio API Key, OpenAI API Key. **Não bloquearam**: Google API Key (`AIza…`), token npm (`npm_…`), par AWS (`AKIAIOSFODNN7EXAMPLE` + secret — são as chaves de exemplo da documentação da AWS), chave Mailgun, e um `ghp_` fabricado com checksum inválido.

Dois aprendizados que importam mais que a lista:

1. **Push protection é um subconjunto do secret scanning.** A Google API Key **não** bloqueou o push, mas **gerou alerta aberto** depois. Ou seja: ligar push protection não te dá "zero alerta"; te dá "zero segredo novo dos padrões push-protegidos".
2. **Bypass com motivo não deixa alerta para o agente tratar.** Os 5 segredos liberados via API viraram alertas **já em `state: resolved`**, com `push_protection_bypassed: true`. Só o alerta do padrão que nunca bloqueou ficou `open` — e esse eu fechei com um `PATCH` (`state=resolved`, `resolution=false_positive`), também sem browser.

**Taxa de falso positivo publicada [DOC]:** o GitHub não publica uma taxa de FP do push protection. Publica **precisão**: *"GitHub received a precision score of 75% (compared to the next best, 46% precision)"*, citando Basak et al., NC State, 2023 ([Next evolution of GitHub Advanced Security](https://github.blog/security/application-security/next-evolution-github-advanced-security/), 2025-04-01). E uma redução medida de FP: *"Our target was a 65% reduction. The result was 75.76%"* ([Reducing false positives at scale](https://github.blog/security/making-secret-scanning-more-trustworthy-reducing-false-positives-at-scale/), 2026-06-11). Traduzindo para esta org: ~1 em 4 bloqueios pode ser ruído — e como o desbloqueio custa um `POST`, o ruído custa segundos, não uma sessão humana.

**Restringir a detecção a padrões de provider:** parcialmente sim, e **de graça**. O campo `secret_scanning_non_provider_patterns` existe no objeto `security_and_analysis` por repo e **já vem `disabled`** [OBS] — os padrões genéricos (chave privada RSA, connection string, basic auth) estão fora por default. O que **não** dá para fazer no free é escolher provider a provider: isso é o endpoint `/orgs/{org}/secret-scanning/pattern-configurations`, gated em Secret Protection [DOC §1.1].

### 1.5 Veredito — Push protection

**ENTRA.** É o único controle da lista que *previne* em vez de avisar, é grátis, e o modo de falha tem saída programática de duas chamadas. O agente precisa de uma coisa que hoje ele não tem: **saber ler o próprio stderr de push**. Isso é código na esteira, não decisão de política.

Nota de implementação: o código de erro é `GH013` — **o mesmo** de violação de ruleset (§2.2). O agente **não pode** discriminar pelo código; tem que casar o corpo (`GITHUB PUSH PROTECTION` vs. `Commits must have verified signatures`).

---

## 2. `required_signatures` — modo de falha e o acoplamento com squash

### 2.1 O que a regra é [DOC]

`required_signatures` não tem parâmetro: *"Commits pushed to matching refs must have verified signatures"* ([REST — rules](https://docs.github.com/en/rest/repos/rules)). É avaliada em **atualização de ref**, e é **escopada aos refs do ruleset** ([About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)) — um ruleset que mira só a default branch não toca em branch de feature.

Sobre bypass, a doc lista admins como *elegíveis*, não isentos ([Creating rulesets for a repository](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository)). [OBS] confirma de forma limpa: criando o ruleset com `bypass_actors: []`, a própria API responde `"current_user_can_bypass": "never"` para o dono da org. **Ruleset sem bypass não tem porta dos fundos, nem para o dono.**

### 2.2 [OBS] O modo de falha, verbatim

Push de commit local não-assinado direto na `main` protegida:

```
remote: error: GH013: Repository rule violations found for refs/heads/main.
remote: Review all repository rules at https://github.com/panlabs-tech/skills/rules?ref=refs%2Fheads%2Fmain
remote:
remote: - Commits must have verified signatures.
remote:   Found 1 violation:
remote:
remote:   96406261dab08f12c4f749fbf902d349950f0031
remote:
To https://github.com/panlabs-tech/skills.git
 ! [remote rejected] main -> main (push declined due to repository rule violations)
```

**O agente distingue?** Sim, mas só pelo corpo. `GH013` + `Commits must have verified signatures.` + a lista de SHAs em violação. E a mensagem é **acionável**: diz exatamente quais commits ofendem. O `! [remote rejected]` e o exit code 1 são iguais aos de qualquer outra violação de ruleset.

**E o mesmo commit não-assinado na branch de feature passou sem reclamação** — confirmando o escopo por ref [OBS].

### 2.3 [OBS] Squash satisfaz; merge commit e rebase morrem

Com o ruleset **ativo** e `bypass_actors: []`, os três métodos de merge via `PUT /repos/.../pulls/{n}/merge`, sobre uma branch com commit local não-assinado:

| Método | Resultado |
|---|---|
| `squash` | **`{"merged":true}`** — commit resultante `verified: true`, `reason: valid`, committer `GitHub`, 1 pai |
| `merge` | **HTTP 405** — `Repository rule violations found\n\nCommits must have verified signatures.` |
| `rebase` | **HTTP 405** — `Base branch requires signed commits. Rebase merges cannot be automatically signed by GitHub` |

O caso `rebase` é o único dos três que o GitHub documenta com franqueza: *"GitHub creates a modified commit, using the data and content of the original commit. This means that GitHub didn't truly create this commit, and can't therefore sign it as a generic system user"* ([About commit signature verification](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification)).

Isso confirma mecanicamente o que o #49 já tinha inferido da história do `ethitorial`: **`required_signatures` e squash-only são uma decisão só.** Ligar a assinatura sem fechar os outros dois métodos não "endurece um pouco" — cria dois caminhos de merge que retornam 405 e param a esteira.

### 2.4 [OBS] O caso `github-actions[bot]` — e uma frase da doc que não se sustenta

A doc afirma, em [Available rules for rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets):

> "However, you cannot squash and merge a pull request into the branch on GitHub **unless you are the author of the pull request**."

Se isso valesse para a API em 2026, seria fatal: a esteira desta org tem o **bot abrindo** o PR e o **token do dono mergeando** — comprovadamente (`ethitorial`: 33 PRs abertos por `app/github-actions`, **todos** os 33 mergeados por `ThiagoPanini`).

**Testei o caso autor≠mergeador.** Como a org bloqueia o bot de abrir PR (§5.4), usei o **Dependabot** como autor: coloquei um `dependabot.yml` no `skills`, ele abriu o PR #3 (autor `app/dependabot`), e mergeei com **meu** token, com o ruleset `required_signatures` **ativo**:

```console
$ gh api repos/panlabs-tech/skills/pulls/3/merge -X PUT -f merge_method=squash
{"sha":"074eb2d3963c4dc24801201f579a115b64310915","merged":true,"message":"Pull Request successfully merged"}
```

Commit resultante: `verified: true`, `reason: valid`, `author: dependabot[bot]`, `committer: GitHub`, 1 pai.

**A restrição da doc não se aplica ao merge por squash via API.** Autor e mergeador diferentes, regra ativa, sem bypass — mergeou e assinou. Segundo caso deste research em que teste vence doc.

Evidência convergente em produção [OBS]: 6 merge commits amostrados de PRs abertos pelo `github-actions[bot]` no `ethitorial` — todos `verified: true`, `committer: GitHub`, 1 pai.

### 2.5 Veredito — `required_signatures`

**ENTRA, indissociável de squash-only.** Custo medido para a esteira: **zero** — o commit local do agente nunca aterrissa na `main`. Modo de falha: mensagem clara, acionável, distinguível pelo corpo. Não exige chave de assinatura no agente, o que **derruba a premissa do #47** de que a regra quebraria o `git commit` local.

O risco residual não é a regra, é a **combinação**: se algum dia um repo reabrir merge commit ou rebase, o merge passa a retornar 405 silenciosamente para o agente. A mitigação é desligar os outros dois métodos no repo (`allow_merge_commit: false`, `allow_rebase_merge: false`), não só confiar no ruleset.

---

## 3. CodeQL default setup — duração real e o custo da regra de ruleset

### 3.1 Disponibilidade e configuração [DOC]

Elegível em **repo público**, sem licença: *"It is publicly visible, or GitHub Code Security is enabled"* ([Configuring default setup](https://docs.github.com/en/code-security/code-scanning/enabling-code-scanning/configuring-default-setup-for-code-scanning)). Configurável inteiramente por API — `PATCH /repos/{owner}/{repo}/code-scanning/default-setup` aceita `state`, `languages`, `query_suite` (`default` | `extended`), `threat_model`, `runner_type`. Não há arquivo no repo: `codeql-config.yml` é do advanced setup.

Gatilhos: push na default/protegida, PR para elas, e cron semanal — com uma nota operacional útil: *"If no pushes and pull requests have occurred in a repository with default setup enabled for 6 months, the weekly schedule will be disabled to save your GitHub Actions minutes."*

Não existe timeout específico do CodeQL. O teto é o limite geral do Actions: **6 h por job** ([Actions limits](https://docs.github.com/en/actions/reference/limits)).

### 3.2 [OBS] Duração medida

**Piso, no `skills`** (2 arquivos: 1 `.ts`, 1 `.py`), default setup ligado via API:

| Job | Duração |
|---|---|
| `Analyze (javascript-typescript)` | 73 s |
| `Analyze (python)` | 55 s |
| **Wall clock do run** | **80 s** — os dois jobs rodam **em paralelo** |

**Teto prático, em repos públicos reais que usam default setup** (não advanced), amostrando runs de `path: dynamic/github-code-scanning/codeql`:

| Repo | Porte | Job | Duração |
|---|---|---|---|
| `streamlit/streamlit` | ~1,0 GB, TS + Python | `Analyze (javascript-typescript)` | **1,6–1,7 min** (4 runs, muito estável) |
| `mindsdb/mindsdb` | ~281 MB, Python | `Analyze (python)` | **1,0–1,1 min** |
| `mindsdb/mindsdb` | — | `Analyze (actions)` | **0,7 min** |

**Leitura para a decisão:** um repo Next desta org fica confortavelmente na faixa de **1–2 min**, e como os jobs por linguagem correm em paralelo, o wall clock é o da linguagem mais lenta, não a soma. Compare com a mediana medida do `pr-checks` (40–100 s) e a mediana de vida do PR (0–7 min): **o CodeQL cabe dentro da janela de espera que o agente já pratica**, na pior das hipóteses somando ~1 min.

Três gotchas medidos, todos relevantes para o script de configuração:

- **Detecção de linguagem tem lag.** O `PATCH` para ligar falhou com `422 One or more languages you selected are not present in the repository` logo após o push, e passou ~40 s depois. Um script que empurra código e liga o CodeQL na sequência **precisa de retry**.
- **Os contextos de check chamam-se `Analyze (javascript-typescript)` e `Analyze (python)`** — um por linguagem, mais um `Adjust Configuration` que sai `skipped`. Quem for exigir check por nome tem que listar um por linguagem, e o nome muda quando a detecção muda.
- O workflow aparece como `CodeQL Setup`, `path: dynamic/github-code-scanning/codeql`, sem arquivo no repo.

### 3.3 Advisory é o default [DOC]

Ligar o default setup **não** bloqueia merge nenhum por si. O changelog é explícito:

> "**Merge protection with rulesets is not related to status checks.**"
> — [Code scanning now allows configuring rulesets to prevent pull requests from being merged](https://github.blog/changelog/2024-04-30-code-scanning-now-allows-configuring-rulesets-to-prevent-pull-requests-from-being-merged-beta/)

Ou seja: o bloqueio só existe se você (a) listar `Analyze (...)` como required status check, ou (b) adicionar a regra `code_scanning` ao ruleset. **Sem nenhum dos dois, é puramente advisory** — alertas na aba Security e anotações no PR.

### 3.4 A regra `code_scanning`: thresholds e o modo de falha ruim [DOC]

Schema exato ([REST — rules](https://docs.github.com/en/rest/repos/rules)): `code_scanning_tools[]`, cada item com `tool`, mais dois thresholds obrigatórios:

- `alerts_threshold`: `none` | `errors` | `errors_and_warnings` | `all`
- `security_alerts_threshold`: `none` | `critical` | `high_or_higher` | `medium_or_higher` | `all`

O problema não são os thresholds. É a lista de condições que bloqueiam o merge:

> "A required tool finds a code scanning alert of a severity that is defined in the ruleset. **A required tool's analysis is still in progress. A required tool is not configured for the repository.**"

Duas das três condições **não são alerta**. E não há timeout documentado: análise pendente bloqueia enquanto estiver pendente. Para uma esteira que mergeia sozinha, isso é a diferença entre "gate que reprova" e "gate que **pendura**".

**Falso positivo tem saída por API [DOC]:** `PATCH /repos/{owner}/{repo}/code-scanning/alerts/{n}` com `state=dismissed` e `dismissed_reason` ∈ {`false positive`, `won't fix`, `used in tests`}. Escopo `public_repo` basta em repo público. **Mas** nenhuma página da doc diz se o dismiss **destrava o merge na hora** ou exige nova análise — e eu não testei isso (exigiria produzir um alerta real de CodeQL). **Lacuna declarada.**

### 3.5 Veredito — CodeQL

**ENTRA ADVISORY. A regra de ruleset `code_scanning` FICA FORA por ora.**

Advisory é grátis, cabe na janela de espera, não tem modo de falha contra o agente, e produz o sinal que hoje não existe (o job `security` é só gitleaks). A regra de ruleset acrescenta um gate que pode travar por "análise em andamento" sem prazo, e cuja rota de destrave por falso positivo tem comportamento não verificado. Reavaliar quando houver histórico de quantos alertas o default setup levanta nestes repos — decisão barata de tomar depois, cara de desfazer no meio de uma esteira parada.

---

## 4. `sha_pinning_required` — quem mantém os SHAs

### 4.1 [OBS] Onde mora, e que ele existe no free

Não é regra de ruleset. É campo do objeto de permissões do Actions, por repo e por org:

```console
$ gh api repos/panlabs-tech/skills/actions/permissions
{"enabled":true,"allowed_actions":"all","sha_pinning_required":false}
```

`PUT` no mesmo endpoint com `sha_pinning_required=true` foi **aceito no plano free** [OBS]. Nível de org exige `admin:org` — que este token não tem. Shipped em [2025-08-15](https://github.blog/changelog/2025-08-15-github-actions-policy-now-supports-blocking-and-sha-pinning-actions/) [DOC].

### 4.2 [OBS] O modo de falha: job vermelho, não push rejeitado

Este é o ponto que decide o item. Com a política ligada e um workflow usando `actions/checkout@v5`:

```
The action actions/checkout@v5 is not allowed in panlabs-tech/skills because
all actions must be pinned to a full-length commit SHA.
```

- Falha em **2 s**, no passo `Set up job`, **antes de qualquer step rodar**.
- É **anotação de check run com `annotation_level: failure`** — sinal estruturado, legível por API.
- O `git push` e a abertura do PR **não são afetados**. Nada é rejeitado.
- Controle: trocando para `actions/checkout@8ade135a41bc03ea155e62e844d188df1ea18608 # v4.1.0`, o run passa.

**Isso é o melhor modo de falha da lista inteira**: o agente já espera o verde: ele vê o vermelho, lê a anotação que nomeia a action ofensora, corrige e empurra de novo. Não há deadlock possível.

Escopo [DOC]: *"Reusable workflows can still be referenced by tag"* — os `workflow_call` do #47 ficam de fora da exigência. Actions locais (`uses: ./…`) são documentadas como isentas, mas tiveram bug real no lançamento desta política (Community Discussion #170337, reportado corrigido em nov/2025); ações `docker://` não são endereçadas por nenhum texto oficial. **Duas lacunas declaradas.**

### 4.3 [OBS] Dependabot bumpa SHA pin — e o comentário junto

Medido de ponta a ponta no `skills`. Com `.github/dependabot.yml` (ecossistema `github-actions`) e a action pinada num SHA antigo, o Dependabot abriu PR **sozinho, em minutos**:

```diff
-      - uses: actions/checkout@8ade135a41bc03ea155e62e844d188df1ea18608 # v4.1.0
+      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
```

Título: `build(deps): bump actions/checkout from 4.1.0 to 7.0.1`. Ou seja: **atualiza o SHA, atualiza o comentário de versão, e atravessa três majors numa PR só** — resolvendo, na prática, exatamente a divergência `checkout@v6` / `@v7` que o #47 achou. Comportamento documentado desde [2022-10-31](https://github.blog/changelog/2022-10-31-dependabot-now-updates-comments-in-github-actions-workflows-referencing-action-versions/) [DOC].

**Custo de manutenção, com números:**

- **Volume**: `actions/checkout` liberou ~15–16 releases em ~2 anos — ordem de **uma PR a cada 6–8 semanas por action estável**. Com 4–6 actions por repo, é ruído de dígito único por semana, e concentrado logo após releases upstream.
- **Redutores nativos [DOC]**: `groups:` no `dependabot.yml` consolida vários bumps numa PR; `cooldown` já tem **default de 3 dias** e é configurável por nível de semver.
- **Auto-merge [DOC]**: o GitHub publica a receita (`gh pr merge --auto`), e o `GITHUB_TOKEN` serve — **exceto** se a branch usar merge queue, caso em que precisa de PAT/App token.
- **Bug conhecido, ainda aberto** [DOC]: `dependabot/dependabot-core#7912` — se o comentário de versão já estiver **errado** antes do bump, o Dependabot não o corrige. Custo real: quem introduzir um pin errado à mão deixa lixo permanente. Mitigação: só pinar via ferramenta.

### 4.4 Veredito — `sha_pinning_required`

**ENTRA.** É a recomendação explícita do próprio GitHub (*"Pinning an action to a full-length commit SHA is currently the only way to use an action as an immutable release"*, [Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use#using-third-party-actions)), tem o modo de falha mais benigno de todos (check vermelho em 2 s), e o custo de manutenção recorrente é **absorvido pelo Dependabot**, medido nesta org e não inferido.

Duas condições de entrada, que são trabalho e não decisão: (1) pinar tudo antes de ligar, senão a CI fica vermelha na hora; (2) ligar o Dependabot `github-actions` no mesmo movimento — senão a política troca "SHAs divergentes" por "SHAs congelados", que é pior.

---

## 5. Orientação publicada sobre agentes autônomos contra branch protection

### 5.1 A prática do próprio GitHub: **isentar o agente**, não fazê-lo cumprir [DOC]

O dado mais informativo veio do agente do próprio GitHub. Sobre o Copilot cloud agent:

> "The agent is also subject to any branch protections and required checks for the working repository."
> "Copilot cloud agent **cannot mark its pull requests as 'Ready for review' and cannot approve or merge** a pull request."
> — [Risks and mitigations](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/risks-and-mitigations)

> "If you have configured a ruleset or branch protection rule that isn't compatible with Copilot cloud agent, **access to the agent will be blocked**... If the rule is configured using rulesets, you can add Copilot as a bypass actor to enable access."
> — [About cloud agent](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-cloud-agent)

E o changelog que criou a saída é explícito sobre o motivo:

> "It can't always comply with every rule – **for example, it can't sign commits**. When a repository includes rules that the agent can't comply with, the agent is automatically disabled. Now, you can unblock usage of the coding agent by configuring Copilot coding agent as a bypass actor."
> — [changelog de 2025-11-13](https://github.blog/changelog/2025-11-13-configure-copilot-coding-agent-as-a-bypass-actor-for-rulesets/)

**Leitura para esta org.** A resposta publicada da plataforma para "agente contra gate" é **abrir exceção para o agente** — e o gate que motivou a exceção foi justamente `required_signatures`. O desenho desta esteira (squash-only) chega ao mesmo lugar **sem exceção nenhuma**: o agente não precisa assinar porque o commit dele nunca aterrissa na `main` (§2). É uma validação forte do shape do `ethitorial`, e um argumento contra povoar `bypass_actors`.

Vale notar o meio-termo documentado, se um dia fizer falta: `bypass_mode: pull_request` ("For pull requests only") permite que um ator burle regras **apenas via PR**, sem ganhar push direto.

### 5.2 O que a Anthropic publica — e o que não publica [DOC]

`code.claude.com/docs/en/github-actions` e `anthropics/claude-code-action/docs/security.md` **não mencionam** branch protection, required checks, rulesets ou auto-merge. Não há orientação publicada da Anthropic sobre merge autônomo contra gates. O que existe e é relevante:

- **A action sabe assinar commit**: `use_commit_signing: true` (via API do GitHub) ou `ssh_signing_key`. Ou seja, se algum dia a esteira precisar do commit local assinado, existe caminho — mas com squash-only ela **não precisa**.
- **Default é não abrir PR**: *"In its default configuration, Claude does not create pull requests automatically... The user must click the link and create the PR themselves."* A esteira desta org já opera fora desse default.
- **Recomendação de token**: GitHub App dedicado via `actions/create-github-app-token`, **não** `GITHUB_TOKEN`, com troubleshooting explícito — *"CI not running on Claude's commits" → "Ensure you're using the GitHub App or custom app (not Actions user)"*.

### 5.3 O gate contra o qual a orientação avisa — e um que não morde aqui [DOC]

- **`GITHUB_TOKEN` não dispara workflow**: *"events triggered by the `GITHUB_TOKEN` will not create a new workflow run"* ([GITHUB_TOKEN](https://docs.github.com/en/actions/concepts/security/github_token)). E o caso PR é pior que isso: *"when a workflow using GITHUB_TOKEN creates or updates a pull request, the resulting `pull_request` event creates workflow runs in an **approval-required** state"* ([Triggering a workflow](https://docs.github.com/en/actions/using-workflows/triggering-a-workflow)). **A esteira desta org já contorna corretamente**, rodando o `pr-checks` no `push` e não no `pull_request` — o comentário no `pr-checks.yml` do `ethitorial` documenta a razão. Não mexer nisso.
- **"Require branches to be up to date"**: o GitHub não desaconselha por escrito, mas posiciona a merge queue como o remédio para exatamente a rebase-churn que essa regra causa *"on branches that have a relatively high number of pull requests merging each day"*. Com a esteira sequencial de hoje, nenhum dos dois é problema.
- **Review obrigatório**: *"Pull request authors cannot approve their own pull requests"* — a regra dura já registrada no #49. A doc oferece um escape (*"Repository owners and administrators can merge a pull request even if it hasn't received an approving review"*), **mas ele não existe sob ruleset sem bypass**: `current_user_can_bypass: "never"` [OBS §2.1]. Adotando o shape do `ethitorial`, o escape some — o que reforça que review obrigatório continua **impossível**, não apenas indesejado.

### 5.4 [OBS] O achado que não estava na pergunta: a esteira já está quebrada

Ao tentar montar o teste do `github-actions[bot]`, o `gh pr create` com `GITHUB_TOKEN` falhou:

```
pull request create failed: GraphQL: GitHub Actions is not permitted to create or approve pull requests (createPullRequest)
```

Tentei habilitar no nível do repo e a API recusou, apontando a origem:

```console
$ gh api repos/panlabs-tech/skills/actions/permissions/workflow -X PUT -F can_approve_pull_request_reviews=true
{"message":"Conflict","errors":"The organization does not allow GitHub Actions to create or approve pull requests","status":"409"}
```

Fui então verificar na fonte que manda — os repos vivos — e a falha **já está em produção**:

| Repo | Último `open-pr` | Situação |
|---|---|---|
| `life-under-control` | run 29696847132, **2026-07-19T17:28Z** | **`failure`** — mesmo erro `not permitted to create or approve pull requests` |
| `life-under-control` | 2026-07-16T01:43Z e antes | `success` (85 PRs abertos pelo bot, de 2026-06-30 a 2026-07-16) |
| `ethitorial` | 2026-07-06T15:13Z | `success` |

Ou seja: **entre 2026-07-16 e 2026-07-19 a política da org foi desligada** (ou nunca esteve ligada de forma estável), e desde então o job `open-pr` — que é o mecanismo do ADR-0014 — **falha**. Isso não é um gate em avaliação; é a esteira parcialmente parada hoje, e independe de qualquer decisão deste ticket.

**Não consigo confirmar nem corrigir daqui**: ler ou escrever `orgs/panlabs-tech/actions/permissions/workflow` exige escopo `admin:org`, que este token não tem, e a instrução desta sessão é não rodar `gh auth refresh` por conta própria. **Fica reportado, não resolvido.**

### 5.5 Veredito — orientação publicada

Não existe receita pronta, nem do GitHub nem da Anthropic, para "agente autônomo sob branch protection". Existem **primitivas documentadas** — auto-merge, `bypass_actors` (inclusive `pull_request`-only), App token dedicado, merge queue — e existe uma prática observável: **a plataforma resolve o conflito isentando o agente**. O desenho desta org resolve por construção, o que é melhor. O único conselho publicado que contradiz a esteira atual é o de **não usar `GITHUB_TOKEN`** para abrir PR — e §5.4 mostra que esse conselho já cobrou o preço.

---

## 6. Recomendação por item: entra / entra advisory / fica fora

| Item | Veredito | Motivo, em uma frase |
|---|---|---|
| **Push protection** (+ secret scanning) | **ENTRA** | O desbloqueio é uma chamada de API com `placeholder_id` extraído do stderr do push — o agente sai sozinho, sem browser (§1.3). |
| **`required_signatures`** | **ENTRA**, colada a squash-only | Squash via API produz commit assinado pelo GitHub mesmo com autor≠mergeador e PR de bot; sem squash-only, merge e rebase retornam 405 (§2.3, §2.4). |
| **Squash-only** (`allow_merge_commit: false`, `allow_rebase_merge: false`) | **ENTRA** | Não é preferência de estilo: é a condição mecânica que faz `required_signatures` custar zero (§2.3). |
| **CodeQL default setup** | **ENTRA ADVISORY** | 1–2 min em paralelo, cabe na espera que o agente já faz, e sem regra de ruleset não tem modo de falha contra ele (§3.2, §3.3). |
| **Regra de ruleset `code_scanning`** | **FICA FORA** (reavaliar) | Bloqueia também por "análise em andamento" e "ferramenta não configurada", sem timeout documentado — pendura o merge por motivo que não é alerta (§3.4). |
| **`sha_pinning_required`** | **ENTRA**, junto com Dependabot `github-actions` | Falha como check vermelho em 2 s com anotação nomeando a action, e o Dependabot mantém SHA e comentário sozinho (§4.2, §4.3). |
| **`secret_scanning_non_provider_patterns`** | **FICA FORA** (manter `disabled`) | Já é o default, e ligar padrões genéricos aumenta bloqueio sem cobertura de provider nova (§1.4). |
| **Delegated bypass / custom patterns / pattern configuration** | **INDISPONÍVEL** | Gate de plano: exige Team/Enterprise + Secret Protection pago; não é escolha (§1.1). |
| **`bypass_actors` povoado** | **FICA FORA** | A esteira já cumpre todas as regras por construção; abrir exceção é a saída de quem não consegue cumprir, e não é o caso (§5.1). |
| **Merge queue / review obrigatório / "up to date"** | **FICA FORA** | Já descartados no #47/#49 e nada neste research os reabilita; review obrigatório continua impossível, e sob ruleset sem bypass some até o escape de admin (§5.3). |

**Trabalho de esteira que estes vereditos criam** (é código, não decisão):

1. O agente precisa **ler o stderr do `git push`** e distinguir `GITHUB PUSH PROTECTION` de `Commits must have verified signatures` — os dois vêm como `GH013`.
2. Loop de desbloqueio: regex `unblock-secret/([A-Za-z0-9]+)` → `POST .../push-protection-bypasses` com `reason` → re-push.
3. Pinar todas as actions **antes** de ligar `sha_pinning_required`, e subir `dependabot.yml` no mesmo movimento.
4. O script de configuração precisa de **retry no `PATCH` do CodeQL** — a detecção de linguagem tem ~40 s de lag após o push.

---

## 7. Perguntas devolvidas ao mapa

1. **A política da org "Allow GitHub Actions to create and approve pull requests" foi desligada de propósito?** O `open-pr` do `life-under-control` falha desde 2026-07-19 por causa dela (§5.4). Se foi intencional, o ADR-0014 precisa de outro mecanismo para abrir PR (App token dedicado, conforme §5.2) — o que é decisão. Se não foi, é incidente. **Não dá para distinguir sem `admin:org`.**
2. **Quem executa a mutação de nível de org?** Push protection e secret scanning podem ser ligados repo a repo com o token atual, mas os *defaults para repo novo* são de org e exigem `admin:org` — o mesmo bloqueio já registrado no #59. Fica a pergunta: o dono roda `gh auth refresh -s admin:org` uma vez e o script versionado assume, ou a config de org permanece manual?
3. **Ligar `code_scanning` como regra depois de quanto histórico?** O veredito "fica fora" é temporário por falta de dado — ninguém sabe quantos alertas o CodeQL levanta nestes repos. Qual é o gatilho para reavaliar: N semanas de advisory, ou zero alertas em M PRs?
4. **`sha_pinning_required` é por repo ou por org?** Por repo funciona com o token atual e foi testado; por org é uma chamada só para os 6 e todo repo futuro, mas exige `admin:org`. Mesma bifurcação da pergunta 2.
5. **O `skills` entra no padrão?** Ele foi o laboratório deste research justamente por estar vazio. Se receber o mesmo ruleset dos apps, deixa de servir a esse papel — vale decidir se a org quer manter um repo-sandbox declarado.

---

## Apêndice — reprodutibilidade

Todos os testes [OBS] rodaram em 2026-07-20/21 com `gh` autenticado como `ThiagoPanini` (escopos: `repo`, `workflow`, `read:org`, `project`, `gist`, `packages` — **sem `admin:org`**).

### Estado anterior do `panlabs-tech/skills`, registrado antes de mutar

```
security_and_analysis: todos os 5 campos "disabled"
rulesets: []
branch protection em main: 404 (não protegida)
actions/permissions: {"enabled":true,"allowed_actions":"all","sha_pinning_required":false}
actions/permissions/workflow: {"default_workflow_permissions":"read","can_approve_pull_request_reviews":false}
code-scanning/default-setup: {"state":"not-configured","languages":[]}
HEAD de main: 84a0ae4a3aa6dcebdaf8017b17a3143cc8614b9a  (LICENSE + README.md)
branches: [main]
```

### Verificação de restauração, ao final

Todos os itens acima reconferidos e **idênticos** ao estado anterior: `HEAD` de volta em `84a0ae4`, árvore com apenas `LICENSE` e `README.md`, uma única branch, `rulesets: []`, os 5 campos de `security_and_analysis` em `disabled`, `sha_pinning_required: false`, `default-setup: not-configured`, `code-scanning/alerts: []`, `secret-scanning/alerts` respondendo `404 Secret scanning is disabled on this repository`, zero PRs abertos.

**Resíduo declarado, e é o único:** os PRs **#1, #2 e #3** do `skills` ficam no histórico como fechados/mergeados. Pull requests não podem ser apagados pela API. Os commits que eles introduziram foram removidos da `main` por force-push; sobra o registro dos PRs e a run do Dependabot. Nenhum outro repo da org foi mutado — `tfbox`, `ethitorial`, `travelmanager`, `panlabs` e `life-under-control` foram **apenas lidos**.

### Comandos

```bash
# ---------- baseline e verificação ----------
gh api repos/panlabs-tech/skills --jq '.security_and_analysis'
gh api repos/panlabs-tech/skills/rulesets
gh api repos/panlabs-tech/skills/actions/permissions
gh api repos/panlabs-tech/skills/code-scanning/default-setup
gh api "repos/panlabs-tech/skills/git/trees/main?recursive=1" --jq '.tree[].path'

# ---------- §2 required_signatures ----------
cat > rs-sig.json <<'EOF'
{ "name": "test-required-signatures", "target": "branch", "enforcement": "active",
  "bypass_actors": [],
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [ { "type": "required_signatures" } ] }
EOF
gh api repos/panlabs-tech/skills/rulesets -X POST --input rs-sig.json   # -> current_user_can_bypass: "never"

git -c commit.gpgsign=false commit -m "..." && git push origin main      # -> GH013, "Commits must have verified signatures."
git push origin test/sig-squash                                          # -> aceito (regra é escopada por ref)

gh api repos/panlabs-tech/skills/pulls/1/merge -X PUT -f merge_method=squash  # -> merged
gh api repos/panlabs-tech/skills/pulls/2/merge -X PUT -f merge_method=merge   # -> 405
gh api repos/panlabs-tech/skills/pulls/2/merge -X PUT -f merge_method=rebase  # -> 405
gh api repos/panlabs-tech/skills/commits/main \
  --jq '{verified:.commit.verification.verified, reason:.commit.verification.reason, committer:.commit.committer.name}'

# caso autor != mergeador: PR #3 aberto pelo Dependabot, mergeado com o token do dono
gh api repos/panlabs-tech/skills/pulls/3/merge -X PUT -f merge_method=squash  # -> merged, verified=true

# evidência convergente em produção (somente leitura)
gh pr list -R panlabs-tech/ethitorial --state merged --limit 100 --json number,author,mergedBy,mergeCommit
gh api repos/panlabs-tech/ethitorial/commits/<sha> --jq '.commit.verification'

# ---------- §1 push protection ----------
gh api repos/panlabs-tech/skills -X PATCH \
  -f 'security_and_analysis[secret_scanning][status]=enabled' \
  -f 'security_and_analysis[secret_scanning_push_protection][status]=enabled'

git push origin test/push-protection            # -> GH013 + banner GITHUB PUSH PROTECTION + URLs unblock-secret/<id>

# o <id> da URL É o placeholder_id:
gh api repos/panlabs-tech/skills/secret-scanning/push-protection-bypasses \
  -X POST -f reason=false_positive -f placeholder_id=3Gn8HaxIsG3iuLoiTldOSZINLME
# -> {"reason":"false_positive","expire_at":"...","token_type":"SLACK_WEBHOOK"}

git push origin test/push-protection            # -> passa depois de liberar os 5

# negativos confirmados:
gh api repos/panlabs-tech/skills/secret-scanning/push-protection-bypasses        # GET -> 404
gh api repos/panlabs-tech/skills/bypass-requests/push-rules                      # -> 404
gh api repos/panlabs-tech/skills/bypass-requests/secret-scanning                 # -> 404
curl -H "Authorization: token $(gh auth token)" \
  https://github.com/panlabs-tech/skills/security/secret-scanning/unblock-secret/<id>   # -> 404 (rota web)

gh api repos/panlabs-tech/skills/secret-scanning/alerts \
  --jq '.[] | "\(.secret_type_display_name) \(.state) bypassed=\(.push_protection_bypassed)"'
gh api repos/panlabs-tech/skills/secret-scanning/alerts/5 -X PATCH -f state=resolved -f resolution=false_positive

# ---------- §3 CodeQL ----------
gh api repos/panlabs-tech/skills/code-scanning/default-setup -X PATCH \
  -f state=configured -f query_suite=default \
  -F 'languages[]=javascript-typescript' -F 'languages[]=python'
# 1ª tentativa logo após o push -> 422 "languages ... not present"; passou ~40 s depois

gh api repos/panlabs-tech/skills/actions/runs/<id>/jobs \
  --jq '.jobs[] | "\(.name) \(.started_at) \(.completed_at)"'
gh api repos/panlabs-tech/skills/commits/main/check-runs --jq '.check_runs[].name'

# amostra de repos públicos que usam default setup (somente leitura)
gh api "repos/streamlit/streamlit/actions/runs?per_page=100&status=completed" \
  --jq '[.workflow_runs[] | select(.path=="dynamic/github-code-scanning/codeql")]'

# ---------- §4 sha_pinning_required ----------
gh api repos/panlabs-tech/skills/actions/permissions -X PUT \
  -F enabled=true -f allowed_actions=all -F sha_pinning_required=true     # aceito no free
gh run view <id> -R panlabs-tech/skills                                    # -> anotação de failure, 2 s, em "Set up job"
gh pr diff 3 -R panlabs-tech/skills                                        # -> Dependabot bumpou SHA + comentário

# ---------- §5 estado da esteira (somente leitura) ----------
gh api repos/panlabs-tech/life-under-control/actions/runs/29696847132/jobs
gh run view 29696847132 -R panlabs-tech/life-under-control --log-failed
```

### Limitações declaradas

- **Sem `admin:org`.** Não foi possível ler nem alterar `orgs/panlabs-tech/actions/permissions/workflow`, o que deixa a §5.4 diagnosticada mas não resolvida, e impediu o teste direto de PR aberto pelo `github-actions[bot]` sob `required_signatures`. O substituto foi o Dependabot como autor (§2.4) — mesma topologia autor≠mergeador, ator diferente.
- **Não testei o destrave por dismiss de alerta do CodeQL** (§3.4): exigiria produzir um alerta real de code scanning e uma regra `code_scanning` ativa. Se essa regra for reconsiderada, esse é o teste que falta.
- **Não testei push protection com ator≠autor do segredo.** A doc restringe o `POST` de bypass a *"the original author of the committed secret"*; no fluxo do agente os dois são o mesmo, então a restrição não morde — mas o caso contrário permanece não verificado.
- **A cobertura de padrões do §1.4 é amostra, não catálogo.** Dez padrões fabricados dizem que push protection ⊂ secret scanning, e nada sobre quais dos ~200 padrões suportados bloqueiam.
- **A duração do CodeQL do §3.2 é piso + amostra externa**, não medição nos repos desta org — medir de verdade exigiria ligar o default setup neles, que é mutação proibida a esta sessão.
- **Ações `docker://` sob `sha_pinning_required`** não foram testadas nem são endereçadas pela doc.
