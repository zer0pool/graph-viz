---
description: Check if code complies with project style guides and architecture
---

This workflow ensures that all changes adhere to the OPS Console coding standards defined in `docs/00.guides/react-style-guide.md` and `docs/00.guides/agents.md`.

### 1. Identify Modified Files
List all files that have been modified or added in the current task.

### 2. Architecture & Design Review
For each modified React component, verify:
- **FSD Compliance**: Is the file in the correct layer (`entities`, `features`, `shared`, etc.)?
- **SRP & Patterns**: Does it follow the **Container-Presenter** pattern or extract logic into **Custom Hooks**?
- **Compound Components**: Are logically related elements grouped correctly?

### 3. Technical Standards
- **TypeScript**: No `any` types. Use strict interfaces and proper generic types.
- **Styling**: Use existing Tailwind tokens and CSS classes. Maintain consistent color schemes (#1A73E8 for tables, #FB8C00 for jobs).
- **Proptypes**: Every component must have clear, explicit interfaces.

### 4. Automated Validation
// turbo
```bash
make lint
```

### 5. Final Checklist
- [ ] No hardcoded configuration that belongs in `.env`.
- [ ] No console logs or placeholder comments left behind.
- [ ] Exported components are named consistently with their file names.
