# Orgs de referência do GitHub: o que serve a uma org solo com esteira agêntica

> Research da issue [#47](https://github.com/panlabs-tech/panlabs/issues/47), dentro do mapa [#46](https://github.com/panlabs-tech/panlabs/issues/46).
> Levantado em 2026-07-19. Branch descartável `research/orgs-referencia` — não vira PR.

## Como ler este documento

Duas classes de fonte, sempre separadas:

- **[DOC]** — documentação oficial do GitHub (`docs.github.com`, incluindo os snippets `data/reusables/gated-features/*` do repo `github/docs`, que é o texto que a plataforma injeta nas próprias páginas). É normativo.
- **[OBS]** — observação empírica em orgs reais, coletada via `gh api` em 2026-07-19. É convenção, não regra. Comandos no [apêndice](#apêndice--reprodutibilidade).

Toda prática passa pelo **filtro solo**: *isso serve a 1 dev + agentes autônomos, ou só existe porque a org tem dezenas de mantenedores e contribuidores externos?* O que não passa vai para [Descartado, e por quê](#7-descartado-e-por-quê) — com motivo. Descartar com motivo é resultado.

**Restrições que mudam o filtro** (mapa #46):

- `panlabs-tech`: plano **free**, 1 membro, 0 teams, sem repo `.github`, `default_repository_permission: read`, 6 repos **todos públicos**.
- Audiência: (1) humano de fora que precisa entender em 30s; (2) o dev solo + agentes Claude Code. **Contribuidor externo não é audiência.**
- **Doutrina de merge autônomo no verde** (ADR-0014) — prática que exija aprovação humana em PR quebra a esteira.

---

## 0. TL;DR — o veredito

**Adotar** (mecanismo real, paga-se com 1 dev):

| # | Prática | Por que passa no filtro solo |
|---|---|---|
| 1 | Repo público `panlabs-tech/.github` com `profile/README.md` de ~10 linhas | Único jeito de a org ter cara na aba Overview. É literalmente a audiência "30 segundos". Custo: 1 arquivo. |
| 2 | `SECURITY.md` + `SUPPORT.md` herdados via `.github` | Escreve uma vez, vale para os 6 repos, **não** aparece no histórico nem no clone de cada repo. |
| 3 | Reusable workflows (`workflow_call`) para o `pr-checks` | Os 4 `pr-checks.yml` já são o mesmo arquivo divergindo. Drift real: `checkout@v6` vs `@v7`. Sozinho ninguém percebe o drift. |
| 4 | `description` em 6/6; `homepage` + `topics` só nos repos com público | Convenção mais forte e mais barata que as orgs de referência praticam. `panlabs` está sem description. |
| 5 | README-ponteiro (30–120 linhas) + LICENSE em todo repo | Núcleo irredutível: 15/15 repos-vitrine têm exatamente esses dois. LICENSE **não é herdável**. |
| 6 | Desligar wiki (6/6 ligado, 0/6 usado) e Projects por repo | Superfície morta que confunde a audiência (1). |
| 7 | Segurança passiva: secret scanning + push protection + Dependabot alerts/security updates | **Grátis em repo público**, zero cerimônia, zero interação humana no fluxo. |
| 8 | Ruleset por repo só com regras sem-humano: bloquear force-push, bloquear deleção, exigir status checks, exigir histórico linear | Disponível no free **porque os repos são públicos**. Nenhuma delas pede aprovação. |
| 9 | `AGENTS.md`/`CLAUDE.md` versionado no repo | `vercel/next.js` versiona `.github/AGENTS.md` e `.github/CLAUDE.md`; `denoland/deno` versiona `copilot-instructions.md`. Convenção validada, não inventada. |

**Descartar** (§7): CODEOWNERS, review obrigatório, CODE_OF_CONDUCT, CONTRIBUTING para externo, catálogo de 5 issue forms, `contact_links`, `FUNDING.yml`, `GOVERNANCE.md`, stale bot, labeler, `.github/release.yml`, Dependabot **version** updates sem auto-merge, org-level rulesets (indisponível), merge queue (disponível mas sem problema para resolver).

**Sinalizado como risco à esteira** (§4): `require signed commits`, `require branches to be up to date` sob volume, e a dependência já existente do `GITHUB_TOKEN` não disparar workflows.

---

## 1. O repo `.github` da org

### 1.1 Profile README — o cartão de visitas [DOC]

- Caminho exato: **`profile/README.md`** num repositório chamado `.github` da org; renderiza na aba **Overview** do perfil. ([Customizing your organization's profile](https://docs.github.com/en/organizations/collaborating-with-groups-in-organizations/customizing-your-organizations-profile))
- O repo `.github` **precisa ser público**. A variante só-para-membros é um repo **separado**, chamado `.github-private`, com o mesmo caminho `profile/README.md` — não é o mesmo repo com visibilidade trocada.
- Suporta GitHub Flavored Markdown, emoji, imagens e GIFs. Não há limite de tamanho documentado específico para o profile README.
- Não disponível em Enterprise Managed Users (irrelevante aqui).

**[OBS] O que orgs reais escrevem lá.** De 21 orgs varridas, a anatomia dos profile READMEs curtos é sempre a mesma: **sem ensaio "quem somos", sem badges, 2 a 4 links, menos de 15 linhas**.

- `honojs` (8 linhas): lista de links rotulados — Documents, Questions, Bug Reports, Chatting, Announcements, Contributing.
- `pmndrs` (5 linhas): linha de links (Discord | Documentation | x) + um comando de instalação.
- `biomejs` (11 linhas): um `<picture>` com troca claro/escuro via `prefers-color-scheme` + uma frase com dois links.
- `unjs` (3 linhas), `total-typescript` (69 linhas, página de marketing), `github` (53 linhas, narrativa com `<details>` e estatísticas).

E o achado negativo, que também informa: **8 orgs de primeira linha simplesmente não têm repo `.github`** — `denoland`, `cli`, `oven-sh`, `tailwindlabs`, `anthropics`, `t3-oss`, `wooorm`, `colinhacks`. Outras têm o repo mas **sem** profile README: `vercel`, `astral-sh`, `withastro`, `fastify`, `bluwy`. Ou seja: o profile README é opcional na prática — mas é opcional *para quem já é famoso*. Para uma org de 6 repos que ninguém conhece, é justamente a peça que falta.

**Filtro solo: ADOTAR**, no formato `honojs`/`pmndrs`: o que é a panlabs em uma frase, links para os produtos, link para `panlabs.tech`. Alvo: ≤ 15 linhas.

### 1.2 Health files herdados — o que herda e o que não herda [DOC]

Fonte: [Creating a default community health file](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file).

Lista **completa** do herdável a partir do `.github` da org:

`CODE_OF_CONDUCT.md` · `CONTRIBUTING.md` · Discussion category forms · `FUNDING.yml` · `GOVERNANCE.md` · issue/PR templates **e** `config.yml` · `SECURITY.md` · `SUPPORT.md`

O que **não** herda, confirmado na doc:

- **`LICENSE`** — verbatim: *"You cannot create a default license file. License files must be added to individual repositories so the file will be included when a project is cloned, packaged, or downloaded."*
- **`CODEOWNERS`** — ausente da tabela; a doc trata como estritamente por repo **e por branch**. ([About code owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners))
- **`dependabot.yml`** — ausente da tabela; verbatim: *"You must store this file in the `.github` directory of your repository in the default branch."* Não existe Dependabot config org-wide. ([About the dependabot.yml file](https://docs.github.com/en/code-security/concepts/supply-chain-security/about-the-dependabot-yml-file))
- **Workflows** — não são health file; reuso é outro mecanismo (§1.4).

Regras finas que importam na montagem:

- **Precedência de path** no repo consumidor: `.github/` → raiz → `docs/`. Se nada for achado, cai para o `.github` da org, mesma ordem.
- **Exceção**: issue templates e `config.yml` **têm** que estar em `.github/ISSUE_TEMPLATE`; os demais podem estar em qualquer um dos três lugares.
- **Override tudo-ou-nada para issue templates**: *"If a repository has any files in its own `.github/ISSUE_TEMPLATE` folder ... none of the contents of the default `.github/ISSUE_TEMPLATE` folder will be used."* Consequência concreta: `tfbox`, que tem 6 arquivos lá, **não herdaria nada** de issue template da org enquanto mantiver os seus.
- Benefício declarado — e é o argumento certo para org solo: *"they won't appear in the file browser or Git history of the individual repositories, and are not included in their clones, packages, or downloads."*
- `.github` **privado não funciona**: *"Private `.github` repositories are not supported."*
- Lacunas na doc, registradas honestamente: **não há nada escrito sobre forks** herdarem defaults, e não há frase explícita confirmando que repos **privados** da org herdam de um `.github` público (é inferência pela ausência de restrição declarada).

**[OBS]** No universo varrido, `CODE_OF_CONDUCT.md` e `SECURITY.md` são comuns mas **não universais nem no topo** — `vercel`, `honojs` e `biomejs` não têm CoC; `fastify` não tem SECURITY. `withastro` mantém um `GOVERNANCE.md` de **403 linhas** com quatro níveis de contribuidor e templates de mensagem no Discord para *nomear mantenedor*; `fastify` tem 109 linhas de governança definindo times nomeados. Isso é o teto da cerimônia, e ele é função de **número de mantenedores**, não de tamanho do projeto.

**Filtro solo: ADOTAR `SECURITY.md` e `SUPPORT.md`; DESCARTAR o resto.** `SECURITY.md` responde "achei uma falha, para onde mando?" — pergunta de humano de fora, audiência (1), e a resposta é um e-mail. `SUPPORT.md` responde "quero ajuda, onde pergunto?". Ambos custam um arquivo cada, valem para 6 repos e ficam fora do clone. `CODE_OF_CONDUCT`, `GOVERNANCE`, `FUNDING`, `CONTRIBUTING`: §7.

### 1.3 Templates de issue e PR [DOC]

- Issue templates modernos em `.github/ISSUE_TEMPLATE/`: Markdown com frontmatter (`title`, `labels`, `type`, `assignees`) ou **issue forms** YAML (`name`, `description`, `body` obrigatórios). ([Configuring issue templates](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository), [Syntax for issue forms](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms))
- `config.yml` aceita `blank_issues_enabled` e `contact_links`. Detalhe que importa para org solo: com `blank_issues_enabled: false`, quem tem **write ou acima continua vendo** "Blank issue", rotulada *"Maintainers only"*. Desligar issue em branco não atrapalha o dono.
- Ordenação alfanumérica, **YAML antes de Markdown**. `name` com ≤3 caracteres não aparece.
- Limitações: *"Issue forms are not supported for pull requests."* Label referenciada precisa existir no repo, senão não é aplicada.
- PR template: `pull_request_template.md` na raiz, em `docs/` ou em `.github/`; múltiplos em `.github/PULL_REQUEST_TEMPLATE/` via `?template=`. ([Creating a pull request template](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository))
- Ambos herdáveis do `.github` da org.

**[OBS] Onde issue forms aparecem no mundo real:** nenhuma das orgs grandes varridas (`github`, `microsoft`, `vercel`, `nodejs`, `astral-sh`, `honojs`, `biomejs`) tem issue template no `.github` da org — os templates ficam no repo-vitrine, porque um template org-wide não serve a repos heterogêneos. Quem tem no `.github` da org são `antfu-collective`, `unjs`, `sxzz`, `fastify`, `supabase` — orgs cujos repos são **estruturalmente iguais** (pacotes utilitários pequenos). Um sinal a favor: os 4 apps Next da panlabs *são* estruturalmente iguais.

**[OBS] Prova de que o catálogo de issue forms não serve aqui.** Nos 5 repos da org com issues, **100% das issues foram abertas pelo próprio dono** — 27 em `panlabs`, 60 em `ethitorial`, 100+ em `life-under-control`, 100+ em `travelmanager`, 7 em `tfbox`. Zero autores externos. E o fluxo real (`/to-issues`, agentes via `gh issue create --title --body`) **não passa pelo seletor de template** — o seletor só existe na UI web. O `tfbox` mantém 5 issue forms (`bug_report`, `feature_request`, `documentation`, `performance_issue`, `question`) que ninguém de fora nunca usou, e cujo `config.yml` aponta `contact_links` para `ThiagoPanini/tech-playground/discussions` — repo cujo Discussions está **desligado** (`has_discussions: false`). Cerimônia copiada apodrece em link morto.

**Filtro solo: DESCARTAR o catálogo (§7). ADOTAR um único PR template curto**, já existente em 4/6 repos, porque ele serve ao agente (é o corpo que o `open-pr` preenche) e ao dono relendo o PR — não ao contribuidor externo.

### 1.4 Reusable workflows — o item de maior retorno [DOC] + [OBS]

**[DOC]**
- O workflow chamado declara `on: workflow_call` (com `inputs:` e `secrets:` tipados) e vive obrigatoriamente em `.github/workflows` — *"Subdirectories of the `workflows` directory are not supported."* ([Reuse workflows](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows))
- Chamada no nível de **job**, não de step: `uses: {owner}/{repo}/.github/workflows/{file}.yml@{ref}` — `ref` pode ser SHA, tag ou branch.
- Limites: até 10 níveis de aninhamento; até 50 reusable workflows únicos por arquivo chamador. Secrets **não** propagam sozinhos (`secrets:` explícito ou `secrets: inherit`). `env` de workflow não propaga.
- Acesso: workflow em repo **público** é chamável por qualquer um. Em repo **privado**, só se o repo chamado marcar *"Accessible from repositories in the ORGANIZATION-NAME organization"*. Como os 6 repos da panlabs são públicos, essa restrição não morde. ([Sharing actions and workflows with your organization](https://docs.github.com/en/actions/how-tos/reuse-automations/share-with-your-organization))
- Reusable workflow **vs** composite action: workflow tem vários jobs, pode escolher runner diferente do chamador, usa secrets, e loga job a job; composite action é um único step no log, sem jobs, **sem secrets** (só `inputs`).

**[OBS] Onde as orgs de referência colocam CI compartilhada.** Zero das 21 orgs varridas põe `workflow_call` no repo `.github` — nem `github`, nem `microsoft`, nem `actions`, nem `nodejs`. Quando centralizam, usam um **repo dedicado**: `actions/reusable-workflows` tem `.github/workflows/basic-validation.yml` com `on: workflow_call` e inputs tipados (`operating-systems`, `enable-audit`, `node-version`), consumido pelos ~60 repos `actions/*`. É a mesma forma do problema da panlabs: muitos repos com CI quase idêntica.

Isso é **convenção observada, não restrição**: o `.github` é um repo comum e hospedar `workflow_call` nele funciona. Para uma org de 6 repos, `.github` evita criar um 7º repo; a alternativa `panlabs-tech/workflows` segue a convenção do `actions/*`. É uma decisão de gosto, e o mapa deve decidi-la — o mecanismo é idêntico nos dois casos.

**[OBS] Por que é o item de maior retorno aqui.** Os 4 apps Next (`panlabs`, `ethitorial`, `life-under-control`, `travelmanager`) têm `pr-checks.yml` com o **mesmo esqueleto**: mesma lista de branches em `on: push`, mesmo `concurrency: pr-checks-${{ github.ref }}` com `cancel-in-progress`, mesmo `permissions: contents: read`, mesmo job final `open-pr` que abre o PR quando tudo fica verde. E já tem drift: `panlabs` usa `actions/checkout@v7` + npm; `ethitorial` usa `@v6` + pnpm. Quatro cópias divergindo é a superfície onde hoje uma correção de segurança precisa ser aplicada quatro vezes.

Vale registrar a razão técnica do desenho atual, documentada no próprio código: o comentário do `pr-checks.yml` do `ethitorial` explica que a validação roda no `push` e não no `pull_request` porque *"um PR aberto automaticamente ... NÃO dispararia `pull_request` por causa da proteção anti-recursão do `GITHUB_TOKEN`"*. Isso é comportamento documentado da plataforma (§4.3) — a esteira já contorna corretamente.

**Filtro solo: ADOTAR.** É o raro mecanismo que fica **mais** valioso com poucos mantenedores: num time grande alguém percebe o drift; sozinho, não.

---

## 2. Configuração da org

### 2.1 Estado atual [OBS]

`gh api orgs/panlabs-tech`, 2026-07-19:

```
plan: free (filled_seats: 1)          default_repository_permission: read
members_can_create_repositories: true members_allowed_repository_creation_type: all
members_can_fork_private_repositories: false
web_commit_signoff_required: false    two_factor_requirement_enabled: false
advanced_security_enabled_for_new_repositories: false
dependabot_alerts_enabled_for_new_repositories: false
dependabot_security_updates_enabled_for_new_repositories: false
dependency_graph_enabled_for_new_repositories: false
secret_scanning_enabled_for_new_repositories: false
secret_scanning_push_protection_enabled_for_new_repositories: false
```

E por repo (`gh api repos/panlabs-tech/panlabs --jq .security_and_analysis`): `secret_scanning: disabled`, `secret_scanning_push_protection: disabled`, `dependabot_security_updates: disabled`.

**Nada de segurança está ligado, e os defaults para repos futuros também não.** Todos esses toggles existem no nível da org, ligam-se uma vez e valem para os 6 repos e para todo repo novo. É a definição de mecanismo sobre cerimônia.

Dois pontos que já estão certos e não devem ser mexidos:

- `default_repository_permission: read` — inócuo com 1 membro, mas é o default seguro se um segundo entrar.
- A org **já permite** que Actions crie pull requests (há PRs de `app/github-actions` em 4 repos). O toggle *"Allow GitHub Actions to create and approve pull requests"* tem default **desligado** [DOC]; se alguém desligar de volta, a esteira inteira para.

### 2.2 O que ligar, e o que custa

| Toggle | Free em repo público? | Veredito |
|---|---|---|
| Dependency graph | sim, para qualquer visibilidade | **Ligar** — pré-requisito dos alerts |
| Dependabot **alerts** | sim, qualquer visibilidade | **Ligar** — passivo, não abre PR |
| Dependabot **security updates** | sim, qualquer visibilidade | **Ligar** — só abre PR quando há CVE |
| Dependabot **version updates** (`dependabot.yml`) | sim | **Condicionar a auto-merge** — ver §7 |
| Secret scanning | **sim, automático e gratuito** em repo público | **Ligar** |
| Push protection | **sim** em repo público; há toggle org-wide "Enable all" | **Ligar** |
| Code scanning / CodeQL | **sim, gratuito** em repo público | **Ligar** onde houver código relevante |
| Private vulnerability reporting | sim, repo público | Ligar — dá um canal sem expor e-mail |
| Required 2FA na org | sim, inclui explicitamente "GitHub Free for organizations" | Ligar — custo zero com 1 membro |
| `GITHUB_TOKEN` default permissions (org) | sim | Manter restrito; workflows declaram `permissions:` |
| Retenção de artefatos/logs (1–400 dias) | sim | Baixar de 90 dias se quiser economizar |
| Org-level Actions secrets/variables | **sim para repos públicos** (*"not accessible by private repositories for GitHub Free"*) | Disponível — útil se algum segredo repetir entre repos |
| Custom properties de repositório | sim (`fpt:'*'`) | Disponível; valor marginal com 6 repos |

Fontes: [About secret scanning](https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning), [About code scanning](https://docs.github.com/en/code-security/code-scanning/introduction-to-code-scanning/about-code-scanning), [About Dependabot alerts](https://docs.github.com/en/code-security/dependabot/dependabot-alerts/about-dependabot-alerts), [Managing security and analysis settings for your organization](https://docs.github.com/en/organizations/keeping-your-organization-secure/managing-security-settings-for-your-organization/managing-security-and-analysis-settings-for-your-organization), [Requiring 2FA](https://docs.github.com/en/organizations/keeping-your-organization-secure/managing-two-factor-authentication-for-your-organization/requiring-two-factor-authentication-in-your-organization), [Using secrets in GitHub Actions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions).

Correção a duas suposições comuns, verificada na doc: **base permissions e as restrições de criação de repo estão disponíveis no Free** (só a opção "somente repositórios privados" dentro da restrição de criação exige Enterprise Cloud); e **dependency insights de org exige Enterprise Cloud, não apenas Team**.

---

## 3. Convenções entre repos [OBS]

### 3.1 Metadados — o que as orgs realmente preenchem

Repos públicos, não-fork, não-arquivados:

| Org | repos | `description` | `homepage` | `topics` | licença | wiki ligado | discussions |
|---|---:|---:|---:|---:|---:|---:|---:|
| `antfu-collective` | 23 | 100% | 13% | 52% | 100% | 78% | 13% |
| `unjs` | 82 | 95% | 16% | 22% | 91% | 68% | 12% |
| `honojs` | 14 | 93% | 57% | 36% | 43% | 50% | 7% |
| `biomejs` | 19 | 89% | 58% | 37% | 79% | 42% | 32% |
| `pmndrs` | 79 | 86% | 54% | 41% | 77% | 75% | 29% |
| `cli` | 6 | 83% | 50% | 67% | 100% | 67% | 17% |
| `actions` | 60 | 82% | 25% | 18% | 90% | 48% | 25% |
| `tailwindlabs` | 16 | 81% | 44% | 19% | 56% | 50% | 25% |
| `supabase` | 71 | 80% | 54% | 44% | 75% | 51% | 13% |
| `epicweb-dev` | 75 | 80% | 61% | 53% | 61% | 57% | 8% |
| `denoland` | 190 | 79% | 44% | 22% | 56% | 66% | 2% |
| `vercel` | 178 | 78% | 72% | 38% | 62% | 49% | 10% |
| `withastro` | 48 | 73% | 42% | 15% | 50% | 33% | 10% |
| `oven-sh` | 18 | 67% | 17% | 28% | 44% | 67% | 6% |
| `anthropics` | 61 | 66% | 10% | 8% | 75% | 79% | 13% |
| `astral-sh` | 54 | 65% | 19% | 13% | 63% | 56% | 4% |
| `t3-oss` | 8 | 50% | 88% | 50% | 62% | 50% | 25% |

Os **repos-vitrine** das mesmas orgs, um a um:

| Repo | desc | `homepage` | topics | licença | wiki | disc | branch |
|---|:--:|---|--:|---|:--:|:--:|---|
| `astral-sh/ruff` | ✓ | `docs.astral.sh/ruff` | 11 | MIT | **off** | on | `main` |
| `astral-sh/uv` | ✓ | `docs.astral.sh/uv` | 4 | Apache-2.0 | **off** | off | `main` |
| `biomejs/biome` | ✓ | `biomejs.dev` | 9 | Apache-2.0 | **off** | on | `main` |
| `honojs/hono` | ✓ | `hono.dev` | 9 | MIT | **off** | on | `main` |
| `oven-sh/bun` | ✓ | `bun.com` | 12 | custom | **off** | on | `main` |
| `withastro/astro` | ✓ | `astro.build` | 11 | custom | **off** | off | `main` |
| `vercel/next.js` | ✓ | `nextjs.org` | 14 | MIT | **off** | on | `canary` |
| `cli/cli` | ✓ | `cli.github.com` | 4 | MIT | **off** | on | `trunk` |
| `tailwindlabs/tailwindcss` | ✓ | `tailwindcss.com` | 7 | MIT | **off** | on | `main` |
| `t3-oss/create-t3-app` | ✓ | `create.t3.gg` | 12 | MIT | **off** | off | `main` |
| `supabase/supabase` | ✓ | `supabase.com` | 19 | Apache-2.0 | **off** | on | `master` |
| `colinhacks/zod` | ✓ | `zod.dev` | 5 | MIT | on | on | `main` |
| `denoland/deno` | ✓ | `deno.com` | 4 | MIT | on | on | `main` |
| `pmndrs/zustand` | ✓ | `zustand-demo.pmnd.rs` | 7 | MIT | on | on | `main` |
| `sindresorhus/got` | ✓ | — | 6 | MIT | **off** | on | `main` |

Leitura:

1. **`description` é a única convenção quase universal** — 15/15 nos repos-vitrine, 65–100% na cauda longa. É a linha que aparece na busca e na lista de repos da org: a superfície dos 30 segundos. `panlabs-tech/panlabs` está sem, e é justamente o repo do site institucional.
2. **`topics` NÃO é convenção de org — é convenção de repo-vitrine.** Na cauda longa a taxa despenca (8% em `anthropics`, 13% em `astral-sh`, 15% em `withastro`); nos vitrine é 15/15 com mediana ~9. A prática real é: **repo com público recebe metadados completos; repo interno recebe só `description`**. Isso desmonta a versão "checklist de SEO" de que todo repo precisa de topics. Limites oficiais [DOC]: máximo 20 topics, ≤50 caracteres, minúsculas/números/hífens; nomes de topic são **sempre públicos**, mesmo criados em repo privado ([Classifying your repository with topics](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics)).
3. **`homepage` aponta para a documentação, não para o repo.** 14/15 dos vitrine, sempre o site de docs. `tfbox` aponta para `thiagopanini.github.io/tfbox/` — domínio antigo, fora da org: homepage stale é pior que homepage vazia.
4. **Nomenclatura de repo é rigidamente `lower-kebab`.** `antfu-collective` 23/23, `vercel` 64/64, `astral-sh` 53/54, `unjs` 81/82, `epicweb-dev` 74/75. **Zero underscores** em todas as orgs varridas; maiúscula só em 2 de 79 repos do `pmndrs`. As exceções são pontos (`next.js`, `astro.build`). Convenção observada, não regra do GitHub. Os 6 repos da panlabs já obedecem.
5. **`main` é maioria, não unanimidade** — `cli/cli` usa `trunk`, `vercel/next.js` usa `canary`, `supabase` usa `master`. Importa menos o nome do que ser o mesmo em todos (é `main` em 6/6 — manter).

### 3.2 Anatomia do README [OBS] + [DOC]

| Repo | linhas | forma |
|---|---:|---|
| `tailwindlabs/tailwindcss` | 36 | ponteiro puro: Documentation / Community / Contributing |
| `honojs/hono` | 85 | Quick Start · Features · Documentation · License |
| `denoland/deno` | 116 | Install · primeiro programa · recursos · Contributing |
| `cli/cli` | 119 | o que é · Documentation · Installation · Contributing |
| `t3-oss/create-t3-app` | 141 | o que é · filosofia · instalação |
| `colinhacks/zod` | 191 | link para docs no topo · o que é · features · uso básico |
| `astral-sh/uv` | 326 | highlights · installation · features |
| `actions/checkout` | 388 | changelog por versão + usage |
| `sindresorhus/got` | 474 | API completa no README |
| `pmndrs/zustand` | 512 | receitas no README |

Duas famílias: **README-ponteiro** (36–191 linhas, manda para o site de docs) e **README-como-documentação** (326–512, o README *é* a doc). A escolha é função de existir ou não um site de docs. Os repos da panlabs já têm `docs/` e sites em `*.panlabs.tech` — a família certa é a primeira.

[DOC] O GitHub procura README em `.github/`, depois na raiz, depois em `docs/`; gera índice ("Outline") a partir dos headings; transforma links relativos conforme a branch, e recomenda link relativo — *"easier for users who clone your repository"*; trunca a exibição acima de **500 KiB**. ([About READMEs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes))

### 3.3 Arquivos de raiz — o núcleo irredutível [OBS]

Raiz de 15 repos-vitrine:

| Arquivo | presença |
|---|---|
| `README.md` | **15/15** |
| `LICENSE` (qualquer grafia) | **15/15** |
| `CONTRIBUTING.md` | 9/15 |
| `CHANGELOG.md` | 5/15 |
| `CODE_OF_CONDUCT.md` | 4/15 |
| `SECURITY.md` | 3/15 |
| `CODEOWNERS` | 1/15 |

O extremo minimalista é instrutivo: `sindresorhus/got` — milhões de downloads, um mantenedor — tem exatamente **`license` e `readme.md`** na raiz. `denoland/deno` tem `LICENSE.md` e `README.md`. **O núcleo irredutível é README + LICENSE**; o resto cresce com o número de humanos.

Estado atual da panlabs pelo community profile do GitHub:

| repo | health | arquivos reconhecidos |
|---|---:|---|
| `panlabs` | **0%** | *nenhum — nem README* |
| `skills` | 50% | license, readme |
| `ethitorial` | 50% | license, pull_request_template, readme |
| `tfbox` | 37% | pull_request_template, readme |
| `life-under-control` | 37% | pull_request_template, readme |
| `travelmanager` | 37% | pull_request_template, readme |

O gap real não é falta de cerimônia — é **`panlabs` sem README e 4 repos sem LICENSE**.

### 3.4 Política de release e tag [OBS]

| Repo | formato de tag | notas |
|---|---|---|
| `cli/cli`, `tailwindcss`, `zod`, `zustand`, `deno`, `got` | `vX.Y.Z` | geradas do CHANGELOG |
| `astral-sh/uv` | `X.Y.Z` (sem `v`) | corpo gerado ~11 KB |
| `astral-sh/ruff` | `vX.Y.Z` antigo → `X.Y.Z` atual | ~8 KB |
| `biomejs/biome`, `withastro/astro`, `t3-oss/create-t3-app`, `vercel/next.js` | `pacote@X.Y.Z` (monorepo) | Changesets |
| `actions/checkout` | `vX.Y.Z` **+ tag móvel `vX`** | consumidores fixam `@v7` |

Achado negativo relevante: **0 de 11 repos-vitrine usam `.github/release.yml`** (o config de release notes auto-geradas por label). Todos derivam as notas do CHANGELOG, via Changesets, `git-cliff` ou script próprio.

Na panlabs: `panlabs`, `ethitorial`, `life-under-control` e `travelmanager` têm **0 tags e 0 releases** — e faz sentido: são apps com deploy contínuo no Coolify, a "versão" é o commit na `main`. Só `tfbox` tem tags, no formato `aws/sqs-queue/v0.2.0`, exigido pelo consumo de módulos Terraform por path.

**Conclusão: política de release não é uniforme por org; é função de o repo ter consumidor externo.** App com deploy contínuo não precisa de tag. Módulo/biblioteca precisa, no formato que o registry do ecossistema exige. Qualquer spec que force "toda repo da org tem release semver" seria cerimônia.

### 3.5 O que os repos-vitrine colocam em `.github/` [OBS]

```
cli/cli            CODE-OF-CONDUCT, CODEOWNERS, CONTRIBUTING, ISSUE_TEMPLATE, PULL_REQUEST_TEMPLATE, SECURITY, dependabot.yml, workflows
astral-sh/ruff     CODEOWNERS, ISSUE_TEMPLATE, PULL_REQUEST_TEMPLATE, actionlint.yaml, pr-reviewer-pools.toml, renovate.json5, zizmor.yml, workflows
vercel/next.js     AGENTS.md, CLAUDE.md, CODEOWNERS, DISCUSSION_TEMPLATE, ISSUE_TEMPLATE, pull_request_template.md, workflows
denoland/deno      CODE_OF_CONDUCT, CONTRIBUTING, ISSUE_TEMPLATE, PULL_REQUEST_TEMPLATE, SECURITY, copilot-instructions.md, workflows
withastro/astro    ISSUE_TEMPLATE, PULL_REQUEST_TEMPLATE, labeler.yml, renovate.json5, workflows
biomejs/biome      CODEOWNERS, ISSUE_TEMPLATE, PULL_REQUEST_TEMPLATE, labeler.yml, renovate.json5, workflows
honojs/hono        FUNDING.yml, ISSUE_TEMPLATE, actions, pull_request_template.md, workflows
colinhacks/zod     workflows
actions/checkout   dependabot.yml, workflows
```

Três achados que interessam ao padrão panlabs:

- **Instrução de agente virou artefato de repo em orgs de primeira linha**: `vercel/next.js` versiona `.github/AGENTS.md` **e** `.github/CLAUDE.md`; `denoland/deno` versiona `.github/copilot-instructions.md`. Isso valida (não inventa) a prática de `AGENTS.md`/`CLAUDE.md`, hoje em 3/6 repos da panlabs.
- **Não há convenção única de bot de dependência**: Renovate (`renovate.json5`) em `astral-sh`, `withastro`, `biomejs`; Dependabot (`dependabot.yml`) em `cli/cli`, `actions/checkout`, `zustand`.
- **`colinhacks/zod` — repo de um mantenedor — tem só `workflows` em `.github/`.** O volume de cerimônia acompanha o número de humanos, não a importância do projeto.

**Nota lateral que vale registrar** [OBS]: `astral-sh/.github/AI_POLICY.md` diz textualmente *"We do not allow autonomous agents to be used for contributing to our projects. We will close any pull requests that we believe were created autonomously."* É política para **contribuição externa**, não restrição ao tooling da própria org — mas é o sinal mais claro de que agentes autônomos em PR são hoje um diferencial de org solo, não uma prática que se copia de orgs grandes. O caso mais próximo é `sxzz`, mantenedor solo que ship a PRs assistidos por IA: a única adaptação de processo dele foi um checkbox de honestidade no PR template (*"This PR contains AI-generated code, but I have carefully reviewed it myself"*), não processo novo.

---

## 4. Compatibilidade com a doutrina de merge autônomo no verde

Esta seção existe porque o ADR-0014 muda o veredito de coisas que, fora dele, seriam "boas práticas".

### 4.1 O que quebra a esteira [DOC]

| Mecanismo | Efeito | Fonte |
|---|---|---|
| **Required PR reviews (≥1)** | **Quebra.** Regra dura da plataforma: *"Pull request authors cannot approve their own pull requests."* Nem o dono nem o `GITHUB_TOKEN` que abriu o PR podem aprová-lo. | [Approving a PR with required reviews](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/approving-a-pull-request-with-required-reviews) |
| *"Allow GitHub Actions to create and approve pull requests"* | **Não resolve sozinho.** Só permite a *capacidade* de chamar a API de aprovação; não anula a proibição de auto-aprovação do mesmo ator. | [Managing GitHub Actions settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository) |
| **"Require review from Code Owners"** com dono único | **Deadlock.** O único code owner é o autor do PR, e autor não aprova o próprio PR. Requisito impossível de satisfazer. | [About code owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners) + fonte acima |
| **`GITHUB_TOKEN` abrindo PR** | *"events triggered by the `GITHUB_TOKEN` will not create a new workflow run"* (exceções: `workflow_dispatch`, `repository_dispatch`). O `on: pull_request` não dispara. Workaround documentado: PAT ou token de GitHub App. | [Triggering a workflow](https://docs.github.com/en/actions/using-workflows/triggering-a-workflow) |
| **"Require branches to be up to date"** (strict) sob volume | Cada merge na base invalida o status dos outros PRs pendentes, forçando re-run e podendo entrar em corrida. | [About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) |
| **Require signed commits** | *"contributors and bots can only push commits that have been signed and verified"*. Commits criados via API/web do GitHub são assinados automaticamente pelo GitHub; **commits que o agente faz com `git commit` local numa worktree, sem chave configurada, chegam não assinados e são rejeitados.** | [Available rules for rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets), [About commit signature verification](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification) |

**Observação sobre o estado atual** [OBS]: a esteira já contorna o problema do `GITHUB_TOKEN` rodando os checks no `push` da branch de trabalho, e o comentário no `ethitorial/pr-checks.yml` afirma usar ruleset strict/up-to-date — os contextos reportados no SHA satisfazem o PR. Isso funciona hoje com PRs sequenciais; **é o item a revisitar se a esteira passar a mergear PRs em paralelo**. Nesse caso a solução documentada é merge queue, que está **disponível no free para repo público de org** — *"Pull request merge queues are available in any public repository owned by an organization"* — mas é solução para um problema que ainda não existe.

### 4.2 O que é seguro ligar [DOC]

| Regra de ruleset | Veredito |
|---|---|
| Block force pushes | **Seguro** — *"Enabling force pushes will not override any other rules."* Nenhuma interação com merge-on-green. |
| Restrict deletions | **Seguro** |
| Require linear history | **Seguro**, exige que o repo permita squash ou rebase merge (*"must use a squash merge or a rebase merge"*) — o que já é o caso |
| Require status checks | **Seguro — é *o* gate.** Um check exigido que nunca reporta fica "Pending" para sempre e trava o merge: *"If a workflow is skipped due to path filtering, branch filtering or a commit message, then checks associated with that workflow will remain in a 'Pending' state."* Job pulado por `if:` reporta **Success**. Fail-closed é bom aqui, mas exige cuidado com path filters. |
| "Allow auto-merge" + `gh pr merge --auto` | **Seguro** — merge quando os requisitos passam. Não exige branch protection para existir; vira no-op se nada estiver bloqueando. |
| Bypass list no ruleset | **Seguro e disponível.** Atores possíveis pela API: `Integration`, `OrganizationAdmin`, `RepositoryRole`, `Team`, `DeployKey`, `User`; cada entrada pode ser escopada a *"For pull requests only"*. |

Diferença que importa: **ruleset e branch protection clássica têm defaults invertidos**. Na clássica, admin bypassa por padrão a menos que se marque *"Do not allow bypassing the above settings"* (`enforce_admins`). No ruleset, **ninguém bypassa** salvo quem estiver explicitamente na lista. E quando as duas coexistem na mesma branch, *"the most restrictive version of the rule applies"*.

### 4.3 Dependabot e merge autônomo [DOC] + [OBS]

[DOC] A receita oficial é `dependabot/fetch-metadata` + `gh pr merge --auto`, com `permissions: contents: write, pull-requests: write` ([Automating Dependabot with GitHub Actions](https://docs.github.com/en/code-security/tutorials/secure-your-dependencies/automate-dependabot-with-actions)). Duas ressalvas documentadas: workflows disparados pelo Dependabot recebem `GITHUB_TOKEN` **read-only** e **não** enxergam os Actions secrets — só os *Dependabot secrets* ([Dependabot on GitHub Actions](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-on-actions)); e se a branch alvo usar merge queue, o `GITHUB_TOKEN` embutido **não consegue** enfileirar o PR.

[OBS] O custo de não fazer isso está medido dentro da própria org. O `tfbox` tem `dependabot.yml` com 3 ecossistemas e produziu **46 PRs**: **8 merged, 28 fechados sem merge, 10 ainda abertos**. Taxa de merge de 17% e um backlog permanente de 10 PRs. Dependabot **version updates** sem auto-merge, numa org solo, é gerador de ruído — não de segurança.

---

## 5. Limites do plano free — o que simplesmente não está disponível [DOC]

Todos os 6 repos são **públicos**, o que salva a maior parte da lista. O que muda o veredito:

| Recurso | Free / repo público | Free / repo privado | Exige |
|---|---|---|---|
| **Repository rulesets** | **sim** | não | Pro/Team/GHEC para privado |
| **Organization rulesets** | **não** | não | **Team ou Enterprise** |
| Push rulesets (privado/internal) | n/a | não | Team |
| Merge queue | **sim** (repo público de org) | não | GHEC para privado — Team **não** basta |
| Branch protection clássica | sim | não | Pro+ |
| CODEOWNERS | sim | não | Pro+ |
| Multiple/team PR reviewers | sim | não | Team |
| Environments + deployment protection rules | sim | não | Pro+; wait-timer/reviewer em privado exige Enterprise |
| GitHub Pages / wikis | sim | não | Pro+ |
| Secret scanning | **sim, automático e grátis** | não | Secret Protection (Team/GHEC) |
| Push protection | **sim** | não | idem |
| Code scanning / CodeQL | **sim, grátis** | não | Code Security (Team/GHEC) |
| Dependency review em PR | sim | não | Code Security |
| Dependabot alerts / security updates / version updates / dependency graph | **sim** | **sim** | — grátis em tudo |
| **Security overview (org)** | **não** | **não** | **Team/Enterprise** + Secret risk assessment |
| Secret risk assessment | não | não | Team/Enterprise |
| Org Actions secrets/variables | **sim** | não (*"not accessible by private repositories for GitHub Free"*) | Team+ |
| Actions minutos | ilimitado (runners padrão) | 2.000 min/mês | Team 3.000, Enterprise 50.000 |
| Custom repository roles | não | não | **GHEC** |
| Dependency insights (org) | não | não | **GHEC** (nem Team) |
| Base permissions, restrição de criação de repo, política de fork | sim | sim | — |
| Teams | sim | sim | — sem limite de contagem documentado |
| Required 2FA na org | sim | sim | — |
| Custom properties | sim | sim | — |
| Verified domains (badge) | sim | sim | restringir notificação ao domínio exige GHEC |
| Org profile README | sim | sim | — |

Fontes principais: [About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets) — verbatim: *"Rulesets are available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, and GitHub Enterprise Cloud."*; [Creating rulesets for repositories in your organization](https://docs.github.com/en/organizations/managing-organization-settings/creating-rulesets-for-repositories-in-your-organization); [Managing a merge queue](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue); [About security overview](https://docs.github.com/en/code-security/security-overview/about-security-overview); [About GitHub Advanced Security](https://docs.github.com/en/get-started/learning-about-github/about-github-advanced-security) — *"You must be on a GitHub Team or GitHub Enterprise plan in order to purchase GitHub Code Security or GitHub Secret Protection"*; [github.com/pricing](https://github.com/pricing).

**As duas consequências práticas:**

1. **Não existe ruleset de org no free.** Toda a padronização de branch protection precisa ser aplicada **repo a repo** — 6 vezes, e mais uma a cada repo novo. Isso empurra a decisão para "aplicar via `gh api` num script versionado" em vez de "configurar na UI". Se algum dia essa repetição doer mais do que US$ 4/usuário/mês, o org ruleset do plano Team é a saída — mas com 1 assento e 6 repos, não dói ainda.
2. **Tudo tem que continuar público.** Secret scanning, push protection, code scanning, rulesets, merge queue, Pages, wikis, org secrets: no free, cada um desses some no instante em que um repo vira privado. "Repo privado" na `panlabs-tech` não é só uma escolha de visibilidade — é abrir mão de toda a camada de segurança e governança de uma vez. Vale virar invariante escrita.

---

## 6. O que orgs de referência desligam, e por quê [OBS]

**Wiki.** Desligado em **12 dos 15** repos-vitrine varridos (exceções: `deno`, `zod`, `zustand`). Na cauda longa a taxa de wiki ligado é 33–79% — mas ligado é o *default* do GitHub, então o número mede inércia, não uso. `withastro` (33%) e `biomejs` (42%) claramente desligam de propósito. Motivo: wiki é um segundo lugar de documentação, fora do PR, fora do review, fora do grep — divergindo silenciosamente do `docs/`. Na `panlabs-tech` o wiki está ligado em **6/6 e usado em 0/6**: é superfície morta que aparece na navegação do repo para a audiência (1).

**Discussions.** Ligado em 2–32% da cauda longa, e ligado em 12/15 dos vitrine (fora: `uv`, `astro`, `create-t3-app`). Ou seja: **as orgs ligam Discussions no repo-vitrine e desligam em todo o resto.** É canal de comunidade — precisa de comunidade. Zero em 6/6 na panlabs hoje; manter zero.

**Projects.** 46–87% de "ligado" na cauda longa — de novo, o default. Não há sinal de convenção forte.

**Issues.** Praticamente nunca desligado (84–100%) — mesmo em orgs que redirecionam suporte para outro canal, como `withastro`, que mantém Issues ligado e usa `SUPPORT.md` para dizer que Issues não é canal de suporte.

**Aprovação obrigatória em PR.** Não observável de fora sem admin. Mas há um dado interno relevante [OBS]: nos 5 repos da panlabs com PRs, **0 reviews em 4 deles** (`panlabs` 30 PRs, `ethitorial` 95, `life-under-control` 100, `travelmanager` 100 — todos com zero reviews); só `tfbox` tem 11, da era Dependabot/Copilot. A esteira já opera sem review, e o volume é real: 86 dos 100 PRs de `life-under-control` foram abertos por `app/github-actions`.

---

## 7. Descartado, e por quê

Cada linha aqui é uma prática que aparece em orgs de referência e que **não** deve ser copiada. O motivo é o teste: *quem essa prática serve?*

| Prática | Onde aparece | Por que descartar |
|---|---|---|
| **CODEOWNERS** | `cli/cli`, `astral-sh/ruff`, `biomejs`, `vercel/next.js`, `tailwindcss` | Serve para **rotear review entre pessoas**. Com 1 pessoa, roteia para ela mesma. Pior: combinado com "Require review from Code Owners" produz **deadlock formal** — o único owner é o autor e autor não aprova o próprio PR. Já estava fora de escopo no mapa #46; a doc confirma que estaria quebrado, não só inútil. |
| **Review obrigatório em PR** | universal em orgs grandes | Incompatível com ADR-0014 por regra dura da plataforma (§4.1). Não é questão de disciplina — é impossível. |
| **CODE_OF_CONDUCT.md** | `cli/cli`, `deno`, `nodejs`, `zod` | Regula **interação entre estranhos**. Sem estranhos, é declaração sem sujeito. Nem `vercel`, `honojs` ou `biomejs` têm. |
| **CONTRIBUTING.md voltado a contribuidor externo** | 9/15 dos vitrine | Setup, estilo de commit e fluxo de PR já vivem no `CLAUDE.md`/`AGENTS.md`, que é o que o leitor real (o agente) lê. Um CONTRIBUTING duplicaria isso num arquivo que ninguém lê e que sairia de sincronia. Se um dia fizer falta, é ponteiro de uma linha para `CLAUDE.md`. |
| **GOVERNANCE.md / MEMBERS.md / processo de nomeação** | `withastro` (403 linhas), `fastify` (109), `nodejs` | Define como pessoas entram e saem de papéis. Com 1 pessoa e 0 teams não há papel a atribuir. Cerimônia mais cara do levantamento. |
| **`FUNDING.yml`** | `honojs`, `sindresorhus`, `preactjs`, `bluwy`, `biomejs`, `sxzz`, `fastify` | Curiosamente **mais comum em org solo do que em corporação** — mas resolve "quero ser patrocinado por usar meu OSS". A panlabs é vitrine de soluções próprias, não OSS buscando sponsor. Fora até que essa intenção exista. |
| **Catálogo de 5 issue forms** (bug/feature/docs/perf/question) | `tfbox` hoje; `unjs`, `sxzz`, `fastify` | Filtra a entrada de **relator desconhecido**. 100% das ~294 issues amostradas na org foram abertas pelo dono, e o fluxo real (`gh issue create`) **não passa pelo seletor de template**. É formulário sem preenchedor. |
| **`config.yml` com `contact_links`** | `tfbox` hoje | Aponta o visitante para Discussions/fórum. Na panlabs aponta para `ThiagoPanini/tech-playground/discussions`, cujo Discussions está **desligado**. Já apodreceu em link morto — prova de que cerimônia copiada não é gratuita: ela decai. |
| **`SUPPORT.md` que fecha as Issues** (estilo `withastro`) | `withastro` | Resolve "excesso de estranhos consumindo banda do mantenedor". Problema que uma org de 1 membro e 6 repos não tem. *(O `SUPPORT.md` que a panlabs deve ter é o oposto: uma linha dizendo onde falar.)* |
| **CLA bot, policy bot, repo-linter org-wide** | `microsoft` (`policies/*.yml`, `CLA/`), `github` (`repolinter-ruleset.json`) | Só se paga com centenas/milhares de repos e cessão de PI de terceiros. Com 6 repos, o "linter de org" é uma leitura de `gh api` num script. |
| **Stale bot** | `microsoft/stale.yml` | Fecha issue esquecida de estranho. Aqui toda issue é do dono e o wayfinder já é o mecanismo de triagem. Fecharia trabalho próprio. |
| **`labeler.yml` (auto-label por path)** | `withastro/astro`, `biomejs/biome` | Serve para triagem humana em fila grande. O vocabulário de labels da panlabs (`needs-triage`, `ready-for-agent`, …) é aplicado pelo agente que já sabe o que fez — automatizar por path adiciona ruído, não sinal. |
| **`.github/release.yml`** (release notes por label) | **0 de 11** repos-vitrine | Ninguém usa. Notas saem do CHANGELOG. Não gastar ticket com isso. |
| **Dependabot version updates sem auto-merge** | `tfbox` hoje | Medido: 46 PRs → 8 merged, 28 fechados, 10 abertos parados. 17% de aproveitamento e backlog permanente. Ou vem com a receita de auto-merge (§4.3), ou sai. Alerts e **security** updates ficam — esses são passivos. |
| **Organization rulesets** | prática correta em orgs Team+ | **Indisponível no plano free.** Não é descarte por filtro, é indisponibilidade. Padronização vai ter que ser repo a repo, via script. |
| **Merge queue** | disponível no free para repo público de org | **Descartado por ora, não por indisponibilidade**: resolve corrida entre PRs paralelos, e a esteira hoje é sequencial. Reavaliar se o merge autônomo passar a rodar N PRs em paralelo com ruleset strict. |
| **Discussions** | ligado em 11/15 vitrine | Precisa de comunidade. Zero em 6/6 hoje; manter zero. |
| **Wiki** | ligado em 6/6 na panlabs, usado em 0/6 | Segundo lugar de documentação fora do PR e do grep. 13/15 dos vitrine desligam. Desligar. |
| **Múltiplos PR templates via `?template=`** | recurso [DOC] | Depende de o autor escolher na UI web. O autor é um workflow que chama `gh pr create --body`. Um template só. |
| **README-como-documentação** (300–500 linhas) | `got`, `zustand`, `uv` | É a forma certa para quem **não tem** site de docs. A panlabs tem `docs/` e `*.panlabs.tech`. README longo viraria a terceira cópia divergente da mesma informação. |
| **`topics` em todo repo** | 8–53% na cauda longa das orgs | Não é convenção real. A convenção é: metadado completo no repo com público, `description` no resto. `skills` e repos internos não precisam de topics. |

---

## 8. Perguntas que este research deixa em aberto para o mapa

1. **Onde mora a CI compartilhada** — `panlabs-tech/.github/.github/workflows/` (evita um 7º repo) ou `panlabs-tech/workflows` (segue a convenção observada em `actions/reusable-workflows`)? O mecanismo é idêntico; é decisão de forma.
2. **Como o ruleset é aplicado repo a repo** sem org ruleset — script `gh api` versionado (onde?) ou configuração manual aceita como custo.
3. **`require signed commits`: entra ou não?** Só entra se os agentes tiverem chave de assinatura configurada na worktree; hoje quebraria o `git commit` local.
4. **`skills` (repo vazio) recebe o mesmo padrão dos apps?** README + LICENSE ele já tem; description, topics, homepage e política de release dependem de ele ter consumidor — o que ainda não foi decidido (item aberto do mapa #46).
5. **`tfbox` mantém ou remove os 5 issue forms?** Removê-los é pré-requisito para ele passar a herdar qualquer template do `.github` da org (override é tudo-ou-nada).

---

## Apêndice — reprodutibilidade

Comandos usados para a coleta [OBS], em 2026-07-19, com `gh` autenticado:

```bash
# metadados da org
gh api orgs/panlabs-tech

# metadados de todos os repos públicos de uma org
gh api "orgs/<org>/repos?per_page=100&type=public" --paginate

# um repo específico (inclui has_wiki/has_discussions/allow_auto_merge quando há admin)
gh api repos/<owner>/<repo>

# community profile — o checklist do próprio GitHub
gh api repos/<owner>/<repo>/community/profile

# árvore de arquivos (raiz e .github)
gh api "repos/<owner>/<repo>/git/trees/HEAD?recursive=1" --jq '.tree[].path'

# conteúdo cru de um arquivo
gh api "repos/<owner>/<repo>/contents/<path>" -H "Accept: application/vnd.github.raw"

# README renderizável
gh api repos/<owner>/<repo>/readme --jq .content | base64 -d

# tags e releases
gh api "repos/<owner>/<repo>/tags?per_page=3" --jq '.[].name'
gh api "repos/<owner>/<repo>/releases?per_page=1"

# rulesets (retornou [] em panlabs — repo público no free tem rulesets disponíveis)
gh api repos/panlabs-tech/panlabs/rulesets

# autoria de issues e PRs
gh issue list -R <owner>/<repo> --state all --limit 100 --json author
gh pr list -R <owner>/<repo> --state all --limit 100 --json author,reviews,state
```

**Limitações da coleta, declaradas:**

- `allow_auto_merge`, `delete_branch_on_merge`, `allow_squash_merge` e afins **só aparecem para quem tem admin** no repo. As colunas de método de merge das orgs de terceiros não são observáveis — foram omitidas, não inferidas.
- `gh api orgs/panlabs-tech/rulesets` e `orgs/panlabs-tech/actions/permissions` retornaram 403/404 por falta do escopo `admin:org` no token atual. O estado desses dois não foi verificado diretamente; o de rulesets é inferido pela indisponibilidade do recurso no plano free [DOC].
- `has_wiki`/`has_projects` medem o **flag**, não o uso. Como ambos vêm ligados por default, a taxa na cauda longa mede inércia; o sinal está nos repos-vitrine, que são curados.
- Orgs varridas: `astral-sh`, `biomejs`, `honojs`, `unjs`, `antfu-collective`, `denoland`, `oven-sh`, `tailwindlabs`, `t3-oss`, `epicweb-dev`, `withastro`, `vercel`, `cli`, `anthropics`, `pmndrs`, `supabase`, `actions`, `github`, `microsoft`, `nodejs`, `solidjs`, `preactjs`, `fastify`, `sindresorhus`, `total-typescript`, `bluwy`, `sxzz`, `wooorm`, `colinhacks`.
