---
status: shipped
owner: David
created: 2026-01-30
updated: 2026-01-30
version: 1.1
related: [react-style-guide.md]
tags: [react, typescript, refactoring, fsd]
---

Created: 2026-01-30
Updated: 2026-01-30
Author: David
Version: 1.1
Status: Shipped
Title: OPS Console: React + TypeScript Refactoring Guide

Summary:
Defines the standard procedure and patterns for refactoring the OPS Console frontend. Focuses on SRP, separation of concerns, logic extraction via Hooks, and reorganization into Feature-Sliced Design (FSD) structures.

---

This document defines the **standard refactoring procedures** and **patterns** to improve the maintainability and scalability of the project. All changes must respect SOLID principles, separation of concerns, and testability.

## 1. Refactoring Methodology

### Step 1: Logic Extraction (Custom Hooks)
- Move state management and business logic out of the component.
- **Goal**: Make the component a "Pure UI" or "Presenter".

### Step 2: Component Separation (Container-Presenter)
- **Container**: Handles data fetching, state, and orchestration.
- **Presenter**: Pure UI component receiving data via props.

### Step 3: Architecture Alignment (FSD)
- Move the refactored components into the correct **Feature-Sliced Design** layer:
  - `entities/`: Domain models and basic data logic.
  - `features/`: Indivisible domain functionality (Search, Filter).
  - `widgets/`: Composition of features and entities (Header, Sidebar).
  - `shared/`: Generic UI components and utilities.

## 2. Code Examples (Before & After)

### ❌ Before: Messy Component (Logic + UI Mixed)
```tsx
// Login.tsx
const Login = () => {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  
  const handleLogin = async () => {
    // API Call logic...
    const res = await fetch('/api/login', { ... });
  };

  return (
    <form onSubmit={handleLogin}>
      <input value={email} onChange={e => setEmail(e.target.value)} />
      {/* ... more UI */}
    </form>
  );
};
```

### ✅ After: Refactored (Separated Concerns)
```tsx
// 1. Logic (Hook)
export const useLoginForm = () => {
  const [email, setEmail] = useState('');
  const login = async () => { ... };
  return { email, setEmail, login };
};

// 2. UI (Presenter)
export const LoginForm = ({ email, setEmail, onLogin }: Props) => (
  <form onSubmit={onLogin}>
    <input value={email} onChange={e => setEmail(e.target.value)} />
  </form>
);

// 3. Orchestrator (Container)
export const LoginContainer = () => {
  const logic = useLoginForm();
  return <LoginForm {...logic} onLogin={logic.login} />;
};
```

## 3. Refactoring Checklist
- [ ] Is business logic (API calls, data transformation) removed from JSX?
- [ ] Are hooks used to manage complex state?
- [ ] Is the component folder following the FSD structure?
- [ ] Are types defined in a separate `types.ts` or within the component folder?
- [ ] Is there at least one unit test for the extracted logic (`hooks.test.ts`)?
