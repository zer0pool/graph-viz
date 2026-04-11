# Table Landing — Design Specification

**Date**: 2026-04-11  
**Status**: Design Ready  
**Target**: Figma Implementation

---

## 1. Page Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ Header: "Tables" + "Refresh" Button                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ [ TOP LISTS SECTION ]                                            │
│ ┌──────────────────────────────┐  ┌──────────────────────────────┐
│ │ Top by Size (Indigo)         │  │ Top by Rows (Emerald)        │
│ │ - Limit selector (5/10/30)   │  │ - Limit selector (5/10/30)   │
│ │ - Ranking rows               │  │ - Ranking rows               │
│ └──────────────────────────────┘  └──────────────────────────────┘
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│ [ MAIN TABLE SECTION ]                                           │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ All Tables | Search Bar                                    │ │
│ ├──────┬──────────┬──────────┬──────────┬─────────┬──────────┤ │
│ │ Pro  │ Dataset  │ Table    │ Modified │ Size    │ Rows     │ │
│ │      │          │          │          │ (right) │ (right)  │ │
│ ├──────┼──────────┼──────────┼──────────┼─────────┼──────────┤ │
│ │ ... 10 rows per page ...                                   │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ Pagination (prev [Page 1 of N] next)                       │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Header Section

**Height**: 120px (including padding)

| Element | Details |
|---------|---------|
| Title | "Tables" (text-2xl, font-bold, tracking-tight) |
| Subtitle | "BigQuery table list sorted by last modified time" (text-muted-foreground) |
| Refresh Button | `RefreshCw` icon + "Refresh" text (variant: outline) |

---

## 3. Top Lists Section (Grid: 2 columns on lg)

### 3.1 Card Structure (Both cards identical layout)

**Card Height**: Variable (~400px typical with 5 items, 600px with 30 items)

| Component | Styling |
|-----------|---------|
| Card Header | padding: 1rem, background: slate-50/50, border-bottom |
| Title | Flex (icon + text), gap-2 |
| LimitSelector | Pill buttons (5, 10, 30) in top-right corner |
| Content | padding: 0, space-y-4 |
| Rows | Each row 40px height |

### 3.2 Left Card: Top by Size (Indigo)

**Icon**: `HardDrive` (h-4 w-4, text-indigo-600)  
**Background**: bg-indigo-50  
**Title**: "Top {limit} Tables by Size"  
**Subtitle**: "Ranked by yesterday · % change vs 7d avg"

**Row Layout**:
```
#1  table_name  [dataset_badge]  ▁▁▂▃▄▅▆█▇  ↑+3.6%  720K
```

| Part | Width | Details |
|------|-------|---------|
| Rank | w-6 | text-right, text-slate-400, font-medium |
| Table | flex-1 | font-mono, font-semibold, truncate with tooltip |
| Dataset | max-w-[80px] | text-[10px], slate-100 bg pill, truncate |
| Sparkline | w-14 h-5 | SVG 7-bar chart (indigo-500) |
| Trend | w-16 | TrendBadge component (↑/↓/flat) |
| Value | w-24 | text-right, font-mono, font-bold, whitespace-nowrap |

**Sparkline SVG Spec**:
- 7 bars (one per day, oldest → newest)
- Last bar: full color (indigo-500)
- Previous 6: indigo-500 + "66" opacity (40%)
- Missing values: ghost bar at "20" opacity
- Height: 20px, responsive width (fill 100% of w-14)

**Value Formatting**:
- >= 1 TB: "X.X TB"
- >= 1 GB: "X.X GB"
- >= 1 MB: "X.X MB"
- < 1 MB: "X.X KB"

### 3.3 Right Card: Top by Rows Written (Emerald)

**Icon**: `BarChart2` (h-4 w-4, text-emerald-600)  
**Background**: bg-emerald-50  
**Title**: "Top {limit} Tables by Rows Written"  
**Subtitle**: "Ranked by yesterday · % change vs 7d avg"

**Row Layout**: Identical to Left Card

**Sparkline Color**: emerald-500

**Value Formatting**:
- >= 1B: "X.X B"
- >= 1M: "X.X M"
- >= 1K: "X.X K"
- < 1K: "X"

---

## 4. Main Table Section

### 4.1 Card Header

| Element | Details |
|---------|---------|
| Left | Icon (`Database`) + Title "All Tables" |
| Right | Search input with `Search` icon |
| Count | "{totalCount} tables total" in subtitle |

**Search Input**:
- Placeholder: "Search by table name..."
- Width: w-64
- Icon: Left-aligned, fade color on focus
- Rounded: md, border: slate-200
- Focus: ring-primary/20

### 4.2 Table Structure (7 Columns)

| # | Header | Alignment | Width | Details |
|---|--------|-----------|-------|---------|
| 1 | Project | left | auto | text-xs, slate-600 |
| 2 | Dataset | left | auto | text-xs, slate-600 |
| 3 | Table | left | auto | **monospace**, font-semibold, truncate |
| 4 | Last Modified | left | auto | text-xs, slate-500, format: YYYY-MM-DD HH:MM |
| 5 | Size | right | auto | text-xs, font-medium, formatted (TB/GB/MB/KB or —) |
| 6 | Rows Written | right | auto | text-xs, font-medium, comma-separated (or —) |
| 7 | Write Mode | left | auto | Badge component |

**Row Height**: 56px (py-4)

**Hover State**: bg-slate-50/80, transition-colors

### 4.3 Write Mode Badge (3 variants)

| Mode | Colors |
|------|--------|
| **append** | border-blue-200, bg-blue-50, text-blue-700 |
| **fulldump** | border-purple-200, bg-purple-50, text-purple-700 |
| **upsert** | border-teal-200, bg-teal-50, text-teal-700 |
| **null** | text-slate-300, renders as — |

**Badge Styling**:
- variant: outline
- font-normal, text-xs
- Padding: px-2.5, py-1

### 4.4 Loading State

**Skeleton Rows**: 10 rows shown while loading

Each cell: `h-4 rounded bg-slate-100 animate-pulse`

**Empty State**:
```
No tables found
(center, italic, text-slate-400, h-32)
```

### 4.5 Pagination

**Position**: Border-top, bg-slate-50/40, px-5 py-3

**Layout**:
```
[Range: 1–10 of 450 tables]  [‹] [Page 1 of 45] [›]
(left)                        (right)
```

**Button Style**:
- h-7 w-7, rounded, border-slate-200, bg-white
- Hover: border-slate-300, bg-slate-50
- Disabled: cursor-not-allowed, opacity-40

---

## 5. Typography & Colors

### 5.1 Font Sizes

| Size | Usage |
|------|-------|
| text-2xl | Main page title "Tables" |
| text-lg | Card titles "Top by Size", "All Tables" |
| text-sm | Subtitles, descriptions |
| text-xs | Table cells, badges, secondary text |
| font-mono | Table names, values, code-like content |

### 5.2 Font Weights

| Weight | Usage |
|--------|-------|
| font-bold | Page title, card titles |
| font-semibold | Column headers, table names |
| font-medium | Secondary headers, values |
| font-normal | Body text, badges |

### 5.3 Color Palette

| Color | RGB | Usage |
|-------|-----|-------|
| **Indigo-500** | #6366f1 | Top by Size sparkline |
| **Emerald-500** | #10b981 | Top by Rows sparkline |
| **Blue-200/50/700** | — | Append badge |
| **Purple-200/50/700** | — | Fulldump badge |
| **Teal-200/50/700** | — | Upsert badge |
| **Slate-600** | — | Column headers |
| **Slate-400** | — | Secondary text, disabled |
| **Slate-50** | — | Card/row backgrounds |

### 5.4 Spacing

| Unit | Value | Usage |
|------|-------|-------|
| **p-6** | 1.5rem | Page padding |
| **gap-6** | 1.5rem | Section spacing |
| **space-y-4** | 1rem | Ranking row spacing |
| **px-5 py-3** | — | Pagination padding |

---

## 6. Interactions & States

### 6.1 Hover States

| Element | Effect |
|---------|--------|
| Table Row | bg-slate-50/80, transition-colors |
| Pagination Button | border-slate-300, bg-slate-50 |
| Search Input | ring-primary/20 on focus |

### 6.2 Loading State

- Skeleton cards shown while `loading=true`
- Spinner or pulse animation on refresh button

### 6.3 Error State

- Error banner at top of table: bg-red-50, border-red-100, text-red-600
- Message: error text from API

---

## 7. Responsive Breakpoints

| Breakpoint | Change |
|-----------|--------|
| **lg** | Top Lists grid: 1 column → 2 columns (grid-cols-2) |
| **sm** | Adjust padding, reduce font sizes |

---

## 8. Animation

| Element | Animation |
|---------|-----------|
| Page Enter | animate-fade-in-up (stagger: delay-100, delay-200) |
| Sparkline Bars | Static SVG (no animation) |
| Loading Skeleton | animate-pulse |
| Refresh Button | RefreshCw icon rotates on click (library handles) |

---

## 9. Accessibility

- **Semantic HTML**: `<table>`, `<th>`, `<td>`
- **ARIA Labels**: `role="table"`, `role="button"` on pagination
- **Focus Management**: Tab order through search, pagination buttons
- **Alt Text**: For icons (via lucide-react library)
- **Color Contrast**: All text meets WCAG AA (4.5:1 min)

---

## 10. Figma Component Structure

```
Table Landing Design
├── 📄 Page: Main
│   ├── 🎨 Component: Header
│   ├── 🎨 Component: TopLists (2-column grid)
│   │   ├── Card: Top by Size
│   │   └── Card: Top by Rows
│   └── 🎨 Component: MainTable
│       ├── TableHeader
│       ├── TableRow
│       ├── TableCell
│       ├── WriteModeCell
│       └── Pagination
│
├── 🎨 Shared Components
│   ├── Badge (3 variants: append, fulldump, upsert)
│   ├── Sparkline (SVG 7-bar chart)
│   ├── TrendBadge (↑ red, ↓ green, flat gray)
│   ├── LimitSelector (5/10/30 toggle)
│   └── Skeleton (pulse animation)
│
├── 🎨 Styles
│   ├── Color: Indigo-500, Emerald-500, Blue-200/50/700, etc.
│   ├── Typography: Font family, sizes, weights
│   └── Spacing: Grid, padding, gaps
│
└── 📋 Specifications
    ├── 📐 Layout: Grid, breakpoints
    ├── 🖼️ Assets: Icons (lucide-react)
    └── 📝 Notes: Implementation details
```

---

## 11. Implementation Notes

- **Component Library**: Shadcn/ui (Button, Badge, Card, Input, Table)
- **Icons**: lucide-react (RefreshCw, Database, Search, HardDrive, BarChart2, TrendingUp, TrendingDown, Minus)
- **State Management**: React hooks (useState, useCallback)
- **Styling**: Tailwind CSS (utility-first, responsive classes)
- **Data Visualization**: Custom SVG for Sparkline (no external charting library)
- **Formatting**: Custom functions (formatBytes, formatRows, formatDateTime)

---

## 12. Design Tokens

Use these tokens to maintain design consistency across the application:

```css
:root {
  --color-primary-indigo-500: #6366f1;
  --color-primary-emerald-500: #10b981;
  --color-status-append-border: #bfdbfe;
  --color-status-append-bg: #eff6ff;
  --color-status-append-text: #1e40af;
  --color-status-fulldump-border: #e9d5ff;
  --color-status-fulldump-bg: #faf5ff;
  --color-status-fulldump-text: #7c3aed;
  --color-status-upsert-border: #99f6e4;
  --color-status-upsert-bg: #f0fdfa;
  --color-status-upsert-text: #0d9488;
  --spacing-page: 1.5rem;
  --spacing-section: 1.5rem;
  --spacing-row: 1rem;
  --font-mono: 'Fira Code', 'Courier New', monospace;
  --font-sans: 'Inter', system-ui, sans-serif;
}
```

