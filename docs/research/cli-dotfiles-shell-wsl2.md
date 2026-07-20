# Research: CLI moderno, dotfiles e shell em WSL2

> **Procedência**: relatório produzido por um agente de research disparado durante o trabalho neste
> mapa, cuja sessão terminou antes de capturá-lo. Recuperado do transcript em disco e commitado
> **sem alteração de conteúdo** — nada aqui foi re-verificado na recuperação, e o texto é do agente,
> não meu. Alimenta [#53 — Toolchain da máquina](https://github.com/panlabs-tech/panlabs/issues/53) e, em parte, [#52](https://github.com/panlabs-tech/panlabs/issues/52).
>
> **Data da apuração**: 2026-07-20.
>
> O arquivo contém **dois blocos**: um relatório intermediário e, após o separador, a versão final e
> mais completa. O segundo supersede o primeiro, mas o primeiro é mantido porque traz detalhe que a
> síntese cortou.

---

Both agents returned. Compiling the full report.

---

# Developer tooling on WSL2 for an agentic (Claude Code) workflow — primary-source notes, 2026-07-20

## FRONT A — Modern CLI tools

### A.0 The two facts that decide everything for the agent angle

**1. Claude Code bundles its own ripgrep, and you can switch it to yours.** Official troubleshooting page: "If the Search tool, `@file` mentions, custom agents, or custom skills aren't finding files, the bundled `ripgrep` binary may not run on your system. Install your platform's `ripgrep` package… Then set `USE_BUILTIN_RIPGREP=0`… run `claude doctor` and check that the Search line shows the path of your system ripgrep instead of `OK (bundled)`" (https://code.claude.com/docs/en/troubleshooting). The bundled binary lives at `<install>/vendor/ripgrep/<arch>/rg` (https://github.com/anthropics/claude-code/issues/6415). The Grep tool "is built on ripgrep and uses ripgrep's regex syntax, not POSIX grep" and "respects `.gitignore`" (https://code.claude.com/docs/en/tools-reference). Note `USE_BUILTIN_RIPGREP` is referenced from troubleshooting but is **not** in the env-vars table (https://code.claude.com/docs/en/env-vars) — semi-documented.
   - WSL-specific caveat from the same page: "Disk read performance penalties when working across file systems on WSL may result in fewer-than-expected matches… `claude doctor` shows Search as OK in this case." Fix: keep projects on `/home/`, not `/mnt/c/`.

**2. Your shell aliases and functions ARE injected into every agent Bash call.** Verbatim: "Aliases and shell functions defined in your shell startup file are available. At session start, Claude Code sources `~/.zshrc`, `~/.bashrc`, or `~/.profile` depending on your shell, captures the resulting aliases, functions, and shell options, and applies them to every Bash command" (https://code.claude.com/docs/en/tools-reference). **So `alias ls=eza` / `alias cat=bat` are not cosmetic — they rewrite what the agent executes.**

**3. The read-only auto-approve list is coreutils names only.** "Claude Code recognizes a built-in set of Bash commands as read-only and runs them without a permission prompt in every mode. These include `ls`, `cat`, `echo`, `pwd`, `head`, `tail`, `grep`, `find`, `wc`, `which`, `diff`, `stat`, `du`, `cd`, and read-only forms of `git`. **The set is not configurable**" (https://code.claude.com/docs/en/permissions). `rg`, `fd`, `bat`, `eza`, `jq`, `dust`, `duf`, `procs` are **not** on it → each one triggers a permission prompt unless you add an allow rule. Combined with #2: aliasing `ls`→`eza` means the auto-approved `ls` silently runs a non-POSIX binary with different flag semantics.

**4. No TTY, and ANSI is expensive.** The Bash tool "runs each command in a separate process"; there is "no interactive TTY or stdin access" (https://github.com/anthropics/claude-code/issues/26353). Output cap 30,000 chars default, hard ceiling 150,000, tunable via `BASH_MAX_OUTPUT_LENGTH`; timeout 120s default / 600s max (https://code.claude.com/docs/en/tools-reference, https://code.claude.com/docs/en/env-vars). ANSI escapes are stored **unstripped** in context and have caused context overflow plus unrecoverable API errors — ~35KB of pure escape codes, closed as not-planned (https://github.com/anthropics/claude-code/issues/26373). **Conclusion: every byte of decoration is a byte of context you paid for.**

Mitigating good news: `rg`, `bat`, `fd`, `git` all default to `--color=auto` and detect non-TTY. ripgrep FAQ: "The `auto` value is the default and will cause ripgrep to only enable colors when it is printing to a terminal. But if you pipe ripgrep to a file or some other process, then it will suppress colors" (https://github.com/BurntSushi/ripgrep/blob/master/FAQ.md). bat README: when output is not interactive, "bat will act as a drop-in replacement for cat and fall back to printing the plain file contents, regardless of the `--pager` option's value" (https://github.com/sharkdp/bat). git: "When set to true or auto, use colors only when the output is to the terminal" (https://git-scm.com/docs/git-config).

### A.1 The eleven core tools

| Tool | Latest | Ubuntu 24.04 | Ubuntu 26.04 | Debian 13 | apt pkg name | Binary size |
|---|---|---|---|---|---|---|
| ripgrep | 15.2.0 (2026-07-15) | 14.1.0 | 15.1.0 | 14.1.1 | `ripgrep` | 1.73 MB tarball / 1.4 MB .deb |
| fd | 10.4.2 (2026-03-10) | 9.0.0 | 10.3.0 | 10.2.0 | `fd-find` (binary `fdfind`!) | 1.49 MB |
| bat | 0.26.1 (2025-12-02) | 0.24.0 | 0.25.0 | 0.25.0 | `bat` (binary `batcat` on older) | 2.2 MB .deb |
| eza | 0.23.5 (2026-07-09) | 0.18.2 | 0.23.4 | 0.21.0 | `eza` (13+/24.04+ only) | ~1.4–2.5 MB installed |
| zoxide | 0.10.0 (2026-07-04) | 0.9.3 | 0.9.8 | 0.9.7 | `zoxide` | small |
| fzf | 0.74.1 (2026-07-18) | **0.44.1** | 0.67.0 | 0.60.3 | `fzf` | ~3 MB |
| delta | 0.19.2 (2026-03-28) | 0.16.5 | 0.18.2 | 0.18.2 | **`git-delta`** | 2.51 MB .deb |
| jq | 1.8.2 (2026-06-20) | 1.7.1 | 1.8.1 | 1.7.1 | `jq` | tiny, zero runtime deps |
| yq (Go) | 4.53.3 (2026-06-06) | — | — | sid only | **`yq-go`** | Go binary |
| lazygit | 0.63.1 (2026-07-15) | **absent** | 0.57.0 | 0.50.0 | `lazygit` (Debian 13+/Ubuntu 25.10+) | ~6 MB |
| direnv | 2.37.1 (2025-07-20) | 2.32.1 | 2.37.1 | **2.32.1** | `direnv` | 7.77 MB |

Sources: repology per-project version pages (https://repology.org/project/ripgrep/versions, /fd-find/, /bat-cat/, /eza/, /zoxide/, /fzf/, /git-delta/, /jq/, /yq-go/, /lazygit/, /direnv/) plus each project's GitHub releases page.

**ripgrep** — solves: grep is slow and searches everything. Benchmarks from the author's own post (2016-09-23, https://burntsushi.net/ripgrep/): linux kernel literal search rg 0.334 s vs ag 1.588 s vs git grep 0.345 s; 1 GB single file rg 0.268 s vs GNU grep 0.516 s vs ag 2.730 s. README claims ~6x over Unicode-enabled grep on a 13 GB file (https://github.com/BurntSushi/ripgrep). Defaults: respects `.gitignore`, skips hidden and binary files and symlinks; `-u`/`-uu`/`-uuu` peel that back (https://github.com/BurntSushi/ripgrep/blob/master/GUIDE.md).
**Downside:** "ripgrep never was, isn't and never will be POSIX compatible" (FAQ). Its gitignore-by-default is a *silent-miss* hazard — a script ported from `grep -r` will quietly stop seeing generated/vendored files. README also warns binaries "contain debug symbols" and recommends `strip`.
**Agent verdict: MANDATORY.** Both as Claude Code's search backend (`USE_BUILTIN_RIPGREP=0`) and as a Bash tool. Add `Bash(rg *)` to your allow rules since it's not on the built-in read-only list.

**fd** — solves `find`'s syntax. README claims ~23x faster than `find -iregex`, ~13x vs `find -iname` over ~4M files (https://github.com/sharkdp/fd).
**Downside:** the Debian/Ubuntu binary is `fdfind`, not `fd`, "due to a naming conflict with another package"; README suggests `ln -s $(which fdfind) ~/.local/bin/fd`. Same gitignore-silent-miss problem as rg. The `.deb` from GitHub releases *does* name it `fd`.
**Agent verdict: useful but second-tier.** `find` is auto-approved and Claude Code's Glob tool already covers name search (and notably Glob does *not* respect gitignore by default, unlike Grep — https://code.claude.com/docs/en/tools-reference). Main value is `fd -x`/`-X` parallel exec.

**bat** — syntax highlighting, git modification gutter, line numbers, automatic paging.
**Downside:** interactively it pages through `less`; the paging is the whole point and also the whole risk. `BAT_PAGER` override exists. Ubuntu binary is `batcat` on older releases.
**Agent verdict: HUMAN ONLY, but harmless.** Because bat degrades to plain `cat` when stdout isn't a TTY, even an `alias cat=bat` won't corrupt agent output. It will however cost a permission prompt if the agent invokes `bat` by name. Genuinely useful as `MANPAGER="bat -plman"` and as an fzf preview.

**eza** — git status column, tree view, icons, hyperlinks, `theme.yml` (https://github.com/eza-community/eza). Maintained fork of `exa`, which carries the banner "exa is unmaintained, use the fork eza instead" and hasn't released since 0.10.1 (2021-04-12) — and "isn't archived because the only person with the rights to do so is unreachable" (https://github.com/ogham/exa).
**Downside — the sharpest in this list:** eza is not a drop-in `ls`. Confirmed from eza's own man page: in eza, `-t` means `--time=WORD` (choose which timestamp column to *show*); in GNU ls, `-t` means *sort by mtime* (https://github.com/eza-community/eza/blob/main/man/eza.1.md). So `ls -lt` under an alias does something entirely different, silently. There is an open request literally titled "feat: work as a drop-in ls replacement" (https://github.com/eza-community/eza/issues/736). Not in official Debian/Ubuntu until Debian 13 / Ubuntu 24.04; INSTALL.md still pushes the third-party `deb.gierens.de` repo (https://github.com/eza-community/eza/blob/main/INSTALL.md).
**Agent verdict: HUMAN ONLY — and do NOT alias `ls`.** `ls` is on Claude Code's auto-approved read-only list and your alias gets injected into every Bash call. Use `alias l=eza` or `alias ll='eza -l --git'` and leave `ls` alone. This is the single most likely way to confuse your agent.

**zoxide** — frecency-ranked `cd`. `eval "$(zoxide init zsh)"`. README explicitly: "Debian / Ubuntu derivatives update their packages very slowly. If you're using one of these distributions, consider using the install script instead." `zi` interactive mode needs fzf ≥ 0.51.0 (https://github.com/ajeetdsouza/zoxide).
**Downside:** it's a shell hook, so it's stateful and shell-coupled. For agents specifically: the `z` *function* gets captured into Claude Code's snapshot, but the `chpwd` hook that records directories does not fire — there are reports of `cd:1: command not found: __zoxide_z` and per-`cd` warnings inside Claude Code (https://github.com/anthropics/claude-code/issues/9633, https://github.com/anthropics/claude-code/issues/22118).
**Agent verdict: HUMAN ONLY.** Zero value to an agent that gets absolute paths anyway, and a small source of snapshot noise.

**fzf** — general-purpose fuzzy finder / interactive terminal toolkit; `source <(fzf --zsh)` gives CTRL-T, CTRL-R, ALT-C (https://github.com/junegunn/fzf).
**Downside:** it is fundamentally interactive — it opens `/dev/tty` and fails with "Failed to open /dev/tty" in non-TTY contexts (https://github.com/junegunn/fzf/issues/447). Ubuntu 24.04's 0.44.1 is ~30 releases stale.
**Agent verdict: HUMAN ONLY, and actively dangerous to the agent.** If Claude Code ever runs a command that reaches fzf's interactive path, it has no TTY and no stdin — best case an error, worst case a 120-second timeout burn. `--filter`/`-f` is the non-interactive escape hatch. Never put fzf inside a shell function the agent might call.

**delta** — syntax-highlighted pager for `git diff`/`grep`/`blame`, word-level diff via Levenshtein, side-by-side, `n`/`N` navigation, zdiff3 merge conflicts (https://github.com/dandavison/delta). Config:
```gitconfig
[core] pager = delta
[interactive] diffFilter = delta --color-only
[delta] navigate = true
```
**Downside — the packaging trap:** Debian already had a `delta` package (a Tigris test-case minimizer), so dandavison's tool is packaged as **`git-delta`** while installing a binary named `delta`; the `Provides: delta` declaration caused an actual conflict bug (https://github.com/dandavison/delta/issues/1210, https://packages.debian.org/sid/git-delta). `apt install delta` gets you the wrong program.
**Agent verdict: HUMAN ONLY, and safe by construction.** Git only invokes `core.pager` when stdout is a terminal, so the agent's `git diff` returns plain text. `interactive.diffFilter` only affects `git add -p`, which the agent can't drive anyway. Set it and forget it.

**jq** — the one unambiguous both-audiences tool. C, zero runtime dependencies. Transferred to the `jqlang` org after 2018–2023 dormancy; 1.8.2 released 2026-06-20 (https://github.com/jqlang/jq).
**Downside:** its own DSL is a real language you have to learn; error messages are terse. Debian 12's 1.6 predates a lot of syntax.
**Agent verdict: MANDATORY.** Every `gh api`, every JSON tool output. The agent writes jq well and it produces compact, deterministic, colorless-when-piped output.

**yq — get this right, it's genuinely two different programs:**
- **mikefarah/yq** (Go, v4.53.3): single portable binary, jq-like syntax over YAML/JSON/XML/CSV/TOML/HCL/properties (https://github.com/mikefarah/yq). Its README gives **no Debian/Ubuntu instructions and no warning about the name clash** — a real documentation failure.
- **kislyuk/yq** (Python, v4.1.2): "yq takes YAML input, converts it to JSON, and pipes it to jq" — a *wrapper that requires jq installed*. Ships `yq`, `xq`, `tomlq` (https://github.com/kislyuk/yq).
- **What apt actually gives you:** `apt install yq` on Debian sid and on **Ubuntu 26.04 (resolute) is the Python kislyuk one, version 3.4.3**, depending on `jq`, `python3`, `python3-xmltodict`, `python3-yaml`, `python3-tomlkit` (https://packages.debian.org/sid/yq, https://packages.ubuntu.com/resolute/yq). The Go one is packaged separately as **`yq-go`** and only reached Debian sid/testing and **Ubuntu 26.10** (https://repology.org/project/yq-go/versions). Ubuntu also has a `ppa:rmescandon/yq` and a mikefarah-published snap, adding two more ways to get a different `yq` (https://snapcraft.io/yq).
- **Downside:** the two are syntactically incompatible and both are ~3 versions behind in distros. Note kislyuk's is also on version "4.x" now, so version numbers don't disambiguate them either.
**Agent verdict: install mikefarah's Go binary from GitHub releases, not apt.** Pin it in your dotfiles so the agent's `yq` is deterministic. If you don't need YAML often, skip it — `yq -o=json | jq` is what you'd do anyway.

**lazygit** — TUI over git: staging hunks, interactive rebase without editing TODO files, stashing. README: `sudo apt install lazygit` only from "Debian 13 Trixie, Sid, and later, or Ubuntu 25.10 Questing Quokka and later"; otherwise curl the release tarball (https://github.com/jesseduffield/lazygit). Absent from Ubuntu 24.04 entirely.
**Downside:** pure TUI, requires an interactive terminal.
**Agent verdict: HUMAN ONLY, zero agent value.** It is however the best complement to an agentic workflow — reviewing and selectively staging what the agent wrote is exactly what lazygit is good at.

**direnv** — per-directory env via `.envrc`, loaded/unloaded on `cd`. Hook: `eval "$(direnv hook zsh)"` / `eval "$(direnv hook bash)"` (https://github.com/direnv/direnv/blob/master/docs/hook.md).
**The security prompt is the design, not a bug:** a new `.envrc` is refused with ".envrc is not allowed" until `direnv allow .` — because `.envrc` is arbitrary shell that would otherwise execute on `cd` into any cloned repo (https://direnv.net/). Also: "direnv is not loading the `.envrc` into the current shell. It's creating a new bash sub-process… and only exports the environment diff back" — **so aliases and functions cannot be exported**.
**Downside for agents — significant and specific:** direnv works via a *prompt hook*, and Claude Code's Bash tool "runs each command in a separate process" with no prompt. **Your `.envrc` will not be active in agent Bash calls.** Also "Environment variables don't persist. An `export` in one command won't be available in the next" (https://code.claude.com/docs/en/tools-reference). Workarounds: `direnv exec DIR COMMAND` (https://direnv.net/man/direnv.1.html), or Claude Code's own `CLAUDE_ENV_FILE` / a SessionStart hook (https://code.claude.com/docs/en/env-vars). Note Claude Code explicitly does **not** strip `direnv exec` as a permission wrapper: "a rule like `Bash(devbox run *)` matches whatever comes after `run`, including `devbox run rm -rf .`" (https://code.claude.com/docs/en/permissions). Debian 13 still ships 2.32.1 from 2022.
**Agent verdict: worth it for you, but understand it's invisible to the agent.** Activate your venv/env *before* launching Claude Code — which is the documented guidance.

### A.2 The secondary set (brief)

- **sd** (1.1.0, 2026-02-25) — sed replacement with JS/Python regex syntax, `-F` literal mode, in-place editing. Publishes ~2.35x (1.5 GB JSON) and ~11.93x (regex, 55 MB) speedups vs sed (https://github.com/chmln/sd). **Downside:** explicitly not a drop-in — "doesn't replicate sed's full command language". **Agent verdict: skip.** `sed` is a well-known quantity, the agent writes it correctly, and Claude Code's Edit tool is the right way to change files anyway (and `sed -n 'X,Yp'` on a single file even satisfies the read-before-edit check — https://code.claude.com/docs/en/tools-reference).
- **dust** (1.2.4, 2026-01-08) — `du` with a sorted visual tree, terminal-width-aware. apt/cargo name is `du-dust`, binary is `dust`, which clashes (https://github.com/bootandy/dust). **Downside:** the ASCII bar chart is decoration an agent must parse past; `du` is on the auto-approve list and `dust` isn't. **Human only. Worth it** — genuinely faster to read than `du -sh * | sort -h`.
- **duf** (0.9.1, 2025-09-08) — colorized `df` grouped into local/network/fuse/special, plus `--json`. `apt install duf` on Ubuntu 22.04+/Debian 12+ (https://github.com/muesli/duf). **Downside:** shallow value; you run `df` twice a month. `--json` is the only agent-friendly bit. **Marginal.**
- **procs** (0.14.12, 2026-06-25) — `ps` replacement with TCP/UDP ports, Docker container names, I/O throughput, tree view, watch mode (https://github.com/dalance/procs). **Downside:** no clear Debian/Ubuntu apt entry; colorized by default. **Human only, mildly worth it** if you debug port conflicts often.
- **hyperfine** (1.20.0, 2025-11-18) — statistical CLI benchmarking, warmup runs, outlier detection, export to CSV/JSON/Markdown/AsciiDoc; `-N`/`--shell=none` "to run a benchmark without an intermediate shell" for sub-5 ms commands. In Ubuntu apt (https://github.com/sharkdp/hyperfine). **Downside:** none really; it's a tool you use occasionally. **WORTH IT — and it's the correct instrument for Front C.** Both audiences: the agent can drive it and read the JSON.
- **tealdeer** (1.8.1, 2025-11-11) — Rust tldr client, mean 13.2 ms execution, second only to Zig's outfieldr; needs a cache (`tldr --update`) (https://github.com/tealdeer-rs/tealdeer). **Downside:** `tldr` name is shared with the Node.js client; cache goes stale silently. **Agent verdict: pointless for the agent** — Claude already knows the flags, and burning a Bash call on a tldr page is strictly worse than asking. Mild human value.
- **atuin** (18.17.1, 2026-07-14) — SQLite shell history with exit code, duration, hostname, session, cwd; full-screen fuzzy search; optional E2E-encrypted sync (hosted or self-hosted); rebinds Ctrl-R and Up (both configurable); "old history file is not replaced" (https://github.com/atuinsh/atuin). **Downside:** it's a Ctrl-R takeover plus a shell hook plus (optionally) a network service in your prompt path; the README documents no startup-cost figure. It also adds functions to the snapshot Claude Code replays. **Human only. Worth it if and only if you actually work across multiple machines** — otherwise you're paying hook cost and a sync service for a nicer Ctrl-R.

### A.3 Front A summary — the actual recommendation

| For the AGENT (install, allow-list, no aliases) | For the HUMAN (install, alias freely, never touch `ls`/`cat`/`grep`) | Skip |
|---|---|---|
| **ripgrep** + `USE_BUILTIN_RIPGREP=0` | eza, bat, lazygit, fzf, zoxide, delta, dust, procs, atuin | sd, tealdeer, duf |
| **jq** | | |
| **hyperfine** (both) | | |
| yq-go *if* you touch YAML | | |
| fd (marginal — Glob covers most) | | |

Three concrete rules:
1. **Never alias a coreutils name that's on Claude Code's read-only list** (`ls cat echo pwd head tail grep find wc which diff stat du cd`). Use new names (`l`, `lt`, `bcat`).
2. **Add explicit allow rules** for the modern tools you want the agent to use, e.g. `Bash(rg *)`, `Bash(jq *)`, `Bash(fd *)` — they are not auto-approved and the set is not configurable (https://code.claude.com/docs/en/permissions).
3. **Prefer apt on Ubuntu 26.04, GitHub releases on 24.04.** 26.04 is close to upstream for everything except delta/lazygit/eza; 24.04's fzf (0.44.1) and delta (0.16.5) are badly stale, and lazygit + chezmoi are absent.

---

## FRONT B — Dotfiles: chezmoi wins, and it isn't close on the stated criterion

### The decisive criterion is bootstrap-from-zero, and only one tool has zero prerequisites

chezmoi's own comparison table lists bootstrap requirements as **None** for chezmoi, versus `git` for yadm and bare-git, and `Python, git` for dotbot (https://www.chezmoi.io/comparison-table/). That's not marketing: `useBuiltinGit` defaults to `auto` = "Use builtin git if `git` command is not found in `$PATH`", and `useBuiltinAge` likewise (https://www.chezmoi.io/reference/configuration-file/variables/). On a bare distro with no git, `chezmoi init --apply` still clones and decrypts.

### chezmoi

**Model.** Source state in `~/.local/share/chezmoi` (a plain git repo), target `$HOME`, persistent state in `~/.config/chezmoi/chezmoi.boltdb` (https://www.chezmoi.io/reference/configuration-file/variables/, https://www.chezmoi.io/quick-start/). Files are written as **real files**, not symlinks (https://www.chezmoi.io/comparison-table/) — which sidesteps the entire symlink-clobbering failure class that kills stow.

**Attributes** (https://www.chezmoi.io/reference/source-state-attributes/): `dot_` → leading dot; `private_` → strip group/world perms; `readonly_`; `executable_`; `encrypted_`; `symlink_`; `create_` (seed once, never touch again); `modify_` (contents are a script that transforms the existing file); `exact_` (dir: remove anything unmanaged); `empty_`, `literal_`, `remove_`, `external_`. Suffixes `.tmpl` and `.literal`.

**Templating & WSL detection.** Built-ins include `.chezmoi.os`, `.chezmoi.arch`, `.chezmoi.hostname`, `.chezmoi.osRelease`, and `.chezmoi.kernel` — the docs say `.chezmoi.kernel` is "useful for detecting specific kernels (e.g. Microsoft's WSL kernel)" (https://www.chezmoi.io/reference/templates/variables/). The maintainer-sanctioned idiom (https://github.com/twpayne/chezmoi/issues/1347):
```
{{ if (and (eq .chezmoi.os "linux") (.chezmoi.kernel.osrelease | lower | contains "microsoft")) }}
# WSL-specific
{{ end }}
```
Your kernel `6.6.87.2-microsoft-standard-WSL2` matches. **Downside: it's a string sniff, not a first-class fact** — WSL1-vs-WSL2 discrimination is an open issue (https://github.com/twpayne/chezmoi/issues/4942), and `not contains` misbehaves inside `.chezmoiignore` (https://github.com/twpayne/chezmoi/issues/1192).

**Secrets.** 17 documented backends: 1Password, Bitwarden, pass, gopass, KeePassXC, LastPass, Dashlane, Doppler, Keeper, Proton Pass, Vault, AWS Secrets Manager, Azure Key Vault, ejson, passhole, system keychain, custom (https://www.chezmoi.io/user-guide/password-managers/). Whole-file encryption via age (`chezmoi age-keygen`, `encryption = "age"` with identity/recipient; multiple recipients, symmetric, passphrase modes — https://www.chezmoi.io/user-guide/encryption/age/) or gpg. It is the only tool in the comparison table with ✅ for password-manager integration.

**Externals** — `.chezmoiexternal.toml` with types `file`/`archive`/`archive-file`/`git-repo`, plus `refreshPeriod`, `stripComponents`, `executable`, `checksum.sha256` (https://www.chezmoi.io/reference/special-files/chezmoiexternal-format/). This is how you vendor `age`, `fzf`, zsh plugins, or any of Front A's GitHub-release-only binaries without submodules — directly relevant given how many Front A tools you should *not* get from apt.

**Scripts** (https://www.chezmoi.io/user-guide/use-scripts-to-perform-actions/): `run_once_` hashes contents into the state DB so it never re-runs; `run_onchange_` re-runs when contents change and **templates are rendered before hashing**, so a changed variable retriggers. Ordering is alphabetical with `before_`/`after_` modifiers. A `.tmpl` script that renders to whitespace is skipped — that's the per-OS conditional idiom.

**Version/size.** v2.71.1 released **today, 2026-07-20**; cadence every 2–4 weeks (https://github.com/twpayne/chezmoi/releases). Single static Go binary, ~15.7 MB.

**apt is worse than the docs imply.** The install page shows `apt-get install chezmoi` under Debian, but chezmoi is **absent from every released Ubuntu** (noble and questing both "No such package"; only `stonking`/26.10 has 2.71.0-5 — Launchpad publishing history) and **Debian sid only**, not trixie (https://packages.debian.org/sid/chezmoi). On a fresh WSL Ubuntu LTS, `apt install chezmoi` fails outright.

**Honest costs:**
- **Source-vs-target indirection is permanent.** `~/.zshrc` and `~/.local/share/chezmoi/dot_zshrc` are two files, forever. Every edit is `chezmoi edit --apply` or edit-then-`re-add`.
- **`chezmoi re-add` does not work on templates.** "chezmoi will not overwrite templates" (https://www.chezmoi.io/reference/commands/re-add/). Once a file is `.tmpl`, the round trip is one-way — this is the biggest daily tax.
- **`chezmoi edit --watch` is fragile on WSL:** it requires `edit.hardlink`, and hardlinks "cannot span different filesystems, so if your temporary directory resides on a separate filesystem (like tmpfs), this feature won't function" (https://www.chezmoi.io/reference/commands/edit/). `/tmp` on tmpfs is the WSL default.
- **The one-liner installs relative to CWD** — "install the correct binary … in `./bin`". Run it from the wrong directory and the binary lands somewhere useless.
- Go `text/template` learning curve; `chezmoi execute-template` is the debugger. Ecosystem-of-one maintainer (mitigated: your source dir is just a git repo of readable files).

### Bare git repo

Origin is StreakyCobra's HN comment, 2016-02-10 (https://news.ycombinator.com/item?id=11071754), popularized by Atlassian (https://www.atlassian.com/git/tutorials/dotfiles):
```sh
git init --bare $HOME/.cfg
alias config='/usr/bin/git --git-dir=$HOME/.cfg/ --work-tree=$HOME'
config config --local status.showUntrackedFiles no
```
`status.showUntrackedFiles no` is mandatory or `config status` lists every unmanaged file in `$HOME`.

**Downsides:**
- **It fails precisely on the reinstall scenario.** A fresh distro isn't empty — it ships `.bashrc`, `.profile`, `.bash_logout` — so `config checkout` aborts with "The following untracked working tree files would be overwritten by checkout". The canonical workaround **parses git's human-readable error message with egrep/awk and `mv`s the results**. It breaks on filenames with spaces and on localized git output.
- `git clone --bare` doesn't set `remote.origin.fetch`, so pull/fetch misbehave until you add the refspec manually — omitted by nearly every tutorial (https://morgan.cugerone.com/blog/workarounds-to-git-worktree-using-bare-repository-and-cannot-fetch-remote-branches/).
- The `showUntrackedFiles no` you need for usability is the same setting that hides new dotfiles forever. You find out they were never committed *after* the reinstall.
- **No private/encrypted/password-manager story at all** (❌❌❌ in https://www.chezmoi.io/comparison-table/). One reflexive `config add -A` in `$HOME` stages `~/.ssh/id_ed25519`, `~/.aws/credentials`, and `~/.claude.json` — which per https://code.claude.com/docs/en/settings "contains your OAuth session, MCP server configurations… per-project state… and various caches."
- No templating (per-machine branches → permanent merge conflicts), no run-once scripts.
- **The nuance most write-ups miss:** because the repo is *bare*, there's no `~/.git`, so tools that walk up looking for a repo won't treat `$HOME` as a work tree — you avoid the `git init $HOME` disaster. The flip side is the real cost: **your dotfiles get zero editor/IDE/agent git integration.** The `config` alias exists only in your interactive shell. For an agentic workflow where you want Claude Code to diff and commit config changes, that's a genuine handicap.
- The alias is itself a dotfile — chicken-and-egg on every bootstrap.

### GNU stow

Symlink farm manager (https://www.gnu.org/software/stow/manual/stow.html). `stow -d ~/dotfiles -t ~ nvim`; `-R` restow, `-D` delete, `--dotfiles` translates `dot-bashrc` → `.bashrc`.

**Downsides:**
- **`--adopt` carries its own warning:** "Warning! This behaviour is specifically intended to alter the contents of your stow directory. If you do not want that, this option is not for you." It overwrites your repo's version with whatever's in `$HOME`.
- **Tree folding reshapes `$HOME` silently.** If `~/.config` doesn't exist and your package contains `.config/nvim/`, Stow symlinks *all of* `~/.config` into your repo, so every future app writes its config into your dotfiles repo. `--no-folding` disables it.
- **Symlinks get clobbered by atomic-save apps.** The definitive case is VS Code: "Instead of updating the file in-place… VS Code wipes the file and creates a whole new file… changes the inode number" (https://github.com/microsoft/vscode/issues/195539, also #194856, #200474). Any tool doing tmp-file + `rename()` turns your symlink into a regular file and silently detaches it. (Counter-example: git *is* symlink-safe — it resolves symlinks before locking, so `git config --global` writes through a symlinked `~/.gitconfig`.)
- No templating, no secrets, no bootstrap. Fresh WSL means `apt install git stow` → clone → and stow conflicts on every stock dotfile Ubuntu shipped.
- **Maintenance:** release dates from https://ftp.gnu.org/gnu/stow/ — 2.2.2 (2015-11), 2.3.0 (2019-06), 2.4.0 (2024-04), **2.4.1 (2024-09-08), nothing since** (~22 months). And 2.4.0's headline fix was "a long-standing bug preventing the `--dotfiles` option from working correctly with directories" — the flagship dotfiles feature was broken for years (https://git.savannah.gnu.org/cgit/stow.git/plain/NEWS). Perl dependency.

### yadm

Bash wrapper around git; repo at `$HOME/.local/share/yadm/repo.git`, work tree `$HOME` (https://yadm.io/docs/overview).

**Its one genuinely superior feature for you:** WSL is a first-class OS value. Verbatim from https://yadm.io/docs/alternates: *"The OS for 'Windows Subsystem for Linux' is reported as 'WSL', even though uname identifies as 'Linux'."* So `.zshrc##os.WSL` just works — strictly nicer than chezmoi's `contains "microsoft"` sniff.

Alternates syntax `file##attr.value,attr.value` over `os`/`hostname`/`class`/`distro`/`distro_family`/`user`/`template`. Templates via `##template.default` (built-in), `##template.esh`, `##template.j2` (j2cli or envtpl) (https://yadm.io/docs/templates). Encryption: patterns in `$HOME/.config/yadm/encrypt`, `yadm encrypt` bundles matches into a single gpg/openssl archive you commit (https://yadm.io/docs/encryption). Bootstrap: executable `$HOME/.config/yadm/bootstrap`, run via `yadm clone --bootstrap <url>` (https://yadm.io/docs/bootstrap).

**Downsides:**
- **Development has stalled.** Latest tag 3.5.0, **2025-03-03**; top commit on master is that same release — ~16 months of no commits (https://github.com/TheLocehiliosan/yadm/tags, /commits/master). The GitHub Releases tab is empty ("There aren't any releases here") — tags only, so no prebuilt artifact to curl. Compare chezmoi: released today.
- **Alternates duplicate whole files.** `##os.Linux` + `##os.Darwin` + `##os.WSL` = three near-identical copies. Templates fix that, but the good processors (j2cli/envtpl/esh) are extra dependencies you must install *before* bootstrap, undercutting the "just git" pitch.
- **Alternates are implemented as symlinks** → inherits the whole VS-Code-atomic-write breakage class, for exactly the files you made machine-specific.
- Coarse encryption: one opaque `archive` blob you can't diff, and you must remember to re-run `yadm encrypt` + recommit after every secret change.
- No password-manager integration. Requires git present to bootstrap, and yadm itself installed first — two steps where chezmoi has one.

### Other contenders (one line each)

- **nix home-manager** — the maximalist option; manages packages *and* config together, atomic rollbacks. **Cost:** you must install and understand Nix first (`nix-channel --add`, `nix-shell '<home-manager>' -A install`, source `hm-session-vars.sh`; https://nix-community.github.io/home-manager/installation/standalone.html) — a new language, a multi-GB store, channel-vs-flake schisms, a `stateVersion` you must not get wrong. For a WSL box whose job is running Claude Code, you're buying a distro-management system to solve a dotfile problem.
- **dotbot** — YAML plan, but installs as a **git submodule** and needs Python + git to bootstrap; ❌ on private files, encryption, templating, run-once (https://www.chezmoi.io/comparison-table/).
- **rcm** (thoughtbot) — well-documented shell scripts, symlink-based, ❌ on private files/encryption/templates.
- **vcsh** — many git repos coexisting in `$HOME` without symlinks; per-machine via branches only.
- **dotter** — Rust, Handlebars templating, portable binary; smallest community of the templating tools.
- **Mackup** — popular but it's a *sync* tool for known apps, not a bootstrapper.

### Decision framework

| Profile | Tool | Price |
|---|---|---|
| One machine, never reinstalls, wants zero abstraction | bare git | The reinstall you say you'll never do is exactly what breaks it; one `add -A` leaks secrets |
| Many machines, few per-machine diffs, mostly installed software | stow | Symlinks clobbered by atomic-save apps; tree folding reshapes `$HOME`; no bootstrap; upstream stale since 2024-09 |
| Wants git muscle memory + WSL variants + some encryption | yadm | Best ergonomics-per-concept, native `##os.WSL` — but 16 months without a commit, duplicated files, coarse encryption |
| **Reinstalls WSL; agentic workflow; needs secrets + per-machine config + one-command rebuild** | **chezmoi** ✅ | Permanent source/target indirection; `re-add` won't touch templates; Go template syntax |
| Wants the whole machine reproducible | nix home-manager | Nix, forever |

### Bootstrap on a fresh WSL Ubuntu, from zero

Windows side: `wsl --install -d Ubuntu`

Inside the new distro — **the single command**:
```sh
cd ~   # the installer writes relative to CWD
sh -c "$(curl -fsLS https://get.chezmoi.io/lb)" -- init --apply <github-user>
```
`/lb` installs into `./.local/bin` instead of `./bin` (https://www.chezmoi.io/install/). Public repo → no auth and **no git required** (`useBuiltinGit=auto`). Then `export PATH="$HOME/.local/bin:$PATH"` (or start a login shell) and verify with `chezmoi doctor` → `chezmoi status` → `chezmoi diff`.

**Do not use apt for chezmoi** — absent from all released Ubuntu and from Debian stable.

The one secret you must carry out-of-band is your **age identity file**; copy it from `/mnt/c/...` or a password manager *before* the first apply and point `age.identity` at it (https://www.chezmoi.io/user-guide/encryption/age/). Everything else goes in `run_once_before_*.sh.tmpl` and `.chezmoiexternal.toml` — including all the Front A binaries that apt has stale or missing (lazygit, delta, eza, yq-go, chezmoi-adjacent tooling).

**Claude Code specifics for your source state** (paths per https://code.claude.com/docs/en/settings):
- Manage `dot_claude/settings.json`, `dot_claude/CLAUDE.md`, `dot_claude/agents/`, `dot_claude/commands/`.
- **Never manage `~/.claude.json`** — it "contains your OAuth session, MCP server configurations… per-project state… and various caches." Put it in `.chezmoiignore`. Under stow it would be a symlink Claude Code's own writes would detach; under bare git it's one `add -A` from being published.

---

## FRONT C — Shell & prompt

### C.0 The framing fact that reorders the usual advice

**zsh reads `~/.zshrc` only for interactive shells** (https://zsh.sourceforge.io/Doc/Release/Files.html). So `zsh -c 'cmd'` pays zero oh-my-zsh cost, and prompt cost is zero because precmd hooks only fire when a prompt is drawn.

**But Claude Code deliberately defeats that** — it sources `~/.zshrc` at session start and replays the captured aliases/functions/setopts into every Bash call (https://code.claude.com/docs/en/tools-reference). So your cost model is: *one* full `.zshrc` execution per session, plus a **per-Bash-call replay of the captured function table**. Reported mechanism: each captured function is replayed as its own `eval "$(echo '<base64>' | base64 -d)"` — one fork per function (https://github.com/anthropics/claude-code/issues/50733).

That's measured, and it's ugly. Issue #31437 (closed as not planned, https://github.com/anthropics/claude-code/issues/31437): the snapshot grew from ~4 KB / 4 evals to **195 KB / 199 evals** because capture bypassed the standard `case $- in *i*) ;; *) return;; esac` guard and swallowed 194 completion functions. Reporter's measurement (macOS, not WSL): **7.8 s to source the new snapshot vs 0.26 s for the old**, verified as pure fork cost by timing 199 *empty* function evals at ~8 s.

**Implication: your metric is snapshot size — function and alias count — not first-prompt lag.** That inverts every zsh perf blog. Related closed-without-fix issues: OMZ's `omz_urlencode` causing `parse error near '()'` on every command (#1872); OMZ's `alias -- -='cd -'` re-emitted as `alias -- -- -='cd -'` printing an error on every single command (#38197); `setopt rcquotes` breaking escaping (#18572); snapshot omitting `chpwd_functions`/`precmd_functions` so zoxide warns on every `cd` (#22118); p10k producing a 196 KB / 146-function snapshot with dangling refs (#9633).

**Highest-value single change: put a non-interactive guard in `.zshrc` before completion/plugin/prompt setup**, so snapshot capture can't sweep in hundreds of completion functions. Anthropic has closed every one of these as not-planned; it is permanently your problem.

**WSL2 baseline tax:** Microsoft's own guidance — "We recommend against working across operating systems with your files… Use the Linux file system root directory: `/home/<user name>/Project`. Not… `/mnt/c/...`" (https://learn.microsoft.com/en-us/windows/wsl/filesystems). microsoft/WSL#5696 measured **~2 s** for simple commands with `/mnt/c` entries in `PATH`, because exec lookups traverse 9p. No prompt or plugin manager fixes that.

### C.1 Oh-my-zsh startup cost — real numbers

**zsh-bench** (romkatv — flag: he authors powerlevel10k), raw ms, Threadripper 3970X / Ubuntu 22.04 / NVMe, 2023-02-27 (https://raw.githubusercontent.com/romkatv/zsh-bench/master/doc/linux-desktop.txt). Test repo: 1,000 dirs / 10,000 files.

| config | first prompt | first cmd | cmd lag | input lag | **exit time** |
|---|--:|--:|--:|--:|--:|
| no-rcs | 1.3 | 1.5 | 0.09 | 0.11 | **1.4** |
| compsys (`compinit` only) | 18.3 | 18.5 | 0.10 | 0.12 | 19.2 |
| git-branch (handwritten) | 15.9 | 16.1 | 4.97 | 0.11 | 1.3 |
| agnoster | 32.6 | 32.7 | 24.37 | 0.11 | 2.4 |
| starship | 41.1 | 41.4 | 35.40 | 0.11 | 6.5 |
| powerlevel10k | 1.9 | 20.6 | 1.85 | 0.14 | 6.3 |
| **ohmyzsh (stock)** | **93.3** | 96.0 | **36.59** | 0.34 | **53.9** |
| prezto | 48.6 | 52.4 | 1.34 | 0.29 | 47.0 |
| zim | 61.0 | 78.9 | 19.11 | 12.83 | 31.6 |

**Read the `exit time` column as yours** — it's the closest published proxy for a workload dominated by shell *invocation*. **OMZ 53.9 ms vs no-rcs 1.4 ms (~38x)** on a Threadripper with NVMe; worse on WSL2.

Crucially, romkatv also shows **OMZ is not inherently slow** — his `ohmyzsh+` config (only needed plugins, p10k, tmux) hits 4.8 ms first prompt / 39.2 ms exit, and he concludes verbatim: *"All plugin managers and frameworks have good performance when configured properly. This includes ohmyzsh, despite a commonly held opinion that it's slow."*

**Where the time goes**, from reading https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/oh-my-zsh.sh:
- `compinit` runs unconditionally, **no `-C`**: `compinit -i -d "$ZSH_COMPDUMP"`.
- **A `git rev-parse HEAD` subprocess on every startup** to build zcompdump metadata; if the recorded revision or `$fpath` differs, the dump is deleted and fully rebuilt.
- **Open bug makes that misfire:** #12952 (open since 2025-01-31, https://github.com/ohmyzsh/ohmyzsh/issues/12952) — "`$fpath` is different everytime" due to duplicated entries, forcing a full compdump every shell. Fix is `fpath=(${(uo)fpath})`. A zprof in that thread shows `_omz_source` 23 calls / 1071 ms cumulative.
- **Every lib file is sourced, always** — 22 files, including `cli.zsh` (27 KB) and `diagnostics.zsh` (11.7 KB) you never use.
- `compaudit` runs unless `ZSH_DISABLE_COMPFIX=true`.
- OMZ already does `zrecompile -q -p "$ZSH_COMPDUMP"` — the `zcompile` trick, but only for the compdump.

**The auto-update check does a network call.** `tools/check_for_upgrade.sh` is sourced every load; default mode `prompt`, default frequency 13 days; when due it hits `https://api.github.com/repos/ohmyzsh/ohmyzsh/commits/${branch}` with `curl --connect-timeout 2`. Measured in issue #11617: `is_update_available` = **322.84 ms = 71.43% of total** (https://github.com/ohmyzsh/ohmyzsh/issues/11617). Kill it: `zstyle ':omz:update' mode disabled` before sourcing.

**Git-in-prompt cost.** `parse_git_dirty` runs `git status --porcelain`. Knobs, best first:
```zsh
DISABLE_UNTRACKED_FILES_DIRTY=true      # adds --untracked-files=no
GIT_STATUS_IGNORE_SUBMODULES=dirty
# per-repo, no .zshrc edit needed — great for a monorepo:
git config --add oh-my-zsh.hide-dirty 1
git config --add oh-my-zsh.hide-info 1
```
zsh-bench quantifies it: zim, alone among frameworks in not detecting untracked files, has "approximately half the command lag of ohmyzsh". **Async prompt is on by default** since 2024-04-03 (`zstyle -T ':omz:alpha:lib:git' async-prompt`, true when unset), but OMZ's own README calls it "an experimental feature… it might not work well with some setups" and it forks a subshell per handler per precmd.

Third-party corroboration: JonLuca measured 3.14 s → 0.42 s, OMZ ≈70% of load time, compsys family dominating zprof (compdump 33.99%, compinit 32.93%, compdef 22.73%) — https://jonlu.ca/posts/speeding-up-zsh.

**Measurement snippets:**
```zsh
time zsh -i -c exit                                    # naive
for i in $(seq 1 10); do /usr/bin/time zsh -i -c exit; done
hyperfine --warmup 3 --runs 20 -N 'zsh -i -c exit'     # proper stats

# zprof — function-level
zmodload zsh/zprof     # top of .zshrc
zprof                  # bottom of .zshrc
# conditional variant so normal sessions aren't profiled:
if [[ -n $ZSH_PROF ]]; then zmodload zsh/zprof; fi
# run: ZSH_PROF=1 zsh -ic zprof

# line-level, catches top-level code zprof can't see (needs moreutils)
zsh -xv 2>&1 | ts -i "%.s" > zsh_startup.log
sort -t' ' -r -k1 zsh_startup.log | head -40
```
**zprof's blind spot, from the manual:** "the `zsh/zprof` causes shell **functions** to be profiled" (https://zsh.sourceforge.io/Doc/Release/Zsh-Modules.html) — it does *not* attribute top-level `.zshrc` code or `source` of non-function files, which is exactly where OMZ's `for lib_file` loop lives. Use the `zsh -xv | ts` method for that.

**`time zsh -i -c exit` caveat, verbatim from romkatv:** "The output of `time zsh -lic \"exit\"` tells you how long it takes to execute `zsh -lic \"exit\"` and nothing else." Agnoster shows 2 ms exit but 32 ms first-prompt lag; p10k shows 6 ms exit but 1.9 ms first-prompt. "Many zsh plugin managers have been optimized for fast `exit`… The widely held belief that zinit is the fastest plugin manager is based on the timing of `exit`" (https://github.com/romkatv/zsh-bench#how-not-to-benchmark). **For your agent workload it's still the least-bad single number — just know what it does and doesn't mean.**

### C.2 Plugin managers

**Third-party load-time benchmark** (sheldon's author — flag the bias, but raw hyperfine JSON is public), 23 plugins, M2 Max, **no deferred loading** (https://github.com/rossmacarthur/zsh-plugin-manager-benchmark):

| manager | load (mean) | install (mean) |
|---|--:|--:|
| base (none) | **12.2 ms** | 0.01 s |
| zimfw | 31.1 ms | 7.87 s |
| zgenom | 47.0 ms | 25.63 s |
| **sheldon** | 48.4 ms | 7.14 s |
| **antidote** | 48.6 ms | **2.87 s** |
| antibody ⚠️archived | 49.3 ms | 4.89 s |
| **zinit** | **151.3 ms** | **34.18 s** |
| **zplug** | **165.0 ms** | 8.85 s |

Project's own summary: "antibody, antidote, antigen, sheldon, zimfw all have excellent performance… zinit, zplug and zpm have notably bad load time performance." **Fairness caveat it states itself:** no deferred loading was used, so zinit's entire pitch isn't represented.

**zinit** (zdharma-continuum/zinit) — v3.15.0, 2026-07-01, genuinely active. Turbo syntax (https://github.com/zdharma-continuum/zinit#turbo-and-lucid):
```zsh
zinit ice wait lucid           # wait = wait"0"; lucid suppresses "Loaded X"
zinit light zsh-users/zsh-autosuggestions
zinit ice wait"2"              # or a delay
zinit wait lucid atload'_zsh_autosuggest_start' light-mode for zsh-users/zsh-autosuggestions
```
`wait'!0'` resets the prompt after loading — **required for themes**. OMZ loading:
```zsh
zinit snippet OMZL::git.zsh              # lib
zinit snippet OMZP::git                  # plugin
zinit snippet OMZT::gnzh                 # theme
zinit ice as"completion"; zinit snippet OMZP::docker/_docker
zinit ice svn; zinit snippet OMZP::gitfast   # svn = whole subdirectory
zinit wait lucid for OMZL::git.zsh atload"unalias grv" OMZP::git   # turbo for-syntax
```
**Its claim: "50-80% faster Zsh startup (i.e., the shell will start up to 5 times faster!)".** Source that claim carefully — it comes from zinit's own harness https://github.com/zdharma-continuum/pm-perf-test, whose `run.zsh` measures literally `ZDOTDIR=$PWD zsh -i -c exit`. That's the metric romkatv dismantled, naming zinit: "Unsurprisingly, zinit has been optimized for it."

**The trust story — verified, and it matters.** The original `github.com/zdharma` org was deleted by its owner (psprint). Primary source is https://github.com/zdharma-continuum/I_WANT_TO_HELP, headed "Status of zinit as of 11/01/2021", preserving the owner's own words: *"I'm the projects' owner and I can delete them anytime I want. And that just happened – I've had some say major doubts whether I want the time-consuming projects to go on, so I've deleted them."* and the founding comment of the continuation org: *"I no longer trust /u/psprint2 as a maintainer… He has demonstrated his complete unreliability twice now."* Corroboration: `zdharma-continuum` org created 2021-10-30; downstream project filed "Zdharma has been deleted from Github" on 2021-11-01 (https://github.com/MenkeTechnologies/zpwr/issues/6). First deletion ~March 2020. `github.com/zdharma/zinit` exists again today but is a 130-star stub.
**Other downsides:** ~564 KB of shell code (zsh_unplugged counts "approximately 8,682 lines of Zsh code… versus the 30-line alternative", https://github.com/mattmc3/zsh_unplugged); worst install time in the benchmark (34 s); and per romkatv it "cannot cleanly use Instant Prompt" because it lacks a separate install-vs-load API.

**antidote** (mattmc3/antidote) — v2.1.0, 2026-04-09, last commit 2026-07-19. Lineage, verbatim (https://antidote.sh/history): "The original Antigen plugin manager was slow. Antibody was written to address this, but was written in Go, not Zsh… So Antidote was created to carry on." antibody is confirmed archived (last push 2022-05-27).

**The static bundle — the key property for you** (https://github.com/mattmc3/antidote#performance):
```zsh
zsh_plugins=${ZDOTDIR:-$HOME}/.zsh_plugins
if [[ ! ${zsh_plugins}.zsh -nt ${zsh_plugins}.txt ]]; then
  ( source /path-to-antidote/antidote.zsh
    antidote bundle <${zsh_plugins}.txt >${zsh_plugins}.zsh )
fi
source ${zsh_plugins}.zsh
```
In steady state your `.zshrc` sources **one flat generated file** and antidote never runs. OMZ loading:
```
getantidote/use-omz                          # handles OMZ dependencies
ohmyzsh/ohmyzsh path:lib
ohmyzsh/ohmyzsh path:plugins/git
zsh-users/zsh-autosuggestions kind:defer     # uses romkatv/zsh-defer
```
Annotations: `path:`, `kind:` (`path`/`defer`/`fpath`/`clone`), `branch:`, `conditional:`, `autoload:`. Perf claims are deliberately modest — it defers to zsh-bench rather than publishing its own numbers. zsh-bench `antidote`: 4.8 ms first prompt / **27.8 ms exit**.
**Downsides:** you must remember to regenerate — the `-nt` check catches `.txt` edits but a plugin *update* doesn't change the `.txt` mtime; `path:lib` still pulls all 22 OMZ lib files; `kind:defer` inherits zsh-defer's caveats.

**zplug — verified stale.** Last release **2.4.2, 2017-12-28** (8.5 years). Commits: 2019-03-27, 2023-03-22, then 22 housekeeping commits all on 2026-03-04 by the original author — including "docs: add CLAUDE.md and AGENTS.md for AI-assisted development" and "chore: remove deprecated CI configs, broken links, and leaked token". No release followed. Slowest load in the sheldon benchmark (165 ms). romkatv's nuanced take: "From the 'pure' plugin managers I've tested zplug has the best API but it's also the slowest" — the API praise is because it separates install from load, which is what makes p10k Instant Prompt work correctly.

**sheldon** (rossmacarthur) — Rust, TOML `plugins.toml`, one line: `eval "$(sheldon source)"`. Commands `init`/`lock`/`source`/`add`/`edit`/`remove`; `lock` produces `plugins.lock`, `source` emits the script (locking first if config changed). v0.8.5, 2025-07-22; last commit 2026-07-01.
**Downsides:** no async/deferred loading, no `compinit` management, no OMZ shortcut syntax. And `eval "$(sheldon source)"` **forks the Rust binary on every interactive shell**, where antidote's static file is a plain `source` of text. Not in zsh-bench.

**Plain zsh + zcompile — the baseline.** zsh_unplugged's argument: "You don't need a big bloated plugin manager for your Zsh plugins" — ~30 lines of zsh replace one (https://github.com/mattmc3/zsh_unplugged). romkatv independently agrees: *"Plugin managers cannot beat diy++ on performance unless they cut corners… **The value provided by a plugin manager is convenience, not speed.**"*

`zcompile`, verbatim from the manual: "This builtin command can be used to compile functions or scripts, storing the compiled form in a file… This allows faster autoloading of functions and sourcing of scripts by avoiding parsing of the text when the files are read" (https://zsh.sourceforge.io/Doc/Release/Shell-Builtin-Commands.html). Output is `file.zwc`; `source` uses it if "a file named 'file.zwc' is found, **is newer than file**".

**Two traps romkatv documents and recommends against** (https://github.com/romkatv/zsh-bench#cutting-corners):
1. **Compiling `.zshrc` itself** — the freshness check is mtime-based, so `mv ~/.zshrc.bak ~/.zshrc` (mv preserves mtime) silently keeps the *old* compiled version. Also aliases defined in `.zshrc` stop applying to functions defined in the same file.
2. **`compinit -C`** — "if you do that and install a new tool using your favorite package manager, completions for this tool may not appear in zsh even after restart. You'll have to manually delete a cache file. Saving a few milliseconds on zsh startup is not worth it." The manual confirms `-C` skips both the new-function check and the security check.

**Migrating off OMZ: almost nothing is load-bearing.**
- `git` plugin = **197 alias lines** plus a `git version` subprocess at load. Keep via `ohmyzsh/ohmyzsh path:plugins/git` or copy the ten you use.
- `docker`, `history`, `copypath`, `copyfile`, `node`, `web-search` = alias files, 100 bytes–2.4 KB, copy-paste.
- `docker-compose`, `terraform`, `golang`, `rust`, `pip` — the real content is the bundled `_<tool>` completion file; just drop it in `fpath`.
- `z` (35 KB), `extract`, `dirhistory`, `sudo` = real logic. Replace `z` with zoxide.
- **Expensive ones that shell out at startup:** `gh` runs `gh completion --shell zsh` on every shell (backgrounded, still a fork); historically `nvm`/`rvm` (multi-second, https://github.com/ohmyzsh/ohmyzsh/issues/5327), `kubectl`, `pyenv`, `virtualenvwrapper`, `aws` (2 `brew` invocations).
- Kill aliases without unloading: `zstyle ':omz:*' aliases no`. **OMZ's own warning:** "not currently compatible with plugin managers such as zpm or zinit, which don't source the init script (`oh-my-zsh.sh`) where this feature is implemented."

### C.3 Prompts

**starship.** Single TOML at `~/.config/starship.toml` (`STARSHIP_CONFIG` overrides). Documented defaults (https://starship.rs/config/): **`scan_timeout` = 30 ms** ("Timeout for starship to scan files"), **`command_timeout` = 500 ms** ("Timeout for commands executed by starship"), `add_newline` = true. `git_metrics` is `disabled = true` by default; `git_status` is enabled.

Init `eval "$(starship init zsh)"` sets `PROMPT` **and** `RPROMPT` — i.e. **two binary spawns per render** if you use a right prompt — and registers hooks with no interactive guard of its own.

**Slowness in big repos, from starship's own tracker:** #4305 measured **185 ms** for `git_status` in a 3,564-LOC repo (https://github.com/starship/starship/issues/4305); #1617 "Starship takes over 50 seconds to load with some git repos"; #1038 "Very Slow on WSL 2" — "after hitting Enter, I need to wait for 5 to 20 seconds" (https://github.com/starship/starship/issues/1038). Root cause is architectural: **#301 "Fetch git status asynchronously" has been open since 2019-09-06 with milestone "Far-Future"** (https://github.com/starship/starship/issues/301); async landed for fish only. romkatv's explanation of the 41 ms / 35 ms numbers: "Starship is implemented as an external binary, so it has to pay the price of at least one additional fork+exec on every command… Under the benchmark conditions starship **clones 158 times**!"

Mitigations: `[git_status] disabled = true`, `[git_status] ignore_submodules = true`, disable unused language modules. **Honest downside: lowering `command_timeout` doesn't make git faster — it makes the segment silently vanish** and log `Executing command "/usr/bin/git" timed out` (https://starship.rs/faq/, https://github.com/starship/starship/issues/6519); raising it trades the warning for a hang. Starship's own docs also flag that git_status is slow in Windows directories under WSL and offer a `windows_starship` option to shell out to a native Windows binary for those paths.

Profiling: `env STARSHIP_LOG=trace starship timings` — "a breakdown of all modules that either took more than 1ms to execute or produced some output"; also `starship explain`, `starship module <name>`.

**Fonts — starship has the best graceful degradation of the four** (https://starship.rs/presets/):
```zsh
starship preset plain-text-symbols   -o ~/.config/starship.toml   # ASCII only
starship preset no-nerd-font         -o ~/.config/starship.toml
starship preset no-empty-icons       -o ~/.config/starship.toml
starship preset pure-preset          -o ~/.config/starship.toml
```
The `no-nerd-font` page states it "will become the default preset in a future release of starship".

**powerlevel10k — the maintenance status, verified.** There is no "seeking maintainers" notice; the README banner is verbatim:
> **THE PROJECT HAS VERY LIMITED SUPPORT / NO NEW FEATURES ARE IN THE WORKS / MOST BUGS WILL GO UNFIXED / HELP REQUESTS WILL BE IGNORED**

Added by commit `bde5ca4`, "docs: the project is on life support", **2024-05-21** (https://github.com/romkatv/powerlevel10k/commit/bde5ca4c2aa6e0c52dd7f15cf216dffdb1ec788c). In discussion #2681 he wrote: *"I have no plans for future versions or for new features… I won't be merging PRs except those rare ones that can be merged as-is. I won't be fixing bugs other than in exceptional circumstances."* and *"If it works now for you, it'll keep working"* (https://github.com/romkatv/powerlevel10k/discussions/2681). He explicitly did **not** cite personal circumstances — "I am well by any objective and subjective measure" — and did not ask for maintainers. **Repo is not archived** (54.7k stars). The same banner now sits on gitstatus.

Instant prompt goes at the very top of `.zshrc`:
```zsh
if [[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]]; then
  source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
fi
```
**The caveat that matters here:** during init with instant prompt on, **stdin is redirected to `/dev/null` and stdout/stderr to a temp file**, replayed after init.

gitstatus is why p10k is fast: a persistent `gitstatusd` daemon holding per-directory state across prompts, `fstatat()` instead of `lstat()`, an untracked-file cache keyed on directory mtime, ~12.4x multithreading scaling. Its own numbers on a clean Chromium repo (i9-7900X, ext4/M.2): gitstatus 291 ms cold / **30.9 ms hot** vs git 876 / 295 ms vs libgit2 1730 / 1310 ms (https://raw.githubusercontent.com/romkatv/gitstatus). WSL is an explicitly supported platform. **Downside:** binaries are auto-downloaded prebuilt per-arch (supply-chain/offline concern), and the README says "It's currently neither easy nor recommended to package and distribute gitstatus."

`p10k configure` writes a ~4,300-line commented `~/.p10k.zsh` you now own. MesloLGS NF recommended; works without a Nerd Font but "displays all style options only with Nerd Fonts". Monorepo knob: `POWERLEVEL9K_VCS_MAX_INDEX_SIZE_DIRTY` (default -1 = infinity).

**p10k downsides for you specifically:** zsh-only; frozen with a declared no-bugfix policy; **large `_p9k_*` function table → snapshot bloat** (§C.0); and instant prompt's stdin/stdout redirection is implicated in AI-CLI breakage reports (https://github.com/anthropics/claude-code/issues/5428 — *closed*; workaround `POWERLEVEL9K_INSTANT_PROMPT=off`; note the same report asserts the instant prompt runs in non-interactive invocations, which contradicts both the zsh manual and p10k's source, so read it critically — what's credible is that anything spawning `zsh -i` gets ANSI plus buffered replay).

**oh-my-posh.** Cross-shell (zsh/bash/fish/pwsh/cmd/nu), Go binary, config in json (default)/yaml/toml with a JSON Schema and `extends` (https://ohmyposh.dev/docs/configuration/general). `eval "$(oh-my-posh init zsh)"` as the **last** line of `.zshrc`. Reading its `omp.zsh`: precmd/preexec hooks, no interactive guard, **0–2 binary spawns per prompt**. It has something starship lacks — Streaming (Beta) renders progressively (https://ohmyposh.dev/docs/experimental/streaming) — but the docs warn "Setting a very low timeout (e.g., 0 or 50ms) may cause visual glitches", and it has open correctness bugs (#7313, #7357).
**Is it slower than starship? Unresolved.** The only comparison found is the author's own secondhand claim in https://github.com/JanDeDobbeleer/oh-my-posh/discussions/1293 (2022): "Joel Benett did a quick test and oh-my-posh was the fastest (out of the box experience)." **oh-my-posh is absent from zsh-bench.** Diagnostics: `oh-my-posh debug`. Fonts: "Oh My Posh was designed to use Nerd Fonts"; degradation only by picking a `minimal` theme.

**pure and handwritten.** pure = pure zsh + zsh-async, **no binary, no external prompt process** (https://github.com/sindresorhus/pure). Options: `PURE_CMD_MAX_EXEC_TIME` (5 s), **`PURE_GIT_PULL` defaults to 1 — it fetches from the remote, i.e. network I/O tied to your prompt; set it to 0**, `PURE_GIT_UNTRACKED_DIRTY` (1).
**Gain:** no binary dependency, ~2 auditable files, no Nerd Font (`❯` is plain Unicode), tiny function footprint → tiny snapshot. **Give up:** no runtime-version/k8s/aws segments, no wizard, no gitstatus-class speed. Not in zsh-bench; closest proxy is the `git-branch` row (minimal synchronous handwritten prompt): **15.9 ms first prompt / 4.97 ms cmd lag** — already ~2.5x faster than starship, and pure's async should beat it on cmd lag.

**None of the four self-gate on interactivity.** starship's `starship.zsh`, oh-my-posh's `omp.zsh`, and `powerlevel10k.zsh-theme` all lack an `[[ -o interactive ]] || return` — they rely on zsh's `.zshrc` rule. Belt and braces: `[[ -o interactive ]] && eval "$(starship init zsh)"`, and never put prompt code in `.zshenv`.

### C.4 fish vs nushell vs zsh in 2026

**fish** — the Rust rewrite shipped in **4.0.0, released 2025-02-27**: "fish's core code has been ported from C++ to Rust… there should be no direct impact on users" — 2731 commits, +111221/−89168 (https://fishshell.com/blog/new-in-40/). **Downside: the post publishes no benchmarks at all** — it's a maintainability story, not a speed story. Current **4.8.1, 2026-07-13**.

Out of the box with no config: "Syntax highlighting, Autosuggestions, tab completion and selection lists that can be navigated and filtered" (https://fishshell.com/docs/current/index.html). That's the genuine win — it's exactly the plugin stack that causes the zsh snapshot problems.

**The cost, from the official "fish for bash users" page** (https://fishshell.com/docs/current/fish_for_bash_users.html):
- **Heredocs: not supported.** Verbatim: "fish does not have `<<EOF` 'heredocs'." **This is the sharpest agentic hazard** — heredocs are ubiquitous in tool-emitted snippets.
- **Subshells: not supported.** "fish does not currently have subshells. You will have to find a different solution."
- `set x y` not `VAR=VAL`; `set -gx VAR value` not `export`. "fish does not perform word splitting." `<(cmd)` → `(cmd | psub)`; **no equivalent to `>(cmd)` at all**.
- Fair correction to the usual complaints: `$(cmd)` works since fish 3.4.0 (2022-03), and `&&`/`||`/`!` since **3.0.0 (2018-12-28)** — that objection is eight years stale.
- fish 4.x is not a quiet series: 4.1.0 added `{ … }` compound commands but broke `{echo,echo}` brace expansion; 4.7 stopped reading the terminfo DB; 4.6 changed emoji default width 1→2; 4.3 made `fish_color_*` global by default (https://fishshell.com/docs/current/relnotes.html).
- **Official login-shell warning, verbatim:** "Setting fish as your login shell may cause issues, such as an incorrect PATH. Some operating systems, including a number of Linux distributions, require the login shell to be Bourne-compatible." Recommended path is configuring your terminal emulator to launch fish rather than `chsh`.

**fish + Claude Code is actively broken and Anthropic declined to fix it.** #13425 (Dec 2025, v2.0.62): with fish as default shell, *every* command fails because Claude Code still generates and sources **zsh-syntax** snapshots; fish chokes on `emulate -L zsh`, `setopt extendedglob`, `local -a`. Reporter calls the workaround "completely unusable." **Closed as not planned** (https://github.com/anthropics/claude-code/issues/13425). #11475 confirms `$SHELL` reports zsh inside the Bash tool even for fish users. #7490 asking for `SHELL=…/fish claude` to be respected is still open with no maintainer response. **The word "fish" does not appear anywhere in Claude Code's tools-reference doc.**

**nushell** — **0.114.1, 2026-07-11**; still pre-1.0, confirmed in the 0.114.0 post. **Breaking-changes-per-release confirmed:** 0.114.0's "Breaking changes" section alone lists submodules no longer implicitly imported, stricter parse-time type checking moving errors from runtime to parse time, `enforce-runtime-annotations` flipped from opt-in to **opt-out**, `--header-row` removed from `from xlsx`, `std/iter scan` signature changed (https://www.nushell.sh/blog/2026-07-04-nushell_v0_114_0.html). 0.114.1 exists to fix fallout from that flip. **Roughly every ~6 weeks your config and every nu script is exposed.**

Performance: **no official benchmark**. Community figures only: ~1 ms minimal / ~4–5 ms with stdlib / "normally 20ms~30ms" in practice (https://github.com/nushell/nushell/discussions/12428). A documented catastrophic regression: startup going from ~20–30 ms to **2 min 9 s** on 0.94.1 (https://github.com/nushell/nushell/issues/13023).

Language cost (https://www.nushell.sh/book/coming_from_bash.html): `export FOO=BAR` → `$env.FOO = BAR`; `> path` → `out> path`; `> /dev/null` → `| ignore`; `&&` → `;`; externals need a `^` prefix on name collisions. **Even redirection syntax differs — far worse than fish for pasted snippets.** Official warning, verbatim: "Nu is not intended to be POSIX compliant. Be aware that some programs on your system (or their documentation) might assume that your login shell is POSIX compatible" (https://www.nushell.sh/book/default_shell.html). Claude Code has no nu snapshot format and no tracking issue.

### C.5 Front C bottom line

1. **Optimize snapshot size (function/alias count), not first-prompt lag.** That's the opposite of what every zsh perf blog optimizes for.
2. **Add a non-interactive guard in `.zshrc` before completion/plugin/prompt setup.** Highest-value single change; Anthropic has closed every related issue as not-planned.
3. **If you stay on OMZ, the cheap wins are real:** `zstyle ':omz:update' mode disabled`, `DISABLE_UNTRACKED_FILES_DIRTY=true`, drop unused plugins, `git config --add oh-my-zsh.hide-dirty 1` per big repo. romkatv's own `ohmyzsh+` config hits 4.8 ms first prompt.
4. **antidote's static bundle is the best structural fit** — steady state is one `source` of a flat generated file, no manager code runs, and OMZ pieces still load via `ohmyzsh/ohmyzsh path:plugins/git`. zinit's turbo optimizes the exact metric its own harness measures and romkatv debunked; sheldon forks a Rust binary per shell; zplug's last release was 2017.
5. **Prompt:** p10k wins latency decisively (1.9 ms vs starship's 41 ms first prompt; 1.9 vs 35 ms cmd lag) but loses on snapshot footprint and instant-prompt stdin/stdout redirection, and is on declared life support since 2024-05-21. starship is the slowest measured with async-git open since 2019 at "Far-Future". **pure or a handwritten prompt gives the smallest function table, which is the thing that actually taxes you.** If you take starship anyway: `starship preset plain-text-symbols` + `[git_status] disabled = true`.
6. **Stay on zsh.** fish-as-`$SHELL` is a closed-as-not-planned broken configuration with Claude Code; nushell isn't on the map. Get fish's ergonomics from zsh-autosuggestions/fast-syntax-highlighting *inside* an interactive guard, or launch fish from your terminal emulator without `chsh` — which fish's own docs recommend anyway.
7. **Keep repos on `/home/`, not `/mnt/c/`.**

---

## Conflict-of-interest flags to carry into the write-up

- **zsh-bench is authored by powerlevel10k's author.** Its methodology critique is sound and its raw data is public, but p10k tops its own benchmark.
- **zinit's "50–80% faster" claim comes from zinit's own harness, which measures `zsh -i -c exit`** — the metric zsh-bench exists to discredit.
- **The plugin-manager load-time table is by sheldon's author** (raw hyperfine JSON is public and reproducible), and it explicitly disables deferred loading, which is zinit's entire pitch.
- **oh-my-posh's speed claim is the author's undated secondhand report**; no independent measurement exists anywhere.
- **ripgrep's benchmark is by ripgrep's author** (2016, still the canonical reference); fd's and sd's speed claims are likewise self-published.
- **chezmoi's comparison table is by chezmoi's author** — but the specific load-bearing claim (bootstrap requirements = None) is independently verifiable from the `useBuiltinGit`/`useBuiltinAge` config reference.

<!-- ---- proximo bloco ---- -->

The Front C agent died without reporting, so I researched Front C directly. Here are the findings.

---

# FRONT A — Modern CLI tools

## A0. The Claude Code-specific facts that reframe this whole section

Three primary-source findings change the calculus for an agentic workflow:

**1. Claude Code bundles its own ripgrep and does not use yours by default.** The Search/Grep tool "is built on [ripgrep](https://github.com/BurntSushi/ripgrep) and uses ripgrep's regex syntax, not POSIX grep" ([tools-reference](https://code.claude.com/docs/en/tools-reference)). The bundled binary lives at `.../node_modules/@anthropic-ai/claude-code/vendor/ripgrep/<arch>/rg` ([issue #6415](https://github.com/anthropics/claude-code/issues/6415)). The official troubleshooting page says: if search "isn't finding files, the bundled `ripgrep` binary may not run on your system. Install your platform's `ripgrep` package… Then set `USE_BUILTIN_RIPGREP=0`… run `claude doctor` and check that the Search line shows the path of your system ripgrep instead of `OK (bundled)`" ([troubleshooting](https://code.claude.com/docs/en/troubleshooting)). Note `USE_BUILTIN_RIPGREP` is *not* in the [env-vars reference](https://code.claude.com/docs/en/env-vars) — only in troubleshooting. Anthropic frames it as a **compatibility** fix (musl/Alpine, broken dyld), *not* a documented performance win; third-party "5-10x faster" claims ([blog](https://blog.codonomics.com/2026/04/beyond-grep-master-ripgrep-performance.html)) are not from Anthropic. Also relevant to you: WSL cross-filesystem reads cause "fewer-than-expected matches" and `claude doctor` still shows Search as OK — fix is to keep projects on `/home`, not `/mnt/c` (same page).

**2. Your shell aliases and functions ARE applied to every Bash tool call.** Verbatim: "Aliases and shell functions defined in your shell startup file are available. At session start, Claude Code sources `~/.zshrc`, `~/.bashrc`, or `~/.profile` depending on your shell, captures the resulting aliases, functions, and shell options, and applies them to every Bash command" ([tools-reference](https://code.claude.com/docs/en/tools-reference)). **This is the single most important fact in Front A.** `alias ls=eza`, `alias cat=bat`, `alias grep=rg` in your `.zshrc` are not cosmetic — the agent inherits them.

**3. The permission allowlist is coreutils-shaped, and modern tools are not on it.** "Claude Code recognizes a built-in set of Bash commands as read-only and runs them without a permission prompt in every mode. These include `ls`, `cat`, `echo`, `pwd`, `head`, `tail`, `grep`, `find`, `wc`, `which`, `diff`, `stat`, `du`, `cd`, and read-only forms of `git`. **The set is not configurable**" ([permissions](https://code.claude.com/docs/en/permissions)). `rg`, `fd`, `bat`, `eza`, `jq`, `dust`, `yq` are **not** on it — every invocation prompts unless you add explicit allow rules.

**Combine 2 + 3 and you get a genuine footgun:** aliasing `ls`→`eza` means the agent's auto-approved `ls -lt` silently runs eza, where `-t` means `--time=WORD` (which timestamp *field* to display), not "sort by mtime" as in GNU ls ([eza man page](https://github.com/eza-community/eza/blob/main/man/eza.1.md)). You get a wrong-flag error or wrong output on a command the agent believes is standard.

**4. No TTY, and ANSI codes cost you context.** The Bash tool "runs each command in a separate process" with no PTY — "there is no interactive TTY or stdin access. The process runs non-interactively" ([issue #26353](https://github.com/anthropics/claude-code/issues/26353)). Output is capped at 30,000 chars by default (`BASH_MAX_OUTPUT_LENGTH`, hard ceiling 150,000), timeout 2 min default / 10 min max ([tools-reference](https://code.claude.com/docs/en/tools-reference), [env-vars](https://code.claude.com/docs/en/env-vars)). And ANSI escapes are **not stripped** before entering context: a reported case burned ~35KB of context on escape sequences alone and produced unrecoverable API errors — closed as not planned ([issue #26373](https://github.com/anthropics/claude-code/issues/26373)). So decorated output is not merely ugly for an agent; it is a direct token tax.

Mitigating factor: most of these tools do the right thing automatically. ripgrep's `--color` default is `auto`, which "will cause ripgrep to only enable colors when it is printing to a terminal. But if you pipe ripgrep to a file or some other process, then it will suppress colors" ([rg FAQ](https://github.com/BurntSushi/ripgrep/blob/master/FAQ.md)). bat: "when output is not interactive, bat will act as a drop-in replacement for cat and fall back to printing the plain file contents, regardless of the `--paging` option's value" ([bat README](https://github.com/sharkdp/bat)). Git only colors when `color.ui=auto` and output is a terminal ([git-config](https://git-scm.com/docs/git-config)), so a `core.pager = delta` never fires for the agent.

---

## A1. The eleven tools

### ripgrep (BurntSushi) — **install it; it is the one non-negotiable**
- **Solves**: recursive search that respects `.gitignore`, skips hidden files, skips binaries, and is parallel. Own benchmark: on a Linux kernel checkout, rg 0.334s vs ag 1.588s vs git grep 0.345s; on a 1GB single file, rg 0.268s vs GNU grep 0.516s vs ag 2.730s ([burntsushi.net/ripgrep](https://burntsushi.net/ripgrep/), 2016-09-23). README claims ~6x over Unicode-enabled grep on 13GB ([README](https://github.com/BurntSushi/ripgrep)).
- **Current**: 15.2.0, 2026-07-15 ([releases](https://github.com/BurntSushi/ripgrep/releases)). Linux gnu tarball 1.73 MB.
- **apt**: `ripgrep`. Ubuntu 24.04 → 14.1.0; Ubuntu 26.04 → 15.1.0; Debian 12 → 13.0.0; Debian 13 → 14.1.1 ([repology](https://repology.org/project/ripgrep/versions)). Only one minor behind on 26.04 — **apt is fine here**. Debian package ~1.4 MB ([packages.debian.org](https://packages.debian.org/trixie/amd64/ripgrep/download)).
- **Downside**: "ripgrep never was, isn't and never will be POSIX compatible" ([FAQ](https://github.com/BurntSushi/ripgrep/blob/master/FAQ.md)). Rust regex ≠ POSIX ERE/BRE; no backreferences, no lookaround. Its *default filtering is a silent correctness hazard*: it will not find matches in gitignored or hidden files unless you pass `-u`/`-uu`/`-uuu` ([GUIDE](https://github.com/BurntSushi/ripgrep/blob/master/GUIDE.md)). Scripts that assume `grep` semantics break.
- **Agent verdict**: **AGENT + HUMAN.** But note the agent already has rg via the Grep tool; installing a system rg mainly buys you (a) a fallback if the bundled binary won't run, (b) rg available for the agent's *Bash* invocations — where it will prompt for permission since it's not on the read-only list.

### fd (sharkdp) — **install it, for humans mostly**
- **Solves**: `fd PATTERN` vs `find -iname '*PATTERN*'`; gitignore-aware, parallel. README benchmark: ~23x faster than `find -iregex`, ~13x faster than `find -iname` over ~4M files ([README](https://github.com/sharkdp/fd)).
- **Current**: 10.4.2, 2026-03-10; linux-gnu tarball 1.49 MB; .deb published ([releases](https://github.com/sharkdp/fd/releases)).
- **apt**: package is **`fd-find`** and the binary is **`fdfind`** "due to a naming conflict with another package"; README suggests `ln -s $(which fdfind) ~/.local/bin/fd`. Versions: Ubuntu 24.04 → 9.0.0, Ubuntu 26.04 → 10.3.0, Debian 12 → 8.6.0, Debian 13 → 10.2.0 ([repology](https://repology.org/project/fd-find/versions)).
- **Downside**: binary rename is exactly the kind of thing that breaks a dotfiles bootstrap on a different distro. Not a `find` superset — no `-exec ... \;` semantics identical to find, no `-newer`-style predicate zoo. Same gitignore blind spot as rg.
- **Agent verdict**: **HUMAN-leaning.** The agent has the Glob tool, which "doesn't respect `.gitignore` by default" — the opposite default from fd — and caps at 100 results ([tools-reference](https://code.claude.com/docs/en/tools-reference)). `find` is on the read-only allowlist; `fd` is not. Marginal for the agent.

### bat (sharkdp) — **human only**
- **Solves**: syntax highlighting, git modification gutter, line numbers, auto-paging; also `MANPAGER="bat -plman"` and fzf previews ([README](https://github.com/sharkdp/bat)).
- **Current**: v0.26.1, 2025-12-02 ([releases](https://github.com/sharkdp/bat/releases)). Debian package ~2.2 MB download ([packages.debian.org](https://packages.debian.org/trixie/amd64/bat/download)).
- **apt**: `bat`, binary installed as **`batcat`** on Debian/Ubuntu "due to a name clash with another package". Ubuntu 24.04 → 0.24.0, Ubuntu 26.04 → 0.25.0, Debian 12 → 0.22.1, Debian 13 → 0.25.0; upstream 0.26.1 ([repology](https://repology.org/project/bat-cat/versions)).
- **Downside**: **the pager.** It pipes to `less` by default. If you `alias cat=bat` you are one misconfigured `BAT_PAGER`/`LESS` away from a hang. It *does* degrade gracefully when not a TTY (drop-in cat), which saves you — but only for `bat` itself, not for a `less` you invoked deliberately. Plus the `batcat` rename.
- **Agent verdict**: **HUMAN ONLY, and do not alias `cat`.** `cat` is on the auto-approved read-only list; `bat` isn't. Aliasing `cat`→`bat` means every agent `cat` becomes an unlisted binary running under a name the permission system thinks is coreutils. Also, viewing a file with `cat`/`head`/`tail`/`sed -n`/`grep` satisfies Claude Code's read-before-edit check ([tools-reference](https://code.claude.com/docs/en/tools-reference)) — `bat` is not in that list.

### eza — **human only; do NOT alias `ls`**
- **Solves**: git status column, tree view, icons, hyperlinks, `theme.yml`, mount/SELinux info; single binary ([README](https://github.com/eza-community/eza)).
- **Current**: v0.23.5, 2026-07-09. Successor to **exa**, which carries the banner "exa is unmaintained, use the fork eza instead" and notes "This repository isn't archived because the only person with the rights to do so is unreachable"; last exa release 0.10.1, 2021-04-12 ([ogham/exa](https://github.com/ogham/exa)).
- **apt**: Debian trixie has `eza` 0.21.0, installed size ~1.4–2.5 MB depending on arch ([packages.debian.org](https://packages.debian.org/trixie/eza)); Ubuntu 24.04 → 0.18.2, Ubuntu 26.04 → 0.23.4 ([repology](https://repology.org/project/eza/versions)). eza's own [INSTALL.md](https://github.com/eza-community/eza/blob/main/INSTALL.md) still pushes the third-party `deb.gierens.de` repo (adds a keyring + third-party trust root you must re-establish on every reinstall) — **unnecessary now on 26.04/trixie**.
- **Downside**: **not a drop-in.** Per its own man page, `-t` = `--time=WORD` (select timestamp field), whereas GNU `ls -t` sorts by mtime; `-A` is documented as "included for compatibility with `ls -A`", implying most flags are not ([eza.1.md](https://github.com/eza-community/eza/blob/main/man/eza.1.md)). There is an open feature request literally titled "work as a drop-in ls replacement" ([issue #736](https://github.com/eza-community/eza/issues/736)). Not POSIX. And it won't exist on any remote server you ssh into.
- **Agent verdict**: **HUMAN ONLY. Aliasing `ls` is actively harmful here** — see A0 point 2+3. If you want it, alias something else (`l`, `ll`, `lt`) and leave `ls` alone.

### zoxide — **human only, harmless**
- **Solves**: frecency-ranked `cd`. `z foo` jumps; `zi` is interactive (needs fzf ≥ 0.51.0) ([README](https://github.com/ajeetdsouza/zoxide)).
- **Current**: v0.10.0, 2026-07-04. Hook: `eval "$(zoxide init zsh)"`.
- **apt**: `zoxide`. Ubuntu 24.04 → 0.9.3, Ubuntu 26.04 → 0.9.8, Debian 12 → **0.4.3** (ancient), Debian 13 → 0.9.7 ([repology](https://repology.org/project/zoxide/versions)). README explicitly warns: "Debian / Ubuntu derivatives update their packages very slowly… consider using the install script instead."
- **Downside**: it's a shell function + a `precmd` hook, so it adds startup work and a per-prompt hook. It builds state over time — **on a fresh WSL install the database is empty and `z` is useless for weeks**, which is a real cost if you reinstall often (the DB is not something you want in a dotfiles repo).
- **Agent verdict**: **HUMAN.** The `z` function *is* captured by Claude Code's snapshot, so the agent could call it — but the `precmd` hook never fires in a non-interactive one-shot process, so agent `cd`s never feed the database. Harmless; no benefit.

### fzf — **human only**
- **Solves**: general-purpose interactive fuzzy filter over stdin; CTRL-T (files), CTRL-R (history), ALT-C (cd) ([README](https://github.com/junegunn/fzf)). Zsh integration: `source <(fzf --zsh)`.
- **Current**: 0.74.1, 2026-07-18.
- **apt**: `fzf`. Ubuntu 24.04 → 0.44.1 (**very stale**, predates `fzf --zsh` ergonomics), Ubuntu 26.04 → 0.67.0, Debian 12 → 0.38.0, Debian 13 → 0.60.3 ([repology](https://repology.org/project/fzf/versions)). This is the tool where apt staleness bites hardest — a lot of modern config syntax simply doesn't exist in 0.44.
- **Downside**: **fundamentally requires a TTY.** It opens `/dev/tty` and fails with "Failed to open /dev/tty" in non-interactive contexts — a recurring class of issue ([fzf #447](https://github.com/junegunn/fzf/issues/447), [#1726](https://github.com/junegunn/fzf/issues/1726), [#2745](https://github.com/junegunn/fzf/issues/2745)). Non-interactive escape hatch is `-f`/`--filter`.
- **Agent verdict**: **HUMAN ONLY.** If an agent ever invokes a script that shells into fzf, it hangs or errors. Keep fzf out of anything scriptable.

### delta (dandavison) — **human only, but safe**
- **Solves**: syntax-highlighted diffs, word-level diff via Levenshtein inference, side-by-side, `n`/`N` navigation, zdiff3 merge conflicts, hyperlinked blame ([README](https://github.com/dandavison/delta)). Config: `[core] pager = delta`, `[interactive] diffFilter = delta --color-only`, `[delta] navigate = true`.
- **Current**: 0.19.2, 2026-03-28; `git-delta_0.19.2_amd64.deb` 2.51 MB, linux-gnu tarball 3.18 MB ([releases](https://github.com/dandavison/delta/releases)).
- **apt**: **package is `git-delta`, binary is `delta`** — and there is a *different, unrelated* Debian package named `delta` (the Tigris test-case minimizer). Packaging `git-delta` with `Provides: delta` created a real conflict ([delta #1210](https://github.com/dandavison/delta/issues/1210), [Debian bug 993938](https://www.mail-archive.com/debian-bugs-dist@lists.debian.org/msg1825101.html), [packages.debian.org/sid/git-delta](https://packages.debian.org/sid/git-delta)). Versions: Ubuntu 24.04 → 0.16.5, Ubuntu 26.04 → 0.18.2, Debian 13 → 0.18.2 ([repology](https://repology.org/project/git-delta/versions)). The docs say only "the package is often called `git-delta`, but the executable installed is called `delta`" ([installation](https://dandavison.github.io/delta/installation.html)) — they under-warn about the name collision.
- **Downside**: the name collision; config lives in `.gitconfig` so it travels with your dotfiles and will silently break on a machine without delta installed (git errors on a missing pager). Themes depend on bat's syntax assets.
- **Agent verdict**: **HUMAN ONLY but low-risk.** Git skips the pager and colors when stdout isn't a terminal ([git-config, `color.ui`: "use colors only when the output is to the terminal"](https://git-scm.com/docs/git-config)), so agent `git diff` output stays plain. This is the model case of "decoration that correctly disappears for the agent."

### jq — **AGENT + HUMAN; install unconditionally**
- **Solves**: JSON as a first-class data type in the shell. Zero runtime dependencies, portable C ([README](https://github.com/jqlang/jq)).
- **Current**: 1.8.2, 2026-06-20. Project moved to the **jqlang** org after the 2018–2023 dormancy — that governance change is why it's alive again.
- **apt**: `jq`. Ubuntu 24.04 → 1.7.1, Ubuntu 26.04 → 1.8.1, Debian 12 → 1.6, Debian 13 → 1.7.1 ([repology](https://repology.org/project/jq/versions)). **apt is fine.**
- **Downside**: the language is genuinely hard — `//`, `?`, `reduce`, `foreach`, path expressions; 1.7 changed some behaviors from the very widely-deployed 1.6. Debian 12's 1.6 lacks `ltrimstr` niceties and 1.7 fixes.
- **Agent verdict**: **AGENT.** Structured, deterministic, no color, no pager, exits cleanly, output is compact. This is the single best tool on this list for agent use — it lets the agent turn a 30,000-char `gh api` blob into ten lines and stay under `BASH_MAX_OUTPUT_LENGTH`. Add `Bash(jq *)` to your allow rules since jq isn't on the built-in read-only list.

### yq — **get this right: two different programs**

| | **mikefarah/yq** | **kislyuk/yq** |
|---|---|---|
| Language | Go, single static binary | Python |
| What it is | native YAML/JSON/XML/CSV/TOML/HCL/properties processor with jq-*like* syntax | a **wrapper**: "yq takes YAML input, converts it to JSON, and pipes it to jq" |
| Requires jq? | No | **Yes**, plus python3 |
| Current | v4.53.3, 2026-06-06 ([releases](https://github.com/mikefarah/yq/releases)) | 4.1.2, 2026-07-11 ([repo](https://github.com/kislyuk/yq)) |
| Extra commands | — | `xq`, `tomlq` |

**`apt install yq` on Debian/Ubuntu gives you the Python kislyuk one.** Debian sid's `yq` is 3.4.3-3 with homepage `github.com/kislyuk/yq`, depending on `jq`, `python3`, `python3-xmltodict`, `python3-tomlkit`, `python3-yaml` ([packages.debian.org/sid/yq](https://packages.debian.org/sid/yq)). Ubuntu 26.04 `yq` is the same, 3.4.3-2, in universe ([packages.ubuntu.com/resolute/yq](https://packages.ubuntu.com/resolute/yq)) — note that's **3.4.3 when upstream kislyuk is at 4.1.2**, so it's stale *and* the other project. The Go one is packaged as **`yq-go`**, 4.53.3, present in Debian sid/testing/backports and Ubuntu 26.10 ([repology](https://repology.org/project/yq-go/versions)); Arch calls it `go-yq`. Snap `yq` is mikefarah's but is strictly confined (no access to root-owned files) ([snapcraft](https://snapcraft.io/yq)).

**Both READMEs fail to warn about each other** — I checked; neither acknowledges the collision. This is the highest-probability "copy-paste command from the internet silently does the wrong thing" hazard on this list, because their syntaxes diverge (`yq '.a.b'` works in both; `yq e`, `yq -i`, and most v4 operators are mikefarah-only).

- **Recommendation**: install mikefarah's Go binary from GitHub releases to `~/.local/bin/yq` (or `apt install yq-go` if you're on 26.10+/sid), and never `apt install yq`.
- **Agent verdict**: **AGENT + HUMAN**, same reasoning as jq. Deterministic, no decoration.

### lazygit — **human only**
- **Solves**: interactive rebase, hunk staging, stash management without editing TODO files ([README](https://github.com/jesseduffield/lazygit)).
- **Current**: v0.63.1, 2026-07-15; linux tarball ~6 MB ([releases](https://github.com/jesseduffield/lazygit/releases)). v0.63.0 notably added direnv support.
- **apt**: README says apt only for "Debian 13 Trixie, Sid, and later, or Ubuntu 25.10 Questing Quokka and later". Ubuntu 26.04 → 0.57.0, Debian 13 → 0.50.0, upstream 0.63.1 ([repology](https://repology.org/project/lazygit/versions)) — **apt is meaningfully stale**; use the release tarball.
- **Downside**: it is a **full-screen TUI**. Zero value in a script. Keybinding muscle memory is non-transferable. Six-megabyte binary for something you use interactively.
- **Agent verdict**: **HUMAN ONLY, absolutely.** Given no TTY ([issue #26353](https://github.com/anthropics/claude-code/issues/26353)), an agent invoking lazygit hangs until the 2-minute timeout, then gets auto-backgrounded. Worth an explicit `deny` rule.

### direnv — **conditional; read the caveat carefully**
- **Solves**: per-directory env vars via `.envrc`, loaded/unloaded automatically ([direnv.net](https://direnv.net/)).
- **Security model**: whitelist. A new `.envrc` is refused (".envrc is not allowed") until you run `direnv allow .`. This exists because `.envrc` is arbitrary bash — cloning a hostile repo would otherwise execute code on `cd`.
- **Hook**: `eval "$(direnv hook zsh)"` / `eval "$(direnv hook bash)"` / `direnv hook fish | source` ([hook.md](https://github.com/direnv/direnv/blob/master/docs/hook.md)). Supports bash, zsh, tcsh, fish, elvish, powershell, murex, nushell.
- **Current**: v2.37.1, 2025-07-20; linux-amd64 binary ~7.8 MB ([releases](https://github.com/direnv/direnv/releases)). Ubuntu 24.04 → 2.32.1, **Debian 12 and 13 both → 2.32.1** (trixie is stale), Ubuntu 26.04 → 2.37.1 ([repology](https://repology.org/project/direnv/versions)).
- **Downside 1 — the allow prompt is the point and the pain.** Every `.envrc` change re-locks the directory. In an agentic loop where the agent edits `.envrc`, you get a stall the agent can't resolve.
- **Downside 2 — it cannot export functions or aliases.** "direnv is not loading the `.envrc` into the current shell. It's creating a new bash sub-process… and only exports the environment diff back" ([direnv.net](https://direnv.net/)).
- **Downside 3 — THE BIG ONE for you: the prompt hook never fires for Claude Code.** direnv works via a `precmd`/`PROMPT_COMMAND` hook. Claude Code "runs each command in a separate process", "Environment variables don't persist", and only captures aliases/functions/shopts from your rc — not per-directory env state ([tools-reference](https://code.claude.com/docs/en/tools-reference)). So **your `.envrc` is invisible to the agent.** Workaround is `direnv exec DIR COMMAND` ([man page](https://direnv.net/man/direnv.1.html)) — but Claude Code's permission docs call this out as dangerous: "`direnv exec`, `devbox run`, `mise exec`, `npx`, and `docker exec` are not in the [wrapper-stripping] list… a rule like `Bash(devbox run *)` matches whatever comes after `run`, including `devbox run rm -rf .`" ([permissions](https://code.claude.com/docs/en/permissions)).
- **Agent verdict**: **HUMAN, with a caveat you must plan around.** Anthropic's own recommended mechanism for agent-visible env is different: set `CLAUDE_ENV_FILE` to a shell script before launching, or use a SessionStart hook ([tools-reference](https://code.claude.com/docs/en/tools-reference)). If you rely on direnv for project secrets/paths, the agent will silently run with the wrong environment.

---

## A2. The second-tier tools (brief)

| Tool | Verdict | Facts + downside |
|---|---|---|
| **sd** | Worth it for humans, marginal for agents | v1.1.0, 2026-02-25. JS/Python-style regex, `-F` literal mode, in-place edit. Own benchmarks: ~2.35x faster than sed on a 1.5GB JSON simple replace, ~11.9x on regex over 55MB ([README](https://github.com/chmln/sd)). **Downside**: explicitly not a drop-in — "doesn't replicate sed's full command language", so no `sed -n '10,20p'`, no address ranges, no `d`/`a`/`i`. And `sed -n 'X,Yp'` is on Claude Code's read-before-edit list; `sd` is not. Keep sed. |
| **dust** | Nice-to-have, human | v1.2.4, 2026-01-08. Tree + bars + auto-sorted, terminal-width aware ([README](https://github.com/bootandy/dust)). **Downside**: cargo crate is `du-dust` but binary is `dust`, which clashes with other tools; heavily decorated output (grey shading, bar glyphs) = pure noise in an agent's context. `du` *is* on the read-only allowlist; `dust` is not. |
| **duf** | Skip unless you like it | v0.9.1, **2025-09-08 — no release in ~10 months**; Go; `apt install duf` on Ubuntu 22.04+/Debian 12+ ([README](https://github.com/muesli/duf)). Has `--json`, which is the only agent-relevant thing about it. **Downside**: `df -h` already works and is universal. |
| **procs** | Skip | v0.14.12, 2026-06-25, Rust. Adds TCP/UDP ports, Docker names, r/w throughput, tree view ([README](https://github.com/dalance/procs)). **Downside**: not in Debian/Ubuntu apt per its own install list; `ps`'s output format is what every script and every LLM already knows. Colorized by default. |
| **hyperfine** | **YES — install it** | v1.20.0, 2025-11-18; `apt install hyperfine` works on Ubuntu. Warmup runs, outlier detection, JSON/CSV/Markdown export, and `-N`/`--shell=none` "to run a benchmark without an intermediate shell" for sub-5ms commands ([README](https://github.com/sharkdp/hyperfine)). **This is the tool you need for Front C** — it's how you'd honestly measure shell startup. **Downside**: none material; it's a dev tool you invoke deliberately. |
| **tealdeer** | Nice-to-have | v1.8.1, 2025-11-11. Rust tldr client; measured mean 13.2ms, second-fastest client tested (project's own comparison) ([README](https://github.com/tealdeer-rs/tealdeer)). **Downside**: needs `tldr --update` to populate a cache — so on a fresh WSL install it's useless until you run it (put it in a bootstrap script). Binary name `tldr` collides with the Node client. For an *agent*, tldr is redundant — the model already knows these commands. |
| **atuin** | **Think hard before adopting** | v18.17.1, 2026-07-14. SQLite history with exit code, duration, hostname, session, cwd; E2E-encrypted optional sync (self-hostable or disabled); rebinds **ctrl-r and up-arrow** ([README](https://github.com/atuinsh/atuin)). Install is a curl one-liner; no Debian/Ubuntu apt entry documented. **Downsides**: (1) rebinding up-arrow is the most commonly reverted change people make — it changes muscle memory for prefix search; (2) it adds a shell hook and a DB open to every shell start, which cuts against Front C's goal; (3) sync means your full shell history — which for an agentic workflow contains API keys typed inline, `gh` tokens, and prompt text — goes to a server. E2E-encrypted, self-hostable, and the author notes "I couldn't access your data even if I wanted to," but it is still a new exfiltration surface you didn't have. The README does **not** discuss startup cost. |

## A3. Front A summary table — human vs agent

| Install for the **agent** | Install for the **human** | Don't install / keep away from agents |
|---|---|---|
| **jq**, **yq (mikefarah/Go)** — structured, deterministic, uncolored, compact | bat, eza, delta, lazygit, fzf, zoxide, atuin, dust, procs, duf, tealdeer | fzf and lazygit in any scripted path (no TTY → hang → 2-min timeout) |
| **ripgrep** (system copy as a fallback for the bundled one, per [troubleshooting](https://code.claude.com/docs/en/troubleshooting)) | hyperfine (deliberate use), sd, fd | Any `alias ls=eza` / `alias cat=bat` / `alias grep=rg` — Claude Code applies your aliases to every Bash call ([tools-reference](https://code.claude.com/docs/en/tools-reference)) |
| **hyperfine** when you ask it to benchmark | direnv (but see: invisible to the agent) | direnv as your *only* env mechanism — use `CLAUDE_ENV_FILE` or a SessionStart hook instead |

**Rule of thumb**: a tool is good for the agent iff its output is (a) plain text with no ANSI, (b) not paged, (c) compact, (d) deterministic. That is jq, yq, rg, and essentially nothing else on this list. Everything else is for you.

**One concrete config recommendation**: don't alias core commands. Add new names (`l`, `ll`, `lt`, `catp`) and leave `ls`/`cat`/`grep`/`find`/`du` pointing at coreutils, so Claude Code's auto-approved read-only set keeps meaning what it says.

---

# FRONT B — Dotfiles management

**Verdict: chezmoi**, on the decisive criterion.

## chezmoi
- **Model**: source state in `~/.local/share/chezmoi`, dest `$HOME`, state DB at `~/.config/chezmoi/chezmoi.boltdb` ([config vars](https://www.chezmoi.io/reference/configuration-file/variables/)). It writes **real files**, not symlinks ([comparison table](https://www.chezmoi.io/comparison-table/)).
- **Attributes** ([source-state-attributes](https://www.chezmoi.io/reference/source-state-attributes/)): `dot_` → leading dot; `private_` → strip group/world perms; `readonly_`; `executable_`; `encrypted_`; `symlink_`; `create_` (seed once, never touch again); `modify_` (contents are a script that modifies the target); `exact_` (remove anything unmanaged); plus `.tmpl` and `.literal` suffixes.
- **Bootstrap — the decisive fact**: chezmoi's comparison table lists bootstrap requirements as **"None"**, vs `git` for yadm/bare-git and `Python, git` for dotbot ([comparison table](https://www.chezmoi.io/comparison-table/)). This is real, not marketing: `useBuiltinGit` and `useBuiltinAge` default to `auto` = "use builtin if the command is not found in `$PATH`" ([config vars](https://www.chezmoi.io/reference/configuration-file/variables/)). On a bare distro with no git, `chezmoi init --apply` still clones and decrypts.
- **WSL detection**: `.chezmoi.kernel` comes from `/proc/sys/kernel` and the docs say it is "useful for detecting specific kernels (e.g. Microsoft's WSL kernel)" ([template variables](https://www.chezmoi.io/reference/templates/variables/)). Maintainer-sanctioned idiom ([issue #1347](https://github.com/twpayne/chezmoi/issues/1347)):
  ```
  {{ if (and (eq .chezmoi.os "linux") (.chezmoi.kernel.osrelease | lower | contains "microsoft")) }}
  ```
  Your kernel string `6.6.87.2-microsoft-standard-WSL2` matches. **Downside**: it's a string sniff, not a first-class fact; WSL1-vs-WSL2 is an open issue ([#4942](https://github.com/twpayne/chezmoi/issues/4942)), and `not contains` misbehaves in `.chezmoiignore` ([#1192](https://github.com/twpayne/chezmoi/issues/1192)).
- **Secrets**: 17 documented backends — 1Password, Bitwarden, pass, gopass, KeePassXC, Vault, Doppler, LastPass, Keeper, Dashlane, Proton Pass, AWS Secrets Manager, Azure Key Vault, ejson, passhole, OS keychain, custom ([password-managers](https://www.chezmoi.io/user-guide/password-managers/)). Whole-file encryption via age (`chezmoi age-keygen`, then `encryption = "age"` + identity/recipient) or gpg ([age docs](https://www.chezmoi.io/user-guide/encryption/age/)). It is the only tool in its own table with ✅ for password-manager integration.
- **Externals**: `.chezmoiexternal.toml` with types `file`, `archive`, `archive-file`, `git-repo`; `refreshPeriod`, `stripComponents`, `checksum.sha256`, `clone.args` ([reference](https://www.chezmoi.io/reference/special-files/chezmoiexternal-format/)). Use it to vendor zsh plugins, fzf, age without submodules.
- **Scripts**: `run_` (every apply), `run_once_` (SHA256-tracked, never re-runs), `run_onchange_` (re-runs on content change; **templates render before hashing**, so a changed variable retriggers), ordered alphabetically with `before_`/`after_` modifiers ([scripts docs](https://www.chezmoi.io/user-guide/use-scripts-to-perform-actions/)). A `.tmpl` script rendering to whitespace is skipped — that's how you make per-OS conditionals.
- **Current**: v2.71.1, released **2026-07-20** (today); cadence every 2–4 weeks ([releases](https://github.com/twpayne/chezmoi/releases)). Single static Go binary, ~15.7 MB.
- **apt reality check**: the install page shows `apt-get install chezmoi` under Debian, but **chezmoi is in no released Ubuntu** — Launchpad shows it only in `stonking` (26.10, in development) at 2.71.0-5, and Debian has it only in **sid** ([packages.debian.org/sid/chezmoi](https://packages.debian.org/sid/chezmoi)). On a fresh Ubuntu LTS, `apt install chezmoi` fails. Use the curl installer.

**chezmoi's honest costs:**
1. **Permanent source/target indirection.** `~/.zshrc` and `~/.local/share/chezmoi/dot_zshrc` are different files, forever. Every edit is `chezmoi edit` + `apply`, or edit-in-place + `re-add`.
2. **`chezmoi re-add` does not work on templates.** "chezmoi will not overwrite templates"; it only touches already-managed files and ignores non-files ([re-add reference](https://www.chezmoi.io/reference/commands/re-add/)). Once a file is a `.tmpl`, the round trip is **one-way** — you edit the source or nothing. This is the biggest day-to-day tax and it's the thing people don't discover until month two.
3. **`chezmoi edit --watch` is fragile.** Requires arguments (bare `chezmoi edit` unsupported), requires fsnotify, requires `edit.hardlink`, and hardlinks "cannot span different filesystems, so if your temporary directory resides on a separate filesystem (like tmpfs), this feature won't function" ([edit reference](https://www.chezmoi.io/reference/commands/edit/)). On WSL with `/tmp` on tmpfs, this is a live failure.
4. **Go `text/template` learning curve.** Debug with `chezmoi execute-template`; a broken template breaks `apply` for that file.
5. **The one-liner installs relative to CWD** — it writes to `./bin`. Run it from the wrong directory and the binary lands somewhere useless.
6. Editing the target directly is supported but lossy: on next `apply`, chezmoi detects the change and prompts, and you resolve with `chezmoi merge` — but that detection depends on the boltdb, which is empty on a fresh machine ([FAQ](https://www.chezmoi.io/user-guide/frequently-asked-questions/usage/)).

## Bare git repo
Origin is StreakyCobra's HN comment, 2016-02-10 ([news.ycombinator.com/item?id=11071754](https://news.ycombinator.com/item?id=11071754)), popularized by [Atlassian](https://www.atlassian.com/git/tutorials/dotfiles):
```sh
git init --bare $HOME/.cfg
alias config='/usr/bin/git --git-dir=$HOME/.cfg/ --work-tree=$HOME'
config config --local status.showUntrackedFiles no
```
`status.showUntrackedFiles no` is mandatory — without it `config status` lists every unmanaged file in `$HOME`.

**Honest problems:**
- **Checkout onto a non-empty `$HOME` fails, always** — and a fresh WSL distro is not empty (ships `.bashrc`, `.profile`, `.bash_logout`). You get `error: The following untracked working tree files would be overwritten by checkout`. The canonical workaround **parses git's human-readable error with `egrep`/`awk`/`xargs` and `mv`s the results** — it breaks on filenames with spaces and on localized git output. This fails precisely on your decisive criterion.
- `git clone --bare` doesn't set `remote.origin.fetch`, so `fetch`/`pull` misbehave until you add the refspec manually ([writeup](https://morgan.cugerone.com/blog/workarounds-to-git-worktree-using-bare-repository-and-cannot-fetch-remote-branches/)). Most tutorials omit this.
- The setting that makes it usable (`showUntrackedFiles no`) is the same one that **hides new dotfiles forever** — you find out they were never committed after the reinstall.
- **No secrets story at all.** One reflexive `config add -A` in `$HOME` stages `~/.ssh/id_ed25519`, `~/.aws/credentials`, and `~/.claude.json` — which per [Claude Code settings docs](https://code.claude.com/docs/en/settings) "contains your OAuth session, MCP server configurations… per-project state… and various caches". ❌ on private files, whole-file encryption, and password managers ([comparison table](https://www.chezmoi.io/comparison-table/)).
- **No templating** (⁉️ "possible with significant manual effort") → per-machine branches → permanent merge conflicts. **No run-once scripts.**
- **Underrated tooling cost**: because the repo is bare and there's no `~/.git`, editors and CLIs that walk up looking for `.git` will **not** see `$HOME` as a work tree — good (you avoid the "my whole home is a repo" disaster), but it means your dotfiles get **zero editor/IDE/agent git integration**. VS Code, `gh`, `lazygit`, and Claude Code all see `~/.zshrc` as an untracked loose file; the `config` alias exists only in your interactive shell. For an agentic workflow where you want Claude to diff and commit config changes, that's a real handicap.
- Chicken-and-egg: the alias lives in the `.bashrc` that's inside the repo.

## GNU Stow
"A symlink farm manager which takes distinct sets of software and/or data located in separate directories… and makes them all appear to be installed in a single directory tree" ([manual](https://www.gnu.org/software/stow/manual/stow.html)). Perl. `stow -d ~/dotfiles -t ~ nvim`; `-R` restow, `-D` delete, `-n -v` simulate, `--dotfiles` maps `dot-bashrc` → `.bashrc`.

**What breaks:**
- **Atomic-save apps destroy symlinks.** VS Code is the canonical case: "Instead of updating the file in-place… VS Code wipes the file and creates a whole new file… changes the inode number" ([vscode #195539](https://github.com/microsoft/vscode/issues/195539); see also [#194856](https://github.com/microsoft/vscode/issues/194856), [#200474](https://github.com/microsoft/vscode/issues/200474)). Any tool doing tmp-file + `rename()` silently detaches your config from the repo. (Counter-example: git *is* symlink-safe — `lockfile.c` resolves symlinks on the base path, so `git config --global` writes through a symlinked `~/.gitconfig`.)
- **`--adopt` overwrites your repo with whatever's in `$HOME`.** The manual's own warning: "Warning! This behaviour is specifically intended to alter the contents of your stow directory. If you do not want that, this option is not for you."
- **Tree folding surprise**: if `~/.config` doesn't exist and your package contains `.config/nvim/`, Stow symlinks **all of `~/.config`** into your repo, so every future app writes its config into your dotfiles repo. Mitigate with `--no-folding`.
- **No templating, no secrets, no encryption, no bootstrap.** You still need `apt install git stow` → clone → stow, and Stow conflicts on every stock dotfile Ubuntu ships.
- **Maintenance**: 2.2.2 (2015-11) → 2.3.0 (2019-06) → **2.4.0 (2024-04)** → **2.4.1 (2024-09-08)**, "mostly internal and not visible to users" ([gnu.org/software/stow](https://www.gnu.org/software/stow/), [NEWS](https://git.savannah.gnu.org/cgit/stow.git/plain/NEWS)). **Nothing since 2024-09 (~22 months).** Worse: 2.4.0's headline fix was "a long-standing bug preventing the `--dotfiles` option from working correctly with directories" — the flagship dotfiles feature was broken for years.

## yadm
"Like having a version of Git that only operates on your dotfiles" ([overview](https://yadm.io/docs/overview)). Bash wrapper; repo at `~/.local/share/yadm/repo.git`, work tree `$HOME`.
- **★ WSL is a first-class OS value**: "The OS for 'Windows Subsystem for Linux' is reported as 'WSL', even though uname identifies as 'Linux'" ([alternates](https://yadm.io/docs/alternates)). So `.zshrc##os.WSL` just works — **strictly nicer than chezmoi's `contains "microsoft"` sniff.** Alternates use `##attr.value` with `os`, `hostname`, `class`, `distro`, `distro_family`, `user`, `template`.
- **Templates**: `##template.default` (built-in), `##template.esh`, `##template.j2` (j2cli or envtpl) ([templates](https://yadm.io/docs/templates)).
- **Encryption**: patterns in `~/.config/yadm/encrypt`; `yadm encrypt` bundles matches into a **single archive** you commit; gpg symmetric by default, asymmetric via `yadm.gpg-recipient`, or OpenSSL ([encryption](https://yadm.io/docs/encryption)).
- **Bootstrap**: `yadm clone --bootstrap <url>` runs `~/.config/yadm/bootstrap` ([bootstrap](https://yadm.io/docs/bootstrap)).
- **Downsides**: **development has stalled** — latest tag 3.5.0, **2025-03-03**, and the top commit on master is that release ([tags](https://github.com/TheLocehiliosan/yadm/tags), [commits](https://github.com/TheLocehiliosan/yadm/commits/master)); ~16 months quiet. The GitHub Releases tab is empty — tags only, so no prebuilt artifact to curl. Alternates **duplicate whole files** (`##os.Linux` + `##os.Darwin` + `##os.WSL` = three copies to keep in sync) — chezmoi templates express the delta, yadm alternates express the product. The good template processors are extra dependencies, undercutting the "just git" pitch. Alternates are implemented as **symlinks in `$HOME`**, inheriting the VS-Code-atomic-write breakage. Encryption is one opaque blob — undiffable, no per-file history, must remember to re-run `yadm encrypt` after every change. Requires git present. **No password-manager integration.**

## Others (one line + the downside)
- **Nix home-manager** — the maximalist option; manages packages *and* config together, atomic rollbacks. Cost: install and learn Nix first (prerequisite is a working Nix where `nix-instantiate '<nixpkgs>' -A hello` runs), then channels/flakes, a multi-GB store, a `stateVersion` you must not get wrong ([installation](https://nix-community.github.io/home-manager/installation/standalone.html)). You're buying a distro-management system to solve a dotfile problem.
- **Dotbot** — YAML plan; but installs as a git submodule, needs Python + git, symlinks, ❌ private files/encryption/templating/run-once ([comparison](https://www.chezmoi.io/comparison-table/)).
- **rcm** (thoughtbot) — well-documented shell scripts; no Windows, symlink-based, ❌ encryption/templates.
- **vcsh**, **homeshick**, **dotter**, **dotdrop**, **Mackup** — niche; Mackup is a *sync* tool for known apps, not a bootstrapper ([dotfiles.github.io/utilities](https://dotfiles.github.io/utilities/)).

## Decision framework

| Profile | Tool | Price you pay |
|---|---|---|
| One machine, never reinstalls, wants zero abstraction | bare git | The reinstall you swear won't happen is exactly what breaks it; one `add -A` leaks secrets |
| Many machines, few per-machine differences | GNU stow | Symlinks clobbered by atomic-save apps, tree folding reshapes `$HOME`, no bootstrap, upstream stale since 2024-09 |
| Wants git muscle memory + native WSL detection, values a readable Bash script | yadm | 16 months without a commit; alternates duplicate files; coarse single-blob encryption; no password managers |
| **Reinstalls WSL regularly; agentic workflow; needs secrets + per-machine config + one-command rebuild** | **chezmoi** ✅ | Permanent source/target indirection; `re-add` doesn't work on templates; Go template syntax |
| Wants the whole machine reproducible | nix home-manager | Nix, forever |

## Bootstrap for the winner, fresh WSL Ubuntu, from zero
```powershell
wsl --install -d Ubuntu
```
```sh
cd ~          # the installer writes relative to CWD
sh -c "$(curl -fsLS https://get.chezmoi.io/lb)" -- init --apply <github-user>
export PATH="$HOME/.local/bin:$PATH"
chezmoi doctor && chezmoi status && chezmoi diff
```
(`/lb` installs to `./.local/bin` instead of `./bin` — [chezmoi.io/install](https://www.chezmoi.io/install/). Public repo needs no auth and **no git**, thanks to `useBuiltinGit=auto`.) Private-repo variant `... init --apply git@github.com:<user>/dotfiles.git` requires an SSH key already present — chicken-and-egg; prefer a public repo with age-encrypted secrets.

**The one thing you must carry out-of-band**: your age identity file. Copy it from `/mnt/c/...` or a password manager *before* the first apply and point `age.identity` at it.

**Claude-Code-specific layout advice**: manage `dot_claude/settings.json`, `dot_claude/CLAUDE.md`, `dot_claude/agents/`, `dot_claude/commands/`. **Never manage `~/.claude.json`** — it "contains your OAuth session, MCP server configurations for user and local scopes, per-project state (allowed tools, trust settings), and various caches" ([settings docs](https://code.claude.com/docs/en/settings)). Put it in `.chezmoiignore`.

---

# FRONT C — Shell & prompt

> Note: my Front C subagent died without reporting, so this is my own research. It's complete on the substantive questions; I flag the two things I couldn't primary-source at the end.

## C1. oh-my-zsh startup cost — and why the usual measurement is wrong

**First, the methodology correction, from the person who wrote powerlevel10k.** `time zsh -i -c exit` is the wrong benchmark. From [romkatv/zsh-bench](https://github.com/romkatv/zsh-bench): "The output of `time zsh -lic \"exit\"` tells you how long it takes to execute `zsh -lic \"exit\"` and nothing else. If you aren't in the habit of running this command, there is no reason to care about this number." His demonstration: agnoster showed 2ms exit time but 32ms first-prompt lag — the metrics diverge.

zsh-bench measures instead: `first_prompt_lag_ms`, `first_command_lag_ms`, `command_lag_ms`, `input_lag_ms`, `exit_time_ms` (explicitly noted as meaningless for interactive use). His blind-study perception thresholds: first prompt 50ms, first command 150ms, command lag 10ms, input lag 20ms.

**Published results** (AMD Threadripper 3970x, Ubuntu 22.04, 2023-02-27), as % of the perception threshold:

| Config | first prompt | command lag | input lag |
|---|---|---|---|
| no-rcs | 3% | 1% | 1% |
| powerlevel10k | 4% | 19% | 1% |
| zinit | 10% | 24% | 64% |
| zsh4humans | 19% | 27% | 25% |
| prezto | 97% | 13% | 1% |
| zim | 122% | 191% | 64% |
| **ohmyzsh** | **187%** | **366%** | 2% |

Read that: **oh-my-zsh is the worst entry in its author's own table on both prompt and command lag** — nearly 2x the perceptible threshold for first prompt and 3.7x for command lag, on a Threadripper. On a WSL2 VM it is worse.

**Where the time actually goes:**
- **compinit is the dominant cost, and OMZ invalidates its own cache.** From [ohmyzsh #13720](https://github.com/ohmyzsh/ohmyzsh/issues/13720) (Apr 2026): "In many common setups, the `$fpath` string differs subtly between sessions, causing OMZ to delete the dump and do a full compinit rebuild on every shell startup. The underlying `.zcompdump` file is correct — OMZ just never trusts it, wasting **500–1500 ms per new shell**." Corroborated by [#12952](https://github.com/ohmyzsh/ohmyzsh/issues/12952). Anything that mutates `$fpath` before OMZ loads — brew, pyenv, conda, nvm — triggers this. The classic community fix is to check the dump only once a day and otherwise use `compinit -C` ([ctechols gist](https://gist.github.com/ctechols/ca1035271ad134841284)); OMZ has a `ZSH_COMPINIT_CACHE` short-circuit.
- **git status in the prompt on large repos.** OMZ's documented lever: `DISABLE_UNTRACKED_FILES_DIRTY` — "Use this setting if you want to disable marking untracked files under VCS as dirty. This makes repository status checks for large repositories much, much faster" ([Settings wiki](https://github.com/ohmyzsh/ohmyzsh/wiki/Settings)).
- **The auto-update check.** [Issue #11617](https://github.com/ohmyzsh/ohmyzsh/issues/11617), "is_update_available function slows startup a lot." Kill it with `zstyle ':omz:update' mode disabled` (the modern form; `DISABLE_AUTO_UPDATE` is deprecated and equivalent) ([Settings wiki](https://github.com/ohmyzsh/ohmyzsh/wiki/Settings)).
- **`oh-my-zsh.sh` sources every lib file** regardless of use, plus each enabled plugin.
- Other levers documented in the same wiki: `DISABLE_MAGIC_FUNCTIONS` (bracketed-paste-magic/url-quote-magic are "known buggy in some Zsh versions"), `COMPLETION_WAITING_DOTS`, `ZSH_DISABLE_COMPFIX` (skips the insecure-`$fpath` permission scan).

**How to measure properly on your box:**
```zsh
# zprof — zsh's built-in function profiler
# line 1 of ~/.zshrc:
zmodload zsh/zprof
# last line of ~/.zshrc:
zprof
```
`zsh/zprof` is documented as "A module allowing profiling for shell functions" ([Zsh Modules](https://zsh.sourceforge.io/Doc/Release/Zsh-Modules.html)). **Its limitation is in the name**: it profiles *functions*, so straight-line `source`d code and external process spawns don't show up as attributable entries — which is exactly where much of OMZ's cost lives. For wall-clock comparisons use hyperfine with `-N`/`--shell=none` ([hyperfine README](https://github.com/sharkdp/hyperfine)); for the numbers that actually correlate with felt latency, use zsh-bench.

**Why this matters doubly for you**: Claude Code sources `~/.zshrc` at session start to snapshot aliases/functions/options ([tools-reference](https://code.claude.com/docs/en/tools-reference)). A 1.5s `.zshrc` is 1.5s added to every Claude Code session start — and to every new terminal you open, which in an agentic workflow is a lot of terminals.

## C2. Plugin managers

| | Status | Mechanism | Downside |
|---|---|---|---|
| **zinit** (zdharma-continuum) | v3.15.0, 2026-07-01, active ([repo](https://github.com/zdharma-continuum/zinit)) | Turbo mode: `zinit ice wait lucid` then `zinit light user/plugin`. Own claim: "yields **50-80% faster Zsh startup** (i.e., the shell will start up to **5** times faster!)" | **Trust history**: the original `zdharma/zinit` repo was **deleted by its author in 2021**, taking psprint's other projects with it; the community rebuilt as `zdharma-continuum` (recovered partly via softwareheritage.org) — see [zdharma-continuum/zinit#6](https://github.com/zdharma-continuum/zinit/issues/6), [#28](https://github.com/zdharma-continuum/zinit/issues/28), and the [robobenklein/zinit](https://github.com/robobenklein/zinit) fork ("since the original zdharma org is gone"). There is *also* a competing `z-shell/zi` fork. The README does not explain any of this. Technically: the ice-modifier DSL is large and idiosyncratic; deferred loading means plugins aren't ready at first prompt, and zsh-bench measures zinit at **64% of the input-lag threshold** — turbo trades startup for input latency. |
| **antidote** (mattmc3) | v2.1.0, 2026-04-09 ([repo](https://github.com/mattmc3/antidote)) | Successor to antibody (which derived from antigen). "Ultra-high performance plugin loads using a **static plugin file**": `antidote bundle < ~/.zsh_plugins.txt > ~/.zsh_plugins.zsh`, then source the generated file. Dynamic mode is `antidote load ~/.zsh_plugins.txt` | Static mode means **regenerating after every plugin change** — forget and your edits do nothing. Pure-zsh implementation, so no compiled speed floor. `kind:defer` deferral only works for plugins that support it. |
| **sheldon** (rossmacarthur) | 0.8.5, **2025-07-22** — ~12 months quiet ([repo](https://github.com/rossmacarthur/sheldon)) | Rust; `~/.config/sheldon/plugins.toml`; `sheldon add` / `lock` / `source`; `eval "$(sheldon source)"` with a lock file for caching | `eval "$(...)"` spawns a process on **every** shell start — a fixed cost the static-file approach avoids. No first-class OMZ integration documented (you can point it at arbitrary git repos). Deferred loading is mentioned only as "examples available." Slowest-moving of the live options. |
| **zplug** | **Dead.** Latest release **2.4.2, 2017-12-28**; no archive notice ([repo](https://github.com/zplug/zplug)) | Had `defer:N`, parallel install, OMZ/prezto sources | ~8.5 years without a release. Do not adopt. |
| **plain zsh + zcompile** | The baseline | Source plugin files manually; `zcompile` them. Primary source for the win, from the `.` builtin docs: "If a file named `file.zwc` is found, is newer than file, and is the compiled form (created with the `zcompile` builtin) of file, then commands are read from that file instead" ([Shell Builtin Commands](https://zsh.sourceforge.io/Doc/Release/Shell-Builtin-Commands.html)) — i.e. you skip re-parsing | You hand-maintain updates (`git pull` per plugin), ordering, and `zcompile` invalidation. `.zwc` files go stale silently if you forget to regenerate. But it has **zero** startup overhead from the manager itself, and it's the most reinstall-portable option (`.chezmoiexternal.toml` + a `run_onchange_` script that zcompiles). |

**Migrating off OMZ — the real cost.** Most of what people miss is aliases. The OMZ `git` plugin is **well over 150 aliases** plus a handful of genuine functions: `git_main_branch` (prefers `main`, falls back to `master`), `git_develop_branch`, `grename` (renames locally + on origin), `gbda` (delete all merged branches), `gunwipall` ([plugins/git](https://github.com/ohmyzsh/ohmyzsh/tree/master/plugins/git)). Copying the ~20 aliases you actually use into your own `.zshrc` costs you an afternoon and removes the dependency entirely.

**But you don't have to rewrite them — both live managers load OMZ directly:**
- antidote (`~/.zsh_plugins.txt`): `ohmyzsh/ohmyzsh path:lib` and `ohmyzsh/ohmyzsh path:plugins/git`, with `kind:defer` for deferrable plugins ([antidote README](https://github.com/mattmc3/antidote)).
- zinit: `zinit snippet OMZP::git` (plugins), `OMZL::git.zsh` (lib), `OMZT::` (themes), `OMZ::` (raw path) ([zinit README](https://github.com/zdharma-continuum/zinit)).

So the honest migration path is: keep the OMZ plugins you use, drop the `oh-my-zsh.sh` framework (which is where the compinit thrash and the update check live), and get most of the win.

## C3. Prompts

**powerlevel10k — check the README before you adopt it.** The notice at the top reads:

> **"THE PROJECT HAS VERY LIMITED SUPPORT / NO NEW FEATURES ARE IN THE WORKS / MOST BUGS WILL GO UNFIXED / HELP REQUESTS WILL BE IGNORED"**

([romkatv/powerlevel10k](https://github.com/romkatv/powerlevel10k)). Not archived, not abandoned, but explicitly frozen — the maintainer is not accepting the burden. Technically it is still the fastest thing measured (4% of first-prompt threshold, 19% command lag in zsh-bench), because of two mechanisms: **instant prompt** (renders the prompt immediately at zsh startup while plugins load in background, by redirecting I/O during init and restoring it after) and **gitstatus** (a persistent `gitstatusd` daemon that computes git state out-of-band instead of forking git per prompt). Config via the interactive `p10k configure` wizard, which writes `~/.p10k.zsh`. Font: **MesloLGS NF** recommended; it works with system fonts but you lose glyph options. **Downsides**: frozen maintenance; a daemon process per session; `~/.p10k.zsh` is a ~1,700-line generated file that is miserable to hand-merge across machines (relevant to Front B); the instant-prompt mechanism is famously noisy if any of your init code writes to stdout.

**starship.** Config: `~/.config/starship.toml`, override with `STARSHIP_CONFIG`. Key knobs ([starship.rs/config](https://starship.rs/config/)):
- `command_timeout` — default **500** ms — "Timeout for commands executed by starship (in milliseconds)."
- `scan_timeout` — default **30** ms — "Timeout for starship to scan files (in milliseconds)."
- `add_newline` — default `true`.
- `[git_metrics]` is **`disabled = true` by default** — you must opt in.
- `[git_status] disabled = true` is the mitigation for big repos.
- **WSL-specific, directly relevant to you**: the docs note git_status can be slow in **Windows directories under WSL**, and provide a `windows_starship` option to invoke a Windows-native starship binary for those paths. (Same root cause as Claude Code's WSL search warning — 9p filesystem crossing.)

**Aesthetics / fonts**: starship ships presets you apply with e.g. `starship preset no-nerd-font -o ~/.config/starship.toml`. Relevant ones ([presets](https://starship.rs/presets/)): **No Nerd Fonts** ("changes the symbols for several modules so that no Nerd Font symbols are used anywhere" — and the docs state "This preset will become the default preset in a future release of starship", [no-nerd-font](https://starship.rs/presets/no-nerd-font)), **Plain Text Symbols** ("great if you don't have access to Unicode"), **No Runtime Versions**, **Nerd Font Symbols**, plus Pastel Powerline / Tokyo Night / Gruvbox Rainbow / Catppuccin Powerline (all nerd-font-requiring), and **Pure Prompt** (emulates pure). **Downsides**: it's a subprocess spawned per prompt in Rust rather than in-shell zsh, so it's inherently slower than p10k's daemon model; the timeouts exist because modules genuinely block; TOML config is large; default presets need a Nerd Font.

**oh-my-posh.** "A custom prompt engine for any shell"; JSON/YAML/TOML config; blocks→segments hierarchy; `eval "$(oh-my-posh init zsh)"`; has `oh-my-posh font install` ([ohmyposh.dev/docs](https://ohmyposh.dev/docs/)). **Downside**: same per-prompt-subprocess model as starship with no daemon, and its docs publish no performance claims at all — its selling point is cross-shell (including PowerShell), which matters if you split time between WSL and native Windows. If you don't, it's starship with a bigger config surface.

**pure (sindresorhus).** v1.28.3, 2026-07-16, actively released (47 releases) ([repo](https://github.com/sindresorhus/pure)). Shows branch + dirty `*`, unpushed/unpulled arrows, command duration above a threshold, user@host only over SSH/in containers, red prompt char on failure. Uses **zsh-async** for non-blocking git checks; `PURE_GIT_PULL=0` disables remote checks. Loaded via `fpath` + `autoload -U promptinit; promptinit; prompt pure`. Uses Unicode `❯` but **no Nerd Font required**. Requires git ≥2.15.2, zsh ≥5.2. **Downside**: it shows very little — no language versions, no k8s context, no AWS profile. If you want those, it's the wrong tool.

**Recommendation for your profile**: starship with `[git_status] disabled = true` (or a low `scan_timeout`) and the `no-nerd-font` preset if you don't want to manage fonts across WSL reinstalls; or pure if you want minimum moving parts. p10k is faster but frozen and its generated config is a Front-B liability. **Whatever you pick, note that none of this reaches Claude Code** — the agent's Bash tool has no prompt at all, so prompt cost is purely your own terminal experience. What *does* reach Claude Code is `.zshrc` init time and your aliases.

## C4. fish / nushell in 2026 — honest take

**fish** completed a full C++→Rust rewrite for **4.0**; first beta 2024-12-17; ~14 months of work, "1155 files changed, 110247 insertions(+), 88941 deletions(-)" across ~2600 commits; "Performance is usually slightly better in terms of time taken, memory use has a slightly higher floor but a lower ceiling — it will use 8M instead of 7M at rest" ([Fish of Theseus](https://fishshell.com/blog/rustport/)). Autosuggestions, syntax highlighting, and completions-from-man-pages work out of the box with zero config — which is genuinely the thing zsh users spend a weekend assembling. fish is "a UNIX shell that relies not only on UNIX APIs but also their semantics" but makes deliberately non-POSIX design choices (e.g. avoiding subshells).

**nushell** is at **0.114.1 (2026-07-11)**, still **pre-1.0** after years, with breaking changes as a routine part of releases — 0.114.0 alone brought "sharper type checking, POSIX-style `--` option parsing, the new `run` command" ([nushell.sh/blog](https://www.nushell.sh/blog/)). Structured-data pipelines are legitimately better than text-munging for the class of work jq exists to do.

**The honest verdict for your specific workflow: keep bash or zsh as your login shell.**

The concrete reason is primary-sourced. Claude Code "sources `~/.zshrc`, `~/.bashrc`, or `~/.profile` **depending on your shell**" ([tools-reference](https://code.claude.com/docs/en/tools-reference)) — the enumerated set is zsh/bash/sh. There is no documented fish or nushell path. Everything downstream assumes POSIX: the read-only command allowlist is coreutils; the permission engine parses shell operators `&&`, `||`, `;`, `|`, `|&`, `&` and strips wrappers `timeout`/`time`/`nice`/`nohup`/`stdbuf`/`command`/`builtin`/zsh's `noglob` ([permissions](https://code.claude.com/docs/en/permissions)) — a bash/zsh grammar. Hooks, status lines, and `CLAUDE_ENV_FILE` are all "a shell script."

Beyond Claude Code: every `curl | sh` installer, every CI snippet, every README, and every LLM's default output is POSIX. In fish, `export FOO=bar`, `FOO=bar cmd`, `$(...)`, `&&` in some positions, and `2>&1` all differ. You end up typing `bash -c '...'` constantly, which negates the ergonomics you adopted it for.

**The pragmatic split that actually works**: keep zsh (or bash) as `$SHELL` so Claude Code, scripts, and installers behave; if you want fish's interactive feel, get 90% of it in zsh with `zsh-autosuggestions` + `zsh-syntax-highlighting` (both loadable via antidote/zinit); and use `nu` as a *tool you invoke* for structured-data work rather than as your login shell. Nushell pre-1.0 with per-release breaking changes is not something to put underneath a reinstall-from-zero dotfiles strategy.

---

## Two Front C gaps I could not close from primary sources
1. **A first-party oh-my-posh performance benchmark.** Its docs publish none; I found no neutral third-party head-to-head vs starship I'd trust. Treat "oh-my-posh vs starship speed" as unmeasured.
2. **The `zsh/zprof` usage snippet** (`zmodload zsh/zprof` at the top, `zprof` at the bottom) is universally used but the zsh manual section 22.35 wasn't retrievable; I could only source the one-line module description. The snippet is correct but I'm flagging it as not primary-sourced.