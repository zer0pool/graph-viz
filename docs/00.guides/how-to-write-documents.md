/docs/guides/how-to-write-documents.md
# Document Writing Guidelines
This guide defines the standard format and rules for creating and maintaining documentation in the Lineage Manager project.  
All contributors must follow this structure to ensure clarity, consistency, and long-term maintainability.

---

## 1. Document Header (Required)

Every document MUST begin with the following metadata block:

```
---
status: draft | review | shipped
owner: <team-or-person>
created: YYYY-MM-DD
updated: YYYY-MM-DD
version: 1.0
related: [optional-id-list]
tags: [optional-kebab-case-tags]
---

Created: 2025-12-08
Updated: 2025-12-08
Author: <Author Name or Team>
Version: 1.0
Status: Draft | Review | Final
Title: <Document Title>

Summary:
<A short 2–3 sentence description of the document’s purpose>
```

### Header Field Definitions
- **status / owner / created / updated / version / related / tags**: YAML metadata used by automation, search, and AI agents.  
- **Created**: The date the document was first written.  
- **Updated**: The date of last modification.  
- **Author**: The person or team responsible for writing or maintaining the document.  
- **Version**: A manual version number (e.g., 0.1, 1.0, 1.1).  
- **Status** (human-readable):  
  - *Draft*: Early-stage note or proposal  
  - *Review*: Being checked by other team members  
  - *Final/Shipped*: Approved and adopted  
- **Title**: Clear, human-readable title  
- **Summary**: 2–3 concise sentences explaining why the document exists and what it covers.

---

## 2. Document Body Structure

After the header, all documents should follow the recommended structure below unless the document type requires otherwise.

### 2.1 Purpose
Explain why this document exists and what problem it solves.

### 2.2 Background (Optional)
Provide any context necessary to understand the remainder of the document.

### 2.3 Requirements or Definition
Describe what must be achieved, defined, or clarified.

### 2.4 Main Content
This is the core section.  
Depending on the document type, it may include:

- Technical explanations  
- Architectural decisions  
- API definitions  
- UI flows  
- Specifications  
- Design decisions  
- Tables, diagrams, or examples  

### 2.5 Examples (Optional)
Provide example payloads, flows, diagrams, or screenshots when helpful.

### 2.6 Conclusion / Next Steps
Summarize key points and record any follow-up items.

### 2.7 Change Log (Required)
A chronological list of updates:



[2025-12-08] v1.0 Initial creation
[YYYY-MM-DD] vX.X Description of the change


---

## 3. General Writing Rules

### 3.1 Language
- All documentation must be written in **English**.  
- Tone must be **clear, concise, and technical**.  
- Avoid ambiguous language and unnecessary adjectives.

### 3.2 Formatting
- Use Markdown headers (`#`, `##`, `###`) consistently.  
- Use bullet points for lists.  
- Use fenced code blocks (` ``` `) for examples.  
- Keep lines short and readable.

### 3.3 Naming and File Organization

#### File Naming Convention
All document filenames must follow this format:
```
YYYY-MM-DD_<document-title-kebab-case>.md
```

**Examples:**
- `2025-12-07_table-lineage-spec.md` ✅
- `2025-11-10_db-pooling-fix.md` ✅
- `2025-12-03_frontend-refactor.md` ✅

**Rules:**
- Start with ISO date format (`YYYY-MM-DD`)
- Separate date and title with underscore (`_`)
- Use lowercase letters only
- Use hyphens (`-`) for multi-word titles (kebab-case)
- No spaces or special characters (except hyphen)
- `.md` extension required

**Anti-patterns (Do NOT use):**
- ❌ `00_table_impact.md` (number prefix without date)
- ❌ `BUG_FIXES_SUMMARY.md` (no date, mixed case)
- ❌ `2025-12-07 document title.md` (spaces, no kebab-case)
- ❌ `Document_2025_12_07.md` (date at end)

#### Document Organization
Documents must reside in the appropriate directory under `/docs`:
- `/docs/00.guides/` – Development standards, coding rules
- `/docs/01.onboarding/` – New team member guides
- `/docs/02.architecture/` – System design, API specs
- `/docs/03.specs-and-reports/specs/` – Feature specifications (before implementation)
- `/docs/03.specs-and-reports/reports/` – Completion reports (after implementation)
- `/docs/04.development-notes/` – Feature notes, experiments, troubleshooting
- `/docs/05.playbook-and-refs/playbooks/` – Deployment, incident response manuals
- `/docs/05.playbook-and-refs/references/` – External docs, glossary, research notes

### 3.4 Versioning Discipline
- Increment `Version` whenever meaningful changes occur.  
- Always update the `Updated` date.  
- If a document is still in progress, mark its status as `Draft`.

---

## 4. File Naming by Document Type

Different document types may have slightly different naming conventions:

### 4.1 Specification Documents (specs/)
**Format:** `YYYY-MM-DD_<feature-name>.md`

**Examples:**
- `2025-12-07_job-detail-panel.md`
- `2025-11-15_search-autocomplete-api.md`

**Purpose:** Files in this folder are written BEFORE implementation to define requirements and design.

### 4.2 Completion Reports (reports/)
**Format:** `YYYY-MM-DD_<feature-or-fix-name>.md`

**Examples:**
- `2025-12-07_frontend-arch.md`
- `2025-12-07_bug-fixes.md`
- `2025-12-07_refactor-final.md`

**Purpose:** Files in this folder are written AFTER implementation to document results and learnings.

### 4.3 Development Notes (development-notes/)
**Format:** `YYYY-MM-DD_<topic>.md` or `YYYY-MM-DD_<feature-name>-notes.md`

**Examples:**
- `2025-12-07_redis-performance-test.md`
- `2025-12-03_frontend-refactor.md`
- `2025-11-10_db-pooling.md`

**Purpose:** Files in this folder track ongoing work, experiments, and troubleshooting.

### 4.4 Playbooks & References
**Format:** `<descriptive-title>.md` (no date prefix in playbooks; date optional for research notes)

**Examples:**
- `deployment.md`
- `incident-response.md`
- `glossary.md`
- `2025-12-06_redis-caching-strategy.md` (research note)

**Purpose:** Reference documents that are updated over time rather than dated artifacts.

---

## 5. Examples

### 5.1 Good File Naming Example

**Specification Document:**
```
Filename: 2025-12-07_job-detail-panel.md
Header:
  Created: 2025-12-07
  Updated: 2025-12-10
  Author: Frontend Team
  Version: 1.0
  Status: Final
  Title: Job Detail Panel Specification
  Summary: Defines the UI components, data model, and API integration for the job detail side panel.
```

**Completion Report:**
```
Filename: 2025-12-07_frontend-arch.md
Header:
  Created: 2025-12-07
  Updated: 2025-12-08
  Author: Frontend Team
  Version: 1.0
  Status: Final
  Title: Frontend Architecture Refactoring - Completion Report
  Summary: Documents the completed modular refactoring of the frontend codebase, performance improvements, and lessons learned.
```

**Development Note:**
```
Filename: 2025-12-07_redis-performance.md
Header:
  Created: 2025-12-07
  Updated: 2025-12-07
  Author: Data Platform Team
  Version: 0.1
  Status: Draft
  Title: Redis Caching Performance Experiment
  Summary: Experiment log for testing Redis cache hit rates with different TTL strategies.
```

### 5.2 Bad File Naming Examples (Do NOT use)

❌ `00_table_impact.md` – Number prefix without date
❌ `BUG_FIXES_SUMMARY.md` – No date, mixed case
❌ `Document 2025-12-07.md` – Space instead of underscore, date at end
❌ `frontend_architecture_refactored.md` – No date, underscores instead of hyphens

---



---

## 7. Document Review Expectations

Before marking a document as *Final*:
1. Ensure all header fields are completed  
2. Validate clarity and internal consistency  
3. Confirm alignment with architecture and coding standards  
4. Add examples where appropriate  
5. Update the Change Log  

---

## 8. Exceptions
Some lightweight documents (e.g., short checklists or internal notes) may omit Background or Examples, but **the header is always mandatory**.

---

## 9. Appendix: Template for Quick Copy



Created: YYYY-MM-DD
Updated: YYYY-MM-DD
Author: <Name or Team>
Version: X.X
Status: Draft | Review | Final
Title: <Document Title>

Summary:
<2–3 sentences summarizing the purpose of this document>

1. Purpose
2. Background
3. Requirements / Definitions
4. Main Content
5. Examples (Optional)
6. Conclusion / Next Steps
7. Change Log

[YYYY-MM-DD] vX.X Description of change


---

End of document.
