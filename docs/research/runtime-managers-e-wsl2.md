# Research: gerenciadores de runtime e especificidades de WSL2

> **Procedência**: este relatório foi produzido por um agente de research disparado durante o trabalho
> em [#60](https://github.com/panlabs-tech/panlabs/issues/60), cuja sessão terminou antes de capturá-lo.
> Recuperado e commitado sem alteração de conteúdo. Alimenta principalmente
> [#53 — Toolchain da máquina](https://github.com/panlabs-tech/panlabs/issues/53), e em parte
> [#62](https://github.com/panlabs-tech/panlabs/issues/62) e [#63](https://github.com/panlabs-tech/panlabs/issues/63).
>
> **Data da apuração**: 2026-07-20. Nada aqui foi re-verificado na recuperação.

---

## Frente A — Gerenciadores de versão de runtime

### Versões correntes (via GitHub API, 2026-07-20)

| Ferramenta | Última | Data |
|---|---|---|
| `jdx/mise` | `v2026.7.11` (CalVer) | 2026-07-20 |
| `asdf-vm/asdf` | `v0.20.0` | 2026-07-07 |
| `moonrepo/proto` | `v0.58.2` | 2026-07-02 |
| `astral-sh/uv` | `0.11.30` | 2026-07-20 |
| `nvm-sh/nvm` | `v0.40.6` | 2026-07-15 |
| `pyenv/pyenv` | `v2.8.1` | 2026-07-18 |

**`nvm` e `pyenv` lançaram na última semana.** "Estão abandonados" não é argumento válido para migrar.

### mise

**Modelo de ativação — são dois, e é aqui que a decisão trava.**

- `mise activate <shell>` é **baseado em PATH**: registra um hook pre-prompt que chama `mise hook-env`,
  reescrevendo `PATH`/env a cada desenho do prompt. Docs: "updates your PATH and environment every time
  your prompt runs. Recommended for interactive shells." — <https://mise.jdx.dev/getting-started.html>
- `mise activate --shims` é **baseado em shim**: prefixa `~/.local/share/mise/shims` no PATH uma vez.
  <https://mise.jdx.dev/dev-tools/shims.html>

**O problema não-interativo (crítico para agentes que rodam `bash -c`).** Do FAQ oficial: *"if you attempt
to use `mise activate` in a non-interactive session (like a bash script), it will never call `mise hook-env`
and in effect will never modify PATH because it never displays a prompt."* —
<https://mise.jdx.dev/faq.html>

Esse é exatamente o modo de falha de um agente shellando para fora: `bash -c 'node -v'` nunca desenha
prompt, e a ferramenta some. Correções sancionadas, em ordem de robustez:

1. **Shims** — `mise activate --shims` no `.zprofile` e `mise activate` no `.zshrc` (o híbrido que a própria doc recomenda).
2. `mise exec -- <cmd>` / `mise x -- npm test` — explícito, funciona em qualquer lugar.
3. `mise run <task>`.
4. `mise hook-env` manual.

**O que os shims custam** (documentado, não especulação) — <https://mise.jdx.dev/dev-tools/shims.html>:

- Variáveis de `[env]` só ficam visíveis para ferramentas geridas pelo mise, não para processos arbitrários.
- Hooks `cd`/`enter`/`leave` e `watch_files` não disparam; só `preinstall`/`postinstall`.
- `which node` retorna o caminho do shim, não o binário real — quebra ferramentas que introspectam o interpretador.
- Explicitamente: `--shims` "does **not** support hooks, env vars from `[env]`, or `watch_files`."

O enquadramento honesto: **shims dão correção para agente/IDE/CI e custam as features de env-manager;
ativação por PATH dá o conjunto completo e custa confiabilidade não-interativa.** Não dá pra ter os dois
num modo só.

**Arquivos de config e precedência** — <https://mise.jdx.dev/configuration.html> — do maior para o menor:
`mise.local.toml`, `mise.toml`, `mise/config.toml`, `.mise/config.toml`, `.config/mise.toml`,
`.config/mise/config.toml`, `.config/mise/conf.d/*.toml`. Recursam para cima até a raiz; tools e env
mesclam aditivamente com override, tasks são substituídas inteiras. `.tool-versions` (formato asdf) é lido
por compatibilidade. `.mise.toml` é nomenclatura legada — o idioma atual é `mise.toml` puro.

**Arquivos de versão idiomáticos — DESLIGADOS POR PADRÃO.** É o detalhe de migração mais esquecido.
`.nvmrc`, `.node-version`, `.python-version`, `.python-versions` e `devEngines` do `package.json` **não**
são lidos sem opt-in:

```toml
# ~/.config/mise/config.toml
[settings]
idiomatic_version_file_enable_tools = ["node", "python"]
```

Motivo declarado: custo de parsing (resultado é cacheado após a primeira vez).
<https://mise.jdx.dev/lang/node.html> · <https://mise.jdx.dev/lang/python.html>. Com isso ligado, o mise é
descrito como "a drop-in replacement for `nvm`". Também respeita `$NVM_DIR` (default `~/.nvm`).

**Instalação de Python.** O mise usa por padrão **binários pré-compilados do `python-build-standalone`**
(as mesmas distribuições que o uv usa — mantidas pela Astral), caindo para o `python-build` do pyenv quando
não há build pré-compilado. Controlado por `python.compile` / `MISE_PYTHON_COMPILE`.

**Integração mise ↔ uv.** O mise usa `uv` para criar venvs se o uv estiver instalado; `python.uv_venv_auto`
auto-sourceia/cria o `.venv` que o uv gerencia (repos com `uv.lock`); pode exportar `UV_PYTHON`. Para
projetos sem uv há `_.python.venv` com auto-create e seed de pacotes.

**Gestão de env / substitui o direnv?** `[env]` no `mise.toml`, mais diretivas `_.file` (dotenv/JSON/YAML/TOML),
`_.path`, `_.source`. `MISE_ENV_FILE=.env` para auto-carregar subindo a árvore.
<https://mise.jdx.dev/environments/>

A página sobre direnv é categórica: **"The official stance is you should not use direnv with mise."**
Incompatibilidades não são tratadas como bug e PRs de compat não são aceitos. A ponte
`use mise` / `mise direnv activate` está depreciada. <https://mise.jdx.dev/direnv.html> — ou seja: o mise
substitui o direnv para env vars e ativação de venv, mas se existir lógica real em `.envrc` (bash arbitrário,
`dotenv_if_exists`, busca de segredo), é reescrita.

**Tasks** — <https://mise.jdx.dev/tasks/> — `[tasks]` no `mise.toml` ou scripts executáveis em `mise-tasks/`
com metadata em comentário. Execução paralela por dependência, skip por `sources`/`outputs`, watch mode.
A doc não declara garantia de estabilidade.

**Modelo de trust — atrito real para agentes.** `mise trust` marca configs como seguras para executar.
Configs que só declaram versões carregam sem prompt; configs que executam código no load exigem trust.
Em contexto não-CI e não-TTY o mise "may fail with an untrusted-config error when it cannot prompt".
<https://mise.jdx.dev/cli/trust.html> — um agente clonando repo novo e rodando `mise x` pode bater numa
parede de trust que não consegue responder.

**Migração.** De asdf, a doc dá o one-liner verbatim:

```bash
mv ~/.tool-versions ~/.tool-versions.bak
cat ~/.tool-versions.bak | tr -s ' ' | tr ' ' '@' | xargs -n2 mise use -g
```

Ressalva declarada: o mise foi desenhado contra asdf ≤0.15; o asdf Go ≥0.16 tem comandos que ele não suporta.
De nvm/pyenv: ligue `idiomatic_version_file_enable_tools` e os `.nvmrc`/`.python-version` existentes passam a
funcionar. `mise use` escreve TOML — **nunca escreve `.tool-versions`**; `--fuzzy` (default) grava `node@20`,
`--pin` grava `node@20.0.0`.

**Auditoria das alegações de velocidade.** A página de comparação do mise alega que os shims do asdf custam
**~120 ms por chamada de runtime**, contra **~5–10 ms por prompt** do mise.
<https://mise.jdx.dev/dev-tools/comparison-to-asdf.html> — ceticismo justificado:

- Os 120 ms são contra o **asdf era-bash (≤0.15)**. A própria página concede: "The newer Go-based asdf closes
  the performance gap." O número de manchete está velho contra o asdf 0.20.
- A discussion #1201 do próprio mise mostra que o `hook-env` custava **~118 ms** originalmente, anulando
  inteiramente a vantagem; um usuário resumiu como "rtx saves me 100ms to run python by costing me 100ms
  before I run *any* command". Após otimização: 97,4 ms ± 6,1 → 4,8 ms ± 0,7.
  <https://github.com/jdx/mise/discussions/1201>
- A discussion #6279 (recente) reporta **~80 ms de overhead no startup do zsh** com `mise activate`, ~50 ms com
  `--shims`, contra 15,9 ms de baseline. `MISE_TIMINGS=1`: `hook-env` 35,5 ms, `load config` 13,9 ms,
  `load_tools` 21,2 ms. <https://github.com/jdx/mise/discussions/6279>
- **O que importa é a direção do custo**: shim taxa *por invocação de comando*; ativação por PATH taxa
  *por prompt / por cd*. Para um agente que roda muitos comandos curtos e não-interativos, **shims são a
  escolha errada-mas-necessária e você paga a taxa por invocação assim mesmo** — o ganho de manchete
  evapora justamente no caso de uso agêntico.

**Outras contrapartidas do mise:** CalVer com release quase semanal — sem contrato semver, sem linha LTS;
qualquer pin é alvo móvel. Suporte a Windows parcial. Projeto de origem mono-mantenedor.

### asdf

**v0.16.0 = reescrita completa de bash para Go.** <https://asdf-vm.com/guide/upgrading-to-v0-16.html>

- Distribuído como binário Go. **Sem sourcing de `asdf.sh`** e **sem auto-upgrade**.
- Comandos hifenizados sumiram: `asdf list-all` → `asdf list all`, `asdf plugin-add` → `asdf plugin add`.
- **`asdf global` / `asdf local` substituídos por `asdf set`** — a grande quebra de memória muscular, e o que
  quebra as premissas de compat do mise.
- **Removidos**: `asdf update`, `asdf shell`, templates de shim customizados.
- **Quebra de plugin**: comandos de extensão precisam de prefixo `cmd`, shebang correto e permissão de exec —
  o `exec` do Go é mais estrito que o do bash.

Releases desde então: v0.17.0 (mai/2025), v0.18.0 (jun/2025), v0.18.1 (mar/2026), v0.19.0 (abr/2026),
v0.20.0 (jul/2026). **Ainda pré-1.0 depois de 9 anos.**

**Cadeia de suprimentos.** Plugins são adicionados por URL git ou por shortname resolvido contra o índice
comunitário. A doc distingue first-party de comunidade mas **não descreve modelo formal de trust ou
verificação** — sem assinatura, sem política de checksum. Na prática, `asdf plugin add python` executa shell
arbitrário de um repo de terceiro no install e em todo `install`/`exec`. O contra-posicionamento do mise é
exatamente esse: move plugins para a org `mise-plugins` e adiciona checagem GPG e Cosign/SLSA.

**Contrapartidas do asdf**: só shim (custo por invocação, `which` mente), sem Windows, sem gestão de env,
sem task runner, pré-1.0, e a reescrita 0.16 mudou a superfície do CLI debaixo da documentação existente.

### proto (moonrepo)

- Ciclo: download para `~/.proto/temp` → **verificação de checksum (falha aborta)** → unpack → exposto via
  **shims e bin dirs** no PATH. <https://moonrepo.dev/docs/proto>
- **Plugins são WASM** (ou JSON/TOML/YAML para casos simples) — o diferencial real: plugins em sandbox em vez
  de shell arbitrário, mais checksum obrigatório. História de supply-chain materialmente melhor que a do asdf.
- Camada de compatibilidade alegando "over 800 asdf plugins".
- **Maturidade: `v0.58.2`, pré-1.0.** Nem a doc nem o FAQ fazem declaração de production-readiness.
- **Contrapartidas**: menor ecossistema e mindshare dos três; pré-1.0 sem compromisso de estabilidade;
  só shims; acoplado à órbita moonrepo; efetivamente single-vendor.

### pyenv e a questão do uv — o achado que sustenta a decisão

**pyenv hoje** (v2.8.1, 2026-07-18, ativo): shell puro, **baseado em shim**. Não depende de Python, não precisa
ser carregado no shell, e **não gerencia virtualenvs**. <https://github.com/pyenv/pyenv>

Crucialmente: *"Most Pyenv-provided Python releases are source releases and are built from source as part of
installation."* Em WSL2 isso significa instalar `build-essential libssl-dev zlib1g-dev libbz2-dev
libreadline-dev libsqlite3-dev libffi-dev liblzma-dev tk-dev` e **minutos por versão**. É esse o custo concreto
que o pyenv ainda impõe em 2026.

**`python-build` deixou de ser "o jeito padrão de obter CPython".** O padrão de fato hoje é o
**`python-build-standalone`** (originalmente indygreg, hoje mantido pela Astral). **uv e mise usam ele por
padrão.** A doc do uv declara: *"Python does not publish official distributable binaries. As such, uv uses
distributions from the Astral python-build-standalone project."*
<https://docs.astral.sh/uv/guides/install-python/> — a virada real de 2025–2026 não é "nvm/pyenv vs mise",
é **compilar-da-fonte vs binário standalone pré-construído**.

**uv como gerenciador de versão de Python** — <https://docs.astral.sh/uv/concepts/python-versions/>:

- `uv python install 3.12`, `uv python install '>=3.8,<3.10'`, `uv python install pypy@3.10`.
- **`uv python pin`** escreve `.python-version`; `--global` escreve no config do usuário.
- **Diferente do pyenv, o uv instala no PATH por padrão** (`~/.local/bin`) como executáveis versionados
  (`python3.13`); `--default` adiciona `python`/`python3` puros. **Sem shims** — binários/links reais.
- Python é baixado sob demanda: não precisa de Python pré-existente para bootstrap.
- **Limitações declaradas pelo próprio uv vs pyenv**: sem upgrade transparente entre minors; upgrade não
  suportado para PyPy/GraalPy/Pyodide; e o gotcha real — *"The available Python versions are frozen for each
  uv release. To install new Python versions, you may need upgrade uv."* Um patch novo de CPython exige
  upgrade do uv, enquanto o pyenv só precisa de `pyenv update`.

**Veredito sobre o pyenv:** para um projeto que usa uv para dependências, o pyenv é redundante — o uv cobre
install, pin, discovery e criação de venv com binário pré-construído e sem toolchain de compilação. Mantenha
pyenv só se precisar de (a) interpretadores exóticos ou flags de build (`--enable-optimizations`, OpenSSL
custom, free-threaded ainda ausente do standalone), (b) um CPython mais novo que o pin do seu uv, ou
(c) workflows de `pyenv-virtualenv`.

**Mudança de dono da Astral — material para qualquer aposta em uv.** A OpenAI anunciou em 2026-03-19 que vai
adquirir a Astral. <https://openai.com/index/openai-to-acquire-astral/> · <https://astral.sh/blog/openai>.
A OpenAI declara que pretende manter os produtos open source após o fechamento e integrá-los ao Codex. Não
muda licenciamento (MIT/Apache-2.0) hoje, mas é mudança de governança que uma decisão de tooling em 2026
deve registrar — porque **uv e mise passaram ambos a depender do `python-build-standalone` mantido pela
Astral**, um único upstream para o ecossistema inteiro.

### Custo/benefício honesto da Frente A

**O que a consolidação de fato compra:** um binário e um arquivo de config em vez de dois frameworks de função
de shell; `mise.toml` como declaração única versionada de node+python+resto; env vars e tasks no mesmo arquivo
(matando direnv e possivelmente `make`); Python pré-construído (segundos, não minutos) e sem lista de
build-deps do apt; um `mise install` para provisionar máquina ou runner de CI.

**O que de fato custa:**

1. **O nvm/pyenv que você tem já funcionam.** Ambos lançaram este mês. Não há função forçante.
2. **Arquivos de versão idiomáticos vêm desligados** — o "ele só lê seu `.nvmrc`" exige um opt-in explícito
   que você precisa lembrar em toda máquina.
3. **A bifurcação de modo de ativação é inescapável**: correção interativa (PATH) e correção
   não-interativa/IDE/agente (shims) são modos diferentes com features diferentes. A recomendação da própria
   doc é configurar os dois, em rc files diferentes — o que é *mais* encanamento de shell que nvm+pyenv, não menos.
4. **`mise trust`** adiciona um modo de falha novo em contexto desassistido.
5. **direnv é ou-ou**, não coexistência.
6. **CalVer sem contrato de estabilidade** no mise; asdf e proto ambos pré-1.0.
7. **As alegações de velocidade estão velhas e são assimétricas** (ver auditoria acima).
8. **Supply chain**: asdf = shell de terceiro sem verificação; mise = melhor (org própria, GPG/Cosign/SLSA) mas
   você herda o risco do backend asdf assim que usar uma ferramenta só-asdf; proto = melhor de todos
   (WASM + checksum obrigatório) com o menor ecossistema.

**A alternativa pragmática, dita explicitamente:** `uv` para Python + manter `nvm` (ou trocar por `fnm`) para
Node é uma mudança de raio de explosão menor que adotar mise, remove a parte mais lenta (compilação de fonte
do pyenv) e não exige rearquitetar hook de shell nenhum. Adote mise se você quer a história de tasks + env +
multi-linguagem — não se o objetivo é meramente "um gerenciador de versão a menos".

---

## Frente B — Especificidades de WSL2

### `.wslconfig` — lista autoritativa de chaves

Fonte: <https://learn.microsoft.com/en-us/windows/wsl/wsl-config> (`ms.date` 2026-04-15, atualizada 2026-06-02).
Local: `%UserProfile%\.wslconfig`. Só WSL2. Tamanhos são bytes por padrão; aceita `GB`/`MB`. **Regra dos 8
segundos**: mudanças exigem `wsl --shutdown` e parada completa da VM.

Seção `[wsl2]`:

| Chave | Default | Notas |
|---|---|---|
| `memory` | **50% da RAM do host** | |
| `processors` | mesmo número de CPUs lógicas | |
| `swap` | **25% do `memory`, arredondado para GB**; `0` desliga | |
| `swapFile` | `%Temp%\swap.vhdx` | caminho absoluto Windows |
| `kernel`, `kernelModules`, `kernelCommandLine` | — | |
| `localhostForwarding` | `true` | **ignorado com `networkingMode=mirrored`** |
| `networkingMode` | `NAT` | `none`, `nat`, `bridged` (**depreciado desde 2.4.5**), `mirrored`, **`virtioproxy`**. Desde 2.3.25, NAT falhando cai para VirtioProxy |
| `firewall` | `true` | Win11 22H2+ |
| `dnsTunneling` | `true` | Win11 22H2+ |
| `autoProxy` | `true` | só Win11 |
| `dnsProxy` | `true` | só modo NAT |
| `nestedVirtualization` | `true` | só Win11 |
| `vmIdleTimeout` | `60000` ms | só Win11 |
| `guiApplications` | `true` | WSLg |
| `debugConsole` | `false` | só Win11 |
| `safeMode` | `false` | Win11, WSL 0.66.2+ |
| `defaultVhdSize` | `1099511627776` (1 TB) | |
| `maxCrashDumpCount` | `10` | |

**`firewall`/`dnsTunneling`/`autoProxy` nasceram como `[experimental]` no WSL 2.0.0 (set/2023) e foram
promovidas para `[wsl2]` com default `true`.** O código ainda aceita os aliases `experimental.*` — confirmado
em `WslCoreConfig.h`.

Seção `[experimental]` — **ainda experimental em jul/2026**:

| Chave | Default | Notas |
|---|---|---|
| `autoMemoryReclaim` | **`dropCache`** | `disabled` \| `gradual` \| `dropCache`. Note que o default é *ligado* apesar de "experimental" |
| `sparseVhd` | **`false`** | confirmado no fonte: `bool EnableSparseVhd = false;` |
| `hostAddressLoopback` | `false` | só modo mirrored |
| `ignoredPorts` | null | só mirrored, ex.: `3000,9000,9090` |
| `bestEffortDnsParsing` | `false` | só com dnsTunneling |
| `dnsTunnelingIpAddress` | `10.255.255.254` | |
| `initialAutoProxyTimeout` | `1000` ms | |

`gradual` espera **5 minutos de CPU baixa** e libera cache ao longo de **~30 minutos**; `dropCache` libera na hora.

**CHAVES NÃO DOCUMENTADAS NO LEARN — achadas lendo o fonte aberto.** `WslCoreConfig.h` define chaves que
**não** aparecem na página oficial:

- **`wsl2.virtiofs`** (`EnableVirtioFs`, **default `false`**) ← a relevante para performance
- **`wsl2.virtio9p`** (default `false`), **`wsl2.virtio`** (default `true` em x64/Win11)
- `wsl2.hostFileSystemAccess` (`true`), `wsl2.isolateDistroCgroup` (`true`), `wsl2.loadDefaultKernelModules`
  (`true`), `wsl2.ipv6` (`false`), `wsl2.earlyBootLogging`, `wsl2.gpuSupport`, `wsl2.telemetry`,
  `wsl2.crashDumpFolder`, `wsl2.hardwarePerformanceCounters`, `general.distributionInstallPath`,
  `general.instanceIdleTimeout` (15000 ms)
- `experimental.swiotlb`, `experimental.setVersionDebug`
- Validação relevante: `virtiofs` exige `virtio`; ligar virtiofs/virtio9p/consomme dispara dimensionamento de SWIOTLB.

Fonte: <https://github.com/microsoft/WSL/blob/master/src/windows/common/WslCoreConfig.h>

**Ressalva**: chave não documentada não tem garantia de compatibilidade. Usar `virtiofs=true` é aderir a uma
feature não anunciada (ver bugs abertos abaixo).

A Microsoft hoje recomenda editar via o app **WSL Settings** (menu Iniciar) em vez de editar o `.wslconfig` à mão.

### `/etc/wsl.conf` — por distro

- `[boot] systemd=true` — exige WSL da Store (`wsl --version`). Verifique com `systemctl list-unit-files --type=service`.
- `[boot] command=<string>` — roda **como root** no start da instância.
- `[interop] enabled` (`true`), **`appendWindowsPath` (`true`)**.
- `[automount]`: `enabled` (`true`), `mountFsTab` (`true`), `root` (`/mnt/`), `options` (null; só flags
  específicas de DrvFs — para o resto use `/etc/fstab`). `metadata` vem **desligado**, e
  **`umask`/`fmask`/`dmask` só têm efeito com `metadata` ligado**.
- `[network]`: `generateHosts` (`true`), `generateResolvConf` (`true`), `hostname`.
- `[user] default`, `[gpu] enabled` (`true`), `[time] useWindowsTimezone` (`true`).

**`appendWindowsPath=false` — custo/benefício.** A Microsoft documenta só o mecanismo; o trade-off está no
issue tracker:

- **Ganho**: o `PATH` inteiro do Windows (30–60 entradas em `/mnt/c`, cada lookup cruzando a fronteira 9p/DrvFs)
  deixa de ser varrido. Sintoma visível: tab-completion congelando por segundos —
  <https://github.com/microsoft/WSL/issues/4234>. Também elimina um risco de correção real: `node`/`npm`/`python`
  do Linux resolvendo para binário Windows.
- **Custo**: você perde `code`, `explorer.exe`, `clip.exe`, `wslview`, `winget`, os shims do Docker Desktop,
  `git-credential-manager.exe`, `ssh.exe`. `code .` quebrando é o que se nota na hora.
- **O meio-termo correto** é `appendWindowsPath=false` e re-adicionar seletivamente só o necessário no rc
  (o `bin` do VS Code, `/mnt/c/Windows/System32`). O interop em si (`[interop] enabled`) continua ligado.
- Bug conhecido: <https://github.com/microsoft/WSL/issues/9520> — quase sempre é a regra dos 8 segundos.
- Kill switch por sessão (não persiste): `echo 0 > /proc/sys/fs/binfmt_misc/WSLInterop` como root.

### Performance de I/O

**A declaração canônica**, <https://learn.microsoft.com/en-us/windows/wsl/filesystems> (atualizada 2025-08-06):

> "We recommend against working across operating systems with your files… For the fastest performance speed,
> store your files in the WSL file system… Use `/home/<user>/Project`. Not `/mnt/c/Users/<user>/Project`."

É toda a orientação oficial — sem números, sem mecanismo. O mecanismo está no repo aberto:

- WSL1 usa **DrvFs** de verdade (driver de filesystem contra NTFS).
- WSL2 **não**: o `wslservice.exe` sobe um **servidor de arquivos plan9 (9P)** no lado Windows, ao qual a VM se
  conecta. `mount -t drvfs` é tratado por `/usr/sbin/mount.drvfs`, symlink para `/init`.
- Três transportes existem no WSL2: **Plan9**, **Virtio-Plan9** e **VirtioFS** — qual é usado depende de
  `wsl2.virtio9p` / `wsl2.virtiofs`.

Fonte: <https://github.com/microsoft/WSL/blob/master/doc/docs/technical-documentation/drvfs.md>

Ou seja: "acesso cross-OS é lento" = todo `stat`/`open` em `/mnt/c` é um RPC sobre socket Hyper-V para um
servidor user-mode no Windows. ext4 nativo dentro do VHDX é um bloco normal sem esse salto. É por isso que
`node_modules`, `.git` e toolchains glob-pesadas são catastroficamente lentas em `/mnt/c` — e por que *tanto*
o diretório do projeto *quanto* a toolchain (raízes de install de nvm/pyenv/mise/uv) precisam viver em ext4.

**Mudanças 2024–2026:**

- **O WSL virou open source em 2025-05-19.** Liberados: `wsl.exe`, o serviço, os processos init/daemon do Linux
  **e a implementação do servidor plan9**. **Ainda fechados**: `lxcore.sys` (driver WSL1) e `p9rdr.sys`/`p9np.dll`
  (o redirecionador Windows→Linux de `\\wsl.localhost`). O caminho Linux→Windows é auditável; o inverso não.
- **virtiofs é a frente de performance ativa, ainda opt-in e ainda não documentada.** Mudanças recentes:
  PR #40298 (reuso de device), PR #40426 (mmap compartilhado sem DAX), **PR #40654 (merged 2026-05-27, pools
  SWIOTLB/DMA por device — antes `/mnt/c`, `/mnt/d` e a NIC virtio disputavam um único bounce buffer global)**.
  Exige kernel `Microsoft.WSL.Kernel 6.18.26.3-1`+ e DeviceHost `1.2.29-0`+. A fonte declara explicitamente que
  **"The default is still Plan 9 over a Hyper-V socket. Virtiofs is still opt-in."** e **não cita benchmark**.
  Trate "aproximando das velocidades do DrvFs do WSL1" como não quantificado.
- **virtiofs está com bugs agora.** Issues abertas em microsoft/WSL: #40773 (automount de TODOS os drives fixos
  silenciosamente pulado quando `AddVirtioFsShare` falha para um), #40790 (automount aborta inteiro), #40719
  (arquivos criados por não-root no Windows aparecem como root e não abrem para escrita), #14301 (`stat` em
  mount virtiofs → erro de I/O). Também #13846.
- WSL 2.9.4 (2026-07-13, pre-release): "Bump DeviceHost to 1.2.48-0 and to fix virtiofs O_APPEND ftruncate",
  "Fix Lost sub directory structure when mapping to a VHD volume", "Cap storage hw queue count to 4".
- Cadência: stable 2.7.10 (2026-06-26), pre-release 2.9.4 (2026-07-13). Em andamento: **WSLC (WSL Containers)**
  em preview público; `networkingMode=virtioproxy` renomeado para "Consomme" e ganhou IPv6.

**Conclusão prática:** a resposta oficial não mudou — projetos em ext4. `virtiofs=true` é uma alavanca real
mas não sancionada, com bugs vivos de integridade de dados; **não recomendar para máquina de trabalho em
julho de 2026**.

### SSH agent e credenciais

**Opção 1 — `ssh-agent` Linux puro + serviço systemd de usuário (chaves no WSL).** Com `[boot] systemd=true`,
uma unit `~/.config/systemd/user/ssh-agent.service`.
*Prós*: sem dependência do Windows, idêntico em CI/containers, agent sobrevive ao fechar o terminal.
*Contras*: chave duplicada no lado WSL, passphrase re-adicionada a cada `wsl --shutdown`, sem backing de
hardware/cofre, e Git/IDE do Windows não usam.

**Opção 2 — `keychain` (Funtoo).** *Prós*: só shell, não precisa systemd, funciona em WSL antigo.
*Contras*: cópia local da chave; pede passphrase a cada start da VM; interage de forma esquisita com a
regeneração de `/etc/hosts`/resolv do WSL. <https://jrs-s.net/2021/11/17/wsl2-keychain-etc-hosts-and-you/>

> Nota de contexto: é **esta** a opção em uso hoje na máquina (`~/.zshrc` chama `keychain --eval --agents ssh`,
> com fallback `--noask` quando não há TTY — justamente para o Bash do agente não travar).

**Opção 3 — `npiperelay` + `socat` (usar o agent do *Windows* a partir do WSL).** Named pipes do Windows não
podem ser compartilhados como socket Unix, então o `socat` escuta num socket Unix e relaia para
`\\.\pipe\openssh-ssh-agent`. *Prós*: um único cofre de chaves no Windows; funciona com OpenSSH do Windows,
1Password, Pageant; `SSH_AUTH_SOCK` é socket Unix real, então **tudo que fala o protocolo de agent funciona —
inclusive assinatura de commit e `ssh -A`**. *Contras*: **npiperelay está dormente — último release v0.1.0,
2020-07-02.** <https://github.com/jstarks/npiperelay>

**Opção 3b — `mame/wsl2-ssh-agent` ou `rupor-github/wsl-ssh-agent`.** Alternativas mantidas à receita do
npiperelay. O `wsl2-ssh-agent` faz a ponte via PowerShell, traz unit systemd de usuário e contorna lacunas de
protocolo do OpenSSH do Windows pré-8.9. Último **v0.9.7, 2025-11-26**. <https://github.com/mame/wsl2-ssh-agent>
*Contras*: Pageant não testado pelo autor; binários por arquitetura; um processo PowerShell por sessão.

**Opção 4 — integração oficial do 1Password com WSL (NÃO é agent forwarding).** Ela roteia a **invocação
inteira do SSH** para o `ssh.exe`. Setup: `git config --global core.sshCommand ssh.exe`.
*Prós*: biometria/cofre, zero material de chave no WSL, suportado oficialmente.
*Contras* (todos documentados): você precisa usar `ssh.exe`, não `ssh` — tudo que shella para o `ssh` puro
(rsync, ansible, scp, muitos plugins de IDE) **não funciona**; **o config de SSH tem que morar em
`%USERPROFILE%/.ssh/config`, não no `~/.ssh/config` do WSL**; cada sessão nova exige re-aprovar;
**assinatura de commit não suportada em Windows ARM**. <https://www.1password.dev/ssh/integrations/wsl/>

**Opção 5 — credenciais git via Git Credential Manager do Windows (HTTPS, ortogonal a SSH).**
<https://github.com/git-ecosystem/git-credential-manager/blob/main/docs/wsl.md> — com Git for Windows instalado:

```bash
git config --global credential.helper "/mnt/c/Program\ Files/Git/mingw64/bin/git-credential-manager.exe"
```

*Prós*: um cofre só (Windows Credential Manager/DPAPI), MFA e OAuth device-flow, sem PAT colado no WSL.
*Contras* — o gotcha documentado: **"configuration set in WSL Git is NOT respected by GCM (by default)"**,
porque o GCM roda como processo Windows; proxy e afins precisam ser duplicados dos dois lados. Cada lookup
paga um launch de processo interop (perceptível em loop de `git fetch`), e depende de `/mnt/c` montado.

### Disco e encolhimento do VHDX

**O VHDX encolhe sozinho? Só com sparse ligado — e de forma pouco confiável.**

- Comportamento padrão: "WSL 2 automatically resizes these VHD files to meet storage needs" — isso é
  **só crescimento**. Teto padrão **1 TB** (`defaultVhdSize`); era 512 GB antes do WSL 0.58.0.
  <https://learn.microsoft.com/en-us/windows/wsl/disk-space>
- **Sparse VHD** (WSL 2.0.0, set/2023): `[experimental] sparseVhd=true` faz VHDs *novos* nascerem sparse.
  Para distro existente: `wsl --manage <distro> --set-sparse <true|false>`.
- **Checagem de realidade**: sparse **continua `[experimental]` e continua default `false` quase três anos
  depois**. Issues reportando que não funciona: <https://github.com/microsoft/WSL/issues/10703>,
  <https://github.com/microsoft/WSL/issues/12103>, e um Q&A da própria Microsoft relatando que o storage não
  encolhe *e* deixa de poder ser compactado manualmente — VHDs sparse são rejeitados pelo caminho normal de
  `compact vdisk`. Proposta de virar default aberta e sem resposta: <https://github.com/microsoft/WSL/issues/13241>
  (aberta 2025-07-09, sem assignee).
- **`wsl --manage`** (WSL 2.5+): `--resize <size>` roda `e2fsck` + `resize2fs`. **Decimais não são suportados.**
  Note que `wsl --manage` **não é documentado na página de basic-commands** — só na de disk-space, e
  `--set-sparse` só aparece no post de blog de 2023. Cobertura de documentação ruim.
- **Expansão manual** (documentada): `wsl --shutdown` → `diskpart` → `select vdisk file="<path>"` →
  `expand vdisk maximum=<MB>` → no WSL: `sudo resize2fs /dev/sdX <MB>M`.
- **Compactação manual NÃO está na doc da Microsoft.** A página cobre checar, expandir e reparar — nunca
  encolher. A receita que funciona é out-of-band: `wsl --shutdown`, então `Optimize-VHD -Path <ext4.vhdx>
  -Mode Full` (exige módulo Hyper-V do PowerShell, isto é, Pro/Enterprise) **ou** `diskpart` →
  `attach vdisk readonly` → `compact vdisk` → `detach vdisk`. Pré-requisito: zerar o espaço livre por dentro
  antes (`sudo fstrim -av`), senão não há o que recuperar. **Não funciona em VHD já marcado como sparse.**
- **Localizar o VHDX**:
  ```powershell
  (Get-ChildItem -Path HKCU:\Software\Microsoft\Windows\CurrentVersion\Lxss | Where-Object { $_.GetValue("DistributionName") -eq '<distro>' }).GetValue("BasePath") + "\ext4.vhdx"
  ```
- **Aviso da doc**: não modifique/mova/acesse arquivos do WSL sob `AppData` com ferramentas Windows — risco de
  corrupção. Use `\\wsl$\<distro>\`.
- **Reparar VHD caído em read-only**: `wsl --shutdown` → `wsl --mount <path> --vhd --bare` → `wsl lsblk` →
  `wsl sudo e2fsck -f /dev/sdX` → `wsl --unmount`. Com só uma distro instalada você bate em "ext file in use"
  e precisa de uma segunda; feche o Docker Desktop para evitar `ERROR_SHARING_VIOLATION`.

**Contrapartida do `sparseVhd=true`, dita sem rodeio**: é experimental, segue desligado por padrão depois de
~3 anos, tem várias issues abertas de "não encolhe de fato", e ligar **fecha a saída de emergência do
`compact vdisk` manual**. Recomendação: deixe desligado; agende `sudo fstrim -av` mais um
`Optimize-VHD`/`compact vdisk` offline periódico, e mantenha `defaultVhdSize` num teto sensato.

---

## Interação entre as duas frentes

Tudo da Frente A precisa ser instalado em **ext4**, não em `/mnt/c`: `~/.local/share/mise`, `~/.nvm`,
`~/.pyenv`, `~/.local/share/uv`, `node_modules`, `.venv`. Uma compilação `python-build` do pyenv ou um
`npm ci` contra `/mnt/c` cruza a fronteira 9p dezenas de milhares de vezes.

Isso sozinho é um argumento mais forte a favor de instaladores de binário pré-construído (uv / mise /
python-build-standalone) do que qualquer marketing dos gerenciadores de versão: **em WSL2, o caminho de
compilar-da-fonte paga o custo da compilação e, se mal posicionado, também o custo do 9p.**
