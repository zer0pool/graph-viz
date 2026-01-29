---
status: shipped
owner: David
created: 2026-01-30
updated: 2026-01-30
version: 1.1
related: [react-refactoring-guide.md]
tags: [react, typescript, style-guide, fsd]
---

Created: 2026-01-30
Updated: 2026-01-30
Author: David
Version: 1.1
Status: Shipped
Title: OPS Console: React/TS Style Guide & Architecture

Summary:
Defines the Senior Architect standards for React/TypeScript development in the OPS Console project. Covers component patterns (Container-Presenter, Compound, FSD), SOLID principles in React, and standardized tooling.

## 1. Component Patterns

### 📦 Container-Presenter (Smart-Dumb)
**Goal**: Separate UI from business logic for testability and SRP.
- **Presenter**: UI only. Receives data and callbacks via props.
- **Container**: Handles state, hooks, and API logic.
- **Example Structure**:
  ```text
  Login/
  ├── LoginForm.tsx            # Presenter (UI)
  ├── LoginFormContainer.tsx   # Container (Logic)
  ├── hooks.ts                 # useLoginForm logic extraction
  ├── types.ts                 # Type definitions
  ```

### 🧬 Compound Components
**Goal**: Group logically related UI elements (Tabs, Modals, Accordions).
- Use `React.Context` to share internal state.
- **Usage**:
  ```tsx
  <Tabs>
    <Tabs.List>
      <Tabs.Tab id="1">Tab 1</Tabs.Tab>
    </Tabs.List>
    <Tabs.Panel id="1">Content 1</Tabs.Panel>
  </Tabs>
  ```

### 🧱 Feature-Sliced Design (FSD)
**Goal**: Scalable MFE structure with clear boundaries.
- `src/app/`: App initialization & routing.
- `src/pages/`: Route-level views.
- `src/features/`: Independent domain functionalities.
- `src/entities/`: Core domain models (User, Job, Table).
- `src/shared/`: Global utilities, reusable UI (atoms).
- `src/widgets/`: Composed UI blocks (Header, Sidebar).

---

## 2. Architecture Principles

### 🧠 SOLID in React
| Principle | React Implementation |
| :--- | :--- |
| **SRP** | Use Container-Presenter or Custom Hooks to separate logic from UI. |
| **OCP** | Design components (Button, Modal) to be extendable via props (e.g., `Slot`). |
| **LSP** | Use composition over inheritance. |
| **ISP** | Split large interfaces into specific prop types for hooks and components. |
| **DIP** | Abstract external APIs via Service layers (e.g., `UserService`). |

### 📌 Separation of Concerns
- **UI**: `components/*.tsx`
- **Logic**: `hooks/useFeature.ts`
- **API**: `services/api.ts`
- **Types**: `types.ts`
- **Test**: `__tests__/` or `*.test.tsx`

---

## 3. Tooling & Strategy

### 🔧 Standard Tooling
- **ESLint/Prettier**: Enforce consistent style.
- **TypeScript strict**: Non-negotiable type safety.
- **Husky/CommitLint**: Validate commits.

### 🧪 Testing Strategy
- **Logic**: `Vitest` or `Jest` for unit tests.
- **Components**: `React Testing Library` (RTL) for behavior.
- **E2E**: `Playwright` or `Cypress`.

### 📦 Libraries
- **State**: `Zustand` (Simple) / `Recoil` (Hierarchical).
- **Forms**: `React Hook Form`.
- **Data**: `React Query` (TanStack Query).
- **Styling**: `Tailwind` or `Styled-components`.

---

## 4. MFE Design Hints
- **Independence**: Every MFE must have independent deployment, state, and routing.
- **Communication**: Use **Event Bus**, URL Query, or Federated Modules. Avoid global shared state across MFE boundaries.
- **Refactoring**: Use FSD layers (`features/`, `entities/`) to move domain logic out of page components.
