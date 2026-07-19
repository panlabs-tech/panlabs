# Ferramental de desenvolvimento com AI em WSL2

- **Origem:** [issue #51](https://github.com/panlabs-tech/panlabs/issues/51) — `wayfinder:research`
- **Data:** 2026-07-19
- **Branch:** `research/wsl-ai-tooling` (descartável; sem PR)
- **Método:** fontes primárias (docs oficiais, README/código dos próprios projetos) + **medição direta na máquina alvo**. Nenhuma instalação, remoção ou alteração foi feita fora desta worktree.

> **Regra que governa o documento:** toda recomendação declara (1) o que resolve, (2) o que custa instalar **e manter**, (3) por que vale mais do que o que já existe. Onde a resposta honesta é "o que você já tem está bom", está escrito assim.

---

## 0. Inventário medido da máquina

Tudo abaixo foi lido da máquina real em 2026-07-19, não presumido.

| Item | Valor medido |
|---|---|
| WSL | `2.6.3.0`, kernel `6.6.87.2-1`, Windows `10.0.26200.8875` |
| Distro | Ubuntu **24.04.4 LTS**, mas o pacote é `CanonicalGroupLimited.Ubuntu20.04onWindows` (upgrade in-place de 20.04) |
| CPU / RAM / swap | 20 vCPU, **7.6 GiB** RAM, 2.0 GiB swap |
| `/` (ext4 em vhdx) | 1007 G alocáveis, **43 G usados** |
| `.wslconfig` | **não existe** (`/mnt/c/Users/panin/.wslconfig` ausente) → tudo em default |
| `/etc/wsl.conf` | `[boot] systemd=false` |
| `ext4.vhdx` real em disco | **55.3 GB** (vs. 43 G usados dentro) → ~12 GB de folga não devolvida |
| `docker_data.vhdx` | **43.0 GB** |
| `/mnt/c` | 458 G total, **8.1 G livres (99 % cheio)** |
| Startup do zsh interativo | **0.72 – 1.04 s** (7 amostras) |
| Entradas `/mnt/*` no `PATH` | **35** |
| `fpath` | 45 diretórios, 1313 arquivos |
| Claude Code | `2.1.215` |
| `bwrap` / `socat` | **nenhum dos dois instalado** |

Ferramentas presentes: `rg 14.1.0`, `fdfind 9.0.0`, `batcat 0.24.0`, `eza 0.18.2`, `zoxide 0.9.3`, `fzf 0.44.1`, `gh 2.91.0`, `uv 0.11.7`, `starship 1.25.0`, `terraform 1.10.5`, `git 2.50.1`, `keychain`, `docker`.
Ausentes: `jq`, `yq`, `delta`, `lazygit`, `direnv`, `difft`, `hyperfine`, `chezmoi`/`stow`/`yadm`, `mise`/`asdf`/`proto`, `bwrap`, `socat`.

### Três descobertas que mudam as perguntas do ticket

**1. `nvm` e `pyenv` não estão "lado a lado" — os dois estão mortos.**

- `nvm ls` retorna **apenas `system`** (`-> v24.15.0`). Zero versões instaladas por ele. O `node` real é `~/.local/bin/node` → symlink para `~/.local/share/nodeenvs/campfire-context/bin/node`.
- `pyenv` **não está no `PATH`**: `~/.config/zsh/thiago-wsl.zsh` remove explicitamente `~/.pyenv/shims` e `~/.pyenv/bin` (`# Remove pyenv paths explicitly`). O `python3` ativo é `/usr/bin/python3`.
- Mesmo assim, `~/.pyenv/versions` guarda **1.7 GB** de CPython compilado (3.10.16, 3.11.11, 3.12.8, 3.13.1) e o `nvm.sh` é sourceado a cada shell.

A pergunta "manter separados vs. consolidar" está mal posta: hoje não há gerenciamento de runtime nenhum. Ver §1.

**2. O gargalo do shell não é o oh-my-zsh nem o starship — é o `compinit`.** Ver §4, com `zprof`.

**3. O `C:` está com 8.1 GB livres e o `ext4.vhdx` tem ~12 GB de folga irrecuperável sem `sparseVhd`.** Ver §5. Isso é o risco operacional mais concreto do ambiente inteiro.

---

## 1. Gerenciamento de versões de runtime

### 1.1 O estado real, medido

| Runtime | Quem gerencia hoje | Evidência |
|---|---|---|
| Node | **ninguém** | `node` → `~/.local/bin/node` → `~/.local/share/nodeenvs/campfire-context/bin/node` (v24.15.0). `nvm ls` só lista `system`. |
| Python | `uv` (parcial) + `/usr/bin/python3` | `pyenv` removido do `PATH` de propósito em `thiago-wsl.zsh`; `~/.pyenv/versions` com 1.7 GB órfãos |
| Terraform | `apt` | `/usr/bin/terraform` v1.10.5, versão única |

### 1.2 A evidência que decide a seção: 13 repositórios pinam Node e nenhum é respeitado

```
repos pinados em .node-version = 22 : panlabs, life-under-control, life-under-control-mirante,
                                      .wayfinder-research/{skill-distribution,orgs-referencia,wsl-ai-tooling}
repos pinados em .node-version = 24 : travelmanager (+ wt-212..216), ethitorial
node ativo em todos                 : v24.15.0
```

`.python-version`: `callisto` → `3.10`, `engineering-golden-case` → `3.13.1`. O `python3` ativo é o do sistema.

**Ou seja: o `panlabs` — este repositório — declara Node 22 e está sendo construído com Node 24.** Não é hipótese, é o estado atual. `package.json` reforça (`engines.node: ">=22"` vs `">=24"` conforme o projeto).

Detalhe que elimina metade das opções: o formato em uso é **`.node-version`**, não `.nvmrc`. O `nvm` lê `.nvmrc` e o [README oficial](https://github.com/nvm-sh/nvm#readme) é explícito que o auto-switch por diretório **não é built-in** — as receitas de `cdnvm`/`chpwd` na documentação vêm com o aviso de que "não são suportadas pelos mantenedores do `nvm`". Consertar isso com nvm significa manter código de shell não suportado que roda `nvm ls` a cada `cd`.

O `mise` lê `.node-version` nativamente — o registry declara `detect = ["package.json", ".nvmrc", ".node-version"]` ([registry/node.toml](https://raw.githubusercontent.com/jdx/mise/main/registry/node.toml)) — **mas está desligado por padrão**. A [FAQ oficial](https://mise.jdx.dev/faq.html) diz que arquivos idiomáticos "são desabilitados por padrão" e precisam de `mise settings add idiomatic_version_file_enable_tools node`.

### 1.3 Comparativo, com as contrapartidas que cada projeto documenta de si mesmo

| | `mise` | `asdf` | `proto` | manter `nvm`+`pyenv` |
|---|---|---|---|---|
| Ativação padrão | **PATH** (`mise activate`); shims opcionais | **shim-only** | shims + `bin/` no PATH | função de shell / shims |
| Lê `.node-version` | sim (opt-in) | via `legacy_version_file` | — | **não** |
| Terraform | `aqua:hashicorp/terraform` → `releases.hashicorp.com` + `SHA256SUMS` | plugin da comunidade | 2 plugins concorrentes da comunidade | inexistente |
| Python | precompilado (`python-build-standalone`, o mesmo da Astral) | plugin | plugin | compila do fonte |
| Governança | **1 mantenedor** (declarado) | multi-mantenedor | 1 mantenedor | multi |
| Custo por prompt | ~4–14 ms (`mise hook-env`, Rust) | overhead de shim por chamada | shim | sourcing de `nvm.sh` |

Fontes: [mise shims](https://mise.jdx.dev/dev-tools/shims.html), [mise vs asdf](https://mise.jdx.dev/dev-tools/comparison-to-asdf.html), [registry/terraform.toml](https://raw.githubusercontent.com/jdx/mise/main/registry/terraform.toml), [aqua registry hashicorp/terraform](https://raw.githubusercontent.com/aquaproj/aqua-registry/main/pkgs/hashicorp/terraform/registry.yaml), [asdf introduction](https://asdf-vm.com/guide/introduction.html), [moonrepo/proto](https://moonrepo.dev/docs/proto).

Pontos que os próprios projetos declaram e que pesam contra:

- **mise, bus factor.** O [SECURITY.md](https://github.com/jdx/mise/blob/main/SECURITY.md) do próprio autor: *"Development of the 'core CLI' is done on jdx/mise which only a single developer (me, @jdx) has access to. […] This does create a bus factor problem."* Commits: jdx 4325, segundo humano 589.
- **mise, anti-direnv.** [Doc oficial](https://mise.jdx.dev/direnv.html): *"The official stance is you should not use direnv with mise. Issues arising from incompatibilities are not considered bugs and PRs to improve direnv compatibility will not be accepted."* Se você adotar mise, `direnv` sai da mesa (ver §3).
- **mise, trust model.** Configs com env vars, hooks ou templates exigem `mise trust`. E a doc avisa: em shells não-interativos sem TTY (extensões de IDE, scripts) **o mise não consegue pedir trust e o comando falha**. Mitigação: `trusted_config_paths` / `MISE_TRUSTED_CONFIG_PATHS`. **Isso importa muito num fluxo agêntico**, onde o Bash do agente frequentemente não tem TTY — o mesmo problema que o `keychain --noask` já resolve hoje para SSH.
- **mise, IDE.** [ide-integration](https://mise.jdx.dev/ide-integration.html): *"IDEs work better with shims than they do environment variable modifications."* A receita oficial é híbrida: `mise activate --shims` no `.zprofile` e `mise activate` no `.zshrc`.
- **asdf 0.16+** virou binário Go (rel. 2025-01-30) e **removeu `asdf global`/`local`/`shell`** em favor de `asdf set` ([guia de upgrade](https://asdf-vm.com/guide/upgrading-to-v0-16.html)). Continua shim-only, com o imposto do `asdf reshim` depois de todo `npm install -g`. O próprio [asdf-plugins](https://github.com/asdf-vm/asdf-plugins) manda **"Read each plugins code before installation and usage"**.
- **proto** tem 13 ferramentas built-in e **Terraform não é uma delas** — só via um de dois plugins concorrentes da comunidade. Descartado.

> ⚠️ **Nota de honestidade sobre o número "asdf é 120 ms mais lento".** Ele existe, mas é a [afirmação do mise sobre o asdf](https://mise.jdx.dev/dev-tools/comparison-to-asdf.html), anterior ao rewrite em Go, e o próprio jdx a relativiza: *"I don't think performance is a good enough reason to switch though now that asdf-go is a thing."* Não há número publicado pelo asdf. Da mesma forma, **o nvm nunca documentou custo de startup** — "nvm deixa o shell lento" é folclore, não fonte primária.

### 1.4 Python: `uv` já resolve; não traga o mise para isso

O [`uv`](https://docs.astral.sh/uv/concepts/python-versions/) instala e gerencia interpretadores (*"uv supports installing Python versions itself"*), honra `.python-version` procurando no diretório e nos pais, e desde a **0.8.0 (2025-07-17)** coloca executáveis versionados (`python3.13`) num diretório do `PATH`.

Limite declarado, verbatim das [release notes 0.8.0](https://github.com/astral-sh/uv/releases/tag/0.8.0): instalar os executáveis **sem versão** (`python`, `python3`) exige a flag `--default`, e *"The `--default` flag has also been in preview, but is not stabilized in this release."* Além disso: *"you cannot install packages into their environment"*.

E a Astral confirma que o mise usa exatamente os mesmos artefatos: *"`python-build-standalone` is also used in many other Python projects, like Mise"*. A [FAQ do mise](https://mise.jdx.dev/faq.html) inclusive endossa a divisão: se o `uv` gerencia `.python-version`, **não** habilite `idiomatic_version_file_enable_tools python`.

**O que se perde ao aposentar o pyenv:** `pyenv virtualenv <ver> <nome>` (ambientes nomeados) não tem equivalente no mise nem no uv — o modelo dos dois é `.venv` no projeto. Se você não usa envs nomeados (e o `PATH` já exclui o pyenv, então não usa), não perde nada.

### 1.5 Recomendação

**(A) Higiene primeiro — custo zero, ganho imediato.**

- Remover do `.zshrc` as 3 linhas de `NVM_DIR`/`nvm.sh`/`bash_completion`. O `nvm` não gerencia nenhuma versão; é código morto sourceado a cada shell.
- Apagar `~/.pyenv` (**1.7 GB**) e o bloco `# Remove pyenv paths explicitly` do `thiago-wsl.zsh`, que existe só para neutralizar algo que não está mais instalado.
- Remover o bloco de *instant prompt* do powerlevel10k no topo do `.zshrc` e os 5 arquivos `.p10k.zsh*` / `.zshrc.backup-*` / `.zshrc.broken-*`.
- **Contrapartida:** se um dia quiser pyenv de volta, recompila (lento — a Astral descreve builds com PGO/LTO como *"very slow"*). Dado que o `uv` já está instalado, é improvável.

**(B) `mise` para Node e Terraform — sim, e o motivo é concreto.**

> **Resolve:** os 13 repos com `.node-version` divergente sendo todos construídos com Node 24. E dá versionamento de Terraform que hoje não existe (apt, versão única), pelo canal oficial da HashiCorp com verificação de checksum.
> **Custo de instalar:** um binário; `mise use -g node@24`; `mise settings add idiomatic_version_file_enable_tools node`; duas linhas de rc (`mise activate --shims` no `.zprofile`, `mise activate` no `.zshrc`). `mise sync node --nvm` reaproveita instalações existentes.
> **Custo de manter (o que dói de verdade):**
> 1. **`direnv` fica fora** — a doc do mise recusa a combinação. Se você quiser `direnv` (§3), escolha um dos dois.
> 2. **`mise trust` em shell sem TTY falha.** Configurar `MISE_TRUSTED_CONFIG_PATHS` antes de soltar o agente, ou o Bash do Claude Code vai bater em `untrusted-config error`.
> 3. Pacotes npm globais instalados sob o node atual não migram. O `.default-npm-packages` **entra em warning em `2026.11.0` e sai em `2027.11.0`** — usar `postinstall` ou o backend `npm:` desde já.
> 4. Um mantenedor único, declarado pelo próprio.
> **Por que vale mais do que o que existe:** o que existe é um symlink fixo para um `nodeenv` chamado `campfire-context` — um diretório com nome de *outro projeto* — servindo Node para 13 repositórios, 6 dos quais pedem outra major. Nem o `nvm` (que lê só `.nvmrc`) nem o `apt` (Terraform) cobrem isso.

**(C) Python: ficar no `uv`.** É a resposta honesta de "o que você já tem está bom". Não habilitar Python no mise.

**(D) `tenv` só se precisar de `required_version` em HCL.** O [tenv](https://github.com/tofuutils/tenv) resolve constraints lidos dos próprios `.tf`/`terragrunt.hcl`; o mise não faz parsing de HCL. Como não há nenhum `.terraform-version` nos repos hoje, **não recomendo** — é uma ferramenta a mais para um problema que você ainda não tem.

---

## 2. CLI moderno no fluxo agêntico

Aqui a maior parte do trabalho **já está feita**: `rg`, `fdfind`, `batcat`, `eza`, `zoxide`, `fzf` e `gh` estão instalados e integrados no `thiago-wsl.zsh`. A seção existe para (1) corrigir dois bugs reais, (2) apontar as 3 lacunas que valem e (3) dizer o que **não** instalar.

### 2.1 🐛 Dois bugs concretos no que já existe

**Bug 1 — o alias `fd` do oh-my-zsh está encobrindo o `fd` de verdade.**

```
$ command -v fd
alias fd='find . -type d -name'
```

Esse alias vem do plugin `common-aliases` do oh-my-zsh. O binário real está instalado como `fdfind` (o [README do fd](https://github.com/sharkdp/fd) documenta: *"the binary is called `fdfind` as the binary name `fd` is already used by another package"*), mas **não há alias `fd=fdfind`**. Resultado: `fd` faz um `find` lento de diretórios, o `fdfind` (23× mais rápido que `find -iregex` pelo benchmark do próprio projeto) fica sem atalho, e você provavelmente nem percebeu. Correção: `alias fd='fdfind'` no `thiago-wsl.zsh`, depois do `source oh-my-zsh.sh` (já é o caso).

**Bug 2 — `exa` e `eza` instalados ao mesmo tempo.** O `exa` do noble é pacote de transição (`exa --version` já responde "eza"), mas o [ogham/exa](https://github.com/ogham/exa) declara: *"exa is unmaintained, use the fork eza instead. (This repository isn't archived because the only person with the rights to do so is unreachable)"*. Remover o pacote `exa` é limpeza gratuita.

### 2.2 O que falta e vale — em ordem de retorno

| # | Ferramenta | Resolve | Custo instalar | Custo manter | Vale? |
|---|---|---|---|---|---|
| 1 | **`jq`** | JSON no shell. `gh api`, `terraform show -json`, `claude -p --output-format json` — todos cospem JSON | `apt install jq` | ~zero: sem config, sem linha de rc | **sim, quase não-opcional** |
| 2 | **`lazygit`** | staging por hunk, rebase interativo, resolução de conflito — exatamente o que sobra para o humano quando o agente escreve o código | **binário manual**: [não está no noble](https://github.com/jesseduffield/lazygit) (só a partir do Ubuntu 25.10) | `~/.config/lazygit/config.yml`; update manual | **sim, se você revisa muito diff** |
| 3 | **`hyperfine`** | benchmark estatístico. Você acabou de precisar dele para medir tudo neste documento | `apt install hyperfine` | zero | **sim, barato** |
| 4 | `yq` | YAML no shell | ⚠️ ver abaixo | ver abaixo | **cuidado** |

**⚠️ `yq` é uma armadilha de nome.** `apt install yq` no Ubuntu **não** instala o `yq` que todo mundo documenta. O [pacote noble `yq`](https://packages.ubuntu.com/noble/yq) é a versão **3.1.0** do [kislyuk/yq](https://github.com/kislyuk/yq) — um wrapper Python que converte YAML para JSON e chama `jq`. O `yq` em Go que a internet inteira usa é [mikefarah/yq](https://github.com/mikefarah/yq), hoje na v4, empacotado como `yq-go` e **ausente de toda LTS atual do Ubuntu**. Um script escrito contra a sintaxe do mikefarah v4 falha silenciosamente sob o kislyuk 3.x. Se precisar dele: `snap install yq` (esse é o do mikefarah) ou binário do release. Se não precisar: `jq` + `yq`-do-kislyuk cobre o caso simples.

### 2.3 O que NÃO instalar (e por quê)

- **`delta`.** [Sem nenhuma alegação de performance no README](https://github.com/dandavison/delta). Reescreve o git globalmente via `[core] pager` e `[interactive] diffFilter`, e a config recomendada inclui `[merge] conflictStyle = zdiff3` — que **muda como os marcadores de conflito são escritos nos seus arquivos**, uma mudança semântica, não de exibição. Maior raio de dano por unidade de benefício da lista. E num fluxo agêntico o diff é lido pelo agente, não por você.
- **`direnv`.** Custo de manutenção mais alto do conjunto: hook no rc, um `.envrc` por projeto, `direnv allow` a cada edição, **e um subprocesso a cada prompt**. Dado o §4 (o prompt já custa caro) e o §1 (o mise recusa oficialmente conviver com direnv), é a ferramenta errada aqui. O `[env]` do `mise.toml` cobre o mesmo caso sem hook extra.
- **`difftastic`.** [Não é empacotado em Debian nem Ubuntu](https://github.com/Wilfred/difftastic), e o próprio README avisa: *"Difftastic scales relatively poorly on files with a large number of changes, and can use a lot of memory"* e *"Difftastic regularly has releases that fix crashes."*
- **`sd`, `tokei`, `bat` extra.** `sd` é ótimo (benchmark próprio: 2,4–12× sobre `sed`) mas você não faz sed em massa. `tokei` não está no noble. `bat` já está instalado e é **cosmético** — o README não faz nenhuma alegação de performance.

### 2.4 O ponto agêntico: `rg` é a única com justificativa oficial

O [setup do Claude Code](https://code.claude.com/docs/en/setup) declara:

> "**ripgrep**: usually included with Claude Code. If search fails, see search troubleshooting."

E o [tools-reference](https://code.claude.com/docs/en/tools-reference): *"Grep is built on ripgrep and uses ripgrep's regex syntax, not POSIX grep."* O troubleshooting documenta `USE_BUILTIN_RIPGREP=0` para forçar o `rg` do sistema quando o bundled não roda (musl/Alpine), verificável com `claude doctor`.

**Consequência honesta:** ter `rg` instalado no sistema é a única escolha desta seção com um motivo documentado ligado ao agente — e **já está feita**. `fd` não é mencionado em lugar nenhum da documentação do Claude Code. Todo o resto desta seção é para o humano no teclado, não para o agente. Vale dizer isso em voz alta porque a narrativa comum ("instale essas 12 ferramentas e seu agente fica melhor") não se sustenta contra as fontes.

> ⚠️ Inconsistência sinalizada: a página de env vars do Claude Code descreve o default como *preferir* o `rg` do `PATH`, enquanto setup/troubleshooting descrevem o bundled como default. Uma das duas está desatualizada.

### 2.5 Staleness do apt — a contrapartida que ninguém declara

Instalar por `apt` é barato de manter e é por isso que está certo para a maioria. Mas o `fzf` é a exceção que dói: **noble tem 0.44.1, upstream está na 0.74.1**. E o [CHANGELOG 0.48.0](https://github.com/junegunn/fzf) mudou o mecanismo de integração de shell (*"Shell integration scripts are now embedded in the fzf binary"*), ou seja, o `source <(fzf --zsh)` que toda documentação atual mostra **não funciona** na versão do noble — por isso o `thiago-wsl.zsh` precisa do `source /usr/share/doc/fzf/examples/key-bindings.zsh`. Isso está correto para a versão instalada; só saiba que qualquer receita de fzf da internet vai assumir outra coisa.

---

## 3. Gestão de dotfiles

Critério declarado no ticket: **sobreviver a uma reinstalação do WSL**. É o critério certo, e ele ordena as opções sozinho.

### 3.1 A evidência de que "nada" já está falhando

O home hoje tem:

```
.p10k.zsh                          .zshrc.backup-20260422-120301
.p10k.zsh.backup-20260422-125701   .zshrc.backup-20260422-125701
.p10k.zsh.pre-starship-...         .zshrc.broken-20260422-133625
.shell.pre-oh-my-zsh               .zshrc.pre-starship-20260422-141453
.zcompdump  .zcompdump-alienware-x14-5.9  .zsh_history_bad
.claude.json.bak-mcp-cleanup-20260605-223241
```

São **10+ arquivos de backup manual** de uma migração de 22/04/2026. Isso é versionamento feito à mão porque não há versionamento de verdade. Um `git log` responderia todas essas perguntas melhor, e a migração p10k→starship teria sido um commit revertível em vez de 4 arquivos `.backup-`.

E o que está fora de qualquer backup hoje: `~/.zshrc`, `~/.config/zsh/thiago-wsl.zsh` (o arquivo que contém **toda** a customização real), `~/.gitconfig`, `~/.ssh/config`, `~/.claude/settings.json`, `/etc/wsl.conf`. Uma reinstalação do WSL perde tudo isso.

### 3.2 Comparativo pelo critério de reinstalação

| | Reinstalação em 1 comando | Segredos | Diferença por máquina | Instala pacotes | Dependências |
|---|---|---|---|---|---|
| **chezmoi** | **sim** — `sh -c "$(curl -fsLS https://get.chezmoi.io)" -- init --apply $USER` | age/GPG + 17 password managers | templates Go (`.chezmoi.os`, `.chezmoi.hostname`) | `run_onchange_` + `.chezmoidata` | nenhuma (binário único) |
| **yadm** | quase — `yadm clone --bootstrap <url>` (precisa do yadm antes) | arquivo GPG/OpenSSL | alternates `##os.WSL` (por symlink) | script `bootstrap` | git + yadm |
| **bare repo** | clone + `checkout` + dança de backup à mão | **nenhum** | só branches | não | git |
| **stow** | não — precisa clonar antes, depois `stow` | **nenhum** | não | não | git + stow |
| **nada** | não | — | — | — | — |

O `run_once_` / `run_onchange_` do chezmoi é literalmente a história de reinstalação, [documentado](https://www.chezmoi.io/user-guide/use-scripts-to-perform-actions/):

> "`run_once_` scripts: These scripts are executed once for each unique version of the content. […] chezmoi tracks the content's SHA256 hash and stores it in a database."
> "Scripts break chezmoi's declarative approach and should be used sparingly. All scripts should be idempotent."

E o padrão declarativo de pacotes ([install-packages-declaratively](https://www.chezmoi.io/user-guide/advanced/install-packages-declaratively/)) põe a lista de pacotes num `.chezmoidata/packages.yaml` e dispara um `run_onchange_` quando a lista muda — a metade do problema que nem stow nem bare repo tocam.

Para segredos, a receita que fecha o critério ([FAQ de encryption](https://www.chezmoi.io/user-guide/frequently-asked-questions/encryption/)) é: gerar uma chave `age`, criptografá-la com passphrase, commitar o `key.txt.age`, e um `run_onchange_before_decrypt-private-key.sh.tmpl` que a descriptografa no `init`. **Resultado: uma passphrase memorizada reconstitui a máquina inteira.**

Notas de WSL, ambas de primeira parte:
- chezmoi documenta a detecção de WSL via `.chezmoi.kernel.osrelease` ([machines/windows](https://www.chezmoi.io/user-guide/machines/windows/)).
- yadm reporta o SO como `WSL` explicitamente no man page, então `arquivo##os.WSL` funciona out-of-the-box.
- ⚠️ **Nenhum dos dois documenta compartilhar um checkout entre o host Windows e o WSL.** A forma praticável é **dois clones do mesmo remote** — e isso é até melhor: `wsl --unregister` destrói o `~` do WSL sem tocar no lado Windows.

### 3.3 A honestidade obrigatória: a própria doc do chezmoi manda não usar

[what-does-chezmoi-do](https://www.chezmoi.io/what-does-chezmoi-do/), verbatim:

> "If you do not personalize your configuration or only ever use a single operating system with a single account and none of your dotfiles contain secrets then you don't need chezmoi."

As três condições são conjuntas. Aqui **as três falham**: a configuração é personalizada (um `thiago-wsl.zsh` de 100 linhas), há dois sistemas na prática (WSL + o host Windows com o `.wslconfig` que a §5 recomenda criar), e há segredos (`~/.ssh/panini_vps_ed25519`, `~/.aws` via symlink, token do `gh`).

Custo real, declarado pela própria doc: **o fluxo é de dois passos** — editar a fonte, depois `chezmoi apply`. As mitigações documentadas são `chezmoi edit --apply` e `chezmoi edit --watch`. Não existe daemon de auto-apply (a única opção é integração com Watchman, com limitações declaradas). **Isso é atrito diário permanente** e é a razão honesta pela qual muita gente desiste.

### 3.4 Recomendação

> **chezmoi — sim, mas com escopo enxuto.**
> **Resolve:** os 10+ arquivos `.backup-` viram histórico git; `thiago-wsl.zsh` (hoje o único lugar onde mora toda a customização, sem cópia) fica versionado; a reinstalação do WSL vira um comando; os segredos ficam no repo criptografados com age em vez de "existem só nesta máquina".
> **Custo de instalar:** um binário. `chezmoi init --apply` + `chezmoi add` dos ~8 arquivos que importam. Meio dia, uma vez.
> **Custo de manter (o que dói):** (1) o ciclo de dois passos, para sempre; (2) a convenção de nomes (`dot_`, `private_`, `encrypted_`, `run_once_`) é uma linguagem nova para aprender; (3) todo `run_once_` **precisa ser idempotente** — num rebuild o banco de hashes some e tudo roda de novo; (4) `git.autoPush` é uma faca — a doc avisa que um segredo em texto plano vai direto para o repo público.
> **Por que vale mais do que o que existe:** "o que existe" é `cp .zshrc .zshrc.backup-$(date)` quatro vezes numa tarde e nenhuma cópia do arquivo mais importante.

**Alternativa defensável, se o atrito de dois passos incomodar:** **bare git repo**. Zero dependências além do git, edição direta nos arquivos reais, e cobre 80 % do valor (histórico + reinstalação). Contrapartida declarada: `status.showUntrackedFiles no` é obrigatório e **você nunca mais será avisado de um dotfile novo esquecido**; não há mecanismo nenhum para segredos; e a receita de reinstalação do [artigo canônico da Atlassian](https://www.atlassian.com/git/tutorials/dotfiles) inclui um `egrep`/`xargs` parseando a **mensagem de erro humana do git** para fazer backup de conflitos — frágil por construção. É um post de blog descrevendo uma técnica, não uma ferramenta com mantenedor.

**Stow: não.** Pelo critério declarado é a mais fraca das quatro. Resolve só a fatia de symlink, e o *tree folding* documentado no [manual GNU](https://www.gnu.org/software/stow/manual/stow.html) faz `~/.config/nvim` virar um symlink **para dentro do seu repo git** — convidando aplicações a escreverem no repositório. É uma boa ferramenta sendo usada para um trabalho que o manual dela nunca reivindicou.

---

## 4. Prompt e shell

**A resposta curta: o starship é inocente, os 9 plugins do oh-my-zsh são de graça, e ~40 % do startup é uma flag do `compinit`.**

### 4.1 As medições

Todas nesta máquina, 2026-07-19, melhor de 7:

| O quê | Tempo |
|---|---:|
| `zsh -f -i -c exit` (sem rc nenhum) | **0.00 s** |
| `zsh -i -c exit` (config real) | **0.72 – 1.04 s** |
| oh-my-zsh core, `plugins=()` | 0.46 – 1.00 s |
| oh-my-zsh core **+ os 9 plugins** | 0.44 – 0.79 s |
| oh-my-zsh com `ZSH_DISABLE_COMPFIX=true` | 0.47 – 0.68 s |
| **`compinit` (sem cache)** | **0.36 – 0.63 s** |
| **`compinit -C` (com cache)** | **0.01 s** |
| `eval "$(starship init zsh)"` | **0.00 s** |
| `starship prompt` (render, repo git em ext4) | **0.01 s** |
| `nvm.sh` | 0.09 s |
| `keychain --noask` | 0.02 s |
| `uv generate-shell-completion zsh` (quente) | 0.01 s |

Três conclusões que invertem a suspeita natural do ticket:

1. **Os plugins são gratuitos.** 0.44 s com os 9 plugins vs. 0.46 s com zero. Tirar `git`, `sudo`, `extract`, autosuggestions e syntax-highlighting não compra nada. O custo está no *core* do oh-my-zsh, não na lista de plugins.
2. **O starship não custa nada aqui.** `init` = 0 s, render = **10 ms** num repo git em ext4. Ele é um subprocesso por prompt (dois, na verdade — `PROMPT` e `RPROMPT` sob `promptsubst`), o que é uma crítica arquitetural legítima, mas 10 ms é imperceptível.
3. **`compinit -C` sozinho vale ~380 ms**, ou ~40 % do startup total.

A doc oficial do zsh ([Completion System](https://zsh.sourceforge.io/Doc/Release/Completion-System.html)) explica o mecanismo:

> "The check performed to see if there are new functions can be omitted by giving the option `-C`. In this case the dump file will only be created if there isn't one already."

E o oh-my-zsh **deliberadamente não usa `-C`** — o `oh-my-zsh.sh` chama `compinit -i -d "$ZSH_COMPDUMP"`. Vale notar que `ZSH_DISABLE_COMPFIX=true` só troca `-i` por `-u`: remove a auditoria, **mas não o scan do `fpath`**, que é onde está o tempo. Medido acima: praticamente sem efeito. É um knob de segurança, não de velocidade.

> ⚠️ **Nota metodológica honesta.** O `zprof` desta máquina atribui 513 ms a `compaudit` e 856 ms a `compinit`, mas o `zprof` **só mede funções de shell** — não enxerga `fork`/`exec`. Ele também mostra números diferentes conforme o `compaudit` rode em foreground ou no background (`&|`, como o oh-my-zsh faz de verdade). O número em que confio é o A/B direto: `compinit` 0.36–0.63 s vs `compinit -C` 0.01 s. Quem só usa `zprof` para perfilar oh-my-zsh persegue o alvo errado.

Outros custos escondidos no core do oh-my-zsh, lidos do fonte instalado: um **`git rev-parse HEAD`** em subshell a cada startup (só para carimbar a revisão no zcompdump), dois `grep -Fx` contra o zcompdump, e o `rm -f` do zcompdump **sempre que o `$fpath` muda por um item** — forçando rebuild completo. Mais 21 arquivos `lib/*.zsh` sourceados incondicionalmente, sem opt-out.

### 4.2 O custo que não está no startup: 240 ms por *miss* de `PATH`

Medido aqui, com os 35 diretórios `/mnt/c` no `PATH`:

| 20× `command -v <comando inexistente>` | |
|---|---:|
| com `/mnt/c` no `PATH` | **4.79 s** (~240 ms cada) |
| sem `/mnt/c` no `PATH` | **0.00 s** |

Isso não aparece no tempo de startup, mas cobra em cada erro de digitação, em cada `command -v foo` de guarda dentro de script, e em cada TAB em nome de comando (o `HASH_LIST_ALL` do zsh é *on* por padrão e força o hash de todo o `PATH` na primeira completion). **Num fluxo agêntico isso é pior que para um humano**: o Claude Code faz shell-out constantemente, e todo script com `if command -v x >/dev/null` paga a taxa.

Correção: o mesmo bloco de poda de `PATH` que o `thiago-wsl.zsh` já tem — ver §5.3.

### 4.3 Alternativas ao oh-my-zsh, avaliadas honestamente

O que este `.zshrc` realmente consome do oh-my-zsh:

- `zsh-autosuggestions` e `zsh-syntax-highlighting` **não são plugins do oh-my-zsh** — estão em `custom/plugins/`, são repos upstream. Seriam dois `source` em qualquer lugar.
- `git` = ~150 aliases. `common-aliases`, `extract`, `sudo`, `colored-man-pages` = scripts pequenos e autocontidos.
- `command-not-found` = wrapper de 3 linhas no `/usr/lib/command-not-found` do Ubuntu.
- **`ZSH_THEME=""`** — o sistema de temas, que é o principal argumento de venda do oh-my-zsh, **já não é usado**.

Ou seja, o oh-my-zsh está entregando: um loop de `source`, 21 libs obrigatórias, um verificador de updates e um wrapper de `compinit` que se recusa a cachear.

Alternativas com o que cada projeto alega de si:

| Projeto | Alegação própria |
|---|---|
| [zsh_unplugged](https://github.com/mattmc3/zsh_unplugged) | *"You don't need a big bloated plugin manager… A simple ~20 line function may be all you need."* |
| [znap](https://github.com/marlonrichert/zsh-snap) | *"`znap prompt` makes your prompt visible in just 15-40ms"* — sem benchmark comparativo |
| [zinit](https://github.com/zdharma-continuum/zinit) | Turbo mode *"yields 50-80% faster Zsh startup"* |

> **Recomendação — NÃO trocar de framework. Adotar `compinit -C` dentro do que já existe.**
> **Resolve:** ~380 ms de 850 ms, com uma edição.
> **Custo:** três linhas no `.zshrc`, no padrão documentado (roda o check completo 1× por dia, usa cache no resto):
> ```zsh
> autoload -Uz compinit
> if [[ -n ${ZDOTDIR:-$HOME}/.zcompdump(#qN.mh+24) ]]; then compinit; else compinit -C; fi
> ```
> **Contrapartida real:** com `-C`, uma ferramenta recém-instalada só ganha completion no dia seguinte ou após `rm ~/.zcompdump*`. É o preço, e é pequeno.
> **Por que não migrar para znap/zinit:** migrar mantendo `compinit` sem cache recuperaria ~60–70 ms, não 380. O ganho está na flag, não no framework. Trocar de framework é argumento de **legibilidade e manutenção**, não de velocidade — e deve ser vendido assim, não disfarçado de performance.

Ganhos menores, na ordem: remover as 3 linhas de `nvm` (~90 ms, e é código morto de qualquer forma — §1); podar o `PATH` do Windows (§5.3); remover o preâmbulo morto de instant prompt do p10k no topo do `.zshrc`.

### 4.4 Powerlevel10k: não voltar

Vale registrar porque o `.p10k.zsh` ainda está no home e a tentação existe. O p10k é genuinamente mais rápido por arquitetura (roda dentro do shell, com o daemon `gitstatusd` — cujo README publica *"a 10x faster alternative to `git status`"*, 30.9 ms quente vs 295 ms do git num repo chromium). Mas:

1. **O topo do README do p10k, verbatim:** *"THE PROJECT HAS VERY LIMITED SUPPORT / NO NEW FEATURES ARE IN THE WORKS / **MOST BUGS WILL GO UNFIXED** / HELP REQUESTS WILL BE IGNORED"*.
2. **Não existe nenhuma comparação p10k vs. starship em fonte primária.** O README do p10k não menciona starship uma única vez. Qualquer número que alguém cite nesse sentido é inventado.
3. Aqui o starship renderiza em **10 ms**. Não há problema para resolver.
4. **Perigo concreto se voltasse:** o *instant prompt* do p10k redireciona stdin para `/dev/null` durante a inicialização, e o README usa **`keychain` como o exemplo literal** de código que precisa ser movido *acima* do preâmbulo. Neste `.zshrc` o bloco `keychain` está **no fim** — reativar p10k sem mover engoliria o prompt de passphrase.

Hoje o preâmbulo do p10k no topo do `.zshrc` é inerte (nenhum p10k carregado ⇒ o cache nunca é escrito). Mas é código morto com uma armadilha embutida: **apagar**.

### 4.5 Uma ressalva do starship que vale saber

A [doc oficial do módulo git_status](https://starship.rs/config/#git-status) avisa:

> "The Git Status module is very slow in Windows directories (for example under `/mnt/c/`) when in a WSL environment. You can disable the module or use the `windows_starship` option."

Como os repos estão todos em ext4 nativo, **isso não te afeta hoje** — só é mais um motivo para nunca mover repositório para `/mnt/c`. Se um dia a barra do prompt ficar lenta, `STARSHIP_LOG=trace starship timings` é a ferramenta documentada para achar o módulo culpado.

## 5. Especificidades de WSL2

Esta é a seção com o achado mais urgente do documento.

### 5.1 🔴 O disco: 8.1 GB livres no `C:` e ~12 GB presos no vhdx

Estado medido:

```
/mnt/c              458 G total,  8.1 G livres  (99 % cheio)
/ (dentro do WSL)   43 G usados
ext4.vhdx (real)    55.3 GB   ← ~12 GB de folga que o WSL não devolve
docker_data.vhdx    43.0 GB
.wslconfig          NÃO EXISTE
```

O `ext4.vhdx` cresce e **não encolhe sozinho** a menos que seja sparse. A Microsoft documenta o mecanismo, mas fora do Learn — está no [release body do WSL 2.0.0](https://github.com/microsoft/WSL/releases/tag/2.0.0) e no [blog de setembro/2023](https://devblogs.microsoft.com/commandline/windows-subsystem-for-linux-september-2023-update/):

> "This new setting automatically sets any new VHD to be a sparse VHD, which can automatically reduce their size. Additionally, we've added the `wsl --manage <distro> --set-sparse <true/false>` command to allow you to set your existing distros to be sparse or not."

Duas pegadinhas reais: **(1)** `sparseVhd=true` só afeta VHDs **novos** — a descrição da própria setting diz "any newly created VHD"; para um distro existente é preciso rodar `--set-sparse`. **(2)** `wsl --manage --set-sparse` **não está documentado no Microsoft Learn** — a [página disk-space](https://learn.microsoft.com/en-us/windows/wsl/disk-space) só documenta *expansão* (`--resize`, `diskpart expand vdisk`, `resize2fs`), não recuperação. É um buraco de documentação, não um comando não-suportado (ele aparece no `wsl --help` da 2.6.3).

O caminho clássico de compactação usa comandos oficiais ([compact vdisk](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/compact-vdisk)):

> "Reduces the physical size of a dynamically expanding virtual hard disk (VHD) file. This parameter is useful because dynamically expanding VHDs increase in size as you add files, but **they do not automatically reduce in size when you delete files**."
> "You can only use compact dynamically expanding VHDs that are **detached or attached as read-only**."

> **Recomendação #1 do documento — recuperar disco antes de qualquer outra coisa.**
> ```powershell
> wsl --shutdown
> wsl --manage Ubuntu-20.04 --set-sparse true
> ```
> e no `%UserProfile%\.wslconfig`: `[experimental]` + `sparseVhd = true` para os VHDs futuros.
> **Resolve:** ~12 GB presos num disco com 8.1 GB livres. E enquanto o `C:` estiver a 99 %, **o vhdx não consegue crescer** — qualquer `pnpm install` grande, build de container ou `pyenv install` falha por ENOSPC no host, com mensagem de erro que não aponta para a causa.
> **Custo de instalar:** um `wsl --shutdown` (perde sessões abertas; a doc pede ~8 s antes de reiniciar).
> **Custo de manter:** VHD sparse tem overhead de escrita marginal; e a doc não promete recuperação instantânea.
> **Por que vale mais do que o que existe:** o que existe é nenhum `.wslconfig` e nenhuma política de recuperação.

Alvos óbvios de limpeza dentro do WSL, medidos: `~/.cache` **9.1 GB** (`ms-playwright` 2.4 G, `uv` 2.2 G, `puppeteer` 1.4 G, `pip` 1.2 G, `pypoetry` 1.0 G), `~/.npm` **3.5 GB**, `~/.pyenv` **1.7 GB** (órfão, §1), `~/.claude/projects` **613 MB**. Só isso são ~15 GB — mas **liberar dentro do ext4 não devolve nada ao Windows sem o sparse acima**. As duas coisas são complementares, não alternativas.

### 5.2 I/O: `/mnt/c` vs. filesystem nativo — medido nesta máquina

A orientação oficial ([learn.microsoft.com/windows/wsl/filesystems](https://learn.microsoft.com/en-us/windows/wsl/filesystems)) é qualitativa:

> "We recommend against working across operating systems with your files, unless you have a specific reason for doing so. For the fastest performance speed, store your files in the WSL file system if you are working in a Linux command line."

A Microsoft **não publica números para `/mnt/c`**. Os únicos números oficiais ([compare-versions](https://learn.microsoft.com/en-us/windows/wsl/compare-versions)) são WSL2 vs. WSL1 *dentro* do filesystem Linux ("up to 20x faster… 2-5x faster when using `git clone`, `npm install` and `cmake`").

**Medi aqui, 2026-07-19:**

| Operação (2000 arquivos) | ext4 nativo | `/mnt/c` (DrvFs) | Fator |
|---|---:|---:|---:|
| criar 2000 arquivos | **0.04 s** | **13.01 s** | **~325×** |
| `ls -la` sobre 2000 arquivos | **0.00 s** | **20.21 s** | **>2000×** |

Isso é a diferença entre um `pnpm install` e um café. **O ambiente já está correto** — `~/workspaces` está em ext4 nativo, e essa é a resposta honesta: nada a fazer aqui, mas serve de argumento contra qualquer tentação futura de mover repos para `C:`.

Consequência adicional que a Microsoft **não** documenta: notificações de mudança de arquivo (inotify) feitas por apps Windows sobre `/mnt/c` não chegam a apps Linux — [microsoft/WSL#4739](https://github.com/microsoft/WSL/issues/4739), **aberto desde 2019-12-06**, 180 comentários, 512 👍, sem fix. Na prática: `next dev`, `vite`, `nodemon` e `pytest-watch` **silenciosamente não recompilam** se o repo estiver em `/mnt/c`. Os workarounds (`CHOKIDAR_USEPOLLING`, `WATCHPACK_POLLING`) são folclore e queimam CPU. A correção documentada é "ponha os arquivos no filesystem Linux".

### 5.3 O `PATH`: 35 entradas em `/mnt/c`

`appendWindowsPath` é `true` por padrão ([wsl-config](https://learn.microsoft.com/en-us/windows/wsl/wsl-config)). Aqui isso significa **35 diretórios `/mnt/c/...`** no `PATH`, incluindo Java 8, Spark 3.3.1, PhysX da NVIDIA, dois PuTTY/dotnet e dois Pythons do Windows.

A FAQ oficial documenta o risco **funcional**:

> "Windows paths are appended to your path by default, which could cause unexpected behavior for certain Linux applications compared to a traditional Linux environment."

O custo de **performance** não tem citação no Learn — a fonte é [microsoft/WSL#4234](https://github.com/microsoft/WSL/issues/4234) ("[WSL2] Slow completion due to Windows PATH being appended to Linux PATH"), **fechado em ~3 minutos sem correção**. Sinalizo isso explicitamente: a afirmação é bem atestada e o mecanismo é óbvio (todo *miss* de `PATH` percorre ~35 diretórios extras sobre DrvFs), mas **não é fonte primária da Microsoft**.

> **Recomendação — não desligar `appendWindowsPath` inteiro; podar cirurgicamente.**
> O `thiago-wsl.zsh` já faz exatamente isso (`path=(${path:#$p})` para Docker Desktop, nodejs, npm roaming, GnuWin32) e já tem `typeset -U path PATH`. **Isso está certo.** Estender a lista de poda para Java 8, Spark, PhysX, PuTTY, os dois Pythons do Windows e o dotnet x86 é uma edição de 6 linhas no arquivo que já existe.
> **Contrapartida de `appendWindowsPath = false`:** perde `code`, `explorer.exe`, `clip.exe`, `wsl.exe` e `git-credential-manager.exe` por nome. Como o `EDITOR` aqui é literalmente `code --wait`, **desligar quebra o editor**. Por isso: podar, não desligar.
> **Ganho honesto:** é otimização de segunda ordem. O ganho medível de startup está em §4, não aqui.

### 5.4 Memória: sem `.wslconfig`, tudo em default

`free -h` mostra **7.6 GiB**, consistente com o default documentado de **"50% of total memory on Windows"** — ou seja, o host tem ~16 GB. Histórico confirmado nas release notes: era 80 % (Build 19028), virou "50 % ou 8 GB, o que for menor" (Build 20175), e o teto de 8 GB foi removido depois — o mantenedor **benhillis** em [microsoft/WSL#9636](https://github.com/microsoft/WSL/issues/9636): *"this was modified to be 50% (without the 8GB upper limit)"*.

O problema clássico de memória não devolvida é **admitido na doc oficial** ([compare-versions](https://learn.microsoft.com/en-us/windows/wsl/compare-versions)):

> "as of right now WSL 2 does not yet release cached pages in memory back to Windows until the WSL instance is shut down."

Rastreado em [microsoft/WSL#4166](https://github.com/microsoft/WSL/issues/4166) — aberto desde 2019, 456 comentários. O remédio oficial é `autoMemoryReclaim`, cujo comportamento só é explicado no [blog](https://devblogs.microsoft.com/commandline/windows-subsystem-for-linux-september-2023-update/):

> "`gradual` … we start reclaiming cached memory by using the cgroup `memory.reclaim` feature… **However, this feature does require disabling cgroups v1 in WSL, which can cause some issues. In early testing we noticed that this will break the docker daemon when running it as a service in WSL** … `dropcache` … will not require any cgroup changes."

Desde o [WSL 2.1.3](https://github.com/microsoft/WSL/releases/tag/2.1.3) o default é `dropcache` com idle de 10 min.

> **Recomendação — criar `%UserProfile%\.wslconfig` com um teto explícito.**
> ```ini
> [wsl2]
> memory=10GB
> processors=12
> swap=4GB
> [experimental]
> sparseVhd=true
> ```
> **Resolve:** 7.6 GiB é apertado para Claude Code + `next dev` + venv Python + `terraform plan` simultâneos — e é justamente esse o perfil de carga de um fluxo agêntico com worktrees paralelas. Com 16 GB no host, 10 GB dá folga sem sufocar o Windows.
> **Contrapartida honesta:** `memory=` é um **teto do VM**, não uma reserva; subir para 10 GB significa que o Windows pode ficar com 6 GB nos picos. E `dropCache` (default) descarta o page cache após 10 min ociosos — o primeiro `pnpm install` depois do café relê tudo do VHD. Isso é a troca deliberada, não um bug.
> **`processors=12`:** 20 vCPU num VM de 7.6 GB é desequilibrado — 20 workers de build/teste em paralelo estouram RAM antes de saturar CPU. Se subir a RAM, pode manter 20.
> **Custo de manter:** um arquivo de 6 linhas; `wsl --shutdown` a cada alteração (a doc pede ~8 s de espera).

### 5.5 systemd: `false` hoje, e provavelmente está certo

`/etc/wsl.conf` tem `[boot] systemd=false`. O [doc oficial](https://learn.microsoft.com/en-us/windows/wsl/systemd) pede WSL ≥ 0.67.6 (você tem 2.6.3) e `systemd` + `systemd-sysv` instalados. Aviso explícito da doc:

> "It is also important to note that with these changes, **systemd services will NOT keep your WSL instance alive.**"

Ligar dá `systemctl`, `journalctl`, units de usuário e serviços locais (Postgres/Redis nativos). Custo: alguns centenas de ms de boot, e bugs de shutdown específicos de systemd corrigidos tão recentemente quanto as builds 2.9.x.

> **Veredito: não ligar por enquanto — mas por um motivo específico.** O Docker está em uso via Docker Desktop (`docker_data.vhdx` presente), não como serviço nativo; e nada no fluxo atual (`keychain` por boot, Claude Code, `next dev`) precisa de systemd. **Só ligue se** for rodar dockerd nativo (para largar a licença do Docker Desktop) ou serviços locais. Nesse caso, atenção: `autoMemoryReclaim=gradual` quebra dockerd em systemd — o default `dropCache` não quebra.

### 5.6 Credenciais e SSH agent — o que existe já está certo

**SSH.** O `.zshrc` usa `keychain` com um detalhe que merece registro:

```zsh
if [ -t 0 ]; then eval "$(keychain --eval --quiet --agents ssh panini_vps_ed25519)"
else            eval "$(keychain --eval --quiet --noask --agents ssh panini_vps_ed25519)"; fi
```

O propósito do keychain, da [doc do Funtoo](https://www.funtoo.org/Funtoo:Keychain), é exatamente esse: *"allows you to easily have **one long running ssh-agent process per system, rather than the norm of one ssh-agent per login session**"*. Isso casa perfeitamente com o WSL2, onde cada aba do Terminal é um login novo e o VM morre por `vmIdleTimeout`. E o ramo `--noask` para shell sem TTY é precisamente o que impede o Bash do agente de travar num prompt de passphrase.

> **Veredito: isto está bom e não deve ser mexido.** É a resposta honesta de "o que ele já tem está bom" — e é uma solução melhor pensada que a média.

As alternativas de encaminhar para o agente do Windows existem, mas com contrapartida clara:

| Opção | Estado verificado (2026-07) | Contrapartida |
|---|---|---|
| `npiperelay` + `socat` | [jstarks/npiperelay](https://github.com/jstarks/npiperelay) — **última release v0.1.0, 2020-07-02**; a receita ssh-agent nem está no README | dormente; folclore |
| [`wsl2-ssh-agent`](https://github.com/mame/wsl2-ssh-agent) | v0.9.7, **2025-11-26** — o único atual e WSL2-first | binário de terceiro no caminho de auth |
| [`wsl-ssh-agent`](https://github.com/rupor-github/wsl-ssh-agent) | v1.6.9, 2025-09-20 | **o próprio README diz que é para WSL1** e manda WSL2 usar npiperelay |
| [1Password](https://www.1password.dev/ssh/integrations/wsl/) | documentado oficialmente | `git config --global core.sshCommand ssh.exe` → **todo git-over-SSH vira um process launch pelo interop**, mais lento que `ssh` nativo |

Nenhuma vale a troca aqui: a única vantagem real seria a chave viver no TPM do Windows em vez do vhdx, e o custo é latência em cada operação git ou um binário de terceiro no caminho de autenticação.

**Credenciais HTTPS.** O `~/.gitconfig` já usa `gh auth git-credential` como helper para `github.com` e `gist.github.com`. Isso é o caminho limpo, todo-Linux: o [manual do gh](https://cli.github.com/manual/gh_auth_login) diz que o token vai *"stored securely in the system credential store"*. O [Git Credential Manager](https://github.com/git-ecosystem/git-credential-manager/blob/main/docs/wsl.md) só ganharia relevância com Azure DevOps ou Bitbucket, e vem com aviso próprio:

> "Using GCM as a credential helper for a WSL Git installation means that **any configuration set in WSL Git is NOT respected by GCM (by default)**."

Além de invocar um `.exe` em `/mnt/c` a cada fetch. **Não recomendo** — não há Azure DevOps/Bitbucket no inventário.

Detalhe já correto e que vale preservar: `~/.aws` e `~/.azure` são symlinks para `/mnt/c/Users/panin/`, compartilhando credenciais com o host. Funciona, mas note que `/mnt/c` monta **sem metadata por padrão** ([wsl-config](https://learn.microsoft.com/en-us/windows/wsl/wsl-config): *"By default metadata is not enabled"*), então `chmod 600` ali é no-op — nunca ponha chave SSH privada nesse caminho.

### 5.7 Notas de terceira ordem

- **`wslu` / `wslview` está arquivado** ([wslutilities/wslu](https://github.com/wslutilities/wslu), read-only desde 2025-03-01). Não construa nada novo em cima. `wslpath` é exceção — vem dentro do WSL, não do wslu.
- **`wslc` (WSL Containers)** entrou em public preview no [WSL 2.9.3](https://github.com/microsoft/WSL/releases/tag/2.9.3), runtime de container nativo sem engine separada. **Você está na 2.6.3 estável, então não tem.** Mas muda o cálculo de médio prazo sobre a licença do Docker Desktop — vale reavaliar quando chegar ao estável.
- **Licença do Docker Desktop**: gratuito para uso pessoal e empresas com <250 funcionários e <US$ 10 mi de receita ([docs](https://docs.docker.com/subscription/desktop-license/)). Sem problema aqui, mas o `docker_data.vhdx` de **43 GB** é metade do problema de disco da §5.1 — um `docker system prune -a` provavelmente devolve mais do que qualquer outra ação isolada.

---

## 6. Ferramental de fluxo agêntico

Claude Code é o agente primário e não está em avaliação. O que está em avaliação é o que **rodeia** ele.

### 6.1 Worktrees — o Claude Code já resolve; o problema é a limpeza

O `git worktree` oficial ([git-scm.com/docs/git-worktree](https://git-scm.com/docs/git-worktree)) traz as regras que importam: uma branch não pode estar em duas worktrees ao mesmo tempo sem `--force`; cada worktree tem um **arquivo** `.git` (não diretório) apontando para `$GIT_DIR/worktrees/<id>/`; refs são compartilhadas exceto `refs/bisect`, `refs/worktree` e `refs/rewritten`; `git worktree prune` limpa metadados órfãos; superprojetos com submódulo "não são recomendados" em múltiplos checkouts.

O Claude Code 2.x já tem afordâncias de primeira parte ([docs](https://code.claude.com/docs/en/worktrees.md)):

- flag `--worktree` / `-w`, que cria a worktree sob `.claude/worktrees/<nome>/` na branch `worktree-<nome>`;
- ferramentas `EnterWorktree` / `ExitWorktree` em sessão;
- `isolation: worktree` no frontmatter de subagente — worktree temporária por subagente, removida sozinha se não houver mudanças;
- arquivo **`.worktreeinclude`**, que copia arquivos gitignorados (`.env`, `config/secrets.json`) para toda worktree nova — sintaxe de `.gitignore`, mas só casa arquivos que também estão gitignorados;
- `worktree.baseRef` = `"fresh"` (default, ramifica de `origin/HEAD`) ou `"head"`;
- lock automático durante execução do agente; desde a **v2.1.210** locks de sessões mortas são liberados sozinhos, e desde a **v2.1.211** aprovações de permissão persistem em `.claude/settings.local.json` na raiz do repo, sobrevivendo à remoção da worktree.

A máquina roda **2.1.215**, ou seja, já tem tudo isso.

**O problema medido não é falta de ferramenta, é falta de higiene.** `git worktree list` no `travelmanager` mostra **6 worktrees vivas** (`wt-212` … `wt-216` em `~/workspaces/`, mais `/tmp/travelmanager-236`), a mais antiga de **25 de junho** — ~3,5 semanas. Todas fora de `.claude/worktrees/`, ou seja, criadas à mão, fora do ciclo de vida que o Claude Code gerencia. E `/tmp/travelmanager-236` vira entrada `prunable` no primeiro reboot do WSL.

> **Recomendação — usar `--worktree` do próprio Claude Code e parar de criar worktrees à mão.**
> **Resolve:** ciclo de vida (criação, lock, remoção, `cleanupPeriodDays`) passa a ser do agente, não seu.
> **Custo de instalar:** zero — já está no binário.
> **Custo de manter:** aceitar que as worktrees vivam em `.claude/worktrees/` em vez de `~/workspaces/wt-NNN`; e um `git worktree prune` ocasional nos repositórios com litter legado.
> **Por que vale mais do que o que existe:** o que existe hoje são 6 diretórios órfãos consumindo espaço num disco com 8.1 GB livres (§5), sem dono e sem data de expiração.

**Buraco real que worktree cria:** `node_modules`, `.venv`, `.terraform` e `.env` **não** são compartilhados entre worktrees. Mitigação documentada de primeira parte só existe para dois deles:

- **pnpm** — `enableGlobalVirtualStore: true` faz cada `node_modules` virar symlinks para um store global endereçado por conteúdo ([pnpm.io/git-worktrees](https://pnpm.io/git-worktrees)). Relevante aqui: `pnpm` já está instalado.
- **`.env`** — `.worktreeinclude` do Claude Code.
- **Python e Terraform** — sem guia de primeira parte. `.venv` por worktree é o caminho; `.terraform` por worktree é inevitável (providers rebaixados por worktree; ver §5 sobre o custo em disco disso).

Ferramentas de terceiros para worktree (`gwq`, `git-worktree-runner`, `gw-tools`) existem e algumas são mantidas, mas **nenhuma é citada pela documentação oficial** e todas duplicam o que o `--worktree` já faz. **Não recomendo** — custo de manutenção sem ganho sobre o built-in.

### 6.2 Isolamento — aqui há um risco concreto e não mitigado

O `~/.claude/settings.json` **desta máquina** contém:

```json
{
  "permissions": { "allow": ["Bash", "WebFetch", "WebSearch"], "defaultMode": "bypassPermissions" },
  "skipDangerousModePermissionPrompt": true
}
```

E `bwrap` e `socat` **não estão instalados**, ou seja, o sandbox nativo do Claude Code está indisponível.

A documentação oficial de modos de permissão ([permission-modes](https://code.claude.com/docs/en/permission-modes.md)) posiciona `bypassPermissions` / `--dangerously-skip-permissions` como aceitável **apenas** dentro de um limite de isolamento — container, VM ou o sandbox runtime. O Claude Code inclusive se recusa a rodar como root com essa flag em Linux/macOS **exceto** dentro de um sandbox reconhecido. Aqui roda como usuário comum, então nada bloqueia — e o agente tem `Bash` liberado sobre o home inteiro, incluindo `~/.ssh/panini_vps_ed25519` e `~/.aws` (symlink para `/mnt/c/Users/panin/.aws`).

O sandbox nativo ([sandboxing](https://code.claude.com/docs/en/sandboxing.md)) em Linux usa **bubblewrap + socat**: escrita restrita ao working dir + `$TMPDIR` da sessão, leitura ampla, e **rede via proxy com allowlist de domínios** (nenhum domínio pré-liberado; a primeira requisição pede aprovação; `allowedDomains` pré-libera). O comando `/sandbox` ativa o modo auto-allow, em que Bash sandboxado roda sem prompt. Limitações que a própria doc declara: o filtro de domínio não inspeciona TLS por padrão (domain fronting é possível); o sandbox **não** cobre Read/Edit/Write, MCP servers, hooks nem computer use; em Ubuntu 24.04+ pode ser preciso liberar AppArmor para namespaces de usuário do `bwrap`.

> **Recomendação (a de maior retorno do documento) — `sudo apt install bubblewrap socat` e trocar `bypassPermissions` global por `/sandbox` com auto-allow.**
> **Resolve:** hoje o agente tem acesso irrestrito de escrita ao home e à rede, com o prompt de confirmação explicitamente desligado. O sandbox devolve um limite real sem devolver o atrito de aprovar cada comando.
> **Custo de instalar:** dois pacotes do repositório oficial do Ubuntu, ~poucos MB. Possível ajuste de AppArmor no 24.04.
> **Custo de manter:** manter `allowedDomains` (registry npm, PyPI, GitHub, registry Terraform, `api.anthropic.com`); ocasionalmente aprovar um domínio novo. Aceitar que Read/Edit/Write continuam fora do sandbox — regras de permissão ainda são necessárias para isso.
> **Por que vale mais do que o que existe:** o que existe é `bypassPermissions` + `skipDangerousModePermissionPrompt: true` **sem** o limite de isolamento que a própria documentação exige como contrapartida. Essa é a configuração exata que a doc desaconselha no host.

Alternativas de isolamento mais forte, em ordem de custo:

| Opção | O que isola | Custo de manter | Veredito |
|---|---|---|---|
| `/sandbox` (bwrap) | FS de escrita + egress de rede do Bash | baixo — allowlist de domínios | **recomendado** |
| Hooks `PreToolUse` | padrões específicos (`rm -rf`, push em prod) via `permissionDecision: "deny"` ([hooks](https://code.claude.com/docs/en/hooks.md)) | médio — cada hook é código seu que quebra sozinho | complemento, não substituto |
| Devcontainer oficial ([devcontainer](https://code.claude.com/docs/en/devcontainer.md)) | processo inteiro + MCP + hooks; firewall iptables por allowlist em `init-firewall.sh`; `~/.claude` em volume nomeado | alto — rebuild de imagem, `node_modules` dentro do container, IO extra | só se for rodar código não confiável |

A doc do devcontainer é explícita: **não é air-gapped**; ainda precisa de egress. Para código realmente não confiável a orientação é VM ou Claude Code na web.

### 6.3 Observabilidade de sessão

O que existe de primeira parte ([monitoring-usage](https://code.claude.com/docs/en/monitoring-usage.md)):

- `CLAUDE_CODE_ENABLE_TELEMETRY=1` + exportadores OTLP (`OTEL_METRICS_EXPORTER`, `OTEL_LOGS_EXPORTER`, `OTEL_EXPORTER_OTLP_ENDPOINT`);
- métricas: `claude_code.session.count`, `.lines_of_code.count`, `.pull_request.count`, `.commit.count`, `.cost.usage`, `.token.usage`, `.code_edit_tool.decision`, `.active_time.total`;
- eventos: `user_prompt`, `assistant_response`, `api_request`, `tool_result`, `tool_decision`, `permission_mode_changed`, correlacionados por `prompt.id`;
- traces distribuídos em beta (`CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1`), com `TRACEPARENT` propagado para subprocessos.

Transcrições ficam em `~/.claude/projects/<projeto>/<session-id>.jsonl` ([sessions](https://code.claude.com/docs/en/sessions.md)). **Aqui isso são 613 MB em 29 projetos** — num disco com 8.1 GB livres no host. A doc é explícita que **o formato do `.jsonl` é interno e não documentado** e que scripts devem usar `/export`, `claude -p --output-format json` ou hooks (`transcript_path` no `SessionEnd`), não parsear o arquivo. `cleanupPeriodDays` (default 30) controla a retenção; `CLAUDE_CONFIG_DIR` move o diretório inteiro.

Para sessões paralelas há o `claude agents` (agent view) com estados Working / Needs input / Idle / Completed / Failed, `Space` para espiar, `Enter` para anexar, `/bg` para mandar a sessão para background.

> **Recomendação — não montar stack de observabilidade. Fazer duas coisas pequenas.**
> 1. **Baixar `cleanupPeriodDays`** (ex.: 14) ou mover `CLAUDE_CONFIG_DIR`. 613 MB de transcrição num disco apertado é custo puro. **Custo:** uma linha em `settings.json`. **Contrapartida:** perde histórico de sessão além da janela — se você usa `--resume` em sessões antigas, isso dói.
> 2. **Trocar o statusline.** O `settings.json` usa `"command": "npx ccstatusline@latest"`; medido nesta máquina: **1.23 – 1.39 s por render**, porque `npx …@latest` resolve o pacote no registry a cada invocação. Instalar o pacote localmente e apontar o comando para o binário elimina isso. **Custo:** um `npm i -g`. **Ganho:** ~1,3 s por render de statusline dentro do loop do agente.
>
> Um coletor OTLP (Prometheus/Grafana) resolve "quanto gastei / quantos tokens", mas isso é infraestrutura para manter — e `/cost` e `/context` já respondem a mesma pergunta para um dev solo. **Só vale se você quiser série temporal entre sessões.**

Visualizadores de sessão de terceiros: **descarte**. Todos parseiam o `.jsonl` que a documentação declara instável entre versões.


---

## 7. Veredito consolidado

### 7.1 O que fazer, em ordem de retorno sobre custo

| # | Ação | Resolve | Custo de manter | Evidência |
|---|---|---|---|---|
| 1 | `wsl --shutdown` + `wsl --manage <distro> --set-sparse true`; `.wslconfig` com `sparseVhd`, `memory=10GB`, `processors=12` | ~12 GB presos + `C:` a 99 % + 7.6 GiB de teto | arquivo de 6 linhas; `wsl --shutdown` ao alterar | §5.1, §5.4 |
| 2 | `docker system prune -a` + limpar `~/.cache` (9.1 GB) e `~/.npm` (3.5 GB) | `docker_data.vhdx` = 43 GB | recorrente | §5.1 |
| 3 | `apt install bubblewrap socat`; trocar `bypassPermissions` global por `/sandbox` | agente com Bash irrestrito sobre `~/.ssh` e `~/.aws`, sem limite de isolamento | manter `allowedDomains` | §6.2 |
| 4 | `compinit -C` no padrão de cache diário | ~380 ms de ~850 ms de startup | 3 linhas; completion nova só no dia seguinte | §4.1 |
| 5 | Remover `nvm` do `.zshrc`, apagar `~/.pyenv` (1.7 GB), apagar `.p10k.zsh*` e `.zshrc.backup-*` | código morto e 1.7 GB órfãos | nenhum | §1.5, §4.4 |
| 6 | `alias fd='fdfind'`; remover pacote `exa` | o `fd` real está inacessível hoje | nenhum | §2.1 |
| 7 | `mise` para Node + Terraform (não para Python) | 13 repos com `.node-version` divergente, todos em Node 24 | `direnv` sai; `MISE_TRUSTED_CONFIG_PATHS` p/ shell sem TTY; 1 mantenedor | §1.2, §1.5 |
| 8 | `apt install jq hyperfine`; `lazygit` por binário | JSON no shell; medição; revisão de diff | ~zero (jq/hyperfine); manual (lazygit) | §2.2 |
| 9 | Statusline local em vez de `npx ccstatusline@latest` | 1.23–1.39 s por render | um `npm i -g` | §6.3 |
| 10 | `chezmoi` com escopo enxuto (~8 arquivos + age) | 10+ backups manuais; `thiago-wsl.zsh` sem cópia; reinstalação do WSL | ciclo de dois passos, permanente | §3.4 |
| 11 | Usar `claude --worktree`; `git worktree prune` no litter legado | 6 worktrees órfãs desde 25/06 | nenhum | §6.1 |
| 12 | Estender a poda de `PATH` do Windows no `thiago-wsl.zsh` | 240 ms por *miss* de `PATH` | 6 linhas | §4.2, §5.3 |

### 7.2 O que **não** fazer

- **Não trocar oh-my-zsh por znap/zinit por velocidade.** Os 9 plugins custam ~0 ms medidos; o ganho está no `compinit -C`. Trocar é argumento de legibilidade, e deve ser dito assim.
- **Não voltar para powerlevel10k.** O starship renderiza em 10 ms aqui, e o README do p10k declara *"MOST BUGS WILL GO UNFIXED"*.
- **Não adotar `asdf` nem `proto`.** asdf continua shim-only com o imposto de `reshim`; proto não tem Terraform built-in.
- **Não instalar `delta`, `direnv`, `difftastic`.** Sem alegação de performance própria (delta), custo de manutenção alto e conflito declarado com mise (direnv), sem pacote e com crashes assumidos (difftastic).
- **Não trocar `keychain` por bridge para o agente do Windows.** O que existe é melhor pensado que a média e a alternativa custa latência de interop em cada operação git.
- **Não adotar Git Credential Manager.** `gh auth git-credential` já cobre, e não há Azure DevOps/Bitbucket no inventário.
- **Não montar stack de observabilidade OTLP.** `/cost` e `/context` bastam para um dev solo.
- **Não usar `stow`.** Pelo critério de reinstalação é a mais fraca das quatro opções.
- **Não ligar systemd agora.** Nada no fluxo atual precisa; só faz sentido se largar o Docker Desktop.
- **Não mover repositório para `/mnt/c`.** Medido: 325× mais lento para criar arquivos, e watchers de dev server silenciosamente não disparam.

### 7.3 Onde "o que você já tem está bom"

- **`keychain` para SSH agent** — a divisão TTY/`--noask` é exatamente a coisa certa em WSL2 e num fluxo agêntico (§5.6).
- **`gh auth git-credential` como helper de credencial** (§5.6).
- **Repos em ext4 nativo, não em `/mnt/c`** (§5.2).
- **`uv` para Python** — não traga o mise para isso (§1.4).
- **`rg`, `fzf`, `zoxide`, `eza`, `bat` instalados e integrados** — a única com justificativa agêntica documentada é o `rg`, e já está lá (§2.4).
- **A poda de `PATH` e o `typeset -U path` no `thiago-wsl.zsh`** — a técnica está certa, só falta cobrir mais entradas (§5.3).
- **`starship`** — 10 ms de render; não é o problema (§4.1).

### 7.4 Itens que NÃO consegui confirmar em fonte primária

Registrados para não virarem folclore citando este documento:

1. **A Microsoft não publica nenhum benchmark de `/mnt/c` vs. ext4.** Os números da §5.2 são meus, medidos nesta máquina. A orientação oficial é qualitativa.
2. **O custo de performance do `appendWindowsPath` não tem citação no Microsoft Learn** — a FAQ documenta só o risco funcional. [microsoft/WSL#4234](https://github.com/microsoft/WSL/issues/4234) foi fechada em ~3 minutos sem correção. Os 240 ms da §4.2 são medição minha.
3. **`wsl --manage --set-sparse` não está no Microsoft Learn** — só no release body da 2.0.0, no blog de set/2023 e no `wsl --help`.
4. **O `nvm` nunca documentou custo de startup**, e nunca endossou lazy loading. "nvm deixa o shell lento" é folclore.
5. **Os "~120 ms de overhead do asdf" são alegação do mise sobre o asdf**, anteriores ao rewrite em Go, e o próprio jdx as relativiza. O asdf não publica número próprio.
6. **`zoxide`, `bat`, `eza` e `delta` não fazem nenhuma alegação de performance nas próprias docs.**
7. **Não existe comparação p10k vs. starship em fonte primária alguma.**
8. **A doc do Claude Code se contradiz sobre o default de `USE_BUILTIN_RIPGREP`** (setup/troubleshooting vs. página de env vars).
9. **Nem chezmoi nem yadm documentam compartilhar um checkout entre host Windows e WSL.** Dois clones do mesmo remote é a forma praticável, mas é inferência.
10. **Não há página do chezmoi sobre gerenciar chaves SSH privadas.** O yadm tem — usa `.ssh/*.key` como *o* exemplo de criptografia.
11. **Não há guia oficial de integração do Bitwarden SSH agent com WSL**, nem guia da Microsoft para Podman em WSL.

---

## Fontes

**WSL / Microsoft** — [filesystems](https://learn.microsoft.com/en-us/windows/wsl/filesystems) · [wsl-config](https://learn.microsoft.com/en-us/windows/wsl/wsl-config) · [compare-versions](https://learn.microsoft.com/en-us/windows/wsl/compare-versions) · [systemd](https://learn.microsoft.com/en-us/windows/wsl/systemd) · [disk-space](https://learn.microsoft.com/en-us/windows/wsl/disk-space) · [compact-vdisk](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/compact-vdisk) · [WSL 2.0.0](https://github.com/microsoft/WSL/releases/tag/2.0.0) · [WSL 2.1.3](https://github.com/microsoft/WSL/releases/tag/2.1.3) · [WSL 2.9.3](https://github.com/microsoft/WSL/releases/tag/2.9.3) · [blog set/2023](https://devblogs.microsoft.com/commandline/windows-subsystem-for-linux-september-2023-update/) · issues [#4166](https://github.com/microsoft/WSL/issues/4166) · [#4234](https://github.com/microsoft/WSL/issues/4234) · [#4739](https://github.com/microsoft/WSL/issues/4739) · [#9636](https://github.com/microsoft/WSL/issues/9636)

**Claude Code** — [worktrees](https://code.claude.com/docs/en/worktrees.md) · [sandboxing](https://code.claude.com/docs/en/sandboxing.md) · [devcontainer](https://code.claude.com/docs/en/devcontainer.md) · [permission-modes](https://code.claude.com/docs/en/permission-modes.md) · [hooks](https://code.claude.com/docs/en/hooks.md) · [monitoring-usage](https://code.claude.com/docs/en/monitoring-usage.md) · [sessions](https://code.claude.com/docs/en/sessions.md) · [setup](https://code.claude.com/docs/en/setup) · [tools-reference](https://code.claude.com/docs/en/tools-reference) · [git-worktree](https://git-scm.com/docs/git-worktree) · [pnpm git-worktrees](https://pnpm.io/git-worktrees)

**Runtimes** — [mise](https://mise.jdx.dev/) ([shims](https://mise.jdx.dev/dev-tools/shims.html), [vs asdf](https://mise.jdx.dev/dev-tools/comparison-to-asdf.html), [direnv](https://mise.jdx.dev/direnv.html), [FAQ](https://mise.jdx.dev/faq.html), [SECURITY.md](https://github.com/jdx/mise/blob/main/SECURITY.md)) · [asdf](https://asdf-vm.com/guide/introduction.html) ([upgrade v0.16](https://asdf-vm.com/guide/upgrading-to-v0-16.html)) · [proto](https://moonrepo.dev/docs/proto) · [nvm](https://github.com/nvm-sh/nvm#readme) · [pyenv](https://github.com/pyenv/pyenv) · [uv python-versions](https://docs.astral.sh/uv/concepts/python-versions/) ([uv 0.8.0](https://github.com/astral-sh/uv/releases/tag/0.8.0)) · [tenv](https://github.com/tofuutils/tenv) · [aqua hashicorp/terraform](https://raw.githubusercontent.com/aquaproj/aqua-registry/main/pkgs/hashicorp/terraform/registry.yaml)

**Shell / prompt** — [zsh Completion System](https://zsh.sourceforge.io/Doc/Release/Completion-System.html) · [zsh Options](https://zsh.sourceforge.io/Doc/Release/Options.html) · [zsh/zprof](https://zsh.sourceforge.io/Doc/Release/Zsh-Modules.html#The-zsh_002fzprof-Module) · [oh-my-zsh](https://github.com/ohmyzsh/ohmyzsh) ([#11617](https://github.com/ohmyzsh/ohmyzsh/issues/11617), [PR #5842](https://github.com/ohmyzsh/ohmyzsh/pull/5842)) · [starship](https://starship.rs/config/) · [powerlevel10k](https://github.com/romkatv/powerlevel10k) · [gitstatus](https://github.com/romkatv/gitstatus) · [zsh_unplugged](https://github.com/mattmc3/zsh_unplugged) · [znap](https://github.com/marlonrichert/zsh-snap) · [zinit](https://github.com/zdharma-continuum/zinit)

**CLI** — [ripgrep](https://github.com/BurntSushi/ripgrep) ([benchmark](https://burntsushi.net/ripgrep/)) · [fd](https://github.com/sharkdp/fd) · [bat](https://github.com/sharkdp/bat) · [eza](https://github.com/eza-community/eza) / [exa](https://github.com/ogham/exa) · [zoxide](https://github.com/ajeetdsouza/zoxide) · [fzf](https://github.com/junegunn/fzf) · [delta](https://github.com/dandavison/delta) · [jq](https://github.com/jqlang/jq) · [mikefarah/yq](https://github.com/mikefarah/yq) vs [kislyuk/yq](https://github.com/kislyuk/yq) ([pacote noble](https://packages.ubuntu.com/noble/yq)) · [lazygit](https://github.com/jesseduffield/lazygit) · [difftastic](https://github.com/Wilfred/difftastic) · [gh manual](https://cli.github.com/manual/gh_auth_login)

**Dotfiles** — [chezmoi](https://www.chezmoi.io/) ([scripts](https://www.chezmoi.io/user-guide/use-scripts-to-perform-actions/), [pacotes declarativos](https://www.chezmoi.io/user-guide/advanced/install-packages-declaratively/), [FAQ encryption](https://www.chezmoi.io/user-guide/frequently-asked-questions/encryption/), [Windows/WSL](https://www.chezmoi.io/user-guide/machines/windows/)) · [yadm](https://yadm.io/docs/overview) · [GNU Stow](https://www.gnu.org/software/stow/manual/stow.html) · [bare repo (Atlassian)](https://www.atlassian.com/git/tutorials/dotfiles)

**Credenciais** — [keychain (Funtoo)](https://www.funtoo.org/Funtoo:Keychain) · [GCM WSL](https://github.com/git-ecosystem/git-credential-manager/blob/main/docs/wsl.md) · [1Password WSL](https://www.1password.dev/ssh/integrations/wsl/) · [wsl2-ssh-agent](https://github.com/mame/wsl2-ssh-agent) · [npiperelay](https://github.com/jstarks/npiperelay)
