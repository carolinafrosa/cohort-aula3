# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repository Is

This is a **Synkra AIOX** project hosting the **Projeta SC** chatbot — a WhatsApp bot built in n8n that lets citizens query infrastructure projects from the Santa Catarina state government. The single deployable artifact is `docs/flow/projeta-sc.json` (n8n flow export).

The AIOX meta-framework (`.aiox-core/`) provides multi-agent orchestration, task workflows, and CLI tooling. Full framework rules live in `.claude/CLAUDE.md`.

## Project Artifact

```
docs/flow/projeta-sc.json   # n8n flow — the entire chatbot logic
```

### Editing the n8n Flow

The chatbot logic lives entirely in this JSON file. Workflow for changes:

1. **Export** the flow from the n8n UI → Download JSON
2. **Replace** `docs/flow/projeta-sc.json` with the exported file
3. **Edit** the JSON directly if making targeted node/connection changes
4. **Import** back to n8n: Settings → Import → select the file

No build step needed. The file is valid n8n flow JSON — nodes, connections, and credentials are embedded.

**Required env vars** (copy `.env.example` → `.env`):
- `N8N_API_KEY` — n8n instance API key
- `N8N_WEBHOOK_URL` — base URL for webhook triggers

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
```

**First-time setup:** run `node bin/aiox.js doctor` to verify the environment before starting work.

## Architecture

### 4-Layer Boundary Model

| Layer | Paths | Mutability |
|-------|-------|-----------|
| L1 — Framework Core | `.aiox-core/core/`, `.aiox-core/constitution.md`, `bin/aiox.js`, `bin/aiox-init.js` | **NEVER modify** |
| L2 — Framework Templates | `.aiox-core/development/tasks/`, `.aiox-core/development/templates/`, `.aiox-core/development/checklists/`, `.aiox-core/development/workflows/`, `.aiox-core/infrastructure/` | **Extend only** |
| L3 — Project Config | `.aiox-core/data/`, `agents/*/MEMORY.md`, `core-config.yaml` | Mutable (with care) |
| L4 — Project Runtime | `docs/flow/`, `docs/stories/`, `packages/`, `squads/`, `tests/` | Always modify here |

### Agent System

Agents activate via `@agent-name` (e.g. `@dev`, `@qa`, `@architect`). Each has exclusive authority over specific operations. Critical constraint: **only `@devops` can run `git push` or create PRs**.

### Story-Driven Development

All work requires a story in `docs/stories/`. Create the directory if it doesn't exist (`mkdir -p docs/stories`). Canonical flow:

```
@sm *draft → @po *validate → @dev *develop → @qa *qa-gate → @devops *push
```

Stories are named `{epicNum}.{storyNum}.story.md`, track progress via `[ ]` → `[x]` checkboxes, and maintain a File List section. Story status transitions: `Draft → Ready → InProgress → InReview → Done`.

## Environment Notes (WSL2)

- Node: v20.20.0 / npm: 10.8.2 / pnpm: 10.33.0
- `gh` CLI: `~/.local/bin/gh`
- n8n instance: hosted externally (credentials in `.env`)
- Docker: Docker Desktop on Windows host (not WSL-native)
- Supabase CLI: unavailable — use Railway or direct SQL

## MCP Tool Priority

Prefer native Claude Code tools over MCP servers:
- File operations → `Read`, `Write`, `Edit`, `Glob`, `Grep`, `Bash`
- Web search → EXA via docker-gateway
- Library docs → Context7 via docker-gateway
- Browser automation → playwright MCP

MCP infrastructure management is **exclusively** handled by `@devops`.
