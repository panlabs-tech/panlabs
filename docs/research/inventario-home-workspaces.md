# Inventário verificado de `~/` e `~/workspaces`

- **Origem:** [issue #50](https://github.com/panlabs-tech/panlabs/issues/50) — `wayfinder:task`
- **Data:** 2026-07-20
- **Branch:** `task/inventario-maquina` (descartável; sem PR)
- **Método:** medição direta na máquina alvo, em quatro varreduras paralelas somente-leitura. Nada foi apagado, movido, commitado ou instalado. Onde duas fontes discordaram, remedi eu mesmo e reporto o método.

> **Regra que governa o documento:** isto é uma tabela navegável, não uma conclusão. Cada linha traz o **fato medido** e, quando cabe, a **evidência** que sustenta um rótulo (`ÓRFÃO`, `EM USO`, `REPRODUZÍVEL`, `TRABALHO VIVO`). O que fazer com cada linha é decisão de [#52](https://github.com/panlabs-tech/panlabs/issues/52) e [#53](https://github.com/panlabs-tech/panlabs/issues/53), não deste ticket.

---

## 0. O que este inventário derruba

Três premissas com que o mapa vinha operando não sobreviveram à medição.

**1. Não há trabalho não commitado em risco em `life-under-control` — e nunca houve "30 commits perdidos".**
O charting registrou 83 arquivos sujos; o [#63](https://github.com/panlabs-tech/panlabs/issues/63) corrigiu para "foi commitado". A forense encontrou então **30 commits em 22 branches ausentes de todo remote** (`git log --branches --not --remotes`), o que parecia risco grave. **É falso alarme.** Testado por patch-id (`git cherry`) e depois por conteúdo (diff dos arquivos tocados contra `origin/main`), **as 22 branches são idênticas a `origin/main` nos arquivos que tocam**. O trabalho foi merjado por squash — o SHA local morre, o conteúdo não. Ver §3.1.

**2. O peso de `~/workspaces` não é código.**
São 15,68 GiB, dos quais **14,88 GiB (94,9%) são artefatos reproduzíveis** — `node_modules`, `.venv`, `.terraform`, `.next`. Fonte e histórico git somados são **0,80 GiB**. Ver §2.2.

**3. `~/aws` não é configuração de credencial.**
É o bundle descompactado do instalador do AWS CLI v2, 226 MiB e 7.516 arquivos, parado desde fev/2025 — o CLI real está em `/usr/local/bin`. As credenciais AWS moram em `~/.aws`, que é um **symlink para o host Windows**. Ver §5.

---

## 1. Enquadramento: a aritmética fecha

Medido em 2026-07-20 21:46, com o WSL 5 min de pé.

| Item | Valor | Fonte |
|---|---|---|
| `/` (ext4 no vhdx) | 1007 G alocáveis, **43 G usados**, 5% | `df -h` |
| `~/` exceto `~/workspaces` | **~23,3 GiB** | `du -sb`, top 22 |
| `~/workspaces` | **15,68 GiB** | `du -s` |
| Soma explicada | ~39 GiB de 43 G | — |
| `C:` livre | **55 GB** (89% usado) | `df -h /mnt/c` |
| `ext4.vhdx` no host | **51,26 GiB** (55.038.705.664 B) | `stat` |
| `docker_data.vhdx` | **1,57 GiB** | `stat` |

**Nenhum GB inexplicado.** O resto até 43 G é sistema (`/usr`, `/var`, `/opt`).

**Estado pós-[#63](https://github.com/panlabs-tech/panlabs/issues/63) verificado 24 h depois e estável:** aquele ticket entregou `ext4.vhdx` a 51,23 GiB; hoje está a 51,26 GiB. **Não houve re-inflação** — a alocação do ext4 é estrutural, como o #63 concluiu, e o arquivo não anda sozinho. O `docker_data.vhdx` segue nos 1,57 GiB com que o Docker Desktop o recriou.

> Lembrete que o #62 já registrou e este inventário não contradiz: os **913 G livres que o `df` reporta em `/` não existem** — o vhdx é thin-provisioned com teto declarado de 1 TB e respaldo físico no `C:`. O número que manda é o `C:`, medido de fora.

---

## 2. `~/workspaces` — 22 diretórios

### 2.1 Tabela por diretório

Colunas escolhidas para servirem de entrada direta ao critério de descarte de [#52](https://github.com/panlabs-tech/panlabs/issues/52): *(tem remote) × (está pushado) × (é repo de `panlabs-tech`) × (última atividade)*.

| Dir | Tipo | Remote | Stale? | Repo vivo em `panlabs-tech`? | Branch atual | Sujos | Commits só locais | Stashes | Últ. commit | Tamanho | Reproduzível dentro |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `panlabs` | repo | `panlabs-tech/panlabs` | não | **sim** | `research/agentic-tooling-orfaos` | 0 | 0 | 0 | 2026-07-20 | 1,3 G | `node_modules` 1099M, `.next` 167M |
| `life-under-control` | repo | `ThiagoPanini/…` | **sim** | **sim** | `main` | 0 | 0 (ver §3.1) | 0 | 2026-07-19 | 1,5 G | `node_modules` 631M, `.venv` 210M |
| `life-under-control-mirante` | **worktree** de ↑ | `ThiagoPanini/…` | **sim** | sim (mesmo repo) | `feat/oficializar-design-luc` | 0 | — | — | 2026-07-01 | 855 M | `node_modules` 663M |
| `ethitorial` | repo | `ThiagoPanini/…` | **sim** | **sim** | `docs/updating-skills` | 0 | 0 | 0 | 2026-07-06 | 1,2 G | `node_modules` 644M, `.venv` 153M |
| `tfbox` | repo | `ThiagoPanini/…` | **sim** | **sim** | `feature/repo-improvement` (sem upstream) | **12** | 0 | 0 | 2026-04-23 | **5,1 G** | 6× `.terraform` = **4,9 G** |
| `travelmanager` | repo | `ThiagoPanini/…` | **sim** | **sim** | `main` | 0 | 0 | **2** | 2026-06-30 | 895 M | `node_modules` 505M, `.venv` 176M |
| `wt-212` … `wt-216` | **5 worktrees** de ↑ | `ThiagoPanini/…` | **sim** | sim (mesmo repo) | `feat/21x-…` | 0 | 0 | (2, compart.) | 2026-06-25 | 471–642 M cada | `node_modules` 469M **× 5** |
| `callisto` | repo | `ThiagoPanini/callisto` | não¹ | **não** | `develop` | **53** | 0 | 0 | 2025-05-26 | 2,1 G | `.venv` 1103M, `infra` 780M |
| `engineering-golden-case` | repo | `ThiagoPanini/…` | não¹ | **não** | `feature/refactoring-code` (sem upstream) | **36** | 0 | 0 | 2025-06-18 | 2,4 G | `infra/aws` 2,0 G, `.venv` 250M |
| `b3stocks` | repo | `ThiagoPanini/b3stocks` | não¹ | **não** | `feature/unit-tests` | 0 | 0 | 0 | 2025-11-03 | 1,9 G | `.terraform` 736M, `tmp` 728M, `.venv` 462M |
| `campfire` | repo | `ThiagoPanini/campfire` | não¹ | **não** | `mvp/lofi-style` | **18** | 0 | **3** | 2026-05-17 | 155 M | `node_modules` 100M |
| `aidriven-resources` | repo | `ThiagoPanini/…` | não¹ | **não** | `main` | 0 | 0 | 0 | 2026-04-23 | 3,1 M | — |
| `hashnode-backup` | repo | `ThiagoPanini/…` | não¹ | **não** | `main` | 0 | 0 | 0 | 2026-06-06 | 1,3 M | — |
| `ThiagoPanini` | repo | `ThiagoPanini/ThiagoPanini` | não¹ | **não** | `main` | 1 | 0 | 0 | 2025-07-19 | 4,2 M | — |
| `luc-wt` | **não-git** | — | — | **não** (repo não existe) | — | — | — | — | — | 4,0 K | diretório **vazio** |
| `traveltogether` | **não-git quebrado** | — | — | **não** (nome redireciona p/ `travelmanager`) | — | — | — | — | — | 24 K | `.git` só com 3 hooks |
| `.git` (raiz) | **dir vazio** | — | — | — | — | — | — | — | — | 4,0 K | criado 2026-07-20 20:39 |
| `.agents` (raiz) | **dir vazio** | — | — | — | — | — | — | — | — | 4,0 K | criado 2026-07-20 20:47 |

¹ Não é stale: o repo de fato só existe sob a conta pessoal `ThiagoPanini/*`. Stale = aponta para `ThiagoPanini/*` **e** o repo foi transferido para `panlabs-tech/*`, funcionando só por redirect do GitHub.

### 2.2 A razão que decide o tamanho

| Medida | Blocos (`du -s`) | Aparente (`du -sb`) |
|---|---|---|
| Total `~/workspaces` | **15,68 GiB** | 15,98 GB |
| Reproduzível (`node_modules`, `.venv`, `.terraform`, `.next`, `.mypy_cache`, `.pytest_cache`, `.ruff_cache`) | **14,88 GiB** | 15,27 GB |
| **Razão** | **94,9%** | 95,5% |
| **Resto (fonte + `.git` + docs)** | **0,80 GiB** | 0,71 GB |

Os dois métodos concordam. Os 10 maiores blocos reproduzíveis:

| GB | Caminho |
|---|---|
| 2,09 | `engineering-golden-case/infra/aws/get-b3-active-tickers/.terraform` |
| 1,45 | `tfbox/aws/sns-topic/tmp/.terraform` |
| 1,05 | `callisto/.venv` |
| 0,85 | `panlabs/node_modules` |
| 0,84 | `tfbox/aws/glue-job/tmp/.terraform` |
| 0,77 | `tfbox/aws/lambda-function/tmp/.terraform` |
| 0,77 | `b3stocks/infra/.terraform` |
| 0,76 | `b3stocks/tmp/infra/get-b3-stock-tickers/.terraform` |
| 0,74 | `tfbox/aws/iam-role/tmp/.terraform` |
| 0,74 | `tfbox/aws/lambda-layer/tmp/.terraform` |

Dois padrões saltam: **os seis `.terraform` do `tfbox` vivem sob `tmp/`** — e o `.gitignore` do repo já tem `**tmp/`, ou seja, é lixo de `terraform init` que o próprio repo declara descartável; e **`node_modules` do `travelmanager` está replicado 7 vezes** (repo pai 505M + 5 worktrees × 469M + 507M em `/tmp/travelmanager-236`), ~3,3 G para um único projeto.

### 2.3 Anomalias estruturais

| # | Anomalia | Fato medido |
|---|---|---|
| A1 | **10 diretórios com remote stale** | `ethitorial`, `life-under-control`, `-mirante`, `tfbox`, `travelmanager`, `wt-212`…`wt-216`. Apontam para `ThiagoPanini/*`; a API retorna `full_name: panlabs-tech/*`. Funcionam só por redirect. |
| A2 | **Repo vivo da org sem clone local** | `panlabs-tech/skills` (push em 2026-07-19) não existe em `~/workspaces`. É o único dos 6 ausente. |
| A3 | **9 diretórios não correspondem a repo vivo da org** | `ThiagoPanini`, `aidriven-resources`, `b3stocks`, `callisto`, `campfire`, `engineering-golden-case`, `hashnode-backup`, `luc-wt`, `traveltogether`. Ocupam **~5,7 G**. |
| A4 | **Worktree registrada em `/tmp`** | `travelmanager` registra `/tmp/travelmanager-236` (branch `worktree/236-route-map`, 507 M), presente em disco. `git worktree prune --dry-run` não reporta nada a podar. |
| A5 | **`~/workspaces/.git` é um diretório vazio** | Criado 2026-07-20 20:39. Faz ferramenta classificar a raiz como repositório (esta sessão abriu reportando "branch HEAD"), enquanto `git rev-parse` recusa com *not a git repository*. **Enganou um agente nesta própria sessão.** `.agents` (20:47) idem, vazio. |
| A6 | **`traveltogether` tem `.git` inválido** | Só `hooks/{prepare-commit-msg,pre-commit,commit-msg}`; sem `HEAD`, sem `objects`. Resíduo do nome anterior de `travelmanager`. |
| A7 | **`luc-wt` é diretório vazio** | mtime 2026-07-07. Não existe repo `luc-wt` em lugar nenhum (404). |
| A8 | **18 branches locais nunca pushadas** | `b3stocks` 3, `engineering-golden-case` 2 (uma é a atual, com 36 sujos), `ethitorial` 1, `tfbox` 2 (uma é a atual, com 12 sujos), `life-under-control` 10. Duas com nome corrompido: `feature/including-description-on-lambda-function]` (termina em `]`) e `feat/anayzing-slow-post-opening` (typo). |
| A9 | **Refs remotos defasados** | `tfbox` último fetch 2026-04-23 vs. push remoto 2026-07-18 (~3 meses). `campfire` ~2 meses. `hashnode-backup` **nunca fez fetch** (sem `FETCH_HEAD`). Qualquer leitura de ahead/behind nesses repos é não confiável sem `fetch`. |
| A10 | **Edição em massa por ferramenta, não commitada** | `.gitignore` com mtime idêntico ao segundo (2026-06-22 12:34) em `b3stocks`, `callisto`, `engineering-golden-case`; `CLAUDE.md` idem (2026-06-25 09:35) em `aidriven-resources`, `campfire`, `tfbox`; `docs/agents/issue-tracker.md` idem (2026-07-20 20:16) em `travelmanager`, `wt-21x`, `life-under-control` — estes últimos **com conteúdo idêntico**, então invisíveis ao `git status`. |

---

## 3. Trabalho em risco — o ponto sensível

O ticket manda apurar e apresentar, não decidir. Segue o que existe, arquivo a arquivo onde importa.

### 3.1 `life-under-control` — risco **zero**, e por quê

| Teste | Resultado |
|---|---|
| `main` vs `origin/main` | **0** commits à frente; working tree limpa |
| 10 worktrees em `.claude/worktrees/` + `-mirante` | **todas limpas**, verificadas uma a uma |
| `git log --branches --not --remotes` | **30 commits em 22 branches** ← o alarme |
| `git cherry origin/main <branch>` | só **13 patches** marcados `+` (ausentes por patch-id) |
| diff dos arquivos tocados, branch vs `origin/main`, nas 7 branches restantes | **IDÊNTICO nas 7** |
| Último `fetch` | 2026-07-19 14:32 — refs frescos, teste confiável |

**Conclusão factual: nada a preservar.** As 22 branches com upstream `[gone]` e os 30 commits são sobras de PRs merjados por squash: o commit local morre com SHA próprio, o conteúdo já está em `origin/main`. Confirmado também por arquivo — `origin/main` tem **200** arquivos sob `apps/api/`, contra **137** na branch `worktree/192-postgres-core`; a `main` está à frente, não atrás.

> **Achado metodológico para [#52](https://github.com/panlabs-tech/panlabs/issues/52):** `git log --branches --not --remotes` é um **gerador de falso alarme** sob squash-merge — aqui ele acusou 30 commits de risco onde havia zero. O critério de descarte não pode usar "commits não pushados" como sinal bruto; precisa comparar **conteúdo** (`git cherry`, ou diff contra o remote nos arquivos tocados). Sem isso, o critério trava a faxina em cima de trabalho que já está salvo.

### 3.2 Os quatro repos com working tree suja

Confirmados nos números exatos do charting. `life-under-control` era o quinto e saiu.

| Repo | Entradas sujas | Modif. | Deletados | Untracked fonte | Untracked artefato | `diff --stat` | mtime mais recente | Veredito |
|---|---|---|---|---|---|---|---|---|
| `callisto` | 53 | 8 | 31 | **25** | 1 | +17 / −1535 | **2025-06-10** (13 meses) | **MISTO**, quase todo vivo |
| `engineering-golden-case` | 36 | 5 | 30 | **26** | 0 | +27 / −719 | **2025-06-20** (13 meses) | **MISTO**, quase todo vivo |
| `campfire` | 18 | 11 | 3 | **3** | 1 | +85 / −298 | **2026-05-18** (2 meses) | **MISTO**, quase todo vivo |
| `tfbox` | 12 | 1 | 9 | 0 | 21 | +5 / −2020 | 2026-04-23 | **DESCARTÁVEL** |

**Total: 119 entradas sujas, 0 staged em qualquer repo, 479 KB em disco.** O esforço humano em jogo é pequeno em bytes e grande em contexto.

#### `callisto` — refactor arquitetural em voo (indivisível)
25 arquivos `.py` untracked (730 linhas de fonte autoral) + 31 deleções rastreadas são **as duas metades do mesmo movimento**: a camada `ai/agents/*` + `infra/agentic/*` está sendo trocada por um modelo declarativo (entidades `ai_agent_specification`/`model`/`tool`, value objects enum, fábrica plugável em `ai/frameworks/pydantic_ai/`), e os 4 `process_user_prompt_usecase_v1..v4.py` colapsam num único. O `presentation.py` **já foi religado ao novo caminho** — a árvore em disco só compila com os untracked presentes. Refactor inacabado (há `# Change the factory to an interface with run` e `ai/core/agents/career/` só com `__init__.py` vazio).
Descartável: só `.vscode/settings.json` (conteúdo literal `{}`).

#### `engineering-golden-case` — reescrita clean-architecture com renomeação de raiz
26 arquivos untracked (479 linhas) em `app/src/features/` + 30 deleções: `app/src/cross/` e `app/src/get_b3_active_tickers/` viram um namespace único `features/`. Não é mover: surge contrato `IHTTPClientAdapter` com entidades próprias e política de retry explícita, parser separado do transporte, usecase virou `@dataclass(frozen=True)`. Motiva a única mudança de dependência (`pynamodb` em `pyproject.toml` + `poetry.lock`).
**Fato que o humano precisa ver:** a árvore deletada continha suíte de testes (~250 linhas: `conftest.py`, 3 `test_*.py`, 4 mocks) e **a árvore untracked não tem nenhum arquivo de teste**. A branch `feature/refactoring-code` **não tem upstream** — tudo aqui é local.
Reproduzível: `poetry.lock` (173 KB, 80% do peso do conjunto sujo).

#### `campfire` — o único trabalho recente, e o único com stashes
647 linhas de doc autoral untracked: `PRODUCT.md` (renomeação **com reescrita** de `PRODUCT_VISION.md` — 79→124 linhas, 98 divergentes), `docs/decisions/0007-deploy-provider.md` (escolhe Hostinger VPS KVM 2) e `docs/deploy/hostinger-vps.md` (runbook de 465 linhas, 19 passos). As 9 alterações de doc rastreadas são o conserto dos links cruzados da renomeação. À parte, `Home.tsx`/`Home.css` levam um passo de acessibilidade (`skip-link`, `tabIndex={-1}` no `<main>`) e o `poster-caption` que responde à crítica gerada — a crítica e a edição são o mesmo ciclo.
Descartável: `.impeccable/critique/2026-05-17T…md` (gerado; conteúdo já consumido pelas edições).

**3 stashes**, todos em `campfire`, medidos:

| Stash | Escopo | Nota |
|---|---|---|
| `stash@{0}` on `visual-reset-poster-da-fogueira` | 2 arq., +35/−30 | `pre-poster-recovery-font-patch` |
| `stash@{1}` on `feature/codex-option-a-implementation` | 3 arq., +13/−780 | WIP; é sobretudo remoção de `App.tsx` |
| `stash@{2}` on `tmp/campfire-design-refresh` | 27 arq., +556/−1189 | auto-rotulado *"previous design-refresh attempt (pre tmp/jam-stage-redesign)"* — **o próprio autor marcou como superado** |

**2 stashes** em `travelmanager` (visíveis também das 5 worktrees, mesmo git dir): `wave0-leftover: CLAUDE.md docs + settings pref` (2 arq., +18/−16) e `ops changes` (5 arq., +47/−21, toca `Dockerfile` e doc de Coolify).

#### `tfbox` — nada autoral em risco
Os 21 untracked são a skill `ai-dev-setup` **vendorada**, instalada em lote (todos com mtime idêntico ao milissegundo, 2026-04-23 12:55:15). `diff -rq` contra a origem local em `aidriven-resources/skills/ai-dev-setup/` acusa **uma única divergência** (o upstream está um passo à frente), e o `skills-lock.json` modificado registra a origem com hash. As 9 deleções tiram `svg-logo-designer` (duplicada em `.agents/` e `.claude/`) e a config do Serena. Detalhe de padrão: a skill nova entrou como **symlink** `.claude/skills/ai-dev-setup → ../../.agents/skills/ai-dev-setup`, enquanto a antiga era cópia dupla real — insumo direto para [#58](https://github.com/panlabs-tech/panlabs/issues/58).

---

## 4. `~/` — runtimes, caches e resíduo

### 4.1 O que sustenta o PATH hoje

| Comando | Resolve para | Versão |
|---|---|---|
| `node` / `npm` / `pnpm` | `~/.local/bin/*` → **`~/.local/share/nodeenvs/campfire-context/`** | 24.15.0 / 11.12.1 / 11.1.0 |
| `python3` | `/usr/bin/python3` (sistema) | 3.12.3 |
| `uv` | `~/.local/bin/uv` (binário próprio, 60 MB) | 0.11.7 |
| `python` | **não existe** | — |

**O stack Node inteiro da máquina pende de um diretório nomeado por um projeto** — `nodeenvs/campfire-context` (963 MB). Não é `nvm`, não é `mise`. Insumo cru para [#53](https://github.com/panlabs-tech/panlabs/issues/53).

### 4.2 Órfãos confirmados por evidência

| Item | Tamanho | Evidência de orfandade |
|---|---|---|
| `.pyenv` | **1,6 GiB** | Fora do PATH **e ativamente removido** dele por `~/.config/zsh/thiago-wsl.zsh:46-50` (`# Remove pyenv paths explicitly`). 4 CPythons instalados (3.10.16 … 3.13.1). Substituído por `uv`. |
| `.cache/pypoetry` | **1008 MB** | Poetry ausente do PATH; cache parado desde 2025-06-20 (13 meses). |
| `.vscode-remote-containers/bin` | **638 MiB** | 8 builds de servidor dev-container, **7 de 2023**, o mais novo de 2025-01. (`dist/`, 884 KB, é atual e ativo.) |
| `.mintlify` | **293 MiB** | Parado desde 2026-05-01; casa com `~/.config/mintlify` órfão. |
| `~/aws` | **226 MiB** | Instalador extraído do AWS CLI v2 (7.516 arquivos), fev/2025. O CLI está em `/usr/local/bin/aws`. Zero credenciais dentro. |
| `~/downloads` | **226 MiB** | 7 arquivos, todos instaladores já consumidos. `codebase-memory-mcp` (169 MB) é build **superado** pelo de `~/.local/bin` (168 MB, 22/abr). |
| `.nvm` | 1,9 MiB | `nvm ls` reporta **só `system`**; `~/.nvm/versions/node` **não existe**. Zero runtimes — mas é `source`d em toda sessão de shell. |
| Stack Powerlevel10k | ~2,4 MB | `.p10k.zsh` + 2 backups (92 KB cada), `.cache/gitstatus` com mtime **2022-02-14**, `.cache/p10k-paninit/` **vazio** — enquanto o `.zshrc` roda `starship`. O bloco de instant-prompt do p10k continua no topo do `.zshrc`, sem efeito. |
| `.crewai` | 330 KiB | Parado desde 2025-04-23 (15 meses). |
| `.dotnet` | 241 KiB | Só cache de CRL; nenhum SDK. O `dotnet` disponível vem do Windows. |
| `.ipython` | 1,5 MiB | Última atividade 2025-09-20. |
| `.gnupg` | 28 KiB | Congelado em 2025-01-14, **sem material de chave privada** (`private-keys-v1.d/` vazio). |
| **18 arquivos de backup órfãos** | ~600 KB | 4 de `.zshrc`, 3 de `.p10k.zsh`, 3 de `starship.toml`, `.zsh_history_bad` (140 KB), `.shell.pre-oh-my-zsh`, `.zcompdump` velho, `known_hosts.old`, `pubring.kbx~`. Quase todos de **duas** sessões de refatoração: 2026-04-22 e 2026-06-05. |
| **Diretórios vazios** | — | `solidlsp_tmp`, `.biome`, `.cache/{biome,claude,p10k-paninit,vscode-sqltools}`, `.local/share/fonts` (o script `powerlevel10k-fonts.sh` nunca teve efeito). |

**Soma dos órfãos confirmados: ~3,9 GiB.**

### 4.3 `.cache` — o maior consumidor do home (8,6 GiB)

84% são quatro caches de download:

| Subdir | Tamanho | Última atividade | Rótulo |
|---|---|---|---|
| `ms-playwright` | **2,4 GB** | 2026-06-26 | INDETERMINADO — o [#62](https://github.com/panlabs-tech/panlabs/issues/62) já mediu que **1,7 dos 2,4 GB são chromium obsoleto** |
| `uv` | **2,2 GB** | 2026-07-19 | EM USO |
| `puppeteer` | **1,4 GB** | 2026-06-06 | INDETERMINADO (6 semanas) |
| `pip` | **1,2 GB** | 2026-07-06 | EM USO |
| `pypoetry` | 1008 MB | 2025-06-20 | **ÓRFÃO** |
| `pyright-python` | 408 MB | 2026-04-22 | INDETERMINADO |
| `copilot` | 176 MB | 2026-06-05 | INDETERMINADO (`.copilot` ativo hoje, cache parado em junho) |
| `gitstatus` | 2,1 MB | **2022-02-14** | **ÓRFÃO** (dependência do p10k aposentado) |

Outros pesos do home: `.local` 3,9 GiB (`pnpm/store` 1,7 G + `nodeenvs` 963 M + `share/claude` 761 M + `bin` 404 M), `.npm` 3,1 GiB (ativo), `.vscode-server` 2,4 GiB (**limpo** — só 1 build em `bin/`, ao contrário do `.vscode-remote-containers`), `.codex` 1,8 GiB (ativo), `.claude` 664 MiB.

### 4.4 CLIs no PATH

**Presentes:** `rg` 14.1.0, `fdfind` 9.0.0, `batcat` 0.24.0, `eza`/`exa`, `zoxide` 0.9.3, `fzf` 0.44.1, `jq` 1.8.2, `gh` 2.91.0, `starship` 1.25.0, `uv` 0.11.7, `docker` 29.1.3.

**Ausentes:** `yq`, `delta`, `lazygit`, `mise`, `asdf`, `direnv`, `atuin`, `just`, `ruff`, `lefthook`.

**Defeito em uso, não ausência** — o achado mais acionável desta seção:

- **`fd` está instalado e inalcançável pelo nome canônico.** O binário é `fdfind` 9.0.0, e **não há alias**. Em vez disso, o plugin `common-aliases` do oh-my-zsh define `fd` como `find . -type d -name`. Digitar `fd` roda `find`; chamar `fd` de um script dá *command not found*.
- **`bat` só funciona interativamente.** `~/.config/zsh/thiago-wsl.zsh` define `alias bat='batcat'` — e alias não vale em subprocesso, `xargs`, hook ou agente.

Ambos afetam exatamente o consumidor que este mapa mais serve: o agente, que roda em subprocesso não-interativo.

---

## 5. Segredos e credenciais

> Nenhum valor de credencial foi lido, transcrito ou parafraseado. Só metadados, nomes de chave e forma.

| Item | Fato |
|---|---|
| `~/secrets` | **Vazio** (0 entradas, incl. ocultas), modo `700`. mtime 2026-05-31 indica que já teve conteúdo. Confirma o que o [#61](https://github.com/panlabs-tech/panlabs/issues/61) registrou. |
| `~/.aws` | **Symlink → `/mnt/c/Users/panin/.aws`**. `credentials` 116 B, `config` 43 B, ambos com mtime **2025-09-17** (~10 meses sem alteração). 116 B comporta **um** profile com o par padrão, não dois. Modo `777` é artefato do DrvFs — a proteção real é a ACL do NTFS. |
| `~/.azure` | **Segundo symlink para o host Windows**, mesmo padrão. As duas credenciais que o #61 identificou como o raio real. |
| `~/aws` | **Não é credencial** — instalador (§4.2). Varredura por `credential*`/`*.pem`/`*.key` até profundidade 3: **zero achados**. |
| Chaves SSH privadas | **1**: `~/.ssh/panini_vps_ed25519`, modo `600`, **464 B** — tamanho exato de uma Ed25519 **sem passphrase**. |
| Chaves GPG privadas | **0** (`private-keys-v1.d/` vazio). |
| Credencial de registry Docker em texto claro | **0** — `~/.docker/config.json` (46 B) tem só `credsStore`, sem bloco `auths`. |
| Prováveis segredos vivos | 2: `~/.claude/.credentials.json` (2.519 B, modo `600`, mtime **de hoje**) e `~/.codex/.credentials.json` (1.773 B, `600`). Ambos com permissão correta. |
| Histórico de shell | `.zsh_history` 108 KB e `.zsh_history_bad` **136 KB** — o órfão é **maior** que o ativo. Vetor clássico de vazamento; ambos `600`. |
| Artefato curioso | `~/downloads/*:mshield` (ADS do Defender vazado pelo DrvFs) contém uma URL pré-assinada do GitHub com SAS/JWT embutidos, **expirada em 2026-04-22** — morta. |

**Cross-check não planejado, e o mais valioso desta seção:** a varredura foi **bloqueada pela deny list** ao tentar ler `~/.aws/*`, `~/.ssh/*` e `~/.claude/.credentials.json` — inclusive tentativas que extraíam só nomes de seção. É a mitigação decidida em [#61](https://github.com/panlabs-tech/panlabs/issues/61) funcionando **contra um subagente real com postura agressiva**, não contra um teste sintético. O backup `~/.claude/settings.json.pre-deny-20260720` (hoje, 20:57) datar a aplicação.

---

## 6. O que este inventário entrega a cada ticket

| Ticket | O que consome daqui |
|---|---|
| [#52 Layout alvo e critério de descarte](https://github.com/panlabs-tech/panlabs/issues/52) | A tabela §2.1 já traz as 4 entradas do critério por diretório. Mais: **o critério não pode usar "commits não pushados" como sinal bruto** (§3.1); os casos especiais estão medidos — `luc-wt` vazio, `traveltogether` com `.git` inválido, clone duplicado `life-under-control`/`-mirante` (855 M só de `node_modules`), 5 worktrees `wt-21x` na raiz (~2,3 G replicados) e uma **em `/tmp`**; 9 dirs sem repo vivo somam ~5,7 G; `panlabs-tech/skills` não tem clone. E o enquadramento que muda a conversa: **94,9% do peso é reproduzível**, então o layout decide sobre 0,80 GiB de conteúdo real. |
| [#53 Toolchain](https://github.com/panlabs-tech/panlabs/issues/53) | §4 inteira: ~3,9 GiB de órfãos com evidência item a item; o stack Node pendurado em `nodeenvs/campfire-context`; `.pyenv` removido do PATH por script; p10k aposentado mas presente; 18 backups fósseis; lista de CLIs presentes/ausentes; e o **defeito `fd`/`bat` em subprocesso**, que é bug de hoje, não desejo de amanhã. |
| [#54 Fronteira global vs. repo](https://github.com/panlabs-tech/panlabs/issues/54) | O padrão de instalação de skill medido no `tfbox`: cópia dupla real (`svg-logo-designer`) → **symlink** `.claude/skills/* → .agents/skills/*` (`ai-dev-setup`), com `skills-lock.json` registrando origem e hash. Também A10: ferramenta reescrevendo `CLAUDE.md`/`.gitignore`/`issue-tracker.md` em lote por vários repos, às vezes com conteúdo idêntico. |
| [#58 Distribuição de skills](https://github.com/panlabs-tech/panlabs/issues/58) | Idem, mais a divergência medida: a cópia vendorada no `tfbox` está **um passo atrás** da origem em `aidriven-resources` (falta `claude-settings.json.tmpl`). |
| Fog *"referências stale"* | A1 fecha o lado `git remote`: **10 diretórios**. Falta a varredura de dado e doc que [#48](https://github.com/panlabs-tech/panlabs/issues/48) pediu (`src/data/solutions.ts`, `src/lib/github.ts:140`). |

---

## 7. Anexo: correções ao snapshot do charting

| Registro do mapa | Medido em 2026-07-20 |
|---|---|
| "`life-under-control` 83 arquivos sujos na main" | **0 sujos**, `main` em sync, 10 worktrees limpas. Trabalho commitado **e** merjado. |
| "trabalho não commitado de 5 repos" | **4 repos**: `callisto` 53, `engineering-golden-case` 36, `campfire` 18, `tfbox` 12 — todos batendo exatamente. |
| "Todos os 20 dirs de `~/workspaces` apontam pra remotes `ThiagoPanini/*`" | Correto quanto ao remote, mas **só 10 são stale** (repo transferido); os outros de fato só existem sob a conta pessoal. E são **22** entradas, não 20 — há dois diretórios ocultos vazios na raiz. |
| "`luc-wt` e `traveltogether` não são git" | Confirmado, com detalhe: `luc-wt` é **vazio**; `traveltogether` tem `.git` com só 3 hooks. |
| "`wt-212`…`wt-216` são worktrees limpas de `travelmanager`" | Confirmado — e há uma **sexta**, em `/tmp/travelmanager-236`. |
| `~/secrets` vazio (via #61) | Confirmado. |
| `.pyenv` ~1,7 GB órfão (via #51) | Confirmado: 1,6 GiB, 4 versões, removido do PATH por script. |
