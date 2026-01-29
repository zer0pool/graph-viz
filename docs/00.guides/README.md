---
status: shipped
owner: David
created: 2026-01-30
updated: 2026-01-30
version: 1.1
related: [../01.onboarding/README.md, agents.md]
tags: [guides, standards, developer-rules, workflow]
---

# 00.guides – Development Standards & Collaboration Rules

**The documents in this folder are essential guides that every developer must reference at all times.**

## 📄 Document List

### 1. [agents.md](agents.md)
**Collaboration Rules for AI Agents (ChatGPT, Copilot)**
- Prompting guidelines and token efficiency tips.
- Specialized instructions for Antigravity agents.
- Effective collaboration methods within the OPS Console ecosystem.

### 2. [codebase-map.md](codebase-map.md)
**Functional Mapping of the Project**
- High-level overview of Backend and MFE relationships.
- Diagram of service communications and data flows.

### 3. [react-style-guide.md](react-style-guide.md)
**React & TypeScript Coding Standards**
- FSD (Feature-Sliced Design) and SOLID principles in React.
- Component patterns (Compound, Container-Presenter).

### 4. [fastapi-refactoring-guide.md](fastapi-refactoring-guide.md)
**Backend Refactoring Standards**
- DDD (Domain-Driven Design) and SOLID principles for FastAPI.
- Async I/O standards and testing strategies.

### 5. [git-branching-guide.md](git-branching-guide.md)
**Execution & Version Control Standards**
- Branch naming conventions (`Number.Description`).
- Commit message formats and PR procedures.

### 6. [local-docker-guide.md](local-docker-guide.md)
**Local Development Environment Guide**
- Docker service orchestration and CORS configuration.
- Troubleshooting local network and MFE loading issues.

---

## 🎯 Usage Scenarios

| Situation | Document to Reference |
| :--- | :--- |
| **New Hire Joining** | Read `01.onboarding/` first, then this folder. |
| **Code Review Debate** | Refer to `react-style-guide.md` or `fastapi-refactoring-guide.md`. |
| **Creating a Branch** | Check `git-branching-guide.md`. |
| **Requesting AI Help** | Follow `agents.md` guidelines. |
| **Starting a Feature** | Review `codebase-map.md` to understand context. |

---

## 📌 Relationship with `.github/copilot-instructions.md`

- **`.github/copilot-instructions.md`**: The primary entry point that GitHub Copilot loads automatically.
- **`guides/agents.md`**: Detailed AI collaboration playbook (this folder).

**When using Copilot Chat**: Use `@workspace` to ensure instructions are referenced.
**Manual Reference**: Deep dive into `guides/agents.md` for specific technical standards.

---

**Last Updated**: 2026-01-30
