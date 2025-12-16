# Project Status: Flip to 5B

## Current Phase: Advanced Analytics Implementation ✅

### Completed Actions
- [x] Initialized Vite + React + TypeScript in `frontend/`.
- [x] Configured Tailwind CSS v4 with themed support (Molten, Midnight, Runelite).
- [x] Ported Core Logic (`analysis.ts`, `types/index.ts`).
- [x] Implemented App Layout (Sidebar, Routing).
- [x] Implemented Data Layer (`useMarketData`, React Query).
- [x] Implemented Dashboard Page & Components.
- [x] Implemented Item Detail View with Chart.js.
- [x] Implemented Portfolio Management with Zustand.
- [x] Implemented Screener Page with full filtering and sorting.
- [x] Theme System (Molten, Midnight, Runelite themes).
- [x] Favorites functionality with persistence.

### Priority 2: Advanced Analytics ✅ (Just Completed)
- [x] **Advanced Charting (Technical Analysis)**
  - Volume bars alongside price chart
  - SMA (Simple Moving Average) overlays (7-day, 14-day)
  - EMA (Exponential Moving Average) overlays (7-day, 14-day)
  - Toggle controls for each overlay
  - Volume spike detection with visual indicators
- [x] **Flipper's Score & Volatility Index**
  - Proprietary Flipper's Score (0-100) combining ROI, Margin, Volume, Stability
  - Volatility Index with risk level classification (Low/Medium/High/Extreme)
  - Price stability calculation
  - Visual badges and indicators throughout the app
  - Featured "Top Flipper Picks" section on Dashboard
  - Risk indicator column in Screener

### Analysis Functions Added (`utils/analysis.ts`)
- `calculateSMA()` - Simple Moving Average
- `calculateEMA()` - Exponential Moving Average  
- `calculateVolatility()` - Price volatility (coefficient of variation)
- `getRiskLevel()` - Risk classification from volatility
- `calculatePriceStability()` - Inverse volatility score
- `calculateFlipperScore()` - Proprietary ranking metric
- `computeAnalytics()` - Full analytics computation from timeseries

### Type Additions (`types/index.ts`)
- `flipperScore`, `volatilityIndex`, `riskLevel`, `priceStability` on MarketItem
- New `AnalyticsData` interface for computed analytics

## Next Steps
1. **Volume Data Integration**: Fetch 5m volume data from API to improve score accuracy.
2. **Alerts System**: Notify users of price/volume spikes on favorites.
3. **Historical Performance**: Track flip performance over time.

## Backlog
- [ ] Integration with backend API (Cloud Run).
- [ ] User Authentication (Supabase).
- [ ] Mobile responsive improvements.
