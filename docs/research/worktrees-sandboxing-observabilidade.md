# Research: worktrees, sandboxing e observabilidade de agentes

> **Procedência**: relatório produzido por um agente de research disparado durante o trabalho neste
> mapa, cuja sessão terminou antes de capturá-lo. Recuperado do transcript em disco e commitado
> **sem alteração de conteúdo** — nada aqui foi re-verificado na recuperação, e o texto é do agente,
> não meu. Alimenta [#61 — Postura de permissão e isolamento dos agentes](https://github.com/panlabs-tech/panlabs/issues/61) e, em parte, [#54](https://github.com/panlabs-tech/panlabs/issues/54).
>
> **Data da apuração**: 2026-07-20.
>
> O arquivo contém **dois blocos**: um relatório intermediário e, após o separador, a versão final e
> mais completa. O segundo supersede o primeiro, mas o primeiro é mantido porque traz detalhe que a
> síntese cortou.

---

Research complete across all three fronts. Note: the second background survey agent (third-party session viewers) is still running; I gathered Front C independently from primary sources in the meantime.

---

# Front A — git worktree management

## A1. Real semantics (primary: https://git-scm.com/docs/git-worktree)

**Subcommands:** `add`, `list`, `lock`, `unlock`, `move`, `remove`, `prune`, `repair`.

**What is SHARED across worktrees:**
- Object database (`.git/objects/`) and all refs under `refs/`
- Repo config `.git/config` — shared by default. Exceptions: `core.bare` and `core.worktree` apply only to the main worktree
- Hooks: hooks live at `$GIT_DIR/hooks` (https://git-scm.com/docs/githooks), which resolves to the *common* dir — so hooks are shared. The git-worktree page never states this explicitly, but Claude Code's sandbox docs confirm it operationally: for a linked worktree the sandbox allows writes to the main repo's shared `.git`, but "Writes to `hooks/` and `config` inside that directory remain denied" (https://code.claude.com/docs/en/sandboxing)

**What is PER-worktree:**
- `HEAD`, `MERGE_HEAD`, `CHERRY_PICK_HEAD` and other pseudo-refs; the index; the working tree
- Per-worktree ref namespaces: `refs/bisect/`, `refs/worktree/`, `refs/rewritten/`
- Cross-access syntax: `main-worktree/HEAD`, `worktrees/foo/HEAD`
- **Per-worktree config requires opting in:** `git config extensions.worktreeConfig true`, then `git config --worktree <key> <value>`, stored at `git rev-parse --git-path config.worktree`. Git's own guidance: `core.worktree` "should never be shared"; `core.bare` should not be shared if true; `core.sparseCheckout` should not be shared unless all worktrees use it

**`$GIT_DIR/worktrees/` layout:** each linked worktree gets `$GIT_DIR/worktrees/<name>/` containing `HEAD`, `index`, a `gitdir` file (absolute path back to the working tree), and optionally `locked` (containing the reason text). The worktree root holds a `.git` *file* with `gitdir: /path/main/.git/worktrees/<name>`. Inside, `$GIT_DIR` = the private dir, `$GIT_COMMON_DIR` = the main `.git`. Git's rule of thumb: "Do not make any assumption about whether a path belongs to `$GIT_DIR` or `$GIT_COMMON_DIR` … Use `git rev-parse --git-path`."

**Gotchas, all from the git docs:**
- `add` refuses when the commit-ish is a branch already checked out by another worktree, unless `--force`. Detached-HEAD worktrees (`-d`/`--detach`) can coexist freely — that's the documented use for "throwaway" worktrees
- **Submodules: "Multiple checkout in general is still experimental, and the support for submodules is incomplete. It is NOT recommended to make multiple checkouts of a superproject."** `move` also cannot move a worktree containing submodules
- `remove` only removes clean worktrees (no untracked files, no modifications) without `-f`
- Deleting a worktree directory by hand leaves stale admin files; `prune` (or `gc.worktreePruneExpire`) cleans them. `lock` prevents that pruning — and prevents move/delete
- `repair` fixes the two-way links after a manual move
- Untracked/gitignored files are simply **not there** — a worktree is a fresh checkout of tracked files only
- Newer knobs: `worktree.guessRemote`, `worktree.useRelativePaths` (implies `extensions.relativeWorktrees`, "incompatible with older Git"), `--orphan`, `--no-checkout` (for sparse-checkout setup)

## A2. Claude Code has NATIVE worktree support — this is the headline

This changes the calculus for the whole front. Primary: **https://code.claude.com/docs/en/worktrees** (docs moved: `docs.claude.com/en/docs/claude-code/*` now 301s to `code.claude.com/docs/en/*`).

- **`claude --worktree <name>` / `-w`** creates a worktree at `.claude/worktrees/<name>/` on a new branch `worktree-<name>` and starts Claude in it. Omit the name and it generates one (`bright-running-fox`). Also documented in https://code.claude.com/docs/en/common-workflows
- Docs explicitly tell you to add `.claude/worktrees/` to `.gitignore`
- **`.worktreeinclude`** at repo root solves the ".env problem" natively: gitignore syntax; "Only files that match a pattern and are also gitignored are copied, so tracked files are never duplicated." Applies to `--worktree`, subagent worktrees, and desktop parallel sessions. **Not** processed if you use a `WorktreeCreate` hook
- **`worktree.baseRef`**: `"fresh"` (default — branch from `origin/HEAD`, refetched if stale >24h, 5s cap) or `"head"` (branch from local HEAD). Cannot be set to a branch name
- **`--worktree "#1234"`** branches from a PR (`pull/<n>/head`) into `.claude/worktrees/pr-<number>`
- **Subagent isolation:** `isolation: worktree` in a subagent's frontmatter. While an agent runs, Claude runs `git worktree lock` on its worktree so cleanup can't remove it
- **Cleanup sweep** removes subagent/background worktrees older than `cleanupPeriodDays`, skipping any with changes or unpushed commits; never touches `--worktree` worktrees
- **Non-git VCS:** `WorktreeCreate` / `WorktreeRemove` hooks replace the git logic entirely (schema at https://code.claude.com/docs/en/hooks — input `{session_id, cwd, base_path, worktree_name}`, hook prints the absolute path on stdout; non-zero or no-path = failure)
- **Background agents auto-isolate into worktrees** and this can be disabled with `{"worktree": {"bgIsolation": "none"}}` (https://code.claude.com/docs/en/agent-view)
- `EnterWorktree` / `ExitWorktree` are real tools; entering a path *outside* `.claude/worktrees/` always prompts, and neither a permission rule nor "don't ask again" suppresses it — only `bypassPermissions`
- Shared with main checkout: the `.git` dir, project-scope plugins (v2.1.200+), and permission approvals (v2.1.211+ — "Yes, don't ask again" saves to the main checkout's `.claude/settings.local.json`)
- `.claude` is a protected path *except* `.claude/worktrees` (https://code.claude.com/docs/en/permission-modes)

**Downsides of the native path:** worktree creation fails if `.claude`, `.claude/worktrees`, or the target is a symlink; `-p` runs never clean up their worktrees (you must `git worktree remove`); requires ≥1 commit in the repo (else `Failed to resolve base branch "HEAD"`); interactive runs require workspace trust first. Current version is **v2.1.216, 2026-07-20** (https://code.claude.com/docs/en/changelog) and the worktree code has been churning hard — 12 worktree-related fixes between 2.1.176 and 2.1.216, several of them *security* fixes (2.1.210: `isolation: worktree` subagents could run git-mutating commands against the main repo; 2.1.216: same class via `git -C`/`--git-dir`/`GIT_DIR`). Treat worktree isolation as a correctness boundary, not a security boundary.

## A3. Third-party helper tools (verified state as of 2026-07-20)

| Tool | URL | What it is | Latest | Downside |
|---|---|---|---|---|
| **worktrunk** (`wt`) | https://github.com/max-sixty/worktrunk · https://worktrunk.dev/ | Rust. The most active project in the category (~5.9k★, 138 releases). `wt switch -c`, `wt switch pr:123`, `wt list`, `wt merge`, hooks, `-x` to launch an agent per worktree | **v0.68.0, 2026-07-15**; commits 2026-07-20 | Fast-moving pre-1.0; config/hook semantics still churning. Reflink speed is filesystem-dependent (APFS/btrfs/XFS/ReFS) — degrades to real copy on ext4. Binary name `wt` collides with two other tools |
| **gwq** | https://github.com/d-kuro/gwq | Go. Fuzzy finder, global cross-repo worktree discovery, `gwq tmux`, `copy_files` + `setup_commands` in `.gwq.toml` | v0.1.1, 2026-05-02 | Pre-1.0, single maintainer, ~456★; global filesystem scan is slow on big disks; no port mgmt |
| **phantom** | **https://github.com/phantompane/phantom** (moved from `aku11i/phantom` in v6.0.0; npm `@aku11i/phantom` → `@phantompane/cli`) | TypeScript. `phantom create/shell/exec/delete`, fzf, tmux panes, VS Code, **an MCP server** so an agent manages its own worktrees | v6.2.0, 2026-03-29; pushed 2026-07-20 | "Native Windows is not supported. Use Phantom from a Linux environment such as WSL instead." Node runtime dep; `copyFiles` is a true copy |
| **git-workers** (`gw`) | https://github.com/wasabeef/git-workers | Rust TUI; lifecycle hooks; `.git-workers.toml` `[files] copy=[".env"]` | v0.9.0, 2026-04-12 | **~16★.** Personal project, bus factor 1 |
| **git-worktree-switcher** (`wt`) | https://github.com/yankeexe/git-worktree-switcher | Bash, switch-only + fzf | v0.1.2, 2025-10-13 (~9mo idle) | It does `cd "$dir"; exec $SHELL` — **replaces your shell process**, so switching stacks nested shells and loses env/venv state. Switch-only: no create/delete/copy |
| **taecontrol/wt** | https://github.com/taecontrol/wt | Go, `.wt` YAML `init_commands` | v0.0.2, **2023-06-28** | Abandoned (3 years) |
| **ThePrimeagen/git-worktree.nvim** | https://github.com/ThePrimeagen/git-worktree.nvim | Neovim | pushed **2024-08-03**, 61 open issues | **~2 years dead, not archived, no pointer to the fork** — people still install it |
| **polarmutex/git-worktree.nvim** | https://github.com/polarmutex/git-worktree.nvim | The maintained fork | v2.1.0, 2025-02-15; pushed 2025-07-15 | ~12mo idle; v2.0.0 was a breaking rewrite; thin create/switch/delete wrapper only |

**Claude-Code-specific orchestrators:**

| Tool | URL | Status |
|---|---|---|
| **Claude Squad** | https://github.com/smtg-ai/claude-squad | **Alive.** Go, tmux + worktrees + TUI across Claude Code/Codex/Gemini/Aider. v1.0.19, last commit 2026-06-17, ~8.1k★. **AGPL-3.0** (matters if you embed). Requires tmux + `gh` |
| **Crystal** | https://github.com/stravu/crystal | **Dead/renamed** — deprecated Feb 2026, now Nimbalyst |
| **Nimbalyst** | https://github.com/nimbalyst/nimbalyst | **Very alive** — MIT since 2026-04-30, v0.70.1 on 2026-07-20. Heavy Electron GUI, not a CLI. Its vendor blog is also the main source of "which worktree tool is best" content — discount accordingly |
| **Vibe Kanban** | https://github.com/BloopAI/vibe-kanban | **Sunsetting** — shutdown announced 2026-04-10 (https://www.vibekanban.com/blog/shutdown). 27.5k★ but nothing since 2026-04-24; cloud half gone |
| **uzi** | https://github.com/devflowinc/uzi | **Abandoned** (last commit 2025-06-04). Don't adopt — but steal its `uzi.yaml` pattern: `portRange: 3000-3010` + `$PORT` in `devCommand` |
| **container-use** | https://github.com/dagger/container-use | **Barely alive** — 3 commits in 9 months, self-described experimental. Different model: a container per agent instead of a worktree, which *does* solve ports/DBs |

## A4. The three real pain points

**Copying gitignored files (.env).** Support matrix with exact keys: Claude Code `.worktreeinclude` (opt-in whitelist, gitignored-only); worktrunk `wt step copy-ignored` + `[step.copy-ignored] exclude=[...]` — **copies everything gitignored by default**, opt-out model, with built-in exclusions for `.bzr/ .hg/ .jj/ .svn/` etc. (https://worktrunk.dev/step/); phantom `phantom.config.json` → `postCreate.copyFiles: [".env", ...]` + `postCreate.commands` (https://github.com/aku11i/phantom/blob/main/docs/configuration.md); gwq `copy_files` + `setup_commands`; git-workers `[files] copy=[...]`. No support: git-worktree-switcher, both nvim plugins.

**node_modules / venv duplication.** This is mostly solvable at the package-manager layer, not the worktree layer:
- pnpm (https://pnpm.io/motivation): "All the files are saved in a single place on the disk. When packages are installed, their files are hard-linked from that single place, consuming no additional disk space." So N worktrees ≈ 1 copy of bytes. **Caveat (https://pnpm.io/settings): "It is possible to set a store from a different disk but in that case pnpm will copy packages from the store instead of hard-linking them, as hard links are only possible on the same filesystem."** Keep worktrees on the same volume as the store. `packageImportMethod` default is `auto` = clone (CoW) → hardlink → copy; clone is preferred because editing a file in `node_modules` under plain hardlinks corrupts the shared store
- uv (https://docs.astral.sh/uv/concepts/cache/): "it is important for performance for the cache directory to be located on the same file system as the Python environment uv is operating on. Otherwise, uv will not be able to link files from the cache into the environment and will instead need to fallback to slow copy operations." `UV_LINK_MODE` / `link-mode` values `clone|copy|hardlink|symlink`, **default `clone` (CoW) on macOS and Linux**, `hardlink` on Windows
- **Rule:** never put `node_modules` in a `copyFiles`/`.worktreeinclude` list — those are true copies. Run `pnpm install` / `uv sync` in the postCreate command instead. worktrunk is the exception (per-file reflink, "like `cp -Rc`"; cited 14 GB `target/` in ~20s vs ~2min)

**Port collisions.** worktrunk has the cleanest general answer: `{{ branch | hash_port }}`, a deterministic stable port in 10000–19999 derived from the branch name, usable in both the dev-server launch and the `wt list` URL column (https://worktrunk.dev/tips-patterns/). Dedicated tool: **portree** (https://github.com/fairy-pitta/portree) — Go, FNV32(branch:service) hashing with linear probing, injects `$PORT`/`$PT_BRANCH`/`$PT_<SERVICE>_URL`, `*.localhost` subdomain routing via reverse proxy. v0.2.0, 2026-02-22, MIT — but **only ~22★**, Windows experimental, and you can't pass `--port $PORT` through `pnpm` (invoke the tool directly). Claude Code itself does nothing about ports.

---

# Front B — sandboxing / isolation

## B1. Claude Code's own mechanisms

**Permission modes** (https://code.claude.com/docs/en/permission-modes) — six: `default` (labeled **Manual** in UI since v2.1.200, alias `manual`), `acceptEdits`, `plan`, `auto`, `dontAsk`, `bypassPermissions`. `Shift+Tab` cycles `default → acceptEdits → plan`. `dontAsk` never appears in the cycle (`--permission-mode dontAsk`) and **auto-denies** anything that would prompt — the right mode for CI. `--dangerously-skip-permissions` ≡ `--permission-mode bypassPermissions`.

What **still prompts** under `--dangerously-skip-permissions`: explicit `ask` rules, connector tools the org set to `ask`, MCP tools marked `requiresUserInteraction`, and removals targeting `/` or `~` (including when hidden inside `$(...)`, backticks, or `<(...)` — v2.1.208+). Protected-path checks are *skipped*. It refuses to run as root/sudo on Linux and macOS ("cannot be used with root/sudo privileges for security reasons") unless inside a recognized sandbox. Admins block it with `permissions.disableBypassPermissionsMode: "disable"`.

**Protected paths** (never auto-approved except in bypass): `.git`, `.config/git`, `.vscode`, `.idea`, `.husky`, `.cargo`, `.devcontainer`, `.yarn`, `.mvn`, `.claude` (except `.claude/worktrees`); files including `.gitconfig`, `.bashrc`/`.zshrc`/`.envrc`, `.npmrc`/`.yarnrc`/`.pnpmfile.cjs`, `.pre-commit-config.yaml`, `.mcp.json`, `.claude.json`. Critically: **`permissions.allow` rules do not pre-approve protected-path writes** — the check runs before allow-rule evaluation.

**settings.json permissions** (https://code.claude.com/docs/en/settings): `permissions.{allow,deny,ask,additionalDirectories,defaultMode}`; deny beats allow; arrays merge across scopes. Precedence: managed > CLI args > `.claude/settings.local.json` > `.claude/settings.json` > `~/.claude/settings.json`. Managed-only lockdowns: `allowManagedPermissionRulesOnly`, `disableAutoMode`, `disableBypassPermissionsMode`. Note `defaultMode: "auto"` is **ignored** from project/local settings so a repo can't grant itself auto mode.

**PreToolUse hooks** (https://code.claude.com/docs/en/hooks): input includes `session_id`, `transcript_path`, `cwd`, `permission_mode`, `tool_name`, `tool_input`. Exit 2 = block, stderr goes to Claude. JSON output: `hookSpecificOutput.permissionDecision` ∈ `allow|deny|ask|defer`, plus `permissionDecisionReason`, `updatedInput` (rewrite args before execution), `additionalContext`. 31 hook events total.

**Native sandboxing — this exists and works on Linux/WSL2** (https://code.claude.com/docs/en/sandboxing):
- Enable with `/sandbox` (writes to `.claude/settings.local.json`) or `sandbox.enabled: true` in `~/.claude/settings.json`
- **macOS = Seatbelt (nothing to install). Linux and WSL2 = bubblewrap. WSL1 and native Windows are NOT supported.** Deps on Linux/WSL2: `sudo apt-get install bubblewrap socat` (socat relays traffic through the sandbox proxy); ripgrep is bundled with the native binary; an *optional* seccomp filter adds Unix-domain-socket blocking, installed via `npm install -g @anthropic-ai/sandbox-runtime`. Dependency check runs at startup — restart after installing
- **Ubuntu 24.04+ / WSL2 gotcha, documented:** check `sysctl kernel.apparmor_restrict_unprivileged_userns`; if it returns `1`, install an AppArmor profile for `bwrap` at `/etc/apparmor.d/bwrap` (the docs give the exact profile) and `systemctl reload apparmor`. Ubuntu ships `bwrap-userns-restrict` in `/usr/share/apparmor/extra-profiles/` as an alternative (https://github.com/dfaerch/bubblewrap-on-ubuntu); disabling the sysctl globally works but is the worse option
- Default boundary: **write** = cwd + session `$TMPDIR` only; **read** = the entire computer minus denied dirs (so `~/.aws/credentials` and `~/.ssh` are readable by default unless you configure it); **network** = nothing pre-allowed, first use of a domain prompts
- Keys: `sandbox.enabled`, `failIfUnavailable`, `allowUnsandboxedCommands`, `excludedCommands`, `filesystem.{allowWrite,denyWrite,denyRead,allowRead}`, `credentials.{files,envVars}` with `mode: deny|mask` + `injectHosts`, `network.{allowedDomains,deniedDomains,allowUnixSockets,tlsTerminate,httpProxyPort,socksProxyPort}`, `allowManagedDomainsOnly`, `allowManagedReadPathsOnly`, `enableWeakerNestedSandbox`, `enableWeakerNetworkIsolation`, `allowAppleEvents`. New in v2.1.216: `sandbox.filesystem.disabled` (network egress control only)
- **Worktree interop:** when cwd is a linked worktree, the sandbox allows writes to the main repo's shared `.git` so `git commit` works — but denies `hooks/` and `config` inside it
- Escape hatch: a failing command may be retried with `dangerouslyDisableSandbox`, which drops to the normal permission flow. Kill it with `allowUnsandboxedCommands: false` ("Strict sandbox mode")

**Honest costs of the built-in sandbox, all from Anthropic's own docs:**
- It sandboxes **Bash only**. Read/Edit/Write, MCP servers, and hooks run unconstrained on the host. Explicitly: "The [sandboxed Bash tool] on its own constrains only Bash, so it is not sufficient for fully unattended runs in either mode."
- **The proxy does not terminate or inspect TLS by default**, so allowing a broad domain like `github.com` "can create paths for data exfiltration… code running inside the sandbox can potentially use domain fronting or similar techniques to reach hosts outside the allowlist"
- Known breakage: `watchman` (use `jest --no-watchman`); `docker` is incompatible (`excludedCommands: ["docker *"]`); Go CLIs (`gh`, `gcloud`, `terraform`) fail TLS verification under Seatbelt; bubblewrap can't mount a fresh `/proc` inside an unprivileged container (needs `enableWeakerNestedSandbox`, which "considerably weakens security")
- **WSL2-specific:** "sandboxed commands cannot launch Windows binaries such as `cmd.exe`, `powershell.exe`, or anything under `/mnt/c/`. WSL hands these off to the Windows host over a Unix socket, which the sandbox blocks." Add them to `excludedCommands`
- `excludedCommands` has **no managed-only lockdown** — a developer can always append entries. Keep the managed list narrow

**Sandbox runtime** (https://github.com/anthropic-experimental/sandbox-runtime, `@anthropic-ai/sandbox-runtime`) wraps the *whole* Claude Code process in the same Seatbelt/bubblewrap primitives: `npx @anthropic-ai/sandbox-runtime claude`. Config `~/.srt-settings.json` (`allowedDomains`, `deniedDomains`, `allowUnixSockets`, `tlsTerminate`, `denyRead`/`allowRead`/`allowWrite`/`denyWrite`, `enableWeakerNestedSandbox`, …). **v0.0.66, 2026-07-17**, 4.7k★, active. Self-described "research preview… APIs and configuration formats may evolve". Denies all write+network by default, so you must allow `~/.claude`, `~/.claude.json`, `/tmp`, your project, and `api.anthropic.com` before it will start.

**Official devcontainer** (https://code.claude.com/docs/en/devcontainer, files at https://github.com/anthropics/claude-code/tree/main/.devcontainer):
- Easy path is the Dev Container Feature `ghcr.io/anthropics/devcontainer-features/claude-code:1.0` on any base image
- The **reference** container is `devcontainer.json` + `Dockerfile` + **`init-firewall.sh`**. That script: saves Docker's `127.0.0.11` DNS nat rules, flushes nat/mangle/filter, `ipset destroy allowed-domains`; allows DNS/udp 53, ssh/22, loopback; creates `ipset create allowed-domains hash:net`; pulls GitHub CIDRs via `curl -s https://api.github.com/meta` → `jq -r '(.web + .api + .git)[]' | aggregate -q`; adds fixed hosts `registry.npmjs.org, api.anthropic.com, sentry.io, statsig.anthropic.com, statsig.com, marketplace.visualstudio.com, vscode.blob.core.windows.net, update.code.visualstudio.com`; detects the host gateway and allows that /24; then sets **`iptables -P INPUT DROP` / `FORWARD DROP` / `OUTPUT DROP`**; finally verifies that `https://example.com` is blocked and `https://api.github.com/zen` succeeds
- Requires `NET_ADMIN` + `NET_RAW` via `runArgs`. Persist auth with a named volume `source=claude-code-config-${devcontainerId},target=/home/node/.claude,type=volume`. Policy via `/etc/claude-code/managed-settings.json` copied in the Dockerfile
- **Anthropic's own warning:** "no system is completely immune… When executed with `--dangerously-skip-permissions`, dev containers do not prevent a malicious project from exfiltrating anything accessible inside the container, including the Claude Code credentials stored in `~/.claude`. Only use dev containers when developing with trusted repositories… Avoid mounting host secrets such as `~/.ssh` or cloud credential files." Also: "It is provided as a working example rather than a maintained base image"
- Because the Dockerfile is in the repo, "anyone with write access can change or remove this step" — repo-level policy is not an enforcement boundary

**Comparison table** (https://code.claude.com/docs/en/sandbox-environments): sandboxed Bash (no Docker, minimal/low setup, Bash only) < sandbox runtime (no Docker, low, whole process) < dev container (Docker, medium) < custom container (Docker, medium–high) < VM (high) < Claude Code on the web (Anthropic-managed VM). Their guidance: **"Always run `--dangerously-skip-permissions` sessions inside a container, a VM, or the sandbox runtime."** Also honest: "Isolation also does not change what is sent to the model."

## B2. Generic Linux options

- **bubblewrap** (https://github.com/containers/bubblewrap): unprivileged user namespaces; setuid mode has been **removed**. Uses `PR_SET_NO_NEW_PRIVS`. Key flags `--ro-bind/--bind`, `--dev`, `--proc`, `--unshare-pid`, `--unshare-net`, `--new-session`, seccomp. **Its own stated non-goal: "Bubblewrap is not a complete, ready-made sandbox with a specific security policy" and "The level of protection… is entirely determined by the arguments passed to bubblewrap."** Without `--new-session` + seccomp filtering of `TIOCSTI`, escape is possible; "Everything mounted into the sandbox can potentially be used to escalate privileges." That is the honest cost: you own the bind-mount policy, and getting it wrong is silent.
- **firejail** (https://firejail.wordpress.com/, https://github.com/netblue30/firejail): namespaces + seccomp-bpf + 1000+ app profiles; v0.9.80 (March 2026), maintained. **It is a SUID-root program** — that is the structural criticism, and it has bitten: **CVE-2022-31214**, local root via `--join` against a forged container where the initial user namespace persisted and `NO_NEW_PRIVS` was not set (https://seclists.org/oss-sec/2022/q2/188, https://security.gentoo.org/glsa/202305-19); earlier OverlayFS TOCTOU pre-0.9.64.4. Mitigation is `force-nonewprivs yes` or `join no` in `/etc/firejail/firejail.config`. For an agent sandbox, bubblewrap's no-setuid design is the safer default.
- **Docker / devcontainers**: strongest common-denominator boundary, and the only one with a turnkey Anthropic reference. Cost: image rebuild latency on every toolchain change, the host toolchain is hidden from you, editors without Dev Containers support (plain Vim) are out of the workflow, and bind-mounted workspace edits still land on the host.
- **`systemd-run --user`** (https://man7.org/linux/man-pages/man1/systemd-run.1.html): `--scope`, `--pty`, `--shell` (= `--pty --same-dir --wait --collect --service-type=exec $SHELL`), `-p` properties (`MemoryMax`, `CPUQuota`, `PrivateTmp`, `PrivateNetwork`, `ProtectHome`, `ProtectSystem`, `ReadOnlyPaths`, `NoNewPrivileges`). **Crucial caveat: with `--scope` the command "will be executed by systemd-run itself as parent process" and processes "inherit the execution environment of the caller" — so the sandboxing directives (`PrivateTmp`, `PrivateNetwork`, `ProtectHome`, `ProtectSystem`) do NOT apply to scopes, only to service units.** So `systemd-run --user --scope` is a fine *resource* limiter (cgroup memory/CPU) and a poor *isolation* boundary. Use `--user` service units, not scopes, if you want the Protect* directives.

## B3. WSL2 specifics

- **Docker Desktop vs native docker-ce does matter.** Docker Desktop runs its own `docker-desktop` WSL distro and exposes the CLI into your distros via Settings → Resources → WSL Integration; it requires WSL ≥ 2.1.5 and **explicitly says to uninstall any Docker Engine/CLI previously installed directly in WSL to avoid conflicts** (https://docs.docker.com/desktop/features/wsl/). Native docker-ce inside the distro is viable but needs systemd: `[boot] systemd=true` in `/etc/wsl.conf` (Windows 11 / Server 2022, Store WSL) or the older `[boot] command=service docker start` (https://learn.microsoft.com/en-us/windows/wsl/wsl-config). Also relevant: Docker Desktop's microVM **sandboxes** feature (https://docs.docker.com/ai/sandboxes/) is called out by Anthropic as a VM-grade option on hosts that already have Docker Desktop.
- **Throwaway WSL distros as disposable sandboxes — Microsoft primary source** (https://learn.microsoft.com/en-us/windows/wsl/basic-commands):
  - `wsl --export <Distribution Name> <FileName>` — "Exports a snapshot of the specified distribution as a new distribution file. Defaults to tar format. The filename can be `-` for standard input." Option `--vhd` for `.vhdx` (WSL 2 only)
  - `wsl --import <Distribution Name> <InstallLocation> <FileName>` — options `--vhd`, `--version <1/2>`
  - `wsl --import-in-place <Distribution Name> <FileName>` — imports a `.vhdx` directly; "The virtual hard disk must be formatted in the ext4 filesystem type"
  - `wsl --unregister <DistributionName>` — "Once unregistered, all data, settings, and software associated with that distribution will be permanently lost"
  - Plus `wsl -l -v`, `wsl --terminate <d>`, `wsl --shutdown`, `wsl --set-default`
  - **Gotcha:** imported distros have no launcher executable, so `<distro> config --default-user` does **not** work — you must set `[user] default=` in `/etc/wsl.conf`
  - This is genuinely cheap disposable isolation: export once, import N times, `--unregister` to destroy. But it's a *distro*, not a jail — an imported distro still has `/mnt/c` automounted (disable via `[automount] enabled=false`) and Windows interop enabled (`[interop] enabled=false`, `appendWindowsPath=false`), and all WSL2 distros share one lightweight utility VM governed by `%UserProfile%\.wslconfig` (`memory`, `processors`, `networkingMode`, `firewall`, `dnsTunneling`, `autoMemoryReclaim`)
- **Performance trap that hits worktrees hard:** Microsoft (https://learn.microsoft.com/en-us/windows/wsl/filesystems): "We recommend against working across operating systems with your files… For the fastest performance speed, store your files in the WSL file system… Use the Linux file system root directory: `/home/<user name>/Project` — Not `/mnt/c/Users/<user name>/Project`." N parallel worktrees on `/mnt/c` multiply an already-slow path.
- Claude Code's own required egress allowlist, if you build a firewall (https://code.claude.com/docs/en/network-config): `api.anthropic.com`, `claude.ai`, `claude.com`, `platform.claude.com`, `mcp-proxy.anthropic.com`, `downloads.claude.ai`, `storage.googleapis.com`, `bridge.claudeusercontent.com`, `raw.githubusercontent.com`, `code.claude.com`, plus `registry.npmjs.org` for npm installs and the two Datadog intake hosts (optional; kill with `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`).

---

# Front C — observability of agent sessions

## C1. Where sessions live on disk — now officially documented

Primary: https://code.claude.com/docs/en/sessions and https://code.claude.com/docs/en/claude-directory.

> "By default, transcripts are stored as JSONL at `~/.claude/projects/<project>/<session-id>.jsonl`, where `<project>` is your working directory path with non-alphanumeric characters replaced by `-`. Each line is a JSON object for a message, tool use, or metadata entry. **The entry format is internal to Claude Code and changes between versions, so scripts that parse these files directly can break on any release.** To build on session data, use `/export` or the script interfaces instead."

That sentence is the single most important fact on this front — the JSONL schema is explicitly *not* a contract.

Full `~/.claude` application-data layout (all cleaned up automatically once older than `cleanupPeriodDays`, **default 30**):

| Path | Contents |
|---|---|
| `projects/<project>/<session>.jsonl` | Full conversation transcript: every message, tool call, and tool result |
| `projects/<project>/<session>/subagents/` | Subagent transcripts, removed with the parent |
| `projects/<project>/<session>/tool-results/` | Large tool outputs spilled to separate files |
| `projects/<project>/memory/` | Auto memory |
| `file-history/<session>/` | Pre-edit snapshots for checkpoint restore (100 most recent checkpoints) |
| `plans/`, `debug/`, `paste-cache/`, `image-cache/`, `session-env/`, `tasks/`, `shell-snapshots/`, `backups/`, `feedback-bundles/` | as named |
| `sessions/` | One small file per running session (not age-swept) |
| `todos/`, `statsig/`, `logs/` | **Legacy — no longer written** |

Kept indefinitely: `history.jsonl` (every prompt typed, with timestamp + project path), `stats-cache.json` (what `/usage` shows), `remote-settings.json`, `policy-limits.json`.

Background/agent-view state is separate: `~/.claude/daemon.log`, `~/.claude/daemon/roster.json`, `~/.claude/jobs/<id>/state.json`, `~/.claude/jobs/<id>/tmp/`, with `CLAUDE_JOB_DIR` set per session (https://code.claude.com/docs/en/agent-view).

**Plaintext warning, verbatim:** "Transcripts and history are not encrypted at rest. OS file permissions are the only protection. If a tool reads a `.env` file or a command prints a credential, that value is written to `projects/<project>/<session>.jsonl`." Mitigations: lower `cleanupPeriodDays`, `CLAUDE_CODE_SKIP_PROMPT_HISTORY`, `--no-session-persistence` with `-p`, `persistSession: false` in the SDK. Relocate everything with `CLAUDE_CONFIG_DIR`. Purge per-project with `claude project purge` (v2.1.124+).

**Session identity / resume:** `claude --continue` (most recent in cwd), `claude --resume [<id>|<name>]`, `/resume` picker (`Ctrl+W` = all worktrees of the repo, `Ctrl+A` = all projects, `Ctrl+B` = current branch), `claude --session-id <uuid>`, `--fork-session`, `/branch`, `claude --from-pr <n>`, `claude -n <name>` / `/rename`. `-p` and SDK sessions **do not appear in the picker** but resume by ID from the originating directory. Resume restores conversation, model, permission mode (never `plan` or `bypassPermissions`), goals, scheduled tasks — but **not** `--mcp-config`, `--settings`, `--plugin-dir`, `--fallback-model`, or `--add-dir`. Resuming the same session in two terminals without forking **interleaves both into one transcript**.

**The supported programmatic interfaces** (use these instead of parsing JSONL): `claude -p --output-format json|stream-json`; `claude -p --resume <id> --output-format json "…" | jq -r '.result'`; the `transcript_path` field passed to **hooks** and **statusline** commands (a `SessionEnd` hook can archive the transcript); the Agent SDK.

## C2. Official OpenTelemetry

Primary: https://code.claude.com/docs/en/monitoring-usage.

Enable: `CLAUDE_CODE_ENABLE_TELEMETRY=1`. Exporters: `OTEL_METRICS_EXPORTER` ∈ `console|otlp|prometheus|none`, `OTEL_LOGS_EXPORTER` ∈ `console|otlp|none`, `OTEL_TRACES_EXPORTER` ∈ `console|otlp|none`. Transport: `OTEL_EXPORTER_OTLP_PROTOCOL` (`grpc` / `http/json` / `http/protobuf`), `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_HEADERS`, with per-signal overrides. Intervals: metrics 60000 ms, logs 5000 ms, traces 5000 ms. Distributed tracing is beta: `CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1` + `OTEL_TRACES_EXPORTER=otlp`. All of these can go in the `env` block of `settings.json`.

**Metrics (8):** `claude_code.session.count`, `.lines_of_code.count`, `.pull_request.count`, `.commit.count`, `.cost.usage` (USD), `.token.usage`, `.code_edit_tool.decision`, `.active_time.total`. Attributes include `model`, `query_source` (`main|subagent|auxiliary`), `effort`, `agent.name`, `skill.name`, `plugin.name`, `mcp_server.name`, and token `type` (`input|output|cacheRead|cacheCreation`).

**Events (~25 log types)** — this is where real session inspection lives: `user_prompt`, `assistant_response`, `api_request`, `api_error`, `api_refusal`, `tool_result` (with `tool_name`, `tool_use_id`, `success`, `duration_ms`, `decision_type`, sizes), `tool_decision`, `permission_mode_changed`, `auth`, `mcp_server_connection`, `hook_registered` / `hook_execution_start` / `hook_execution_complete`, `skill_activated`, `plugin_installed` / `plugin_loaded`, `compaction`, `at_mention`, `internal_error`, `api_retries_exhausted`. All carry `prompt.id` for correlating a prompt to everything downstream.

**Span hierarchy (beta):** `claude_code.interaction` → `claude_code.llm_request` / `claude_code.hook` / `claude_code.tool` → `tool.blocked_on_user`, `tool.execution`, and subagent interaction spans nested under the parent's tool span. Uses `gen_ai.*` semantic conventions.

**Backends:** any OTLP collector (gRPC 4317 / HTTP 4318), direct Prometheus scrape, console. Named downstreams: Datadog, Honeycomb, New Relic, Grafana Loki, CloudWatch, Azure Monitor (needs `Content-Length`; v2.1.212+ for `http/protobuf`/`http/json`). **Grafana Cloud has a first-party Claude Code integration** (https://grafana.com/docs/grafana-cloud/monitor-infrastructure/integrations/integration-reference/integration-claude-code/) shipping "Claude Code / stats / usage breakdown / productivity" dashboards; it wants `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf` and `OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE=cumulative`. Community Grafana dashboards: https://grafana.com/grafana/dashboards/25052-claude-code/ and https://grafana.com/grafana/dashboards/25255-claude-code-metrics-prometheus/.

**Honest costs, from Anthropic's own caveats list:**
- **Content is redacted by default.** Prompts, responses, tool params, and API bodies only appear if you set `OTEL_LOG_USER_PROMPTS`, `OTEL_LOG_ASSISTANT_RESPONSES`, `OTEL_LOG_TOOL_DETAILS`, `OTEL_LOG_TOOL_CONTENT`, `OTEL_LOG_RAW_API_BODIES` — which turns your metrics backend into a secrets sink
- **`OTEL_*` variables are NOT inherited by subprocesses** (Bash tool, hooks, MCP servers, language servers). Your agent's own tooling is invisible to the same pipeline
- Cardinality: `session.id` and `user.account_uuid` default **on**; `prompt.id` is events-only by design. Tune with `OTEL_METRICS_INCLUDE_*`
- "Cost metrics are approximations" — billing is authoritative
- Default temporality is `delta`; Prometheus-family backends want `cumulative`
- Traces need `CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1`, and `TRACEPARENT` is only sent to Anthropic endpoints unless `CLAUDE_CODE_PROPAGATE_TRACEPARENT=1`
- **The structural cost: OTEL is useless without a collector.** You are standing up collector + Prometheus/Loki + Grafana (or paying Grafana Cloud/Datadog) before you see anything, and it gives you *aggregate* telemetry, not "show me what that agent actually did in file X"

**Official non-OTEL dashboards** (https://code.claude.com/docs/en/analytics): Team/Enterprise at https://claude.ai/analytics/claude-code (Admins/Owners only; usage, GitHub-based contribution metrics in public beta, leaderboard, CSV export; **not available with Zero Data Retention**); API customers at https://platform.claude.com/claude-code. Enterprise-only Analytics API with `read:analytics` scope. Attribution caveats worth knowing: 21-day-before/2-day-after window, code rewritten >20% is not attributed, lock files and `dist/`/`build/`/`node_modules/` excluded, "deliberately conservative… an underestimate".

## C3. Third-party viewers/analyzers (verified 2026-07-20)

| Tool | Reads | Kind | State | Downside |
|---|---|---|---|---|
| **ccusage** — https://github.com/ryoppippi/ccusage | Local agent-CLI usage data across ~15 agents (Claude Code, Codex, OpenCode, Copilot CLI, Gemini CLI…) | **Token/cost accounting only** — daily/weekly/monthly/session reports, cache-read vs cache-creation split | **v20.0.18, 2026-07-20**, 17.3k★, 132 releases — the healthiest tool here | No conversation content. Parses undocumented on-disk formats for a dozen tools, so its blast radius for format churn is 12× |
| **Claude Code Usage Monitor** — https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor | Local session files (`--data-paths`, WSL discovery); reads official rate limits from the statusline hook | Live TUI: burn rate, forecasting, 5-hour window tracking. Mostly accounting, some session-window inspection | v4.0.0, 2026-06-27, 8.5k★ | v4.0 was a full rewrite (trust-layer "official vs estimated" semantics) — migration churn. No conversation viewing |
| **claude-code-log** — https://github.com/daaain/claude-code-log | `~/.claude/projects/` JSONL directly | **Real session inspection** — renders transcripts to HTML/Markdown with collapsible tool-use and tool-result blocks; writes `index.html` + per-project + per-session HTML | v1.5.0, 2026-07-09, 1.2k★, active | The purest example of the risk: it parses the format Anthropic says "changes between versions." Output is static HTML — no live view |
| **claude-code-templates** (`--analytics`, `--chats`) — https://github.com/davila7/claude-code-templates | Local Claude Code data; `--chats` serves a conversation viewer, optionally remotely via Cloudflare Tunnel | Both accounting and conversation viewing | 29.8k★ but **latest release v1.28.3 was 2025-11-15** — 8 months, stale relative to the CLI's weekly releases | Huge kitchen-sink repo (templates + agents + analytics); the Cloudflare-Tunnel remote-access mode exposes your transcripts — including any leaked secrets — over a public URL |
| **claude-code-otel** — https://github.com/ColeMurray/claude-code-otel | Consumes the **official OTEL** stream (no JSONL parsing) | Docker-compose: OTel Collector → Prometheus + Loki → Grafana, 4 prebuilt dashboards | 471★, MIT, **~4 commits, no releases** | Effectively a one-shot compose file someone published. Fine as a starting template, not a dependency |
| **ccdashboard** — https://github.com/NikiforovAll/ccdashboard | OTEL | Grafana stack or a lightweight .NET Aspire Dashboard option | not independently verified | Unverified maintenance |
| **ccflare** — https://github.com/snipeship/ccflare | **A proxy** — intercepts API traffic rather than reading disk | Request-level analytics + load balancing across accounts, dashboard on :8080 | Original appears stalled; the active line is the fork **better-ccflare** (https://github.com/tombii/better-ccflare), whose README cites fixing **authentication bypass and command injection** in the original | Man-in-the-middling your own auth is a real risk surface — and the fork's changelog is itself the evidence. Also invisible to anything that doesn't go over the API (local tool execution) |
| **cchistory** | — | Could not verify a canonical, maintained repo | — | Treat as unconfirmed |

**Honest summary of the third-party layer:** everything splits into three groups with different failure modes. (1) JSONL parsers (`claude-code-log`, `claude-code-templates`) give you real session inspection and are the only way to see what the agent actually did — and they read a format Anthropic documents as internal and version-unstable, on files that are **deleted after 30 days by default**. (2) Accounting tools (`ccusage`, Usage Monitor) are healthy and popular but answer "how much did I spend," not "what happened." (3) OTEL consumers are the only ones on a supported contract, and they cost you a collector plus a metrics/logs stack, redact content by default, and see nothing that subprocesses do.

---

## Cross-cutting notes worth acting on

1. **Docs URL change.** `docs.claude.com/en/docs/claude-code/*` now 301-redirects to `code.claude.com/docs/en/*`. Any bookmark, script, or allowlist using the old host needs updating; `code.claude.com` is also on the required-network-access list.
2. **Front A is largely solved in-product now.** `--worktree` + `.worktreeinclude` + `isolation: worktree` + `WorktreeCreate` hooks cover creation, the `.env` copy problem, subagent isolation, and non-git VCS. The remaining genuine gaps that third parties fill are **ports** (portree, worktrunk's `hash_port`) and **cheap bulk copying of build caches** (worktrunk's reflink `copy-ignored`).
3. **Don't confuse the two isolation boundaries.** Worktrees isolate *files* and are explicitly not a security boundary — the changelog shows repeated fixes for subagents escaping their worktree via `git -C`/`GIT_DIR` (2.1.210, 2.1.216). The sandbox is the security boundary, and it only covers Bash. Full autonomy needs the sandbox runtime, a container, or a VM.
4. **On WSL2 specifically the stack that actually works today:** distro on WSL2 (not WSL1), repo under `/home/...` not `/mnt/c`, `bubblewrap` + `socat` installed, the `bwrap` AppArmor profile in place on Ubuntu 24.04+, `/sandbox` enabled, `excludedCommands` for `docker *` and anything that must call a Windows `.exe`, and `wsl --export`/`--import` kept in your back pocket for a genuinely disposable environment.

<!-- ---- proximo bloco ---- -->

Research complete. The Front A helper-tool subagent never reported back, so I covered that ground directly; the Front C survey subagent did report and its findings are folded in below.

---

# FRONT A — Git worktrees

## A1. The real git semantics (primary: https://git-scm.com/docs/git-worktree)

**Subcommands:** `add`, `list`, `lock`, `unlock`, `move`, `remove`, `prune`, `repair`.

- `add <path> [<commit-ish>]` — if no commit-ish, creates a new branch named after the **final path component**. `-b`/`-B` name the branch explicitly (`-b` refuses if it exists, `-B` force-resets). `-d`/`--detach` gives a detached HEAD — docs call this useful for "throwaway" worktrees. `--orphan` makes an empty index on an unborn branch. `--no-checkout` suppresses checkout so you can configure sparse-checkout first. `--lock [--reason <s>]` locks at creation without a race.
- `remove` only removes **clean** worktrees (no untracked files, no modifications); `-f` overrides, `-f -f` for locked. Main worktree can never be removed.
- `prune` reaps admin files for missing worktrees; automatic pruning is governed by `gc.worktreePruneExpire`. `lock` exists specifically to "prevent its administrative files from being pruned."
- `repair` reestablishes links after a manual move — needed because the pointers are absolute by default.
- `move` **cannot move a linked worktree containing submodules**, and cannot move the main worktree.

**Shared vs per-worktree — this is the part people get wrong:**

| Shared (all worktrees) | Per-worktree |
|---|---|
| `.git/objects/` object DB | `HEAD`, `MERGE_HEAD`, `CHERRY_PICK_HEAD` and other pseudo-refs |
| All refs under `refs/` (branches, tags, remotes) | `index` |
| `.git/config` **by default** | `refs/bisect/*`, `refs/worktree/*`, `refs/rewritten/*` |
| hooks (`$GIT_DIR/hooks`) | working tree contents |

- Config is shared unless you opt in: `git config extensions.worktreeConfig true`, after which per-worktree values go to `git rev-parse --git-path config.worktree` and are set with `git config --worktree <key> <value>`. Docs explicitly say `core.worktree` "should never be shared", `core.bare` shouldn't be shared if true, and `core.sparseCheckout` shouldn't be shared unless every worktree uses it. Even without the extension, `core.bare` and `core.worktree` apply only to the main worktree.
- Cross-worktree ref access syntax: `main-worktree/HEAD`, `worktrees/foo/HEAD`, `main-worktree/refs/bisect/good`.
- **Rule of thumb from the docs:** "Do not make any assumption about whether a path belongs to `$GIT_DIR` or `$GIT_COMMON_DIR`… Use `git rev-parse --git-path` to get the final path."

**`$GIT_DIR/worktrees/` layout:** `git worktree add /path/other/test-next next` creates `/path/main/.git/worktrees/test-next/`. Inside the linked worktree, `.git` is a **file** containing `gitdir: /path/main/.git/worktrees/test-next`. That sets `$GIT_DIR` to the private dir and `$GIT_COMMON_DIR` to `/path/main/.git`. The private dir holds `gitdir` (path back to the working tree, must be fixed by `git worktree repair` if you move things), `HEAD`, `index`, and `locked` (plain-text reason) when locked.

**Gotchas, all from the doc:**
- Same branch cannot be checked out twice: `add` "refuses to create" when the commit-ish is a branch already checked out elsewhere, unless `--force`. Detached HEADs are exempt and can coexist freely.
- **Submodules:** "Multiple checkout in general is still experimental, and the support for submodules is incomplete. It is NOT recommended to make multiple checkouts of a superproject."
- **Hooks are shared.** https://git-scm.com/docs/githooks says only "By default the hooks directory is `$GIT_DIR/hooks`, but that can be changed via the `core.hooksPath` configuration variable" — it says nothing about worktrees. In practice git resolves hooks via the common dir; Anthropic's sandbox doc corroborates by treating `hooks/` and `config` as living in "the main repository's shared `.git` directory" (https://code.claude.com/docs/en/sandboxing).
- **Untracked and gitignored files are NOT copied.** A worktree is a fresh checkout of tracked files only. Anthropic states it plainly: "A worktree is a fresh checkout, so untracked files like `.env` or `.env.local` from your main repository are not present" (https://code.claude.com/docs/en/worktrees).
- Newer knobs: `worktree.guessRemote`, and `worktree.useRelativePaths` (implies `extensions.relativeWorktrees`, **incompatible with older Git** — a real portability downside).

## A2. Claude Code has NATIVE worktree support — this changes the build-vs-buy answer

This is the headline finding. As of **v2.1.216 (2026-07-20)** (https://code.claude.com/docs/en/changelog), Claude Code ships first-class worktrees. Note the docs moved: `docs.claude.com/en/docs/claude-code/*` now 301s to **`code.claude.com/docs/en/*`**.

Primary source: https://code.claude.com/docs/en/worktrees

- **`claude --worktree <name>` / `-w`.** Creates the worktree at `.claude/worktrees/<name>/` at repo root, on a new branch `worktree-<name>`. Omit the name and it generates one like `bright-running-fox`. Docs tip: add `.claude/worktrees/` to `.gitignore`.
- **PR-based:** `claude --worktree "#1234"` fetches `pull/<number>/head` from origin into `.claude/worktrees/pr-<number>`. Quote the `#` or your shell eats it.
- **Base branch:** `worktree.baseRef` is `"fresh"` (default, branches from remote default branch, refreshing `origin/HEAD` if not fetched in 24h, capped at 5s) or `"head"` (your local HEAD, carries unpushed work). **You cannot set it to a branch name** — for that, use git directly.
- **`.worktreeinclude`** solves the ".env problem" natively. Project-root file, `.gitignore` syntax; "Only files that match a pattern and are also gitignored are copied, so tracked files are never duplicated." Applies to `--worktree`, subagent worktrees, and desktop parallel sessions.
- **Tools:** `EnterWorktree` / `ExitWorktree` (https://code.claude.com/docs/en/tools-reference). Since **v2.1.206**, entering a path *outside* `.claude/worktrees/` always prompts — a permission rule or "don't ask again" will not suppress it; only `bypassPermissions` skips it.
- **Subagent isolation:** `isolation: worktree` in a custom subagent's frontmatter. While an agent runs, Claude Code runs `git worktree lock` on its worktree so concurrent cleanup can't remove it; since v2.1.210 the sweep also releases locks from dead sessions but "never releases a lock you set yourself."
- **Background sessions** auto-isolate into worktrees; disable with `{"worktree": {"bgIsolation": "none"}}` (https://code.claude.com/docs/en/agent-view).
- **Cleanup:** interactive exit prompts based on whether the worktree holds work. `-p` runs have **no exit prompt and no cleanup** — you must `git worktree remove` yourself. A periodic sweep removes subagent/background worktrees older than `cleanupPeriodDays` (default 30), skipping any with changes or unpushed commits, and never touching `--worktree` worktrees.
- **What's shared with the main checkout:** the `.git` dir; project-scope plugins (v2.1.200+); and — importantly — permission approvals: since **v2.1.211** "Yes, don't ask again" in a worktree saves to the *main checkout's* `.claude/settings.local.json` and survives worktree removal. Before that, approvals were trapped in the worktree and lost.
- **Escape hatch for non-git VCS:** `WorktreeCreate` / `WorktreeRemove` hooks fully replace the git logic (https://code.claude.com/docs/en/hooks). `WorktreeCreate` receives `{session_id, cwd, base_path, worktree_name}` on stdin and must **print the absolute path to stdout**; exit 0 without a path = failure. **Downside: using the hook disables `.worktreeinclude` processing** — you must copy config files inside your script.

**Downsides of the native support:** it's opinionated about location (`.claude/worktrees/`, symlinks there are refused outright since v2.1.212); `worktree.baseRef` can't name a branch; `-p`/headless leaks worktrees; the cleanup sweep is entangled with `cleanupPeriodDays`, which *also* controls transcript retention, so tuning one tunes the other; and the feature surface has churned hard — a dozen worktree bugfixes between v2.1.176 and v2.1.216, several of them real isolation escapes (v2.1.210: `isolation: worktree` subagents could run git-mutating commands against the main repo; v2.1.216: subagents redirecting git via `git -C`/`--git-dir`/`GIT_DIR`).

## A3. Third-party worktree helpers (state as of 2026-07-20)

| Tool | URL | What it is | Status | Downside |
|---|---|---|---|---|
| **phantom** | https://github.com/aku11i/phantom | TS CLI: `create/attach/exec/shell/edit/ai/delete/list`; worktrees in `.git/phantom/worktrees/` | 212★, MIT, v6.2.0 (2026-03-29), 34 releases — active | Small community; homebrew formula name and the npm package name reported as `@phantompane/cli` don't obviously match the GitHub org — **verify the package before installing** |
| **gwq** | https://github.com/d-kuro/gwq | Go CLI, fuzzy-finder-first: `add/list/get/cd/exec/remove/status/tmux`; global multi-repo discovery with `-g`; TOML config (`~/.config/gwq/config.toml`, `.gwq.toml`), `worktree.basedir`, `naming.template`, per-repo setup commands | 456★, Apache-2.0, v0.1.1 (2026-05-02) | Still **v0.1.x** after 24 releases — API not stable; `gwq cd` needs shell integration like any cd-wrapper |
| **git-worktree-switcher (`wt`)** | https://github.com/yankeexe/git-worktree-switcher | Pure-shell `wt <name>` / `wt -i` / `wt -` / `wt list`, bash+zsh+fish completion | 265★, MIT, v0.1.2 (2025-10-13) | Navigation only — creates nothing, copies nothing, solves none of the real pain; last release ~9 months ago |
| **git-worktree.nvim** | https://github.com/polarmutex/git-worktree.nvim | Maintained fork of ThePrimeagen's; `create_worktree()`/`switch_worktree()`/`delete_worktree()` + hooks + Telescope | 140★, v2.1.0 (2025-02-15) | Editor-scoped; irrelevant to headless agents. I could **not** confirm from the fork's page whether the upstream ThePrimeagen repo is formally unmaintained |
| **portree** | https://github.com/fairy-pitta/portree | The port-collision answer: per-worktree dev servers with **FNV32 hash-based port assignment** + linear probing, injects `$PORT`/`$PT_BRANCH`/`$PT_BRANCH_SLUG`/`$PT_SERVICE`/`$PT_BACKEND_URL`, `*.localhost` subdomain routing via reverse proxy. `portree up/down/ls/proxy start/dash/open` | 22★, MIT, Go, v0.2.0 (2026-02-22) | **22 stars** — essentially a personal project; you are the QA team |
| **claude-squad** | https://github.com/smtg-ai/claude-squad | tmux + git worktrees TUI managing parallel Claude Code / Codex / Gemini / Aider sessions | 8.1k★, **AGPL-3.0**, v1.0.19 (2026-06-17) | AGPL is a real consideration for corporate use; now substantially overlapped by Claude Code's own `claude agents` view + `--worktree --tmux` |
| **Crystal → Nimbalyst** | — | Crystal was renamed; the repo now says "Crystal is now Nimbalyst" — treat Crystal as a legacy name | — | **Under-verified** — I did not fetch the repo directly, only secondary write-ups |
| **Vibe Kanban** | — | Kanban board over agent tasks, agent-agnostic | Bloop (the company) **announced shutdown in early 2026**; project continues community-maintained, hosted services wound down | Vendor gone; **under-verified**, secondary sources only |
| **git-workers** | — | **Could not verify this project exists** under that name | — | — |

I did not find a Claude-Code-specific orchestrator that beats the built-in `--worktree` + `.worktreeinclude` + `claude agents` combination on the isolation axis.

## A4. The three real pain points

**1. Duplicated `node_modules` / venvs per worktree.** Mitigations are genuine but conditional:

- **pnpm** (https://pnpm.io/motivation): "All the files are saved in a single place on the disk. When packages are installed, their files are hard-linked from that single place, consuming no additional disk space." **The catch, verbatim from https://pnpm.io/settings:** "It is possible to set a store from a different disk but in that case pnpm will copy packages from the store instead of hard-linking them, as hard links are only possible on the same filesystem" and "The store should be always on the same disk on which installation is happening, so there will be one store per disk." Relevant settings: `storeDir`, `nodeLinker` (`isolated`/`hoisted`/`pnp`), `packageImportMethod` (`auto`/`hardlink`/`clone`/`clone-or-copy`/`copy`).
- **uv** (https://docs.astral.sh/uv/concepts/cache/): "it is important for performance for the cache directory to be located on the same file system as the Python environment uv is operating on. Otherwise, uv will not be able to link files from the cache into the environment and will instead need to fallback to slow copy operations." Cache location resolves via `--cache-dir` → `UV_CACHE_DIR` → `tool.uv.cache-dir` → `$XDG_CACHE_HOME/uv`. Housekeeping: `uv cache clean`, `uv cache prune`, `uv cache prune --ci`.
- **On WSL2 this bites specifically:** if your repo lives under `/mnt/c/...` and your cache under `~`, they are different filesystems, so you silently lose hardlinking *and* eat DrvFs overhead. Microsoft's guidance is unambiguous (https://learn.microsoft.com/en-us/windows/wsl/filesystems): "For the fastest performance speed, store your files in the WSL file system… Use the Linux file system root directory: `/home/<user name>/Project` — Not the Windows file system root directory: `/mnt/c/Users/<user name>/Project`."
- Since Claude Code puts worktrees at `.claude/worktrees/` *inside* the repo, they inherit the repo's filesystem — so keep the repo on the ext4 side and hardlinking works.
- **Downside of all of this:** it only helps package managers that hardlink. npm and plain `python -m venv` still copy. And Claude Code's own doc offers no help: "A worktree is a fresh checkout, so initialize your development environment there: ask Claude to install dependencies, or run your project's setup yourself."

**2. Copying gitignored config.** Native answer is `.worktreeinclude` (above). Third-party answer is phantom's `postCreate.copyFiles`, verbatim from https://github.com/aku11i/phantom/blob/main/docs/configuration.md:
```json
{
  "worktreesDirectory": "../phantom-worktrees",
  "directoryNameSeparator": "-",
  "postCreate": {
    "copyFiles": [".env", ".env.local", "config/local.json"],
    "commands": ["pnpm install", "pnpm build"]
  },
  "preDelete": { "commands": ["docker compose down"] }
}
```
gwq has per-repository setup commands with template variables. **Downside common to all of them:** you are copying secrets into N directories, multiplying the blast radius of a leaked `.env` and defeating any "one canonical secret" discipline.

**3. Port collisions.** No native support in Claude Code or git. portree is the only purpose-built tool I found (hash-based allocation + probing + reverse proxy). Otherwise the field practice is a fixed per-worktree port offset in each `.env` — which composes badly with `.worktreeinclude`, because the whole point of `.worktreeinclude` is that every worktree gets the *same* `.env`.

---

# FRONT B — Sandboxing / isolation

## B1. Claude Code's own layers

**Permission modes** (https://code.claude.com/docs/en/permission-modes) — six, and the naming has shifted: the mode formerly shown as `default` is now labeled **Manual** in the UI, with `manual` accepted as a CLI alias since v2.1.200.

| Mode | Runs without asking |
|---|---|
| `default` (Manual) | Reads only |
| `acceptEdits` | Reads, edits, and `mkdir`/`touch`/`rm`/`rmdir`/`mv`/`cp`/`sed` inside cwd |
| `plan` | Reads only |
| `auto` | Everything, with a **classifier** reviewing each action |
| `dontAsk` | Only pre-approved tools; everything else auto-**denied** (for CI) |
| `bypassPermissions` | Everything |

- `Shift+Tab` cycles `default → acceptEdits → plan`; `auto` and `bypassPermissions` join the cycle only when enabled; `dontAsk` never appears (set via `--permission-mode dontAsk`).
- **`--dangerously-skip-permissions`** ≡ `--permission-mode bypassPermissions`. What *still* prompts: explicit `ask` rules, org-set `ask` connector tools, MCP tools marked `requiresUserInteraction`, and removals targeting `/` or `$HOME` (the circuit breaker; since v2.1.208 it also fires on `$(...)`/backtick/`<(...)` forms). Protected-path writes are **allowed** in this mode. It is **refused when running as root or under sudo** on Linux/macOS — "cannot be used with root/sudo privileges for security reasons" — with the check skipped inside a recognized sandbox. Admins kill it with `permissions.disableBypassPermissionsMode: "disable"`.
- **Protected paths** are never auto-approved except under bypass, and `permissions.allow` rules cannot pre-approve them because the check runs *before* allow-rule evaluation. Directories: `.git`, `.config/git`, `.vscode`, `.idea`, `.husky`, `.cargo`, `.devcontainer`, `.yarn`, `.mvn`, `.claude` (except `.claude/worktrees`). Files include `.gitconfig`, `.gitmodules`, all the shell rc/profile files, `.envrc`, `.npmrc`/`.yarnrc`/`.pnpmfile.cjs`/`bunfig.toml`, `.bazelrc`, `.pre-commit-config.yaml`, `lefthook.*`, `gradle-wrapper.properties`, `.devcontainer.json`, `.ripgreprc`, `pyrightconfig.json`, `.mcp.json`, `.claude.json`.
- **Auto mode** is the interesting middle: a Sonnet-5-class classifier reviews actions. Notable defaults — it blocks `curl|bash`, force push, `terraform destroy`, `git reset --hard`/`git clean -fd`, amending pushed commits, and (v2.1.205+) **writes to `~/.claude/projects/**.jsonl` transcripts**, explicitly because "a tampered entry reaches every later check once you resume the session." Allowed by default: local edits in cwd, lockfile-declared installs, reading `.env` and sending credentials to *their matching API*, read-only HTTP, and (v2.1.211+) pushing to any branch of the repo you're in. **Downsides:** classifier calls cost tokens and add a round-trip; boundaries you state in conversation are re-read from the transcript each check and "can be lost if context compaction removes the message that stated it"; and it hard-fails after 3 consecutive or 20 total blocks (thresholds not configurable), aborting entirely under `-p`.

**Settings** (https://code.claude.com/docs/en/settings): precedence is **Managed > CLI args > `.claude/settings.local.json` > `.claude/settings.json` > `~/.claude/settings.json`**. `permissions` takes `allow`/`deny`/`ask`/`additionalDirectories`/`defaultMode`; `deny` beats `allow`. Managed-only lockdowns: `allowManagedPermissionRulesOnly`, `disableAutoMode`, `disableBypassPermissionsMode`. Note `defaultMode: "auto"` is **ignored** from project/local settings (v2.1.142+) so a repo can't grant itself auto mode.

**Hooks / PreToolUse** (https://code.claude.com/docs/en/hooks): 31 events. `PreToolUse` gets `{session_id, prompt_id, transcript_path, cwd, permission_mode, effort, tool_name, tool_input}`; exit 2 blocks; exit 0 + JSON `hookSpecificOutput.permissionDecision` of `allow|deny|ask|defer`, plus `permissionDecisionReason`, `updatedInput` (rewrite the args!), `additionalContext`. **Downside: hooks run unconstrained on the host** — they are outside the Bash sandbox boundary entirely.

## B2. The built-in Bash sandbox — real, and it works on WSL2

Primary: https://code.claude.com/docs/en/sandboxing

- **Enable with `/sandbox`** (3 tabs: Mode / Overrides / Config, + Dependencies on Linux). Panel writes to `.claude/settings.local.json`; set `sandbox.enabled: true` in `~/.claude/settings.json` for all projects.
- **OS primitives:** macOS = Seatbelt (nothing to install). **Linux and WSL2 = bubblewrap.** WSL1 unsupported; native Windows unsupported.
- **Linux/WSL2 deps:** `sudo apt-get install bubblewrap socat`. `socat` relays traffic through the sandbox proxy. Ripgrep ships with the native binary. An **optional seccomp filter** adds Unix-domain-socket blocking: `npm install -g @anthropic-ai/sandbox-runtime`. Dependency check runs at startup, so restart after installing.
- **Ubuntu 24.04+ / WSL2 AppArmor trap** — the single most likely thing to bite you. Check `sysctl kernel.apparmor_restrict_unprivileged_userns`; if it returns `1`, install a profile:
  ```
  sudo tee /etc/apparmor.d/bwrap > /dev/null <<'EOF'
  abi <abi/4.0>,
  include <tunables/global>
  profile bwrap /usr/bin/bwrap flags=(unconfined) {
    userns,
    include if exists <local/bwrap>
  }
  EOF
  sudo systemctl reload apparmor
  ```
  Corroborated widely: Ubuntu 23.10+ sets `kernel.apparmor_restrict_unprivileged_userns=1`; Ubuntu 25.04 ships `bwrap-userns-restrict` in the apparmor package (https://github.com/dfaerch/bubblewrap-on-ubuntu, https://github.com/microsoft/vscode/issues/316046). Globally setting the sysctl to `0` works but removes system-wide hardening.
- **WSL2-specific limitation, quoted:** "On WSL2, sandboxed commands cannot launch Windows binaries such as `cmd.exe`, `powershell.exe`, or anything under `/mnt/c/`. WSL hands these off to the Windows host over a Unix socket, which the sandbox blocks." Fix: add them to `excludedCommands`.
- **Default boundary:** write = cwd + session `$TMPDIR` only. Read = **the entire computer** except denied dirs — "this default still allows reading credential files such as `~/.aws/credentials` and `~/.ssh/`." Network = **no domains pre-allowed**; first use prompts (since v2.1.191 an approval sticks for the session).
- **Worktree-aware:** when cwd is a linked worktree, the sandbox allows writes to the main repo's shared `.git` so `git commit` works — but "Writes to `hooks/` and `config` inside that directory remain denied."
- **Key settings:** `sandbox.enabled`, `failIfUnavailable`, `allowUnsandboxedCommands`, `excludedCommands`; `sandbox.filesystem.allowWrite|denyWrite|denyRead|allowRead`; `sandbox.network.allowedDomains|deniedDomains|allowUnixSockets|tlsTerminate|httpProxyPort|socksProxyPort`; `sandbox.credentials.files|envVars` with `mode: "deny"|"mask"`; managed lockdowns `allowManagedDomainsOnly`, `allowManagedReadPathsOnly`; weakening escapes `enableWeakerNestedSandbox`, `enableWeakerNetworkIsolation`, `allowAppleEvents`; and (new in v2.1.216) `sandbox.filesystem.disabled` to keep network egress control while dropping filesystem isolation. Path prefixes: `/` absolute, `~/` home, bare/`./` relative to project root (project settings) or `~/.claude` (user settings) — **different from Read/Edit permission rules**, which use `//path` for absolute.
- **Credential masking** is clever and worth knowing: `mode: "mask"` gives the command a per-session sentinel and the proxy substitutes the real value on requests to `injectHosts`. Requires `network.tlsTerminate`; fails closed without it. Honored only from user/managed/`--settings` scopes, never from a repo's `.claude/settings.json`.
- **Escape hatch:** on sandbox-caused failure Claude may retry with `dangerouslyDisableSandbox: true`, which routes to the normal permission flow. Kill it with `"allowUnsandboxedCommands": false` ("Strict sandbox mode").

**Honest costs, straight from the troubleshooting section:** `watchman` is incompatible (`jest --no-watchman`); **`docker` is incompatible** — "Add `docker *` to `excludedCommands`"; Go CLIs (`gh`, `gcloud`, `terraform`) fail TLS under Seatbelt on macOS; bubblewrap can't mount a fresh `/proc` in unprivileged containers (needs `enableWeakerNestedSandbox`, which "exposes process information to sandboxed commands that a fresh `/proc` mount would hide"); `$TMPDIR` differs between sandboxed and unsandboxed commands so you can't hand temp files between them.

**Security limitations, quoted:** the proxy "does not terminate or inspect TLS," so "code running inside the sandbox can potentially use **domain fronting** or similar techniques to reach hosts outside the allowlist" — and "Allowing broad domains such as `github.com` can create paths for data exfiltration." `allowUnixSockets` on `/var/run/docker.sock` "effectively grants access to the host system." There is **no built-in credential deny list** — only what you enumerate. And the scope note: subagents share the parent's sandbox, but **MCP servers and hooks run unconstrained on the host**.

## B3. Choosing a boundary

https://code.claude.com/docs/en/sandbox-environments ranks them:

| Approach | Isolates | Docker? | Effort |
|---|---|---|---|
| Sandboxed Bash tool | Bash + children only | No | Minimal (macOS) / low (Linux, WSL2) |
| **Sandbox runtime** | Whole Claude Code process incl. file tools, MCP, hooks | No | Low |
| Dev container | Full dev env | Yes | Medium |
| Custom container | Full dev env | Yes | Medium–high |
| VM | Full OS | No | High |
| Claude Code on the web | Full OS, Anthropic-hosted | No | None |

The operative rule, quoted: "Always run `--dangerously-skip-permissions` sessions inside a container, a VM, or the sandbox runtime, so that file tools, MCP servers, and hooks are also inside the boundary." And: "The sandboxed Bash tool on its own constrains only Bash, so it is not sufficient for fully unattended runs in either mode."

**`@anthropic-ai/sandbox-runtime`** (https://github.com/anthropic-experimental/sandbox-runtime) is the sleeper option for a Linux/WSL2 solo setup — same Seatbelt/bubblewrap primitives wrapped around the *whole* process, no Docker. `npx @anthropic-ai/sandbox-runtime claude`, or `srt "<cmd>"`. Config `~/.srt-settings.json`: `allowedDomains`, `deniedDomains`, `allowUnixSockets`, `allowLocalBinding`, `tlsTerminate`, `denyRead`/`allowRead`/`allowWrite`/`denyWrite`, `ignoreViolations`, `enableWeakerNestedSandbox`, `enableWeakerNetworkIsolation`, `mandatoryDenySearchDepth`. **v0.0.66, 2026-07-17**, 4.7k★, 632 commits — actively developed. **Downsides:** self-described "research preview… APIs and configuration formats may evolve"; it **denies all write and network by default**, so you must explicitly allow your project dir, `~/.claude`, `~/.claude.json`, `/tmp`, and `api.anthropic.com` or nothing works; Windows support is alpha; and it inherits every network-inspection limitation of the Bash sandbox.

## B4. The reference dev container

https://code.claude.com/docs/en/devcontainer — three files in https://github.com/anthropics/claude-code/tree/main/.devcontainer: `devcontainer.json` (mounts, `runArgs` capabilities, extensions, `containerEnv`), `Dockerfile`, and `init-firewall.sh`.

**What `init-firewall.sh` actually does** (https://github.com/anthropics/claude-code/blob/main/.devcontainer/init-firewall.sh): preserves Docker's DNS rules (`iptables-save -t nat | grep "127\.0\.0\.11"`), flushes nat/mangle/filter and destroys the `allowed-domains` ipset; allows DNS (udp/53), SSH (22), and loopback; creates `ipset create allowed-domains hash:net`; fetches `https://api.github.com/meta`, extracts `(.web + .api + .git)[]` with `jq` and aggregates the CIDRs; adds fixed domains — `registry.npmjs.org`, `api.anthropic.com`, `sentry.io`, `statsig.anthropic.com`, `statsig.com`, `marketplace.visualstudio.com`, `vscode.blob.core.windows.net`, `update.code.visualstudio.com`; derives the host subnet from the gateway (`sed "s/\.[0-9]*$/.0\/24/"`) and permits it; sets `iptables -P INPUT DROP`, `-P FORWARD DROP`, `-P OUTPUT DROP`; then **verifies** by asserting `https://example.com` is blocked and `https://api.github.com/zen` works.

Requires `NET_ADMIN` + `NET_RAW` via `runArgs`. Persist auth across rebuilds with `"mounts": ["source=claude-code-config,target=/home/node/.claude,type=volume"]` — the reference uses `claude-code-config-${devcontainerId}` for per-project isolation. Org policy goes at `/etc/claude-code/managed-settings.json`. Pin the CLI with `npm install -g @anthropic-ai/claude-code@X.Y.Z` + `DISABLE_AUTOUPDATER=1` (the devcontainer *feature* always installs latest).

**Anthropic's own warning, verbatim:** "When executed with `--dangerously-skip-permissions`, dev containers do not prevent a malicious project from exfiltrating anything accessible inside the container, including the Claude Code credentials stored in `~/.claude`. Only use dev containers when developing with trusted repositories… Avoid mounting host secrets such as `~/.ssh` or cloud credential files." Also: "It is provided as a working example rather than a maintained base image." And dev containers are a convention, **not an enforcement boundary** — "Claude Code does not require a container."

**Network allowlist you'll actually need** (https://code.claude.com/docs/en/network-config): `api.anthropic.com`, `claude.ai`, `claude.com`, `platform.claude.com`, `mcp-proxy.anthropic.com`, `downloads.claude.ai`, `storage.googleapis.com`, `bridge.claudeusercontent.com`, `raw.githubusercontent.com`, `http-intake.logs.us5.datadoghq.com`, `browser-intake-us5-datadoghq.com`, `formulae.brew.sh`, `code.claude.com`, plus `registry.npmjs.org` for npm installs. Note the reference firewall's list is **narrower than this** — it predates several of these hosts.

## B5. Generic Linux options

- **bubblewrap** (https://github.com/containers/bubblewrap): unprivileged user namespaces; **the setuid mode has been removed**. Uses `PR_SET_NO_NEW_PRIVS`. Options: `--ro-bind`/`--bind`, `--dev`/`--proc`, `--unshare-pid`/`--unshare-net`, `--new-session`, seccomp. **The critical caveat, verbatim: "Bubblewrap is not a complete, ready-made sandbox with a specific security policy… The level of protection between the sandboxed processes and the host system is entirely determined by the arguments passed to bubblewrap."** Also: without `--new-session` + `TIOCSTI` seccomp filtering, escape is possible; "Everything mounted into the sandbox can potentially be used to escalate privileges." Translation: bind mounts are your security policy, and getting them right is the whole job. Since Claude Code drives bwrap for you, using its Bash sandbox or sandbox-runtime is strictly better than hand-rolling.
- **firejail** (https://firejail.wordpress.com/, https://github.com/netblue30/firejail): namespaces + seccomp-bpf, 1000+ app profiles, v0.9.80 (March 2026), actively maintained. **It is a SUID-root program, and that is the downside.** CVE-2022-31214 was a local root exploit via `--join` — a crafted container let an attacker enter an environment where "the Linux user namespace is still the initial user namespace, the `NO_NEW_PRIVS` prctl is not activated, and the entered mount namespace is under the attacker's control," escalating via `su`/`sudo` (https://seclists.org/oss-sec/2022/q2/188, https://security.gentoo.org/glsa/202305-19). Mitigate with `force-nonewprivs yes` or `join no` in `/etc/firejail/firejail.config`. Earlier: TOCTOU in the OverlayFS mount before 0.9.64.4. For an agent sandbox, a setuid-root binary with a history of local-root CVEs is the wrong shape — bubblewrap's unprivileged model is a better fit.
- **systemd-run --user** (https://man7.org/linux/man-pages/man1/systemd-run.1.html): `-p` sets `MemoryMax`, `CPUQuota`, `PrivateTmp`, `PrivateNetwork`, `ProtectHome`, `ProtectSystem`, `ReadOnlyPaths`, `NoNewPrivileges`; `--shell` is shorthand for `--pty --same-dir --wait --collect --service-type=exec $SHELL`. **The trap: with `--scope`, "the command will be executed by systemd-run itself as parent process"** — systemd doesn't fork it, so the sandboxing directives (`PrivateTmp`, `PrivateNetwork`, `ProtectHome`, `ProtectSystem`) **do not apply to scopes, only to service units.** So the common "just wrap it in a `systemd-run --user --scope`" advice gives you cgroup resource limits and nothing else. Use `--user` without `--scope` (a transient service) if you want the isolation directives. On WSL2 this requires systemd enabled at all — see below.
- **Docker / devcontainers:** covered above. Rebuild latency and toolchain opacity are the honest costs — every dependency change is a rebuild, and the host toolchain you've tuned is invisible inside.

## B6. WSL2 specifics

- **systemd is opt-in.** `/etc/wsl.conf` → `[boot]` `systemd=true`, then `wsl.exe --shutdown` (https://learn.microsoft.com/en-us/windows/wsl/wsl-config). Only on Windows 11 / Server 2022 for the `[boot]` section. Without it, `systemd-run --user` is a non-starter and native docker-ce needs `[boot] command=service docker start`.
- **Docker Desktop vs native docker-ce: yes, it matters.** Docker Desktop runs its own `docker-desktop` WSL distro and injects the CLI into distros you enable under Settings → Resources → WSL Integration. Docker's docs say to **"Uninstall any Docker Engine/CLI previously installed directly in WSL"** and explicitly warn that running Docker Engine natively alongside Docker Desktop "can cause conflicts" (https://docs.docker.com/desktop/features/wsl/). Requires WSL ≥ 2.1.5. Consider `autoMemoryReclaim` so the page cache doesn't hoard RAM after builds. Native docker-ce inside the distro avoids Docker Desktop licensing and the extra distro, but you own systemd/iptables setup yourself — and note **iptables inside WSL2 is what the devcontainer firewall depends on**.
- **Throwaway distro as a disposable sandbox — this is a genuinely underused WSL trick.** Microsoft primary source: https://learn.microsoft.com/en-us/windows/wsl/basic-commands
  - `wsl --export <Distribution Name> <FileName>` — "Exports a snapshot of the specified distribution as a new distribution file. Defaults to tar format." `--vhd` for `.vhdx` (WSL2 only). Filename can be `-` for stdout.
  - `wsl --import <Distribution Name> <InstallLocation> <FileName>` — "Imports the specified tar file as a new distribution." `--vhd`, `--version <1/2>`.
  - `wsl --import-in-place <Distribution Name> <FileName>` — imports an existing `.vhdx` (must be ext4).
  - `wsl --unregister <DistributionName>` — the nuke: "Once unregistered, all data, settings, and software associated with that distribution will be permanently lost."
  - Plus `wsl --terminate <D>`, `wsl --list --verbose`, `wsl --set-default <D>`, `wsl --shutdown`.
  - Pattern: build a golden distro once, `--export` it to a tar, `--import` a fresh copy per risky task, `--unregister` when done. Cost is near-zero and the boundary is a real VM kernel boundary (all WSL2 distros share one lightweight utility VM, so it's VM-per-host not VM-per-distro — weaker than separate VMs, stronger than a container).
  - **Downsides:** imported distros have no launcher executable, so **`<Distro> config --default-user` does not work** — Microsoft's docs say to use `/etc/wsl.conf` `[user] default=` instead. Export/import of a large distro is slow and disk-hungry. `.wslconfig` (`[wsl2] memory`, `processors`, `networkingMode`, `firewall`, `dnsTunneling`, `defaultVhdSize`) is **global to all distros** — you cannot resource-limit one throwaway distro independently. And the "8 second rule": config changes need the subsystem to fully stop before they take.
- **Filesystem placement is a correctness issue, not just perf** — see A4 for the hardlinking consequence.

---

# FRONT C — Observability

## C1. Where sessions actually live (documented — the *location* is; the *schema* is not)

Primary: https://code.claude.com/docs/en/sessions ("Where transcripts are stored") and https://code.claude.com/docs/en/claude-directory.

> "By default, transcripts are stored as JSONL at `~/.claude/projects/<project>/<session-id>.jsonl`, where `<project>` is your working directory path with non-alphanumeric characters replaced by `-`. Each line is a JSON object for a message, tool use, or metadata entry. **The entry format is internal to Claude Code and changes between versions, so scripts that parse these files directly can break on any release.** To build on session data, use `/export` or the script interfaces instead."

That sentence is the single most important fact on this front — Anthropic documents *where* and explicitly disclaims *what*.

Layout (all under `~/.claude/`, relocatable via `CLAUDE_CONFIG_DIR`):
- `projects/<project>/<session>.jsonl` — "Full conversation transcript: every message, tool call, and tool result"
- `projects/<project>/<session>/subagents/` — subagent transcripts
- `projects/<project>/<session>/tool-results/` — large tool outputs spilled to files
- `projects/<project>/memory/` — auto memory
- `file-history/<session>/` — pre-edit snapshots for checkpoint restore (100 most recent checkpoints)
- `plans/`, `debug/`, `paste-cache/`, `image-cache/`, `session-env/`, `tasks/`, `shell-snapshots/`, `backups/`, `feedback-bundles/`
- `sessions/` — one small file per running session, for concurrency/crash detection; not age-swept
- Not swept, kept forever: `history.jsonl` (every prompt typed, with timestamp + project path), `stats-cache.json` (the aggregate behind `/usage`), `remote-settings.json`, `policy-limits.json`
- **`todos/`, `statsig/`, `logs/` are documented as "Legacy directories from older versions. No longer written."** — several third-party tools still read them.

**Retention is a trap for observability:** everything in the first list "deleted on startup once they're older than `cleanupPeriodDays`. The default is 30 days." So your local session history silently self-destructs monthly unless you raise it — and raising it also lengthens how long unencrypted secrets sit around, because "Transcripts and history are not encrypted at rest. OS file permissions are the only protection. If a tool reads a `.env` file or a command prints a credential, that value is written to `projects/<project>/<session>.jsonl`."

Suppress writes entirely: `CLAUDE_CODE_SKIP_PROMPT_HISTORY`, or `--no-session-persistence` with `-p`, or `persistSession: false` in the SDK. Purge one project: `claude project purge` (v2.1.124+).

**Sanctioned programmatic access** (use these instead of parsing JSONL): `/export` (clipboard or plain-text file); `claude -p --output-format json|stream-json`; `claude -p --resume <session-id> --output-format json "…" | jq -r '.result'`; the **`transcript_path` field passed to every hook and to statusline commands** (a `SessionEnd` hook archiving the transcript is the documented pattern); and the Agent SDK.

**Session commands** (https://code.claude.com/docs/en/cli-reference): `--continue`/`-c`, `--resume`/`-r` (by ID, by name, or picker), `--session-id <uuid>`, `--fork-session`, `--from-pr`, `--name`/`-n`, `/resume`, `/branch`, `/rename`. Picker scoping: current worktree by default, `Ctrl+W` widens to all worktrees of the repo, `Ctrl+A` to all projects, `Ctrl+B` filters by branch. Sessions created with `-p` or the SDK **do not appear in the picker** but resume by ID from the originating directory. Resuming restores conversation, model, and permission mode — except `plan` and `bypassPermissions`, which are never restored — but **not** `--mcp-config`, `--settings`, `--plugin-dir`, `--fallback-model`, or `--add-dir`.

**Background agent state** (https://code.claude.com/docs/en/agent-view): `~/.claude/daemon.log`, `~/.claude/daemon/roster.json`, `~/.claude/jobs/<id>/state.json`, `~/.claude/jobs/<id>/tmp/`, with `CLAUDE_JOB_DIR` set per session. Shell surface: `claude agents [--json] [--cwd]`, `claude attach|logs|stop|respawn|rm <id>`, `claude daemon status|stop --any`. **Downside:** the supervisor "inherits the environment of whichever shell starts it first, and an OS-installed supervisor receives no shell environment at all" — so proxy/CA/telemetry vars exported in your shell reach background agents **only by luck**. Put them in `~/.claude/settings.json`'s `env` block instead.

## C2. Official OpenTelemetry

Primary: https://code.claude.com/docs/en/monitoring-usage

Enable: `CLAUDE_CODE_ENABLE_TELEMETRY=1`, then `OTEL_METRICS_EXPORTER` (`console|otlp|prometheus|none`), `OTEL_LOGS_EXPORTER` (`console|otlp|none`), `OTEL_TRACES_EXPORTER` (`console|otlp|none`), `OTEL_EXPORTER_OTLP_PROTOCOL` (`grpc|http/json|http/protobuf`), `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_HEADERS`, per-signal overrides, and intervals `OTEL_METRIC_EXPORT_INTERVAL` (60000ms), `OTEL_LOGS_EXPORT_INTERVAL` (5000ms), `OTEL_TRACES_EXPORT_INTERVAL` (5000ms).

**8 metrics:** `claude_code.session.count`, `claude_code.lines_of_code.count`, `claude_code.pull_request.count`, `claude_code.commit.count`, `claude_code.cost.usage` (USD), `claude_code.token.usage`, `claude_code.code_edit_tool.decision`, `claude_code.active_time.total`. Attributes worth knowing: token/cost carry `type` (`input|output|cacheRead|cacheCreation`), `model`, `query_source` (`main|subagent|auxiliary`), `effort`, and attribution (`agent.name`, `skill.name`, `plugin.name`, `mcp_server.name`, `mcp_tool.name`) — so you *can* cost-attribute per subagent and per skill.

**~30 event types**, including `claude_code.user_prompt`, `assistant_response`, `api_request`, `api_error`, `api_refusal`, `tool_result`, `tool_decision`, `permission_mode_changed`, `mcp_server_connection`, `hook_registered`/`hook_execution_start`/`hook_execution_complete`, `skill_activated`, `compaction`, `plugin_loaded`. `prompt.id` correlates a prompt to all downstream events (events only — deliberately excluded from metrics to bound cardinality).

**Tracing is beta:** `CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1`. Span tree: `claude_code.interaction` → `llm_request` / `hook` / `tool` → `tool.blocked_on_user` + `tool.execution`; a subagent's `interaction` becomes a child of the parent's `tool` span.

**Redaction defaults on** — prompts, responses, tool details, and API bodies are redacted unless you set `OTEL_LOG_USER_PROMPTS`, `OTEL_LOG_ASSISTANT_RESPONSES`, `OTEL_LOG_TOOL_DETAILS`, `OTEL_LOG_TOOL_CONTENT`, `OTEL_LOG_RAW_API_BODIES`. Cardinality knobs: `OTEL_METRICS_INCLUDE_SESSION_ID` (default true), `_VERSION` (false), `_ACCOUNT_UUID` (true), `_ENTRYPOINT` (false), `_RESOURCE_ATTRIBUTES` (true). Team tagging via `OTEL_RESOURCE_ATTRIBUTES="department=engineering,team.id=platform"` — **no spaces in values**.

**Backends:** OTLP gRPC :4317 / HTTP :4318 → collector → Prometheus, Loki, Datadog, Honeycomb, New Relic, CloudWatch, Azure Monitor; or `OTEL_METRICS_EXPORTER=prometheus` to scrape directly. There is a **first-party Grafana Cloud integration** (https://grafana.com/docs/grafana-cloud/monitor-infrastructure/integrations/integration-reference/integration-claude-code/) shipping "Claude Code", "Claude Code stats", "Claude Code usage breakdown", and "Claude Code productivity" dashboards; it needs an access-policy token with `metrics:write`+`logs:write` and `OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE=cumulative`.

**Honest costs:** you need a collector for any of this to be useful — the raw exporters give you console or a socket. `OTEL_*` variables are **not** passed to subprocesses (Bash, hooks, MCP servers), so nothing your agent shells out to is traced. Cost metrics are "approximations"; billing is authoritative. Default temporality is `delta`, which surprises Prometheus-shaped backends. `TRACEPARENT` only propagates to Anthropic endpoints unless `CLAUDE_CODE_PROPAGATE_TRACEPARENT=1`. And there is "no direct support for service accounts" — identity is the developer's account.

**Hosted alternative** (https://code.claude.com/docs/en/analytics): claude.ai/analytics/claude-code for Team/Enterprise (Admins/Owners only; usage + GitHub-integrated contribution metrics + leaderboard + CSV export), platform.claude.com/claude-code for API customers (usage + spend, needs UsageView). Enterprise-only Analytics API with `read:analytics` scope; a separate Claude Code Analytics API for Console. **Downsides:** contribution metrics are unavailable with Zero Data Retention; they're "deliberately conservative"; attribution only looks at merged PRs within a 21-day window and drops anything a human rewrote by >20%; and none of it is per-session inspection.

## C3. Third-party tools — what's real, what it reads, what breaks

**Token/cost accounting only:**
- **ccusage** — https://github.com/ccusage/ccusage (the `ryoppippi/ccusage` URL now redirects here). **17.3k★, v20.0.18 released 2026-07-20** — the healthiest tool in this space, now Rust-based, multi-harness (Codex, OpenCode, Amp, Gemini CLI, Copilot CLI, …). Reads `~/.claude/projects/**/*.jsonl` and `~/.config/claude/projects/`, honors `CLAUDE_CONFIG_DIR`. `npx ccusage@latest`. Daily/weekly/monthly/session/`blocks` + a `statusline` command. **Downside, from its own docs:** local files only; "API calls for tools like Web Search are not included"; "Costs are estimates and may not reflect actual billing." For Pro/Max subscribers the dollar figures are API list-price equivalents you never pay — routinely misread as real spend. It also inherits the 30-day sweep.
- **Claude Code Usage Monitor** — https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor. 8.5k★, MIT, **v4.0.0 (2026-06-27)**, last commit 2026-07-05. Reads `~/.claude/projects` via rglob for `*.jsonl` (confirmed in `src/claude_monitor/data/reader.py`). `uv tool install claude-monitor`. Live burn-rate TUI with 5h/weekly block prediction; machine-readable `--once --output json` / `--write-state`. **Downside:** predictions extrapolate from local token counts, not Anthropic's actual quota ledger, and the two diverge; no conversation view.

**Real session inspection:**
- **claude-devtools** — https://github.com/matt1398/claude-devtools. 3.7k★, MIT. **v0.5.0 (2026-05-13), and last commit also 2026-05-13** — ~2 months stalled with community PRs waiting since June. The most capable inspector: full message/tool-call text, subagent trees, per-turn token attribution across 7 categories, compaction visualization. Zero outbound network; works under `--network none`; Docker option mounts `~/.claude` read-only. **Downside:** stalled single-maintainer project on an undocumented format; a known token-attribution bug (#224); unsigned Windows build.
- **claude-code-history-viewer (CCHV)** — https://github.com/jhlee0409/claude-code-history-viewer. 1.9k★, MIT, **v1.21.0 (2026-07-12)**, last commit 2026-07-18 — currently the healthiest inspector. Desktop (Tauri) + headless `cchv-server --serve` on :3727 with Argon2id auth, read-only mode, SSE live watching, `--export <session-id> --format html|json`. **Downside:** heavyweight for a log reader; multi-harness support multiplies the undocumented formats it chases; server mode stands up an authenticated web service over unencrypted transcripts.
- **claude-code-log** — https://github.com/daaain/claude-code-log. 1.2k★, MIT, **1.5.0 (2026-07-09)**, last commit 2026-07-20 — very active. `uv tool install claude-code-log`. Reads `~/.claude/projects/**/*.jsonl` → HTML/Markdown with a TUI, per-message token totals, `--detail full|high|low|minimal|user-only`, natural-language date filtering. **Downside:** static export, not live browsing; combined pages "can be several megabytes"; and it **writes its output into `~/.claude/projects/`**, polluting the directory Claude Code sweeps and that `claude project purge` operates on.
- **claude-code-transcripts (simonw)** — https://github.com/simonw/claude-code-transcripts. 1.6k★, Apache-2.0. **0.6 (2026-01-25); last commit 2026-02-12 whose message is literally "Note that this is partially broken."** 61 open issues. **This is the cleanest illustration of the thesis:** the README carries a standing warning that "The `web` commands… are both broken right now due to changes to the unofficial and undocumented APIs that these commands were using." The local-JSONL path still works; the unofficial-API path rotted exactly as predicted.
- **claude-code-trace** — https://github.com/delexw/claude-code-trace. 353★, MIT, Rust+Tauri, **v0.12.0 (2026-07-18)**. Reads `~/.claude/projects/` only; expandable tool calls, MCP detection, **live tail** of running sessions; desktop/web/TUI. **Downside:** ~4 months old, bus-factor 1, unsigned macOS binary.
- **claude-code-viewer** — https://github.com/d-kimuson/claude-code-viewer. 1.3k★, **0.7.5 (2026-05-10)**, stale. It's a web client that *starts and resumes* conversations via the Agent SDK. **Downside is legal, and the README says so:** Anthropic's terms prohibit routing subscription credentials through third-party apps — confirmed at https://code.claude.com/docs/en/legal-and-compliance ("Anthropic does not permit third-party developers to offer Claude.ai login or to route requests through Free, Pro, or Max plan credentials on behalf of their users"). Subscription users get a degraded "copy mode."

**Narrow:** **cchistory** — https://github.com/eckardt/cchistory, 134★, v0.3.0 (2026-06-10). Streams `~/.claude/projects/**/*.jsonl` and extracts **only the Bash commands** Claude ran, shell-history style, with `--follow`. Its own README flags the retention trap: anything older than `cleanupPeriodDays` is gone.

**Proxy-based (different data source entirely — immune to schema churn):**
- **ccflare** — https://github.com/snipeship/ccflare. 1.0k★, MIT, Bun. **No GitHub releases at all; last commit 2026-04-15** — ~3 months stale. Reads nothing on disk: you point `ANTHROPIC_BASE_URL` at `http://localhost:8080/v1/anthropic` and it sees raw request/response payloads, storing history + analytics in its own DB with SSE streams. **Two serious downsides:** its headline feature is load-balancing across multiple accounts via OAuth, colliding directly with the ToS clause above; and it holds your OAuth tokens inside an unreleased, dormant service. A more-maintained fork exists at https://github.com/tombii/better-ccflare (claims fixes for auth bypass and command injection in the original — which tells you something about the original).
- **cc-viewer** — https://github.com/weiesky/cc-viewer, 1.0k★, last push 2026-07-18, same architectural class. **Under-verified** — interception mechanism and install not confirmed.

**OTEL dashboards:**
- **claude-code-otel** — https://github.com/ColeMurray/claude-code-otel. 471★, MIT, docker-compose of Collector → Prometheus + Loki → Grafana with 4 dashboards. **Created 2025-06-17 and last committed 2025-06-17 — abandoned the day it was published, no releases, no tags.** It leads the category purely on first-mover inertia, against a telemetry surface that has since grown tracing, new events, and new cardinality flags.
- **There is no maintained community successor.** The rest of the field is a long tail of 0–11★ personal docker-compose bundles (`ealexisaraujo/claude-code-otel`, `alonw0/cc-metrics`, `KB1SLN-Labs/agent-observability`, `KubeRocketCI/claude-code-telemetry`, `MilesUzbekus/claude-monitoring`, …). Also real: https://github.com/NikiforovAll/ccdashboard (Grafana stack or .NET Aspire dashboard) and published Grafana.com dashboards 25052 and 25255. **Honest conclusion: OTEL is the only sanctioned telemetry path, and the third-party dashboard layer on top of it is fragmented and effectively unowned. For a team, roll your own Grafana or use the first-party Grafana Cloud integration — not a community repo.**

**Hybrid:** **claude-code-templates** — https://github.com/davila7/claude-code-templates. 29.8k★ (stars are for the skills/agents marketplace, not the dashboard), 208 open issues, MIT. npm 1.29.4 (2026-07-14) but **last GitHub release v1.28.3 from 2025-11-15** — poor release hygiene. `npx claude-code-templates@latest --analytics` (:3333), `--chats`, `--analytics --tunnel`. Reading `cli-tool/src/analytics.js`: it reads `~/.claude`, `~/.claude/projects/**/*.jsonl`, `~/.claude/agents`, `~/Library/Application Support/Claude`, and — critically — **`~/.claude/statsig/` to derive the current session id**, a directory Anthropic documents as legacy and no longer written. Its own internal spec doc still describes Claude Code **v1.0.35** and names the transcript `conversation.jsonl`. `--tunnel` publishes your unencrypted transcripts to a public URL. (The statsig breakage is strong inference from code + docs, **not runtime-tested**.)

## C4. Is the JSONL schema documented anywhere? No.

The open request is https://github.com/anthropics/claude-code/issues/53516 — "[FEATURE] Stable, documented schema for `~/.claude/projects/<encoded-cwd>/<uuid>.jsonl` line types" (opened 2026-04-26, **still open**, labeled `stale`, last touched 2026-07-20, no Anthropic response). It enumerates observed top-level types (`agent-name`, `assistant`, `attachment`, `custom-title`, `file-history-snapshot`, `last-prompt`, `permission-mode`, `queue-operation`, `system`, `user`) and `system.subtype` values, and states: "Several of these… are recent additions that did not appear in older transcripts and are not described in the public docs. We have no way to know whether new types are additive (safe) or whether existing types may be renamed or removed (breaking)." A commenter notes tool-builders reverse-engineer the schema from minified `extension.js`.

Worse, the file is not only undocumented but **lossy** in ways that silently corrupt downstream analytics — related issues: #74078/#76706 (assistant text blocks intermittently missing), #77410 (assistant text alongside `AskUserQuestion` never persisted), #67313 (tool-result images duplicated, doubling file size), #58198 (permission prompts not serialized), #78159 (some sessions stopped writing JSONL entirely since ~2.1.209), #75435 (`transcript_path` points at a frozen file after compaction), #62397 (`/stats` scans the JSONLs, so deleting them erases history). Community de-facto specs exist (`vade-app/tjsonl`, https://claude-dev.tools/docs/jsonl-format) — which is itself the proof of reverse-engineering.

---

# Bottom line per front

- **A:** Build on the native `claude --worktree` + `.worktreeinclude` + `worktree.baseRef` + `WorktreeCreate` hook. It's better integrated than anything third-party and it solves the `.env` problem, which was the main reason to reach for phantom or gwq. Add **portree** only if port collisions actually bite. Put the repo on ext4, not `/mnt/c`, and use pnpm/uv so the store hardlinks. Watch the changelog — this surface has had real isolation escapes as recently as v2.1.216.
- **B:** On Linux/WSL2 the practical ladder is: Bash sandbox (`/sandbox`, needs `bubblewrap` + `socat` + the Ubuntu 24.04 AppArmor profile) for daily work → **`@anthropic-ai/sandbox-runtime`** when you want MCP servers and hooks inside the boundary without Docker → dev container or a throwaway `wsl --import` distro for anything unattended or untrusted. Never run `--dangerously-skip-permissions` outside a boundary. Skip firejail. Know that `systemd-run --scope` gives you cgroups but *not* the sandboxing directives.
- **C:** Use OTEL for anything you need to be durable — it's the only stable contract, and it needs a collector. Treat every JSONL-parsing tool as disposable; Anthropic tells you in writing they can break on any release, and the 30-day `cleanupPeriodDays` default is quietly deleting your history anyway. For session inspection specifically, **CCHV** and **claude-code-log** are the currently-healthy picks; claude-devtools is the most capable but has stalled. Prefer the sanctioned interfaces — `/export`, `-p --output-format json`, and the `transcript_path` a `SessionEnd` hook receives — over anything that globs `~/.claude/projects/`.

**Could not verify:** the Crystal→Nimbalyst rename and Vibe Kanban's shutdown (secondary sources only); `git-workers` as a real project; phantom's npm package name (`@phantompane/cli`) against its GitHub org; cc-viewer's interception mechanism; whether claude-code-templates' statsig-based session detection currently fails at runtime. Star counts and release dates are point-in-time 2026-07-20.