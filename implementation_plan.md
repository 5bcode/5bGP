# Flip to 5B - Master Development Plan

## Overview
A high-performance, dark-mode web application for identifying profitable flips in Old School RuneScape. This plan is designed to be a complete blueprint for an AI agent to build the application from scratch using the OSRS Wiki Real-time Prices API **with a Google Cloud backend for optimal performance**.

---

## Architecture & Tech Stack

### Frontend
| Layer | Technology |
|-------|------------|
| **Framework** | HTML5 / CSS3 / Vanilla JS (ES6+) |
| **Styling** | CSS Variables ("Rune-Dark" theme), Flexbox/Grid, Glassmorphism-lite |
| **Charting** | Chart.js (CDN) |
| **Local Storage** | Watchlist, GE Limit Timers, User Preferences |

### Backend (Google Cloud Platform)
| Service | Purpose |
|---------|---------|
| **Cloud Run** | Serverless API proxy for Wiki data. Handles caching logic, rate limiting, and data aggregation. |
| **Firestore** | Persistent cache for item mapping data (refreshed daily). Stores historical price snapshots for custom analytics. |
| **Cloud Scheduler** | Cron job to refresh `/latest` prices every 60 seconds and store in Firestore. Frontend reads from Firestore, not Wiki API directly. |
| **Cloud Storage** | (Optional) Host static frontend files for global CDN delivery. |

**Why GCP Backend?**
1.  **Speed**: Frontend reads from Firestore (low latency) instead of hitting the Wiki API on every user load.
2.  **Rate Limit Protection**: Cloud Run acts as a single aggregator, ensuring the Wiki API's rate limits aren't hit by many users.
3.  **Custom Analytics**: Store every price tick in Firestore for custom long-term trend analysis beyond the 365-point limit of the Wiki API.
4.  **Scalability**: Cloud Run scales to zero when idle, minimizing cost.

---

## Core Features (MVP)

1.  **Real-Time Dashboard**:
    *   Auto-refreshing table (reads from Firestore, updated by Cloud Scheduler).
    *   Columns: Item Icon, Name, Buy Price, Sell Price, **Margin (Post-Tax)**, ROI %, 4h Volume, GE Limit.
    *   Visual indicators (glow, color) for high-opportunity items.

2.  **Advanced Search & Filtering**:
    *   Fuzzy search for item names.
    *   Range sliders: Price (Min/Max), Min Volume, Min Margin %.
    *   Category filters (Weapons, Armor, Potions, etc.).

3.  **Detailed Item View (Modal)**:
    *   Interactive price graph (24h, 7d, 30d, custom).
    *   High Alch value analysis (with live Nature Rune price).
    *   Direct link to OSRS Wiki page.

---

## Complex Features & Logic (The "Alpha" Layer)

### 1. Accurate Tax & Profit Calculation (UPDATED May 2025)

> [!IMPORTANT]
> The GE tax was increased to **2%** on May 29, 2025. It is still capped at 5,000,000 GP.

**Tax Logic (JavaScript)**:
```javascript
function calculateTax(sellPrice) {
  if (sellPrice < 50) return 0; // Items < 50gp are effectively tax-free (rounds to 0)
  return Math.min(Math.floor(sellPrice * 0.02), 5_000_000);
}

function getNetProfit(buyPrice, sellPrice) {
  const tax = calculateTax(sellPrice);
  return sellPrice - buyPrice - tax;
}
```
*   The 2% tax rounds **down** to the nearest whole number.
*   Items sold below 50gp have no tax obligation.

---

### 2. "Opportunity Score" Algorithm
A composite score to find the *best* flips, balancing margin with activity.

**Formula**:
```
Score = (NormalizedProfit * 0.5) + (NormalizedVolume * 0.3) + (ROI * 0.2)
```
**Logic**:
*   Normalize Profit and Volume to a 0-100 scale based on percentile rank.
*   This prevents 1-volume items with fake 10m margins from appearing at the top.

---

### 3. GE Limit Tracking System
A client-side tool for users to track their personal buy limit progress.

| Feature | Description |
|---------|-------------|
| **"I Bought This" Button** | On each item row, logs quantity to `localStorage`. |
| **Limit Progress Bar** | e.g., "7,000 / 10,000 Bought" |
| **Reset Timer Countdown** | 4-hour countdown from first purchase in the set. |
| **Notifications** | (Optional) Browser notification when limit resets. |

**Data Model (`localStorage`)**:
```json
{
  "limitTracker": {
    "4151": { "bought": 7000, "firstPurchaseTs": 1702641600000 }
  }
}
```

---

### 4. Technical Analysis (TA) Indicators
Overlay simple indicators on price charts.

*   **SMA (Simple Moving Average)**: Calculated on 5m data buckets. Display 12-period and 24-period lines.
*   **Volume Spike Alerts**: Flag items where current 5m volume > 300% of its 1h average. Indicates potential pump/dump or merching activity.

---

### 5. High-Alch Sniping Mode
A dedicated view for finding items profitable to alch.

**Logic**:
```javascript
const NATURE_RUNE_ID = 561;
const naturePrice = latestPrices[NATURE_RUNE_ID].high; // Fetch dynamically

function getAlchProfit(item) {
  const alchValue = item.highalch;
  const geBuyPrice = latestPrices[item.id].high;
  return alchValue - geBuyPrice - naturePrice;
}
```
*   Display items where `alchProfit > 0`.
*   Sort by profit, factor in buy limit for GP/hr.

---

### 6. Dump/Pump Detection System
Identify market manipulation and large-scale merching activity.

**Detection Signals**:
| Signal | Logic | Threshold |
|--------|-------|-----------|
| **Buy/Sell Ratio Shift** | `(buyVol5m / sellVol5m)` vs 1h average ratio | > 200% change = alert |
| **Volume Spike** | Current 5m volume vs 1h average | > 300% = "High Activity" badge |
| **Price Velocity** | `(currentPrice - price1hAgo) / price1hAgo * 100` | > ±10% = trending indicator |
| **Spread Collapse** | Margin shrinking rapidly | Margin < 50% of 1h avg = "Squeeze" |

**UI Indicator**: Items flagged with 🔺 (pump) or 🔻 (dump) icons, color-coded row highlights.

---

### 7. Extended Column System
User-selectable columns beyond the default set.

| Column | Calculation | Default |
|--------|-------------|---------|
| **Last Trade** | `max(highTime, lowTime)` formatted as "X min ago" | ✅ |
| **Volume 24h** | Sum of `highVol + lowVol` from `/1h` × 24 (or Firestore history) | ❌ |
| **Price × Volume 24h** | `avgPrice * volume24h` (liquidity indicator) | ❌ |
| **Last Buy** | `highTime` formatted as relative time | ❌ |
| **Last Sell** | `lowTime` formatted as relative time | ❌ |
| **Limit Profit** | `margin * buyLimit` (max profit per 4h cycle) | ❌ |
| **ROI %** | `(margin / buyPrice) * 100` | ✅ |
| **Alch Profit** | `highalch - buyPrice - natureRunePrice` | ❌ |

**UI**: Column picker dropdown with checkboxes. Selection saved to `localStorage`.

---

### 8. Filter Presets System
Saveable, shareable filter configurations for different flipping strategies.

**Built-in Presets**:

#### "High Liquidity Flips" (Default Active Items)
```json
{
  "name": "High Liquidity Flips",
  "filters": {
    "priceVolumeMin": 500000000,
    "lastBuyMaxMinutes": 10,
    "lastSellMaxMinutes": 10,
    "limitProfitMin": 200000
  },
  "sort": { "field": "roi", "direction": "desc" },
  "columns": ["name", "buyPrice", "sellPrice", "margin", "roi", "limitProfit", "lastBuy", "lastSell", "priceVolume24h"]
}
```

#### "Sniper Mode" (Low competition, high margin)
```json
{
  "filters": {
    "roiMin": 5,
    "volume24hMax": 1000,
    "marginMin": 50000
  },
  "sort": { "field": "margin", "direction": "desc" }
}
```

#### "Alch & Flip" (Items profitable to alch if flip fails)
```json
{
  "filters": {
    "alchProfitMin": 0,
    "marginMin": 100
  },
  "sort": { "field": "alchProfit", "direction": "desc" }
}
```

**Custom Presets**: Users can create, name, and save their own. Stored in `localStorage`. Optional: Export/Import as JSON for sharing.

---

## Technical Implementation Guide

### Phase 1: GCP Backend Setup

**`cloud-run/api/main.py` (Python Flask/FastAPI)**:
1.  `GET /prices/latest`: Returns all items from Firestore cache.
2.  `GET /prices/item/{id}`: Returns single item details + timeseries.
3.  **Scheduled Job (`/refresh`)**: Called by Cloud Scheduler every 60s.
    *   Fetches `https://prices.runescape.wiki/api/v1/osrs/latest`.
    *   Fetches `https://prices.runescape.wiki/api/v1/osrs/5m`.
    *   Merges data and writes to Firestore `prices` collection.

**Firestore Collections**:
| Collection | Document | Fields |
|------------|----------|--------|
| `items` | `{itemId}` | `name`, `icon`, `limit`, `highalch`, `lowalch`, `members` (from `/mapping`, refreshed daily) |
| `prices` | `latest` | `{ data: { itemId: { high, highTime, low, lowTime, avgHigh5m, avgLow5m, highVol, lowVol } } }` |
| `history` | `{itemId}` | Array of `{ ts, high, low }` snapshots (for custom long-term charts) |

---

### Phase 2: Frontend Application

**File Structure**:
```
/molten-rosette
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── api.js         // Fetch from Cloud Run, not Wiki directly
│   ├── analysis.js    // Tax, Margin, Score calculations
│   ├── ui.js          // DOM rendering, filtering, sorting
│   ├── charts.js      // Chart.js integration
│   └── limitTracker.js // LocalStorage GE limit logic
└── assets/
    └── (item icons, if self-hosted)
```

**`api.js` Module**:
```javascript
const API_BASE = 'https://your-cloud-run-url.a.run.app';

export async function fetchLatestPrices() {
  const res = await fetch(`${API_BASE}/prices/latest`);
  return res.json();
}

export async function fetchItemTimeseries(itemId, timestep = '5m') {
  // Can still call Wiki API directly for timeseries, or proxy through Cloud Run
  const res = await fetch(`https://prices.runescape.wiki/api/v1/osrs/timeseries?id=${itemId}&timestep=${timestep}`, {
    headers: { 'User-Agent': 'MoltenRosette-FlipApp/1.0' }
  });
  return res.json();
}
```

---

### Phase 3: UI & Theming

**Color Palette (CSS Variables)**:
```css
:root {
  --bg-primary: #0d0d0d;
  --bg-secondary: #1a1a1a;
  --bg-card: rgba(30, 30, 30, 0.7);
  --accent-gold: #d4af37;
  --accent-gold-dim: #a38829;
  --text-primary: #f0f0f0;
  --text-secondary: #a0a0a0;
  --profit-green: #00e676;
  --loss-red: #ff5252;
  --border-glow: 0 0 15px rgba(212, 175, 55, 0.3);
}
```

**Key UI Components**:
*   **Virtual Scrolling / Pagination**: For 3000+ items, show 50/page or use virtual scroll.
*   **GP Formatting**: Use `Intl.NumberFormat` or custom for "12.5m", "1.2k".
*   **Responsive Design**: Table scrolls horizontally on mobile, filters collapse into a drawer.

---

## Verification & Testing Checklist

| Test Case | Expected Outcome |
|-----------|------------------|
| **Tax on Twisted Bow (1.5B)** | Tax = 5,000,000 (capped). Net profit calc is correct. |
| **Tax on 40gp Item** | Tax = 0 (rounds down from 0.8). |
| **Limit Tracker Persistence** | Data survives page refresh. |
| **4h Timer Accuracy** | Countdown resets item correctly after 4 hours. |
| **Cloud Run Cold Start** | First request < 3 seconds. |
| **Firestore Read Latency** | Dashboard loads in < 500ms after first paint. |
| **Mobile Layout** | Table is scrollable, filters are accessible. |

---

## Deployment Steps

1.  **GCP Project Setup**: Create new project `flip-to-5b`. Enable Cloud Run, Firestore, Cloud Scheduler APIs.
2.  **Deploy Cloud Run Service**: `gcloud run deploy osrs-api --source . --region us-central1`.
3.  **Create Cloud Scheduler Job**: Hits `POST /refresh` every 60 seconds.
4.  **Deploy Frontend**: Upload to Cloud Storage bucket with CDN, or use Firebase Hosting.
5.  **Configure CORS**: Allow frontend origin on Cloud Run service.
