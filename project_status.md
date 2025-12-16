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

### Priority 3: Volume Data Integration ✅ (Just Completed)
- [x] **Real-time Volume Data Fetching**
  - Integrated 5-minute volume data from OSRS Wiki API
  - Integrated 1-hour volume data for comparison and trend analysis
  - Volume data used in Flipper's Score calculations for improved accuracy
- [x] **Advanced Analytics Integration**
  - Flipper's Score now factors in real volume data (not just estimates)
  - Volatility calculations use actual price and volume data
  - Risk level assessments based on real market data
- [x] **UI Updates**
  - Dashboard and Screener now use calculated analytics instead of estimates
  - Real-time volume indicators in trend signals (pump/dump detection)
  - Volume-based sorting and filtering capabilities

### Analysis Functions Added (`utils/analysis.ts`)
- `calculateSMA()` - Simple Moving Average
- `calculateEMA()` - Exponential Moving Average
- `calculateVolatility()` - Price volatility (coefficient of variation)
- `getRiskLevel()` - Risk classification from volatility
- `calculatePriceStability()` - Inverse volatility score
- `calculateFlipperScore()` - Proprietary ranking metric with volume data
- `computeAnalytics()` - Full analytics computation from timeseries

### Type Additions (`types/index.ts`)
- `flipperScore`, `volatilityIndex`, `riskLevel`, `priceStability` on MarketItem
- New `AnalyticsData` interface for computed analytics
- Required fields (no longer optional) for calculated analytics

## Next Steps
1. **Alerts System**: Notify users of price/volume spikes on favorites.
2. **Historical Performance**: Track flip performance over time.

## Backlog
- [ ] Integration with backend API (Cloud Run).
- [ ] User Authentication (Supabase).
- [ ] Mobile responsive improvements.
