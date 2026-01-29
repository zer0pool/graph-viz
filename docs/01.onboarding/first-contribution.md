---
status: shipped
owner: David
created: 2026-01-30
updated: 2026-01-30
version: 1.0
related: [../00.guides/git-branching-guide.md, ../00.guides/agents.md]
tags: [onboarding, contribution, workflow]
---

Created: 2026-01-30
Updated: 2026-01-30
Author: David
Version: 1.0
Status: Shipped
Title: First Contribution Guide

Summary:
Explains the workflow for submitting your first code change to the project.

---

## 🌟 Welcome Contributor!

We follow a strict quality gate to ensure codebase consistency. Follow these steps for your first PR.

### 1. Identify a Task
Check the GitHub Issues or ask David (Senior Architect) for a "Good First Issue".

### 2. Follow the Branching Strategy
Refer to the **[Git Branching Guide](../00.guides/git-branching-guide.md)**.
- Check the latest remote branch number.
- Name your branch `[NextNumber].short-description`.

### 3. Development & Standards
- **Backend**: Follow the **[FastAPI Refactoring Guide](../00.guides/fastapi-refactoring-guide.md)**.
- **Frontend**: Follow the **[React Style Guide](../00.guides/react-style-guide.md)**.
- **AI Agents**: Read **[AI Agent Guide](../00.guides/agents.md)** before writing code.

### 4. Create a Pull Request
1. Commit your changes with meaningful messages: `feat: add x validation`.
2. Push your branch: `git push origin 80.your-task`.
3. Open a Pull Request on GitHub.

### 5. Code Review
- Ensure CI checks pass.
- Address comments from reviewers.
- David (Senior Architect) must approve before merging.

---

## 💡 Pro Tips
- Keep your first PR small (< 200 lines).
- Include a screenshot for UI changes.
- Add unit tests for new logic.
