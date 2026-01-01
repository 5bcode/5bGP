# 🎨 UI Redesign Plan: "Deep Slate & Emerald Glass"

**Objective:** Create a uniform, cleaner, and premium aesthetic across the entire application by standardizing surface styles, spacing, and component hierarchy.

## 1. Design System Updates

### A. Color Palette & Surfaces

We will shift from hardcoded `bg-slate-900` to a semantic system based on CSS variables and utility classes.

- **Background (Surface 0):** `slate-950` (Keep existing deep background).
- **Card Surface (Surface 1):** `slate-900` with subtle transparency (`/60`) + `backdrop-blur-md` for a glass effect.
- **Interactive Surface (Surface 2):** `slate-800` on hover.
- **Accents:**
  - Primary: `emerald-500` (Profit/Success).
  - Danger: `rose-500` (Loss/Risk).
  - Paper Mode: `amber-500` (Simulation).

### B. Typography

- **Headers:** `font-bold tracking-tight text-slate-100`.
- **Data/Numbers:** `font-mono text-slate-300`.
- **Labels:** `text-xs font-semibold uppercase tracking-wider text-slate-500`.

### C. Global Utility Classes (to be added to `globals.css`)

- `.glass-card`: Standard style for all containers/widgets.
  - `bg-slate-900/40 backdrop-blur-sm border border-slate-800/60 shadow-xl`
- `.glass-header`: For section headers within cards.
  - `bg-slate-950/30 border-b border-slate-800/60`

## 2. Component Refactoring Roadmap

### Phase 1: Foundation (`globals.css` & `tailwind.config`)

- Update CSS variables to ensure `--card` provides contrast against `--background`.
- Create `.glass-card` and `.glass-panel` utility classes.

### Phase 2: Layout (`Layout.tsx`)

- Clean up the top navigation bar.
- Make the sidebar (mobile) and desktop nav seamless with the glass theme.
- Add a subtle gradient vignette to the main background to prevent "flatness".

### Phase 3: Dashboard Components

- **`MarketCard.tsx`**: Remove hardcoded background classes; apply `.glass-card`.
  - Standardize the mini-table rows (padding, font sizes).
- **`DiscoverRow.tsx`**: Update cards to match the new surface style.
- **`SortableMarketTable.tsx`**: Ensure it looks like a "List View" version of the cards.

### Phase 4: Item Details & History

- **`ItemHeader.tsx`**: Update the main item banner to be a prominent glass panel.
- **`History.tsx`**: Standardize the table view to match `SortableMarketTable`.

## 3. Implementation Details

**File: `src/globals.css`**

```css
@layer components {
  .glass-card {
    @apply bg-slate-900/50 backdrop-blur-md border border-slate-800/60 shadow-lg rounded-xl;
  }
  .glass-panel {
    @apply bg-slate-950/40 border border-slate-800/40 rounded-lg;
  }
  .clickable-card {
    @apply hover:bg-slate-800/60 hover:border-slate-700 transition-all duration-300 cursor-pointer;
  }
}
```

**File: `src/components/dashboard/MarketCard.tsx`**

- Replace `<Card className="bg-slate-900...">` with `<div className="glass-card flex flex-col overflow-hidden h-full clickable-card">`.

**File: `src/components/Layout.tsx`**

- Add a permanent background gradient to the root div:
  `bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950`

## 4. Verification

- Check Dashboard for uniform card heights and styles.
- Ensure "Paper Mode" (Amber theme) still works and looks good on top of the new glass styles.
- Verify contrast ratios for text on the semi-transparent backgrounds.
