# Admin Console: Agent Development Standards

This document serves as the **Persistent Instruction Set** for AI agents (Antigravity). I must read and follow these rules for every task in this project without being asked repeatedly.

## 1. Documentation Standards

All documents created by the agent must strictly follow this folder structure and naming convention:

- **Guides & Conventions**: `docs/00.guides/`
  - Use descriptive names (e.g., `development-standards.md`, `mfe-contract.md`).
- **Specifications (Design Docs)**: `docs/03.specs-and-reports/specs/`
  - Naming: `YYYY-MM-DD_short-description.md`
- **Progress & Completion Reports**: `docs/03.specs-and-reports/reports/`
  - Naming: `YYYY-MM-DD_short-description.md`

## 2. Debugging & Observability Standards

Since the application is often deployed in isolated (In-Net) environments where remote agents cannot access live sessions:

- **Detailed Logging**: Always include `console.log/info/debug` for critical application flows (Auth, MFE Mounting, API Requests, Selection Events).
- **Prefixing**: Every log must have a consistent prefix for filtering:
  - `[Shell]` - For host container logic.
  - `[Auth]` - For OIDC/SSO/Session logic.
  - `[Lineage MFE]` - For graph related logic.
  - `[Detail MFE]` - For table/job detail viewer.
- **Audit Trails**: Logs should include enough state information (e.g., URNs, Payload keys) to allow for manual debugging from a user's text report.

## 3. Micro-Frontend (MFE) Implementation Rules

- **Async Boundary**: Always use a `main.tsx` bootstrapper to satisfy Webpack shared dependency requirements.
- **Entry Point**: `index.ts` must export the `mount` function synchronously.
- **PublicPath**: Use an absolute URL (e.g., `http://localhost:3002/`) in development to prevent 404 chunk loading errors.
- **Selection Payload**: Follow the `Selection` interface defined in `docs/00.guides/mfe-contract.md`. Always provide fallbacks for `tableName` and `jobId` using the `id` field.

## 4. Communication Style

- Be proactive in suggesting documentation.
- When an objective is complete, always summarize the changes in a `report` file under `docs/03.specs-and-reports/reports/`.
- If a task involves complex integration, create a `spec` file first.

---

_By maintaining this file, the USER ensures the AGENT maintains high consistency across sessions._
