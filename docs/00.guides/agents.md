# AI Coding Agent Guide (Lineage Manager)

This document is the single source of truth for anyone using AI coding agents (Copilot Chat, GPT, Claude, etc.) on the Lineage Manager project. It unifies the architectural context, development workflows, and agent-specific rules that previously lived in multiple files.

---

## 1. Purpose & Scope
- Keep AI-produced changes consistent with Lineage Manager’s architecture.
- Minimize token/latency costs by using targeted prompts.
- Ensure every AI-driven task leaves a paper trail (specs, completion notes).

---

## 2. Architecture & Tech Stack

### System Overview
- **Backend**: FastAPI + SQLAlchemy + Dependency Injector. Graph data persists in relational DB with closure tables for fast DAG traversal.
- **Services**:
  - `GraphService` (write) — job registration, sync, expansion.
  - `GraphQueryService` (read) — DAG queries with optional Redis caching.
  - Both share repositories through the `GraphUnitOfWork`.
- **Frontend**: Vanilla JS, Cytoscape.js graph canvas, modular UI controllers (`graphControllerNew`, `panelControllerNew`, etc.).
- **Caching**: Redis only for read-side caching (enabled via `REDIS_ENABLED`).
- **Migrations**: Alembic (`alembic revision --autogenerate` → `alembic upgrade head`).

### Key Conventions
- Node IDs: jobs `j<db_id>`, tables `t<db_id>`. External identifiers (job_id/table_name) resolved server-side.
- Graph API shape:
  ```json
  {
    "base_table": "demo.analytics.foo",
    "nodes": [{"id": "t7", "label": "foo", "data": {"type": "table"}}],
    "edges": [{"source": "j42", "target": "t7", "io": "output"}]
  }
  ```
- Endpoint layout: `api/v1/endpoints/{graph,jobs,tables,search,expand,sync,diagnostics,auth,users}`.
- Frontend event bus: DOM `CustomEvent`s such as `job-detail:view-in-graph`, `table-detail:view-in-graph`, `detail-tabs:changed`.

---

## 3. Development Workflows

### Local Environment
```bash
make venv          # create .venv and install base deps
make install-dev   # add lint/test tooling
source .venv/bin/activate
make run           # uvicorn on :5003 (PYTHONPATH=src)
make test          # pytest with coverage
make format / make lint
make compose-up    # optional Docker stack
```

If pip is missing inside `.venv`, run `python -m ensurepip --upgrade` before `python -m pip install -r requirements.txt`.

### Database
- Models live in `src/lineage_manager/models`. Always import new models in `core/database.py`.
- Use the Unit of Work (`GraphUnitOfWork`) for DB interactions; never open raw sessions in endpoints/services.

### Specs & Reports
1. Author spec: `docs/specs/<feature>.md`.
2. Implement with AI (diff-only patches).
3. Publish completion report: `docs/reports/<date>-<feature>-completion.md`.

---

## 4. Agent Interaction Rules

### Prompting
1. Provide only the necessary context (paths, snippets, API contracts).
2. Ask the agent to share a plan before code for anything non-trivial.
3. Request diff-only output (e.g., `apply_patch` blocks).
4. Supply DTO/API structures or schema expectations up front.
5. Prefer summaries or checklists over full file dumps.

### Token Discipline
- Avoid regenerating entire modules; edit focused sections.
- Ask for outlines or pseudo-code before large rewrites.
- Keep answers concise unless the user explicitly asks otherwise.

### Development Guardrails
- Follow existing directory layout and naming.
- Respect linting/formatting standards (Black, Flake8).
- Do not add new services/modules without specs.

---

## 5. Backend Guardrails
- **DI & Repositories**: Every endpoint injects services via `dependency-injector`. Services obtain repositories through the injected Unit of Work.
- **Graph traversal**: Use existing BFS helpers (`get_job_neighbors`, `get_table_neighbors`) to avoid duplicating traversal logic.
- **Caching**: If Redis is involved, ensure write paths invalidate related keys (`dag:*`, `neighbors:*`).
- **Error handling**: Raise `HTTPException` or return `{ "status": "error", "message": "..." }` for business errors. No bare `print`.
- **Node metadata**: use `GraphNode` helpers (`storage_type`, `storage_path`, etc.) for new storage nodes (table vs storage vs job).

---

## 6. Frontend Guardrails
- **Graph canvas**: `graphControllerNew` orchestrates Cytoscape; respect its division of responsibilities (view, selection, filtering, zoom, expansion).
- **Panel system**: Right-panel logic lives in `panelControllerNew` plus views (`jobDetailView`, `tableDetailView`, `timelinesView`). Each view handles DOM binding; controllers dispatch events.
- **Events**: prefer `CustomEvent`s over global variables when coordinating modules.
- **Styling**: Use existing CSS tokens/classes (e.g., badges, pills, button variants). Keep colors consistent with table/job themes (#1A73E8 for tables, #FB8C00 for jobs).
- **Build artifacts**: Keep JS modular, ES module syntax with `type="module"`.

---

## 7. Common Task Playbooks

### Add a Graph Query
1. Implement method in `GraphQueryService` (read-only, cache-aware).
2. Add FastAPI route in appropriate `api/v1/endpoints/*.py` with `@inject`.
3. Return `{"nodes": [...], "edges": [...]}`.
4. Update frontend API client if needed (`static/js/app/services/api.js`).

### Register a Repository
1. Create `repositories/<entity>_repository.py` inheriting `BaseRepository`.
2. Register it inside `GraphUnitOfWork`.
3. Inject via services; never instantiate directly in endpoints.

### Frontend Feature
1. Identify the UI module (controller vs view vs service).
2. Update HTML in `static/index.html` if new containers are required.
3. Keep Cytoscape layout, event bindings, and minimap controls consistent with existing patterns.

---

## 8. Prompt Templates

### Backend
```
Context: <short summary, linked files>
File(s): <paths>
Goal: <feature/bug description>
Constraints: use DI, repositories, no raw SQL, return diff
Output: apply_patch blocks only
```

### Frontend
```
Context: <UI state / file paths>
Goal: <interaction or visual change>
Constraints: preserve DOM structure/state mgmt, Cytoscape conventions
Output: minimal diff (apply_patch)
```

### Review / QA
```
Mode: review
Scope: <paths or PR summary>
Focus: bugs, regressions, missing tests
Output: numbered findings with severity
```

---

## 9. Quality Checklist (before handing work back to humans)
- [ ] Tests or lint run when feasible (`make test`, `npm test` not applicable yet).
- [ ] Manual verifications noted (e.g., “Reloaded frontend; button focuses node”).
- [ ] Highlight remaining risks or follow-ups.
- [ ] Reference updated files with line numbers in summaries.

---

## 10. Appendix
- **Key Paths**:
  - Backend core: `src/lineage_manager/{services,repositories,api}`
  - Frontend: `src/lineage_manager/static/{index.html, js/app/... , css/modern-console.css}`
  - Docs: `docs/guides`, `docs/specs`, `docs/reports`
- **Contact**: leave TODO/FIXME comments sparingly; prefer creating an item in `/docs/develop_item`.

This document replaces older agent instructions and is the only file that needs updating when workflows change.
