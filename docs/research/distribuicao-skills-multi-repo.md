# Distribuição de skills e configuração de agente em múltiplos repos

> Pesquisa da issue [#55](https://github.com/panlabs-tech/panlabs/issues/55).
> Data de coleta: **2026-07-19**. Versões inspecionadas: `skills@1.5.19` (npm, publicada 2026-07-16),
> Claude Code `2.1.215`, docs oficiais em `code.claude.com/docs/en/*` na data acima.

## TL;DR

1. A ferramenta que produz os dois locks é **uma só**: o CLI **`skills`** do npm — pacote
   [`skills`](https://www.npmjs.com/package/skills), repositório
   [`vercel-labs/skills`](https://github.com/vercel-labs/skills), invocado como `npx skills add …`.
   Foi ele que instalou **todas** as skills desta máquina (prova no histórico de shell, §2.1).
2. Os schemas divergem porque **não são o mesmo arquivo com versões diferentes** — são **dois
   arquivos com contadores de versão independentes**, ambos presentes no *mesmo binário*:
   `.skill-lock.json` (global) está travado em `version: 3` e `skills-lock.json` (por repo) em
   `version: 1`, e assim é desde pelo menos `skills@1.5.0` (abril/2026). Não há migração entre eles;
   eles não conversam. §2.3.
3. **Nenhum dos dois locks trava versão.** O `computedHash` do lock por repo nunca é lido no caminho
   de update/restore (é *write-only*); o `skillFolderHash` do lock global é usado só para *detectar*
   que o upstream mudou, nunca para *fixar* o que instalar. Sem um `ref` explícito no lock, tanto
   `skills update` quanto `skills experimental_install` reinstalam **o HEAD do branch default da
   fonte**. §2.4 e §2.5. **Nenhum dos 6 locks existentes na frota tem campo `ref`.** E mesmo com
   `ref`, o pin é **mutável**: o CLI só aceita nome de branch ou tag — **SHA de commit não funciona**
   (§2.5), e os próprios mantenedores mantêm isso como issue aberta.
4. **Quem trava versão de verdade hoje é o mecanismo nativo do Claude Code**: o campo `sha` (e o
   `ref`) de uma entrada de plugin em `.claude-plugin/marketplace.json`, mais o campo `version` do
   `.claude-plugin/plugin.json`. Esses são os únicos primitivos de fixação documentados
   oficialmente. §3.3 e §3.4.
5. Recomendação para `panlabs-tech/skills`: transformá-lo em **marketplace de plugin single-plugin**
   (`.claude-plugin/marketplace.json` + `.claude-plugin/plugin.json` com `version`), e declarar o
   consumo em `.claude/settings.json` **versionado** de cada repo via `extraKnownMarketplaces` +
   `enabledPlugins`. É o único caminho em que "o que trava a versão" tem resposta oficial e
   auditável. §6.

---

## 1. Estado atual da frota (evidência local)

Levantamento em `~/workspaces` (13 repos com `.git`):

| Repo | `skills-lock.json` | `.agents/skills` | `.claude/skills` |
| --- | --- | --- | --- |
| `aidriven-resources` | sim (v1) | 5 | 5 |
| `campfire` | sim (v1) | 6 | 8 |
| `ethitorial` | sim (v1) | 15 | 16 |
| `life-under-control` | sim (v1) | 16 | 17 |
| `tfbox` | sim (v1) | 3 | 3 |
| `travelmanager` | sim (v1) | 16 | 16 |
| **`panlabs`** | **não** | **10** | **10** |
| `ThiagoPanini`, `b3stocks`, `callisto`, `engineering-golden-case`, `hashnode-backup`, `traveltogether` | não | 0 | 0 |

Global: `~/.agents/.skill-lock.json` (`version: 3`, 17 skills, todas de `mattpocock/skills`,
`installedAt`/`updatedAt` = `2026-07-19T14:38:37Z`), com `~/.claude/skills/<nome>` sendo **symlink**
para `../../.agents/skills/<nome>`.

Fontes distintas em uso nos locks por repo: `mattpocock/skills`, `affaan-m/everything-claude-code`,
`wshobson/agents`, `anthropics/skills`, `vercel-labs/skills`, `ccheney/robust-skills`,
`juliusbrussee/caveman` (grafado ora `JuliusBrussee`, ora `juliusbrussee` — o `source` é literal, não
normalizado por caixa), `rknall/claude-skills`, `pbakaus/impeccable`,
`thiagopanini/aidriven-resources`.

### 1.1 A deriva já aconteceu — medida

`panlabs` **versiona as skills no git** (33 arquivos rastreados sob `.agents/skills/`, congelados em
21/jun/2026) e **não tem lock nenhum**. Comparando o `SKILL.md` das skills que existem nos dois
lugares:

| Skill | Global (`~/.agents/skills`) | `panlabs/.agents/skills` | Resultado |
| --- | --- | --- | --- |
| `grill-with-docs` | 7 linhas | 88 linhas | **divergente** |
| `tdd` | 36 linhas | 109 linhas | **divergente** |
| `setup-matt-pocock-skills` | 116 linhas | 127 linhas | **divergente** |
| `grill-me` | 7 linhas | 10 linhas | **divergente** |
| `handoff` | ausente | presente | só num lado |

Ou seja: **4 de 4 skills compartilhadas já divergiram**, e o conjunto de `panlabs`
(`caveman`, `frontend-design`, `to-issues`, `to-prd`, `prompt-engineering-patterns`, …) é um
*terceiro* conjunto, concorrente tanto do global quanto do dos outros repos. A premissa da issue
("sem lock, 6 repos derivam") já é fato consumado, e o lock que existe nos outros 6 **não impediu
nada** — ver §2.5.

---

## 2. O instalador em uso: o CLI `skills` (vercel-labs)

### 2.1 Identificação (prova direta)

`~/.zsh_history` contém 45 invocações da forma `npx skills add <fonte> [--skill <nome>]`, cobrindo
exatamente as fontes que aparecem nos locks. Exemplos verbatim:

```
npx skills add https://github.com/mattpocock/skills --skill grill-with-docs
npx skills add https://github.com/wshobson/agents --skill python-testing-patterns
npx skills add https://github.com/affaan-m/everything-claude-code --skill hexagonal-architecture
npx skills add mattpocock/skills          # 2026-07-19, corresponde ao installedAt do lock global
```

O pacote npm `skills` (`dist-tags.latest = 1.5.19`) declara
`repository: git+https://github.com/vercel-labs/skills.git`, `description: "The open agent skills
ecosystem"`, e `bin: { skills, add-skill }`. O upstream `mattpocock/skills` se refere a ele como
**"skills.sh"** ([ADR 0002 do repo](https://github.com/mattpocock/skills/blob/main/.agents/adr/0002-ship-as-a-claude-code-plugin.md)).

> Notas de coleta: o bundle publicado (`package/dist/cli.mjs`, ~516 KB, ESM) é o artefato primário
> analisado abaixo — é o código que efetivamente roda em `npx skills`. Números de linha referem-se a
> `skills@1.5.19`.

### 2.2 Superfície de comandos

Documentada no `README.md` do pacote:

| Comando | O que faz |
| --- | --- |
| `skills add <fonte>` | instala skills de uma fonte |
| `skills use <fonte>` | gera o prompt de uma skill sem instalar |
| `skills list` (`ls`) | lista skills instaladas (`-g` para global, `--json`) |
| `skills find [query]` | busca skills |
| `skills update [skills…]` | atualiza para "latest" (`-g` global, `-p` projeto, `-y`) |
| `skills init [name]` | cria um `SKILL.md` template |
| `skills remove [skills…]` (`rm`) | remove |

Flags de `add`: `-g/--global`, `-a/--agent`, `-s/--skill`, `-l/--list`, `--copy`, `-y/--yes`,
`--all`, e (não documentadas) `--metadata`, `--full-depth`, `--subagent`.

**Não documentados no README, mas presentes no binário** (achados relevantes):

- `skills experimental_install` — *"Restore skills from skills-lock.json"*. É o análogo de
  `npm ci`. Não aparece na tabela "Other Commands" do README.
- `skills experimental_sync` — varre `node_modules` atrás de `SKILL.md` e instala.
- Sintaxe de **ref** na fonte: `owner/repo#<ref>`, `owner/repo/sub/path#<ref>`,
  `owner/repo#<ref>@<skill>`, e `github.com/owner/repo/tree/<ref>/<path>`
  (`parseFragmentRef` / `parseSource`, linhas 97–221). **O README não documenta o `#ref`.**
- `skills check` é **alias puro de `update`**, não um dry-run. Quem digitar `skills check` esperando
  um diagnóstico vai atualizar tudo.
- **Não existem** `--force` em `add` (só em `experimental_sync`), `--frozen-lockfile`,
  `skills verify`, `skills ci` nem `skills status`.

### 2.3 Os dois locks — por que os schemas divergem

O bundle define **dois módulos de lock separados**, cada um com seu próprio contador:

```js
// lock global
const AGENTS_DIR = ".agents";
const LOCK_FILE = ".skill-lock.json";
const CURRENT_VERSION = 3;
function getSkillLockPath() {
  const xdgStateHome = process.env.XDG_STATE_HOME;
  if (xdgStateHome) return join(xdgStateHome, "skills", LOCK_FILE);
  return join(homedir(), AGENTS_DIR, LOCK_FILE);
}
```

```js
// lock por repo
const LOCAL_LOCK_FILE = "skills-lock.json";
const CURRENT_VERSION$1 = 1;
function getLocalLockPath(cwd) { return join(cwd || process.cwd(), LOCAL_LOCK_FILE); }
```

Verificado em três releases distintas — os dois contadores coexistem, `{global: 3, local: 1}`, desde
pelo menos `skills@1.5.0` (12/abr/2026), passando por `1.5.8` e `1.5.13`, até `1.5.19`:

| release | `.skill-lock.json` (global) | `skills-lock.json` (repo) |
| --- | --- | --- |
| 1.5.0 | 3 | 1 |
| 1.5.8 | 3 | 1 |
| 1.5.13 | 3 | 1 |
| 1.5.19 | 3 | 1 |

**Conclusão: `version: 1` e `version: 3` não são gerações do mesmo formato.** São dois formatos
distintos, coexistentes por design, escritos pelo mesmo binário na mesma execução — o global quando
se usa `-g`, o do repo quando não se usa. Não há migração, nem conversão, nem leitura cruzada.

**Por que os contadores estão em números diferentes** (arqueologia de `git log -S` no
`vercel-labs/skills`; o repo **não tem CHANGELOG** e as releases do GitHub são tags sem notas):

- O lock **global** nasceu em `7cae125` (2026-01-22, pkg 1.0.23) como `version: 1`, virou `2` em
  `9e7b025` (*"content hash support"*, adicionando `contentHash`) e `3` em `68be464`
  (*"folder hash for update comparison"*, adicionando `skillFolderHash`) — **as três versões no
  mesmo dia**, em ~11 horas, quando o pacote tinha ~26 releases e quase nenhum usuário. `68be464`
  chegou a implementar uma migração v2→v3 in-place; `eec6510` (pkg 1.0.29) **removeu a migração** e
  restabeleceu o "apaga tudo abaixo de 3".
- O lock **por repo** nasceu depois e já direto em `version: 1`, em `daa1f82` (2026-02-20, pkg
  1.4.0). Nunca foi bumpado: `ref`, `subagents` e `sourceUrl` foram adicionados como **campos
  opcionais**, deliberadamente sem quebrar o schema.

Ou seja: o `3` global é cicatriz de um dia de churn inicial; o `1` do repo é um formato mais novo e
mais estável. A diferença **não indica** que o lock do repo seja legado — ele é o formato corrente.

O lock por repo tem, aliás, uma intenção declarada no código-fonte: *"This file is meant to be
checked into version control"*, com chaves ordenadas alfabeticamente e sem timestamps justamente
"para minimizar conflitos de merge" — dois branches adicionando skills diferentes auto-mergeiam.
Isso reforça que ele **quer** ser o artefato versionado da distribuição; só não cumpre o papel (§2.5).

**E o comportamento com lock de versão antiga é destrutivo em ambos:**

```js
if (typeof parsed.version !== "number" || !parsed.skills) return createEmptyLockFile();
if (parsed.version < CURRENT_VERSION) return createEmptyLockFile();
```

Um lock de versão menor que a corrente é **silenciosamente descartado** (`createEmptyLockFile()`) e
sobrescrito na próxima escrita — não há upgrade in-place, não há aviso, não há backup. Se o CLI algum
dia subir o lock do repo para `version: 2`, os 6 `skills-lock.json` v1 da frota viram lixo sem uma
linha de log.

Campos observados:

| Campo | Global (v3) | Repo (v1) |
| --- | --- | --- |
| `source` | sim | sim |
| `sourceType` | sim (`github`/`gitlab`/`git`/`local`/`well-known`/`node_modules`) | sim |
| `sourceUrl` | sim | só quando não-GitHub |
| `skillPath` | sim | sim |
| `ref` | **só se o usuário passou `#ref`** | **só se o usuário passou `#ref`** |
| `skillFolderHash` | sim | — |
| `computedHash` | — | sim |
| `pluginName` | sim | — |
| `installedAt` / `updatedAt` | sim | — |
| `dismissed`, `lastSelectedAgents` (raiz) | sim | — |

O lock global carrega ainda `dismissed` e `lastSelectedAgents` na raiz: ele é tanto lock quanto
**arquivo de estado da CLI**, o que explica boa parte da diferença de schema.

### 2.4 Os dois hashes são coisas diferentes — e nenhum trava nada

**`computedHash` (lock do repo)** — SHA-256 do conteúdo local instalado:

```js
async function computeSkillFolderHash(skillDir) {
  const files = []; await collectFiles(skillDir, skillDir, files);
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  const hash = createHash("sha256");
  for (const file of files) { hash.update(file.relativePath); hash.update(file.content); }
  return hash.digest("hex");
}
```
(ignora `.git/` e `node_modules/`; 64 hex — bate com os valores observados nos 6 repos.)

**`skillFolderHash` (lock global)** — para fontes GitHub **não** é esse SHA-256: é o **SHA-1 do
objeto git** da pasta da skill, obtido de `fetchRepoTree()` (API de árvore do GitHub) via
`getSkillFolderHashFromTree(tree, skillPath)`. Confere com o observado: 40 hex
(`c7d57789b230d6f88d26ca81ab9d03bad160171f`). Só cai no `computeSkillFolderHash` local quando a
fonte não é GitHub e precisou de `cloneRepo`.

**Para que servem:**

- `skillFolderHash` (global) é lido em `updateGlobalSkills()` para **detecção**: refaz o
  `fetchRepoTree` da fonte e, se `latestHash !== entry.skillFolderHash`, marca a skill como
  "tem update". É comparação de *ponteiro remoto*, não verificação de integridade.
- `computedHash` (repo) é lido em **exatamente um lugar**: `experimental_sync`, o caminho de
  `node_modules` (`if (await computeSkillFolderHash(skill.path) === existingEntry.computedHash)
  { upToDate… }`). **Não é lido** nem por `updateProjectSkills()` nem por `runInstallFromLock()`.

Ou seja: no fluxo normal de um repo (`add` sem `-g`, depois `update`, depois `experimental_install`),
o `computedHash` é **escrito e nunca lido**. Ele não valida integridade, não detecta drift local, não
seleciona versão. É metadado morto.

### 2.5 O que trava a versão: nada, por default

`runInstallFromLock()` (o `npm ci` do `skills`) reconstrói a fonte a partir do lock e chama `add` de
novo:

```js
function buildLocalUpdateSource(entry) {
  const source = getLocalSource(entry);
  if (!source) return null;
  if (!entry.skillPath) return formatSourceInput(source, entry.ref);
  return appendFolderAndRef(source, entry.skillPath, entry.ref);
}
function appendFolderAndRef(source, skillPath, ref) {
  …
  return ref ? `${withFolder}#${ref}` : withFolder;   // sem ref → sem pin
}
```

E `updateProjectSkills()` faz `spawnSync(node, [cli, "add", installUrl, "--skill", nome, "-y"])`
**sem qualquer comparação de hash** — reinstala tudo, incondicionalmente.

Consequências, na ordem que a issue pede:

- **Como um repo consome**: `npx skills add <fonte> [--skill …]` (grava em `.agents/skills/` +
  symlinks em `.claude/skills/`), ou `npx skills experimental_install` para restaurar do lock.
- **Como se atualiza**: `npx skills update [-p|-g] [-y]`.
- **O que trava a versão**: **nada**, a menos que a skill tenha sido instalada com `#<branch-ou-tag>`
  — e aí o `ref` fica no lock e é reaplicado no restore. **Nenhum dos 6 locks da frota tem `ref`.**
- **O que acontece quando a fonte muda**: na próxima `update` ou `experimental_install`, o HEAD do
  branch default entra por cima. Se a skill foi deletada upstream, há um prompt
  (`checkAndPromptForDeletions`) — que em `-y`/CI é **pulado**, não removendo nada. Se o arquivo
  local foi editado à mão, a reinstalação faz `rm -rf` do diretório canônico e recria
  (`cleanAndCreateDirectory`): a edição é **destruída sem aviso**. O único sinal de sobrescrita
  (`overwrites: <agentes>`) só aparece no sumário do `add` **interativo** — e `update` sempre chama
  `add` com `-y`, que pula esse sumário.

**Portanto o `skills-lock.json` não é um lockfile no sentido npm/cargo.** É um *manifesto de
proveniência*: registra de onde cada skill veio para permitir reinstalar e checar update. Chamá-lo de
lock induz a uma garantia que ele não dá.

**E não há como travar de forma imutável com esta ferramenta.** O `#ref` grava `"ref": "v1.2.0"` no
lock e `update`/`experimental_install` re-resolvem nesse ref — mas o ref só pode ser **nome de branch
ou de tag**, nunca SHA de commit, porque o clone é:

```js
const cloneOptions = ref ? ["--depth", "1", "--branch", ref] : ["--depth", "1"];
```

`git clone --branch` aceita apenas branch e tag; passar um SHA falha com
`fatal: Remote branch <sha> not found in upstream origin`. Logo:

```bash
npx skills add mattpocock/skills#v1.2.0 --skill tdd   # funciona — mas tag é movível
npx skills add mattpocock/skills#a1b2c3d --skill tdd  # FALHA no clone
```

Se a tag mover upstream, o conteúdo muda e nada aborta — o `skillFolderHash` é comparado apenas para
*sinalizar* update, nunca para *recusar* uma instalação divergente.

Isto é reconhecido pelos mantenedores: a issue
[vercel-labs/skills#500 — *"Lockfile Enhancements (ci, verify, commit SHA pinning)"*](https://github.com/vercel-labs/skills/issues/500)
está **aberta** desde 05/mar/2026 listando como faltantes *"No commit SHA pinning — locks use folder
tree SHA, not commit SHA"*, *"No `--frozen-lockfile` flag"* e *"No `skills verify` command"*; a PR que
implementava isso ([#507](https://github.com/vercel-labs/skills/pull/507)) foi **fechada sem merge**
em 08/jun/2026. Nenhum desses símbolos existe no bundle 1.5.19.

### 2.6 Onde instala, e o `pluginName`

Instalação em duas camadas: uma cópia canônica em `.agents/skills/<nome>` (projeto) ou
`~/.agents/skills/<nome>` (global), e **symlinks** dela para o diretório dos agentes que **não** usam
`.agents/skills` como diretório nativo. `--copy` troca symlink por cópia independente. O README
descreve o symlink como método recomendado ("Single source of truth, easy updates"). Isso bate
exatamente com o observado em `~/.claude/skills/*` e em `panlabs/.claude/skills/*`.

Duas sutilezas com consequência prática:

- Agentes "universais" (Codex, Cursor, OpenCode, Copilot, Gemini CLI, … — todos os que declaram
  `skillsDir === '.agents/skills'`) **não ganham symlink nenhum**: o diretório canônico já *é* o
  diretório deles. O Claude Code **não** é universal (`.claude/skills`), então é justamente ele que
  depende do symlink. Mais: há uma exceção hardcoded que cria `.claude/skills/` num projeto **mesmo
  que o projeto não tenha `.claude/`** — nenhum outro agente recebe esse tratamento.
- **`experimental_install` instala só em `.agents/skills/`** (força `agent: universalAgents`). Ele
  **não recria os symlinks de `.claude/skills/`**. Ou seja, o comando que seria o "`npm ci`" da
  distribuição deixa o Claude Code sem enxergar nada — a menos que `.claude/skills` esteja
  versionado no repo (que é o caso de `panlabs`, por acaso, mas symlinks em git são frágeis em
  Windows/CI).

O `pluginName` do lock global vem da **descoberta de manifesto de plugin** na fonte: o CLI lê
`.claude-plugin/marketplace.json` e `.claude-plugin/plugin.json` do repo-fonte e agrupa as skills
declaradas ali sob o nome do plugin. Confirmado ponta a ponta:
`mattpocock/skills` publica `.claude-plugin/marketplace.json` com `"plugins": [{"name":
"mattpocock-skills", "source": "./"}]` — e é literalmente esse string que aparece como
`"pluginName": "mattpocock-skills"` nas 17 entradas do lock global.

**Isto é a pista principal para a decisão da §6**: a mesma fonte que está sendo consumida via
instalador-com-cópia **já é, hoje, um marketplace de plugin nativo do Claude Code**.

### 2.7 As duas versões de schema convivem?

Sim, e sem interação. Um mesmo repo pode ter simultaneamente skills globais (rastreadas no v3) e
skills de projeto (rastreadas no v1) — é exatamente o caso de `travelmanager`, `ethitorial`,
`life-under-control` e `tfbox` hoje. Consequências práticas:

- `skills update` sem escopo **pergunta** qual escopo atualizar; com `-y` ele *auto-detecta*
  (projeto se estiver num projeto, senão global) — ou seja, em CI atualiza só um dos dois.
- Uma skill com o mesmo nome nos dois escopos vira **duas cópias**, e quem decide qual o Claude Code
  carrega é a precedência de skills do próprio Claude Code (§3.1), não o `skills`.
- É exatamente esta a situação de `panlabs`: 10 skills de projeto (vendorizadas, sem lock) contra 17
  globais — nomes iguais (`tdd`, `grill-with-docs`, `grill-me`, `setup-matt-pocock-skills`) com
  conteúdos diferentes.

---

## 3. O que o Claude Code oferece nativamente (oficialmente suportado)

Fontes: `code.claude.com/docs/en/skills`, `/plugins`, `/plugins-reference`, `/plugin-marketplaces`,
`/discover-plugins`, `/settings`, `/server-managed-settings`. Coleta 2026-07-19.

### 3.1 Agent Skills: locais de carga e precedência

| Escopo | Caminho | Alcance |
| --- | --- | --- |
| Enterprise | via `managed-settings.json` | toda a org |
| Pessoal | `~/.claude/skills/<nome>/SKILL.md` | todos os projetos |
| Projeto | `.claude/skills/<nome>/SKILL.md` | só o projeto |
| Plugin | `<plugin-root>/skills/<nome>/SKILL.md` | onde o plugin está habilitado |
| Aninhado | `.claude/skills/` em diretórios pai/filho | cwd e abaixo |

**Precedência quando o mesmo nome existe em mais de um nível**: Enterprise > Pessoal > Projeto, e
todos sobre as skills embutidas.

> Consequência direta e contraintuitiva para a frota: as **17 skills globais em
> `~/.claude/skills/` vencem** as 10 skills de projeto de `panlabs`. Ou seja, a cópia vendorizada e
> commitada de `panlabs` **não é a que roda** na máquina que tem o global instalado — mas *é* a que
> rodaria numa máquina limpa (CI, outra pessoa). Dois comportamentos distintos para o mesmo repo.

**Symlinks são oficialmente suportados** — a doc afirma que uma entrada `<skill-name>` nos locais
enterprise/pessoal/projeto pode ser symlink para outro diretório em disco; o Claude Code segue o
symlink, lê o `SKILL.md` do alvo, e se o mesmo alvo for alcançável por mais de um caminho, carrega a
skill uma vez só. Isso legitima o layout `.agents/skills/` + symlink que o `skills` monta.

Não há campo de versão no frontmatter de `SKILL.md`. Skill avulsa **não tem versão**, ponto.

### 3.2 Plugins

Plugin = diretório autocontido com manifesto `.claude-plugin/plugin.json`. Pode conter skills,
commands, agents, hooks, MCP servers, LSP servers, e (experimental) themes e monitors.

Campos do manifesto: `name` (único obrigatório, kebab-case, usado no namespacing
`/<plugin>:<skill>`), `displayName`, `version`, `description`, `author`, `homepage`, `repository`,
`license`, `keywords`, `skills`, `commands`, `agents`, `hooks`, `mcpServers`, `lspServers`,
`experimental`, `dependencies`.

**Semântica do `version` — este é o ponto**: a doc é explícita de que definir `version` *pina* o
plugin — se o `plugin.json` declara `"version": "1.0.0"`, empurrar commits novos sem mudar essa
string **não faz nada para quem já instalou**, porque o Claude Code vê a mesma versão e mantém a
cópia em cache. Omitir o campo, num plugin hospedado em git, faz o **SHA do commit** virar a versão —
e aí **todo commit é uma versão nova**.

Ordem de resolução da versão efetiva: `version` do `plugin.json` → `version` da entrada de
marketplace → SHA do commit da fonte do plugin.

Instalação: `/plugin` (gerenciador interativo), `/plugin install <plugin>@<marketplace>`,
`claude plugin install <plugin> --scope [user|project|local]`.

### 3.3 Marketplaces de plugin — os primitivos de fixação

`.claude-plugin/marketplace.json`:

```json
{
  "name": "marketplace-name",
  "owner": { "name": "Owner Name", "email": "owner@example.com" },
  "plugins": [
    { "name": "plugin-id", "source": "./plugins/plugin-id",
      "description": "…", "version": "1.0.0" }
  ],
  "metadata": { "pluginRoot": "./plugins" }
}
```

Obrigatórios: `name`, `owner` (com `name`), `plugins[]`. Cada entrada de plugin exige `name` e
`source`; opcionalmente `displayName`, `description`, `version`, `author`, `homepage`, `repository`,
`license`, `keywords`, `category`, `tags`, `defaultEnabled`, `strict`, e overrides de componentes.

**Tipos de `source` e o que cada um permite fixar** — a tabela que decide tudo:

| Tipo | Campos | O que trava a versão |
| --- | --- | --- |
| caminho relativo | `"./plugins/x"` | nada (resolve local) |
| `github` | `repo`, `ref?`, `sha?` | `ref` (branch/tag) e **`sha` (commit exato)** |
| `url` (git) | `url`, `ref?`, `sha?` | `ref` e **`sha`** |
| `git-subdir` | `url`, `path`, `ref?`, `sha?` | `ref` e **`sha`** |
| `npm` | `package`, `version?`, `registry?` | `version` (semver/range) |

Quando `ref` e `sha` estão os dois presentes, **`sha` vence** — o Claude Code busca e faz checkout do
commit fixado diretamente. **Este é o único mecanismo de fixação imutável e oficialmente documentado
em todo o levantamento.**

Gerenciamento: `/plugin marketplace add <source> [--scope user|project|local]`,
`… list [--json]`, `… update [name]`, `… remove <name> [--scope …]`. Adicionar de git aceita sufixo
`@ref`.

**Auto-update**: ligado por default só para marketplaces oficiais da Anthropic; **desligado por
default** para terceiros e para marketplaces de desenvolvimento local. Pode ser ligado via UI ou
`"autoUpdate": true` em `extraKnownMarketplaces`. O refresh roda após o startup com atraso aleatório
de até ~10 min. Com auto-update ligado, o Claude Code atualiza os plugins instalados para a última
versão em disco.

**Não existe lockfile.** Zero menções a `lock.json` / lockfile em qualquer página de plugins,
marketplaces ou skills. Os plugins ficam em cache em `~/.claude/plugins/cache/` com diretórios
nomeados por versão. Reprodutibilidade vem do `sha`/`version` escritos no `marketplace.json` — isto
é, o *manifesto* faz o papel de lock, versionado no repo do marketplace.

### 3.4 Escopos de settings e precedência

Precedência, do maior para o menor:

1. **Managed** (política da org — servidor, plist/registry, arquivo de managed settings) — não pode
   ser sobrescrito
2. **Argumentos de linha de comando**
3. **Local** — `.claude/settings.local.json` (gitignored)
4. **Projeto** — `.claude/settings.json` (versionado)
5. **Usuário** — `~/.claude/settings.json`

Exceção: regras de permissão (`permissions.allow`/`deny`) **somam** entre escopos em vez de
sobrescrever.

> Atenção à inversão: para *settings*, projeto vence usuário. Para *skills* (§3.1), pessoal vence
> projeto. São hierarquias diferentes — é uma pegadinha real do desenho atual.

Chaves relevantes para distribuição:

```jsonc
// .claude/settings.json — versionado no repo
{
  "extraKnownMarketplaces": {
    "panlabs": { "source": { "source": "github", "repo": "panlabs-tech/skills" } }
  },
  "enabledPlugins": {
    "panlabs-skills@panlabs": true
  }
}
```

Quem clona o repo e o abre no Claude Code é solicitado a **confiar no workspace**; confiado, o
marketplace é registrado e os plugins instalados. **Este é o mecanismo oficial de "distribuição por
repo".**

Em managed settings existem ainda `strictKnownMarketplaces` (allowlist de fontes, aceitando `ref`),
`blockedMarketplaces`, `disableSideloadFlags` e `pluginSuggestionMarketplaces` — nível org/enterprise,
provavelmente overkill aqui, mas é onde mora a garantia mais forte.

Estado atual da máquina: `~/.claude/settings.json` **não declara** `extraKnownMarketplaces` nem
`enabledPlugins`; `~/.claude/plugins/` tem `known_marketplaces.json` e um diretório `marketplaces`,
sem nenhum plugin instalado. `panlabs` **não tem** `.claude/settings.json` versionado — só
`settings.local.json`, que está no `.gitignore`. Ou seja, **hoje nenhum mecanismo nativo está em
uso**.

### 3.5 Oficial vs. convenção de comunidade

| Item | Status |
| --- | --- |
| `SKILL.md` + `.claude/skills/` + `~/.claude/skills/` + precedência | **oficial** (docs) |
| Symlink em diretório de skill | **oficial** (afirmado explicitamente nas docs) |
| `.claude-plugin/plugin.json`, `marketplace.json`, `sha`/`ref`/`version` | **oficial** |
| `extraKnownMarketplaces` / `enabledPlugins` em `.claude/settings.json` | **oficial** |
| Lockfile de plugin/skill | **não existe** — nem oficial, nem convenção |
| CLI `skills` (`npx skills add`), `skills-lock.json`, `.skill-lock.json` | **terceiro** — Vercel Labs, não Anthropic. Nada disso é lido pelo Claude Code |
| Diretório `.agents/skills/` como cópia canônica | **convenção do CLI `skills`** — multi-agente, não é um caminho que o Claude Code carrega por si |
| Sintaxe `fonte#ref` do `skills add` | existe no código, **não documentada** no README; aceita só branch/tag, **não SHA** |
| `skills experimental_install` / `experimental_sync` | existe, **prefixo `experimental_`**, fora do README |

Ponto que merece destaque: **o Claude Code nunca lê `skills-lock.json` nem `.agents/skills/`.** Ele
lê `.claude/skills/`. Todo o valor do layout atual vem dos symlinks — se eles quebrarem (Windows sem
privilégio, `--copy`, checkout de CI que não preserva symlink), o Claude Code simplesmente não vê a
skill, e o lock não ajuda a diagnosticar.

---

## 4. Alternativas genéricas

Todas avaliadas contra a mesma régua: **consome / atualiza / trava / fonte muda**.

### 4.1 Git submodule

- **Consome**: `git submodule add https://github.com/panlabs-tech/skills .claude/skills-src` + um
  symlink ou um `skills` por skill. Clone precisa de `--recurse-submodules`.
- **Atualiza**: `git submodule update --remote` e commit do novo ponteiro.
- **Trava**: **o gitlink** — o commit exato do submódulo fica registrado na árvore do superprojeto.
  É o travamento mais forte e mais barato de todos: imutável, versionado, revisável em PR,
  `git bisect`-ável.
- **Fonte muda**: nada acontece até alguém rodar `update --remote` e commitar. Bump explícito,
  visível no diff como mudança de SHA.
- **Custo**: ergonomia ruim (submódulo esquecido em clone, detached HEAD, CI precisa do flag). Skills
  chegam como diretório aninhado — precisa de symlink ou de `.claude/skills` apontando pra dentro, e
  não dá para pegar um subconjunto de skills.

### 4.2 Git subtree

- **Consome**: `git subtree add --prefix=.claude/skills <repo> main --squash`.
- **Atualiza**: `git subtree pull --prefix=.claude/skills <repo> main --squash`.
- **Trava**: o **conteúdo em si**, que está commitado no repo consumidor. Não há ponteiro para o
  upstream — a versão é literalmente o que está na árvore.
- **Fonte muda**: nada, até um `subtree pull`. Merge pode conflitar se houve edição local.
- **Custo**: histórico poluído, `pull` requer lembrar do prefixo e da flag `--squash`. Vantagem sobre
  submodule: clone normal funciona, sem flags. É, essencialmente, **vendorização com procedência** —
  exatamente o que `panlabs` faz hoje à mão, só que rastreável.

### 4.3 Pacote npm

- **Consome**: `"@panlabs/skills": "^1.2.0"` em `devDependencies`, e depois um passo pós-install que
  symlinka `node_modules/@panlabs/skills/skills/*` para `.claude/skills/`. O CLI `skills` já tem esse
  caminho pronto: `skills experimental_sync` varre `node_modules` atrás de `SKILL.md` (com
  `sourceType: "node_modules"` no lock, e aí sim o `computedHash` é lido).
- **Atualiza**: `npm update` / bump do range.
- **Trava**: **`package-lock.json`** — versão exata + `integrity` (SHA-512 do tarball). É o
  travamento com verificação de integridade *real* que nada mais aqui oferece.
- **Fonte muda**: nada até `npm update` ou mudança do range. Publicar `1.2.1` não afeta quem tem lock
  em `1.2.0`; `npm ci` reproduz byte a byte.
- **Custo**: exige publicar (npm público ou registry privado / GitHub Packages), e um repo sem Node
  não tem onde encaixar. `panlabs` **tem** `package.json` + `package-lock.json` — cabe. `tfbox`
  (Terraform) provavelmente não.

### 4.4 Symlink

- **Consome**: `ln -s ~/algum/lugar/skills/<x> .claude/skills/<x>`. Oficialmente suportado (§3.1).
- **Atualiza**: instantâneo — não existe "atualizar", o alvo é sempre o atual.
- **Trava**: **nada.** Não há versão. É o oposto de travar.
- **Fonte muda**: muda para todo mundo, na hora, sem aviso e sem diff.
- **Custo/uso**: é mecanismo de *layout*, não de distribuição. Serve dentro de uma máquina (é o que o
  CLI `skills` usa para fanout multi-agente). Como estratégia multi-repo, é o pior caso: acopla todos
  os repos ao working copy de uma pessoa.

### 4.5 Sync script

- **Consome**: um `scripts/sync-skills.sh` no repo, ou uma GitHub Action agendada, que copia de uma
  fonte para `.claude/skills/` e commita.
- **Atualiza**: rodando o script.
- **Trava**: **só o que o script escrever explicitamente** — precisa fixar tag/SHA no próprio script
  ou num manifesto ao lado. Sem isso, é `curl | HEAD`.
- **Fonte muda**: entra na próxima execução. Se for Action agendada, entra **sozinho**, o que
  transforma "fonte mudou" em "6 PRs automáticos" — bom se revisado, péssimo se auto-mergeado.
- **Custo**: código próprio para manter em N repos; reinventa exatamente o que o CLI `skills` já faz
  (mal) e o que plugins fazem (bem). Só se justifica se houver requisito que nenhum dos outros cobre.

---

## 5. Comparativo: o que trava a versão

| Mecanismo | Artefato de travamento | Imutável? | Verifica integridade? | Versionado no repo consumidor? |
| --- | --- | --- | --- | --- |
| Plugin via marketplace com `sha` | `sha` na entrada do `marketplace.json` | **sim** | via checkout do commit | no repo do *marketplace* |
| Plugin via marketplace com `ref` (tag) | `ref` | não (tag move) | não | idem |
| Plugin com `version` no `plugin.json` | string `version` | não (mutável pelo autor) | não | idem |
| Plugin sem `version` (git) | SHA do commit | sim, mas **muda a cada commit** | — | — |
| npm + `package-lock.json` | versão + `integrity` SHA-512 | **sim** | **sim** | **sim** |
| Git submodule | gitlink (SHA) | **sim** | via git | **sim** |
| Git subtree | conteúdo commitado | **sim** (é o conteúdo) | via git | **sim** |
| `skills` CLI **com** `#<tag>` | campo `ref` no lock | não (tag move; SHA **não é aceito**) | não | sim (o lock) |
| **`skills` CLI como está usado hoje** | **nenhum** | — | **não** | lock existe mas não trava |
| Vendorizar à mão (`panlabs` hoje) | conteúdo commitado, **sem procedência** | sim | não | sim |
| Symlink | nenhum | — | — | não |
| Sync script | o que o script fixar | depende | não | depende |

Duas linhas resumem o diagnóstico: **as duas estratégias em uso na frota — `skills` sem `ref` (6
repos) e vendorização à mão (`panlabs`) — são as únicas duas linhas da tabela sem um artefato de
travamento utilizável.** Uma não trava; a outra trava o conteúdo mas perde a procedência (não dá para
saber de qual commit upstream aquele `tdd` de 109 linhas veio, nem se há update).

E note a assimetria decisiva: **só o caminho nativo (marketplace com `sha`), o npm e o git
(submodule/subtree) oferecem fixação imutável.** O CLI `skills`, na melhor das hipóteses, oferece
uma tag — que é um ponteiro que o dono do repo upstream pode mover a qualquer momento.

---

## 6. O papel de `panlabs-tech/skills`

Estado hoje (verificado via API do GitHub, 2026-07-19): público, MIT, branch `main`, `pushedAt`
2026-07-19T14:27Z, árvore com **exatamente dois arquivos** — `LICENSE` e `README.md`. Descrição:
*"Conjunto de skills usadas majoritariamente no desenvolvimento de soluções na org panlabs"*.

### Opção A — Marketplace de plugin nativo (recomendado)

O repo hospeda as skills e se declara seu próprio marketplace single-plugin:

```
panlabs-tech/skills
├── .claude-plugin/
│   ├── plugin.json        # name: panlabs-skills, version: 1.0.0, skills: [ ... ]
│   └── marketplace.json   # name: panlabs, plugins: [{ name: panlabs-skills, source: "./" }]
└── skills/<nome>/SKILL.md
```

Cada repo consumidor ganha um `.claude/settings.json` **versionado**:

```json
{
  "extraKnownMarketplaces": {
    "panlabs": { "source": { "source": "github", "repo": "panlabs-tech/skills",
                             "sha": "<commit>" } }
  },
  "enabledPlugins": { "panlabs-skills@panlabs": true }
}
```

- **Consome**: clonar o repo e confiar no workspace. Zero comandos manuais, zero `npx`.
- **Atualiza**: bump do `version` no `plugin.json` upstream (+ do `sha`/`ref` no consumidor, se
  fixado), ou `/plugin marketplace update panlabs`.
- **O que trava**: `sha` (imutável) > `ref` (tag) > `version` do `plugin.json`. Auto-update de
  marketplace de terceiro é **desligado por default**, então nada entra sem ação.
- **Fonte muda**: com `version` fixo no `plugin.json`, quem já instalou **não vê nada** até o bump —
  a doc é explícita nisso. Com `sha` no consumidor, nem o bump entra.
- **Precedente forte**: é exatamente o que `mattpocock/skills` fez na v1.2 — o
  [ADR 0002 do próprio repo](https://github.com/mattpocock/skills/blob/main/.agents/adr/0002-ship-as-a-claude-code-plugin.md)
  registra a motivação: *"A recurring request is a plug-and-play distribution: subscribe to the set
  as a read-only, always-current bundle you don't edit, rather than a fork you own."* E deixa a
  invariante operacional que vale copiar: *"`.claude-plugin/plugin.json`'s `version` tracks
  `package.json`'s version — bump both together on release."*
- **Limites conhecidos**: (a) só Claude Code — o mesmo ADR registra que o Codex **não** suporta
  `skills` como array e **descarta symlinks** no install, então um plugin nativo Codex foi adiado;
  se a frota precisar de Codex/outros harnesses, o CLI `skills` continua sendo a ponte. (b) Plugin é
  **read-only** — não dá para editar a skill no repo consumidor, o que é uma feature, não um bug,
  dado o diagnóstico da §1.1. (c) Se as skills forem organizadas em buckets, o array `skills` do
  `plugin.json` precisa listar cada uma explicitamente (é o que permite curar um subconjunto).

### Opção B — Fonte para o CLI `skills` com lock

O repo hospeda `skills/<nome>/SKILL.md` e os consumidores fazem
`npx skills add panlabs-tech/skills#v1.0.0 --skill <x>`.

- Vantagem: funciona para Codex e demais harnesses; permite editar a cópia local.
- Desvantagem: só "trava" se **toda** invocação carregar `#<tag>` — disciplina humana, não garantia
  da ferramenta, com sintaxe não documentada, e ainda assim **mutável** (tag, não SHA — §2.5). Nada
  impede alguém rodar `add` sem `#ref` e zerar o campo no lock.
- Continua sem verificação de integridade e com destruição silenciosa de edições locais.
- Mitigação parcial se escolhida: como `panlabs-tech/skills` seria **nossa** fonte, dá para tratar a
  tag como imutável por política (nunca reescrever `v1.0.0`), o que devolve boa parte da garantia —
  mas por convenção, não por mecanismo.

### Opção C — Arquivo morto

Manter vazio e seguir com `npx skills add` direto das fontes de terceiros + vendorização em
`panlabs`. É o status quo, e §1.1 mostra o custo: 4 de 4 skills compartilhadas divergentes, dois
conjuntos concorrentes na mesma máquina, e nenhuma resposta para "que versão desta skill este repo
está usando?".

### Recomendação

**A, com B como ponte.** As duas não se excluem: um repo pode ser marketplace de plugin *e* fonte
válida para `npx skills add` ao mesmo tempo — é literalmente o caso de `mattpocock/skills` hoje, cujo
`.claude-plugin/marketplace.json` é o que dá origem ao `pluginName` gravado no lock global desta
máquina (§2.6). O caminho:

1. Popular `panlabs-tech/skills` com as skills próprias da org (as que não vêm de terceiros:
   `to-issues`, `to-prd`, e o que for panlabs-específico).
2. Adicionar `.claude-plugin/plugin.json` (com `version` **explícito** — sem isso todo commit vira
   release) e `.claude-plugin/marketplace.json`. Validar com `claude plugin validate . --strict`.
3. Taggear releases (`v1.0.0`) e tratar o bump de `version` como parte do release.
4. Nos repos consumidores: `.claude/settings.json` **versionado** (não `.local`) com
   `extraKnownMarketplaces` + `enabledPlugins`. Em `panlabs` isso significa criar o arquivo, que hoje
   não existe.
5. Para skills de terceiros (`mattpocock`, `anthropics`, `wshobson`, …): consumir **como plugin**
   quando a fonte oferecer marketplace (`mattpocock/skills` oferece, e é onde mora hoje a maior
   parte do conjunto global), e via `npx skills add <fonte>#<tag>` quando não oferecer — sempre com
   ref, aceitando que o pin é mutável.
6. Retirar as cópias vendorizadas de `panlabs/.agents/skills/` do git assim que o plugin cobrir o
   mesmo conjunto, para eliminar o terceiro conjunto concorrente.

---

## 7. Pontas soltas / riscos

- **Precedência invertida**: skills pessoais (`~/.claude/skills/`) vencem as de projeto. Enquanto o
  global instalado por `npx skills add mattpocock/skills -g` existir, ele **mascara** qualquer skill
  de mesmo nome que um repo distribua — inclusive um futuro plugin panlabs. Migrar para plugin exige
  **limpar o global**, senão a migração parece não ter efeito.
- **Descarte silencioso de lock**: se o CLI `skills` subir `CURRENT_VERSION` do lock de repo de 1 → 2,
  os 6 `skills-lock.json` existentes são zerados sem aviso. Argumento adicional para não depender
  deles como fonte da verdade.
- **`computedHash` é metadado morto** no fluxo de repo — não confiar nele para auditoria de drift.
- **`skills remove` não limpa o lock do repo** — só o global (`if (isGlobal)
  removeSkillFromLock(...)`; `removeSkillFromLocalLock` existe mas não tem chamador fora dos testes).
  Remover uma skill de projeto deixa entrada órfã no `skills-lock.json`, que `experimental_install`
  reinstala. Se alguém "removeu" uma skill em algum dos 6 repos, ela pode voltar sozinha.
- **`getLocalLockPath` não sobe até a raiz do repo** — usa `cwd` puro. Rodar `skills add` de dentro
  de um subdiretório cria um **segundo** `skills-lock.json` ali.
- **`skills check` é alias de `update`**, não dry-run — não usar como comando de diagnóstico.
- **Escritas no lock são engolidas** (`catch {}`, "não falhar a instalação se o lock falhar"): um
  lock pode estar incompleto sem que nada tenha avisado.
- **Fast-path de blob**: para fontes dos owners `vercel`, `vercel-labs`, `heygen-com` e
  `zapier/connectors`, o conteúdo vem de `https://skills.sh/api/download/...`, endpoint **sem ref** —
  ali nem o `#ref` influencia os bytes instalados. Não afeta as fontes da frota hoje, mas é um
  serviço fechado no caminho crítico de instalação.
- **Sem verificação de integridade em lugar nenhum do caminho nativo**: nem plugin nem skill têm
  checksum. Só o npm (`integrity`) e o git (SHA) oferecem isso. Se isso importar, o vetor npm ou
  submodule é o único.
- **Não verificado**: se `claude plugin install --scope project` grava algo além de
  `.claude/settings.json`; se `~/.claude/plugins/cache/` é seguro de commitar (assume-se que não); e
  o comportamento exato do prompt de trust em CI headless.
- **Codex**: `panlabs` tem `.codex/`. Plugin nativo do Claude Code não atende Codex — a ponte
  continua sendo o CLI `skills` (ADR 0002 do upstream). Se Codex for requisito de primeira classe, a
  Opção B deixa de ser ponte e vira caminho paralelo permanente.

---

## 8. Fontes

**Primárias — código e artefatos publicados**
- `skills@1.5.19` — `package/dist/cli.mjs` e `package/README.md`, obtidos via `npm pack skills@1.5.19`
  (registry.npmjs.org). Também `1.5.0`, `1.5.8`, `1.5.13` para datar os contadores de lock.
- Metadados npm: `https://registry.npmjs.org/skills`
- `https://github.com/vercel-labs/skills` — fonte TypeScript na tag `v1.5.19`, em especial
  `src/skill-lock.ts`, `src/local-lock.ts`, `src/add.ts`, `src/update.ts`, `src/installer.ts`,
  `src/source-parser.ts`, `src/git.ts`, `src/plugin-manifest.ts`, `src/agents.ts`, `AGENTS.md`;
  histórico dos commits `7cae125`, `9e7b025`, `68be464`, `eec6510`, `daa1f82`
- `https://github.com/vercel-labs/skills/issues/500` (aberta) e
  `https://github.com/vercel-labs/skills/pull/507` (fechada sem merge) — ausência de pinning por SHA,
  `--frozen-lockfile` e `skills verify`. Relacionadas: issues `#629` e `#165`
- `https://github.com/mattpocock/skills/blob/main/.claude-plugin/marketplace.json`
- `https://github.com/mattpocock/skills/blob/main/.claude-plugin/plugin.json`
- `https://github.com/mattpocock/skills/blob/main/.agents/adr/0002-ship-as-a-claude-code-plugin.md`
- `https://github.com/mattpocock/skills/blob/main/.changeset/ship-as-claude-plugin.md`
- API GitHub: `repos/panlabs-tech/skills` (metadados + árvore `main`)

**Primárias — documentação oficial Claude Code** (coleta 2026-07-19)
- `https://code.claude.com/docs/en/skills` — formato `SKILL.md`, locais de carga, precedência, symlinks
- `https://code.claude.com/docs/en/plugins` e `/plugins-reference` — manifesto, componentes, escopos, CLI
- `https://code.claude.com/docs/en/plugin-marketplaces` — schema do marketplace, tipos de `source`,
  `ref`/`sha`, semântica de `version`, `extraKnownMarketplaces`, `strictKnownMarketplaces`
- `https://code.claude.com/docs/en/discover-plugins` — auto-update, config de marketplace de time
- `https://code.claude.com/docs/en/settings` — precedência de settings
- `https://code.claude.com/docs/en/server-managed-settings` — managed settings

**Evidência local inspecionada (somente leitura)**
- `~/.agents/.skill-lock.json`, `~/.agents/skills/`, `~/.claude/skills/`, `~/.claude/settings.json`,
  `~/.claude/plugins/`
- `~/workspaces/{travelmanager,tfbox,life-under-control,ethitorial,campfire,aidriven-resources}/skills-lock.json`
- `~/workspaces/panlabs/.agents/skills/`, `.claude/skills/`, `.gitignore`, `git ls-files`
- `~/.zsh_history` (identificação do instalador)
