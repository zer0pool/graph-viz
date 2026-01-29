---
status: shipped
owner: David
created: 2026-01-30
updated: 2026-01-30
version: 1.0
related: [agents.md, react-style-guide.md, fastapi-refactoring-guide.md]
tags: [quality-gate, checklist, code-review, verification]
---

# Submission & Quality Gate Checklist

**This checklist must be strictly followed by both AI Agents and Human Developers before finishing any task, committing code, or opening a Pull Request.**

## 🛡️ CORE: Mandatory Verification

| Category | Item | Verification Method |
| :--- | :--- | :--- |
| **Backend (V2)** | 100% Asynchronous I/O | Ensure no `sync` DB calls or blocking `time.sleep`. |
| **Backend (V2)** | DDD Alignment | Is logic in the correct domain? Are layers separated? |
| **Frontend** | Airbnb Style Compliance | No direct DOM manipulation, proper Hook usage. |
| **Frontend** | MFE Standards | Proper logging prefix (e.g., `[Shell]`, `[Catalog]`). |
| **Documentation** | Metadata Headers | All `.md` files must have standardized YAML headers. |
| **Documentation** | Language Priority | All new content must be in **English**. |
| **Git** | Branch Naming | Follow `Number.Description` (e.g., `81.new-feature`). |

---

## 🐍 Backend (FastAPI/Python) Detail
- [ ] **Type Hints**: All function signatures must have complete type hints.
- [ ] **Pydantic**: Use V2 schemas for all API input/output.
- [ ] **Dependency Injection**: Use `dependency-injector` or FastAPI `Depends` for all services/repos.
- [ ] **Error Handling**: Use custom domain exceptions instead of generic `Exception`.
- [ ] **Async Trace**: Check for "Sync-to-Async" coloring issues.

## ⚛️ Frontend (React/TS) Detail
- [ ] **FSD Alignment**: Files placed in `features/`, `entities/`, `shared/` accordingly.
- [ ] **Compound Components**: Are complex UI elements composable?
- [ ] **Slot-based Props**: Using children or render props where flexibility is needed?
- [ ] **Clean Hooks**: Business logic extracted into custom hooks?

---

## 🤖 AI Agent Protocol (Antigravity Self-Check)

*Before calling `notify_user` or the final `git push`, the agent MUST:*
1.  **Reference**: Open this `submission-checklist.md`.
2.  **Verify**: Run a `grep` or `find` to check for leftover Korean comments or `print()` statements.
3.  **Scan**: Confirm all file headers are updated.
4.  **Report**: Briefly state in the final message: *"Standard Check: All quality gates cleared (Async, DDD, Metadata, English)."*

---

## 🚀 Execution Workflow
1.  **Develop**: Implement the feature/fix.
2.  **Lint & Test**: Run `npm run lint` or `pytest`.
3.  **Checklist**: Go through this document row by row.
4.  **Refine**: Fix any non-compliant code.
5.  **Submit**: Commit and Push.

---
_Author: Capsule Corp (David & Antigravity)_
