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

## 4. Lessons Learned & Tips (mfe-catalog Case Study)

The `mfe-catalog` refactoring provided several critical insights for future work (especially for `mfe-lineage`).

### 🚀 Tip 1: Avoid "Context Limit" Hurdles
When attempting massive file moves or multi-file edits, the AI's internal context window can become a bottleneck.
- **The "Rule of 15"**: Try to limit each sub-task or atomic operation to **10-15 files**. Moving more than this at once often leads to "file lost" errors or path corruption.
- **The "800 Line Rule"**: For complex logic refactoring (extracting hooks, changing types), aim for blocks of **800-1000 lines** of code at a time. Beyond this, the risk of logic hallucination increases.
- **Recommended Chunking Strategy**: 
    1. **Layer 1: Shared & API** (~10 files, set the types first).
    2. **Layer 2: Entities** (~10-15 files, small domain components).
    3. **Layer 3: Features & Widgets** (complex logic split into 2-3 batches).
    4. **Layer 4: Pages & App** (final assembly).

### 🔄 Tip 2: Plan for Backend Data "Shape-Shifting"
A common issue during the `mfe-catalog` refactor was receiving an **array of objects** from the backend (`[{type: 'total', value: 10}]`) when the frontend expected a **flat object** (`{ total: 10 }`).
- **Lesson**: Don't just fix it in one place; check all related landing hooks (`useJobLanding`, `useTableLanding`).
- **Best Practice**: Create a shared **transformation utility** or a standard **metric mapping function** in `shared/lib` to handle these discrepancies once for the whole project.

### 🛡️ Tip 3: Anti-'any' as a Refactoring Compass
Removing `any` felt tedious initially, but it served as a powerful "compass" for the refactoring.
- **How**: By defining strict interfaces in `shared/api/api.ts` first, TypeScript automatically highlighted every single hook and component that needed updating.
- **Benefit**: This ensures that 100% of the data path is verified before you even run the build.

### 🎨 Tip 4: Component Consistency (export function)
We standardized on `export function ComponentName(props: Props)` over `const ComponentName: React.FC<Props>`.
- **Reason**: Better readability, easier Generic handling, and more consistent with modern React patterns favored in this project.
- **Advice**: When starting `mfe-lineage`, perform a global search-and-replace for `React.FC` early to establish the pattern.
