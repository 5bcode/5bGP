# Program Plan: 5bGP / FlipTo5B Terminal

This document provides a comprehensive blueprint for building the **FlipTo5B** website, a high-performance OSRS trading terminal. Another AI agent should be able to reconstruct the entire application using these specifications.

## 1. Project Overview

**FlipTo5B** is a professional-grade dashboard for RuneScape "flippers" (traders). It specializes in real-time volatility monitoring to catch "panic wicks" (price dumps) before they recover.

### Key Value Propositions

- **Zero Latency**: Server-side proxy for Wiki API data.
- **Precision**: Tax calculations accurate to 1 GP.
- **Risk Mitigation**: Volatility indexing to avoid "falling knives."

---

## 2. Technology Stack

- **Framework**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Shadcn/UI](https://ui.shadcn.com/)
- **State**: React Context + Hooks
- **Data**: Direct Client-Side Fetch
- **Charts**: [TradingView Lightweight Charts](https://www.tradingview.com/lightweight-charts/)

---

## 3. Data Architecture (Client-Side)

### 3.1 `items_metadata`

Stores static item info (ID, Name, Limits) to reduce API load. Fetched from Wiki `/mapping`.

### 3.2 `trade_history` (Local)

- Persisted via LocalStorage or Supabase (optional).
- `itemId`, `buyPrice`, `sellPrice`, `quantity`, `profit`, `timestamp`.

### 3.3 `alert_configs` (Local)

- User-defined alerts for price thresholds.

---

## 4. Core Business Logic

### 4.1 The Tax Engine

**Formula**: 2% tax on total sell price, capped at 5,000,000 GP. Reference: `src/lib/osrs-math.ts`.

```typescript
export function calculateTax(sellPrice: number): number {
  if (sellPrice < 50) return 0;
  const tax = Math.floor(sellPrice * 0.02);
  return tax > 5_000_000 ? 5_000_000 : tax;
}
```

### 4.2 The Risk Engine (Volatility Index)

**Formula**: Spread divided by Low price, scaled to 0-100. Reference: `src/lib/osrs-math.ts`.

---

## 5. API Strategy

**Primary Source**: `https://prices.runescape.wiki/api/v1/osrs/`

- `/latest`: For current margins.
- `/24h`: For moving average baselines.
- `/mapping`: To populate item metadata.

**Compliance**:

- Header MUST include `X-User-Agent: FlipTo5B-Client/1.0` (Browser safe header).
- Client-side caching (React Query / SWR / Custom Hook) to respect rate limits.

---

## 6. Implementation Roadmap

### Phase 1: Infrastructure (Completed)

1. Scaffold React + Vite + Tailwind.
2. Implement `useMarketData` hook for `/latest` and `/24h`.
3. Build logic lib (`osrs-math`).

### Phase 2: The Checker (Current)

1. Dashboard UI with Margin Cards.
2. "Tax Engine" verification.
3. Watchlist logic.

### Phase 3: The Monitor (Next)

1. Background polling for "Panic Wicks".
2. Audio alerts / Toast notifications.

---

## 7. UI/UX Design tokens

- **Colors**: Slate-950 (Background), Emerald-500 (Profit), Rose-500 (Risk/Dump), Amber-400 (Alerts).
- **Aesthetics**:
  - Glassmorphism for cards (`bg-white/5 backdrop-blur-md`).
  - Monospace fonts for numbers (Inter + JetBrains Mono).
  - Pulse animations for active alerts.
- **Responsibility**: Mobile-first grid (1 column on mobile, 3-4 columns on desktop dashboard).

---

_Created for automated reconstruction by AI agents._
