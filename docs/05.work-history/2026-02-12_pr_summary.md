# PR Description: UI & Navigation Refinements

This PR implements a series of UI enhancements and navigation improvements across the Lineage, Catalog, and Shell modules to improve UX and visual consistency.

## Key Changes

### 1. Lineage Graph & Context Menu
- **Context Menu Interaction**: Fixed the "flying" animation effect by disabling transitions; menus now appear instantly at the cursor position.
- **Node Styling**: 
    - Swapped color themes to match preference: **Tables (Green)** and **Jobs (Blue)**.
    - Increased vertical padding in HTML nodes for better legibility.
    - Ensured perfect flexbox centering for all node labels.

### 2. Full Lineage List View
- **Visual Structure**: Added subtle background tints to designate Identity, Table, and Job sections.
- **Selection Logic**: Removed the red root row highlight; replaced with a clean blue selection border.
- **Visibility**: Increased `PROGRESSIVE_LOADING_LIMIT` to **10** to show more nodes by default.

### 3. Users Landing Page
- **Metrics Layout**: Reorganized the `SummaryGrid` to display 4 metrics in a single horizontal row on medium and larger screens.

### 4. Job Detail & Execution History
- **Navigation Deep-Linking**: Added clickable links to table names in the "Run Dependency" section, allowing direct navigation to Table Detail pages.
- **Run History Polish**:
    - Standardized date formats to `yyyy-mm-dd hh:mm:ss` for both Start and End times.
    - Added a dedicated **End Time** column for improved execution visibility.
    - Cleaned up **Run ID** display by stripping redundant `scheduled_` prefixes while maintaining full ID integrity.

### 5. Architectural Quality
- **Code Cleanup**: Removed all debug `console.log` statements identified during the review.
- **Type Safety**: Refined TypeScript interfaces in `LineageTable` and `useMermaidRenderer` to reduce reliance on `any`.

## Verification Results
- Manual verification of routing between Shell and Catalog MFEs.
- Visual inspection of graph layouts across different screen sizes.
- Verified date formatting and ID parsing logic in the Run History table.
