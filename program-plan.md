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

- **Framework**: [Nuxt 4](https://nuxt.com/) (Vue 3, Nitro Engine).
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Dark Mode first).
- **State**: [Pinia](https://pinia.vuejs.org/) for real-time price synchronization.
- **Database**: [SQLite](https://sqlite.org/) via [Drizzle ORM](https://orm.drizzle.team/).
- **Charts**: [TradingView Lightweight Charts](https://www.tradingview.com/lightweight-charts/) (or Chart.js for summary stats).
- **Real-time**: [Server-Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) for live alert broadcasting.

---

## 3. Data Architecture (SQLite / Drizzle)

### 3.1 `items_metadata`

Stores static item info to reduce API load.

- `id` (integer, pk): Wiki Item ID.
- `name` (text): Item name.
- `members` (boolean): P2P status.
- `limit` (integer): GE buy limit.

### 3.2 `trade_history`

- `id` (text, pk): UUID.
- `itemId` (integer, fk): References `items_metadata.id`.
- `buyPrice` (integer): Format as BigInt internally.
- `sellPrice` (integer).
- `quantity` (integer).
- `taxPaid` (integer).
- `timestamp` (integer): Unix timestamp.

### 3.3 `alert_configs`

- `itemId` (integer, pk).
- `thresholdPercent` (real): Default 5.0.
- `isActive` (boolean).

---

## 4. Core Business Logic

### 4.1 The Tax Engine

**Formula**: 2% tax on total sell price, capped at 5,000,000 GP.

```typescript
export function calculateTax(sellPrice: bigint): bigint {
  if (sellPrice < 50n) return 0n;
  const tax = (sellPrice * 2n) / 100n;
  return tax > 5_000_000n ? 5_000_000n : tax;
}
```

### 4.2 The Risk Engine (Volatility Index)

**Formula**: Spread divided by Low price, scaled to 0-100.

```typescript
export function calculateVolatility(high: bigint, low: bigint): number {
  if (low <= 0n) return 0;
  const spreadRatio = Number(high - low) / Number(low);
  return Math.min(100, spreadRatio * 1000); // 1% spread = 10, 10% = 100
}
```

### 4.3 The Price Monitor ("The Sword")

A Nitro process (`server/plugins/alert-monitor.ts`) that runs every 60 seconds:

1. Fetches `/api/prices`.
2. Compares `latest.low` against `avg24h.avgLowPrice`.
3. If `dropPercent >= threshold`, broadcasts via `eventHub` (SSE).

---

## 5. API Strategy

**Primary Source**: `https://prices.runescape.wiki/api/v1/osrs/`

- `/latest`: For current margins.
- `/24h`: For moving average baselines.
- `/mapping`: To populate `items_metadata`.

**Compliance**:

- Header MUST include `User-Agent: FlipTo5B-Client/1.0`.
- All requests must go through a server proxy (`/server/api/prices`) with a 60s cache.

---

## 6. Implementation Roadmap

### Phase 1: Infrastructure

1. Scaffold Nuxt 4 + Drizzle.
2. Build the Nitro Proxy with caching for `/latest`.
3. Seed `items_metadata` from the Wiki mapping endpoint.

### Phase 2: The Checker (MVP)

1. Implement the Tax Engine Utility.
2. Build a high-performance search component (fuzzy search on item names).
3. Create the Margin Detail card (Buy, Sell, Tax, Net, ROI).

### Phase 3: The Monitor (Advanced)

1. Implement the SSE event hub.
2. Create the background Nitro plugin for price monitoring.
3. Build the "Live Feed" component on the homepage with toast notifications.

---

## 7. UI/UX Design tokens

- **Colors**: Slate-950 (Background), Emerald-500 (Profit), Rose-500 (Risk/Dump), Amber-400 (Alerts).
- **Aesthetics**:
  - Glassmorphism for cards (`bg-white/5 backdrop-blur-md`).
  - Monospace fonts for numbers (Inter + JetBrains Mono).
  - Pulse animations for active alerts.
- **Responsibility**: Mobile-first grid (1 column on mobile, 3-4 columns on desktop dashboard).

---
*Created for automated reconstruction by AI agents.*
