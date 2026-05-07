# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repository Is

This is a **Synkra AIOX** project hosting the **Projeta SC** chatbot — a WhatsApp bot built in n8n that lets citizens query infrastructure projects from the Santa Catarina state government. The single deployable artifact is `docs/flow/projeta-sc.json` (n8n flow export).

The AIOX meta-framework (`.aiox-core/`) provides multi-agent orchestration, task workflows, and CLI tooling. Full framework rules live in `.claude/CLAUDE.md`.

## Project Artifact

```
docs/flow/projeta-sc.json   # n8n flow — the entire chatbot logic (39 nodes)
```

### Editing the n8n Flow

> ⚠️ **NEVER edit `projeta-sc.json` directly.** The routing nodes use complex switch/if logic that becomes malformed without the visual editor. Always use the n8n UI.

Workflow for changes:

1. **Import** `docs/flow/projeta-sc.json` into n8n (Settings → Import)
2. **Edit** visually in the n8n UI
3. **Test** via test webhook or real WhatsApp conversation
4. **Export** (Download JSON) and replace `docs/flow/projeta-sc.json`
5. **Commit**

No build step needed. The file is valid n8n flow JSON — nodes, connections, and credentials are embedded.

**Required env vars** (copy `.env.example` → `.env` — the example lists all available keys):
- `N8N_API_KEY` — n8n instance API key
- `N8N_WEBHOOK_URL` — base URL for webhook triggers
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `DEEPSEEK_API_KEY` / `OPENROUTER_API_KEY` — LLM providers
- `EXA_API_KEY` — web search for agents

> ⚠️ **Hardcoded credentials in the flow JSON:** The Groq API key (used by `GroqClassificador`, `GroqRefinamento`, `InterpretaConsulta`) and the Evolution API key (used by all WhatsApp response nodes) are currently embedded directly in `projeta-sc.json` as HTTP header values. They are **not** controlled by `.env`. Migration to `$env` expressions is tracked in Story 1.6 (status: Ready — approach uses `={{ $env.GROQ_API_KEY }}` and `={{ $env.EVOLUTION_API_KEY }}` directly in HTTP Request headers, no paid n8n plan required). When inspecting the exported JSON for leaked secrets, search for `gsk_` (Groq) and `apikey` header values (Evolution API).
>
> `GROQ_API_KEY` and `EVOLUTION_API_KEY` appear in `.env.example` for documentation purposes only — the live flow ignores them entirely.

### Testing the Flow

There is **no automated test suite**. All validation is manual:

| Method | When to use |
|--------|------------|
| n8n test webhook | Send a POST to the test URL shown in n8n UI while the flow is in test mode |
| Real WhatsApp conversation | End-to-end validation via the `Projeta_SC` Evolution API instance |
| n8n execution log | Debug individual node outputs after a run |

Always test the full happy path (search project → view values → view contracts) after any node change before exporting.

### Flow Architecture (Key Node Groups)

The 39-node flow is organized in these functional groups:

| Group | Nodes | Purpose |
|-------|-------|---------|
| **Entry** | `Whatsapp`, `FiltraMensagem`, `ProcessaMensagem` | Receive WhatsApp webhook, filter spam, route by state |
| **Intent** | `PreparaGroqClassificador`, `GroqClassificador`, `AplicaClassificacao`, `RoteiaClassificacao` | Classify user intent via Groq LLM |
| **Query** | `InterpretaConsulta`, `MontaBusca`, `PreparaConsulta` | Parse natural language into structured query (Gemini 1.5 Pro) |
| **Database** | `ConsultaProjetos`, `ConsultaEntregas`, `ConsultaValores`, `ConsultaContratos` (+ `*1` variants) | Oracle 11g queries |
| **Routing** | `RoteadorPrincipal`, `RoteiaSubmenu`, `RoteiaValores`, `RoteiaResultado` | Switch/IF nodes for menu navigation |
| **Format** | `FormataProjeto`, `FormataEntregas`, `FormataValores`, `FormadaContratos`, `FormataDetalheContrato`, `FormataRefinamento` | Format DB results for WhatsApp |
| **Response** | `RetornoBoasVindas`, `RetornoProjeto`, `RetornaMensagem`, `RetornoReinicio`, `RespondePerguntas` | Send messages back via WhatsApp API |
| **Q&A** | `PreparaPromptPergunta`, `PreparaPromptRefinamento`, `GroqRefinamento`, `FormataRespostaLivre` | Free-text answers via LLM |

**Session state** is managed entirely inside `ProcessaMensagem` (Code node, ~300 lines). It reads `$json.body.data.message.conversation` and a context object stored in memory to decide which branch to activate. When debugging unexpected routing, inspect this node first.

**External dependencies:**
- **Oracle 11g** — SC government project database (read-only queries)
- **Groq API** — intent classification (`GroqClassificador`) and free-text answers (`GroqRefinamento`)
- **Gemini 1.5 Pro** — natural language → structured query (`InterpretaConsulta`), accessed via OpenAI-compatible endpoint
- **Evolution API** (`n8n-evolution-api.lkpafu.easypanel.host`) — WhatsApp gateway; all outbound messages go through this service using the `Projeta_SC` instance

**Deployment:** For VM installation (Ubuntu 22.04 + Node.js 20 + Oracle Instant Client 19c + PM2), see `docs/deploy/implantacao-vm.md`.

## AIOX Framework Commands

```bash
# AIOX CLI (run from repo root)
node bin/aiox.js doctor            # Health check — verifies env, agents, and MCP
node bin/aiox.js graph --deps      # Visualize dependency tree
node bin/aiox.js graph --stats     # Entity stats and cache metrics

# Framework validation (cd .aiox-core/ first)
npm run validate:structure         # Validate project structure
npm run validate:agents            # Validate agent definitions
npm run sync:ide                   # Sync IDE configuration
npm run sync:ide:check             # Verify IDE sync status
npm run sync:skills:codex          # Sync agent skills to Codex CLI (local)
npm run sync:skills:codex:global   # Sync agent skills globally (optional)
```

**First-time setup:** run `node bin/aiox.js doctor` to verify the environment before starting work.

Agent persona definitions live at `.aiox-core/development/agents/` (e.g. `dev.md`, `qa.md`, `architect.md`). For **Codex CLI** users, agent shortcuts and skill mappings are defined in `AGENTS.md` at the repo root.

## Architecture

### 4-Layer Boundary Model

| Layer | Paths | Mutability |
|-------|-------|-----------|
| L1 — Framework Core | `.aiox-core/core/`, `.aiox-core/constitution.md`, `bin/aiox.js`, `bin/aiox-init.js` | **NEVER modify** |
| L2 — Framework Templates | `.aiox-core/development/tasks/`, `.aiox-core/development/templates/`, `.aiox-core/development/checklists/`, `.aiox-core/development/workflows/`, `.aiox-core/infrastructure/` | **Extend only** |
| L3 — Project Config | `.aiox-core/data/`, `agents/*/MEMORY.md`, `.aiox-core/core-config.yaml` | Mutable (with care) |
| L4 — Project Runtime | `docs/flow/`, `docs/stories/`, `packages/`, `squads/`, `tests/` | Always modify here |

### Agent System

Agents activate via `@agent-name` (e.g. `@dev`, `@qa`, `@architect`) or via slash commands `/AIOX:agents:dev` (backed by `.claude/commands/AIOX/agents/`). Each has exclusive authority over specific operations. Critical constraint: **only `@devops` can run `git push` or create PRs**.

### Story-Driven Development

All work requires a story in `docs/stories/`. Create the directory if it doesn't exist (`mkdir -p docs/stories`). Canonical flow:

```
@sm *draft → @po *validate → @dev *develop → @qa *qa-gate → @devops *push
```

Stories are named `{epicNum}.{storyNum}.story.md`, track progress via `[ ]` → `[x]` checkboxes, and maintain a File List section. Story status transitions: `Draft → Ready → InProgress → InReview → Done`.

**Active Epic:** Epic 1 — "Qualidade e UX do Chatbot" (22 stories, all in `docs/stories/1.*.story.md`). Stories 1.1–1.5 are `InReview`; 1.6–1.22 are `Ready`. Pick any `Ready` story to start.

## Environment Notes (WSL2)

- Node: v20.20.0 / npm: 10.8.2 / pnpm: 10.33.0
- `gh` CLI: `~/.local/bin/gh`
- n8n instance: hosted externally (credentials in `.env`)
- Docker: Docker Desktop on Windows host (not WSL-native)
- Supabase CLI: unavailable — use Railway or direct SQL

## Hooks de Governança

Os hooks são registrados em `.claude/settings.local.json` (gitignored). Ao clonar o repositório execute `node bin/aiox.js doctor` para recriar esse arquivo e ativar os hooks.

**Hooks ativos:**

| Hook | Evento | Efeito |
|------|--------|--------|
| `synapse-engine.cjs` | `UserPromptSubmit` | Injeta regras contextuais do diretório `.synapse/` (se existir) em cada prompt |
| `precompact-session-digest.cjs` | `PreCompact` | Salva digest da sessão antes da compactação de contexto |

**Hooks de proteção disponíveis** (ver `.claude/hooks/README.md` para ativar):

| Hook | Trigger | O que bloqueia |
|------|---------|---------------|
| `read-protection.py` | `Read` | Leitura parcial (limit/offset) de `.claude/CLAUDE.md`, `.claude/rules/*.md`, `.aiox-core/development/agents/*.md` |
| `enforce-architecture-first.py` | `Write\|Edit` | Criar código em `supabase/functions/` ou `supabase/migrations/` sem doc aprovada |
| `sql-governance.py` | `Bash` | DDL direto (`CREATE/ALTER/DROP TABLE`) fora do CLI `supabase migration` |
| `mind-clone-governance.py` | `Write\|Edit` | Criar mind clones em `squads/*/agents/*.md` sem DNA extraído |

> Os hooks de proteção existem como arquivos mas precisam ser registrados manualmente em `settings.local.json` ou via `node bin/aiox.js doctor`.

## MCP Tool Priority

Prefer native Claude Code tools over MCP servers:
- File operations → `Read`, `Write`, `Edit`, `Glob`, `Grep`, `Bash`
- Web search → EXA via docker-gateway
- Library docs → Context7 via docker-gateway
- Browser automation → playwright MCP

MCP infrastructure management is **exclusively** handled by `@devops`.

### Known Docker MCP Issue

Docker MCP Toolkit's secrets store does not pass credentials to containers correctly. Workaround: edit `~/.docker/mcp/catalogs/docker-mcp.yaml` directly and hardcode values under the MCP's `env:` block instead of using `docker mcp secret set`. EXA works via `~/.docker/mcp/config.yaml` `apiKeys` and is unaffected.
