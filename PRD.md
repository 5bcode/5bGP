# Product Requirements Document: Flip to 5B

## 1. Executive Summary
**Flip to 5B** is a high-performance, real-time market dashboard designed to assist Old School RuneScape (OSRS) players in "flipping" items (buying low and selling high) on the Grand Exchange. The ultimate goal is to provide tools that streamline the process of accumulating 5 Billion GP.

## 2. Vision & Goals
*   **Vision**: To be the most aesthetically pleasing and responsive OSRS flipping tool on the web.
*   **Goals**:
    *   Provide real-time pricing data with zero lag.
    *   Visualize market trends with interactive charts.
    *   Track personal portfolio performance (Realized & Unrealized P&L).
    *   identify high-margin and high-volume opportunities instantly.

## 3. Core Features

### 3.1 Dashboard (Home)
*   **Market Pulse**: Quick visualization of the overall market state.
*   **Featured Widgets**:
    *   **Largest Margins**: Items with the widest buy/sell spread (adjusted for volume).
    *   **High Volume Profit**: Safe flips with high liquidity.
    *   **Profitable Alchs**: Items profitable to High Alchemy.
    *   **Top Gainers/Losers**: 1-hour price movers.

### 3.2 Screener
*   **Search**: Instant search by item name.
*   **Filters**:
    *   Minimum/Maximum Price.
    *   Minimum Volume (5m, 1h, 24h).
    *   Minimum Margin.
    *   ROI % (Return on Investment).
*   **Sorting**: Sort by Margin, Volume, ROI, or custom "Potential" score.

### 3.3 Item Detail View
*   **Interactive Chart**: Price history graph (using Chart.js or Recharts).
*   **Live Metrics**: Current Buy/Sell prices, Margin, Tax calculation, GE Limit.
*   **Alch Analysis**: High Alch value, Nature Rune cost, Profit per Alch.
*   **Links**: Direct links to OSRS Wiki and Official GE page.

### 3.4 Portfolio Tracker
*   **Active Flips**: Track currently held items.
    *   Input: Buy Price, Quantity, Target Sell Price.
    *   Live Updates: Show current Unrealized P&L based on market movements.
*   **History**: Log completed flips.
*   **Stats**: Total Profit, Active Investment, ROI.
*   **Persistence**: Save portfolio data (Local Storage initially, Database later).

## 4. Technical Architecture (Migration Target)

This project strictly adheres to the **Project Constitution**.

### 4.1 Frontend
*   **Framework**: **React** (Latest version).
*   **Language**: **TypeScript** (Strict mode).
*   **Styling**: **Tailwind CSS** for layout, **Framer Motion** for animations.
*   **State Management**: React Context or Zustand.

### 4.2 Backend
*   **Runtime**: **Node.js**.
*   **Database**: **Supabase** (PostgreSQL) for user data and persistent caching.
*   **API**: RESTful API to proxy OSRS Wiki data and handle user authentication.

### 4.3 Data Sources
*   **OSRS Wiki API**:
    *   `/latest`: Real-time high/low prices.
    *   `/5m`: Volume data.
    *   `/mapping`: Item definitions (IDs, names, limits).

## 5. Migration Plan (Current State -> Target State)
The current prototype exists in Vanilla HTML/JS and Python. The immediate objective is to migrate to the mandated stack.

1.  **Initialize React App**: Scaffolding with Vite or Next.js.
2.  **Port Logic**: Convert `ui.js`, `api.js`, `analysis.js` to TypeScript hooks/utils.
3.  **Componentize**: Break down `index.html` into reusable React components.
    *   `DashboardCard`
    *   `ProductTable`
    *   `ScreenerFilters`
    *   `PortfolioWidget`
4.  **Backend Rewrite**: Rewrite `main.py` logic (FastAPI) into Node.js (Express or Next.js API Routes).
5.  **Design Polish**: Apply Tailwind CSS to match the "Modern Vibe" and "Premium Aesthetics" requirement.

## 6. Design Guidelines
*   **Theme**: Dark mode default ("Molten" aesthetic: dark greys, vibrant oranges/golds).
*   **Typography**: Inter or similar modern sans-serif.
*   **Interactions**: Hover effects on rows, smooth transitions between views.
*   **Responsiveness**: Fully usable on Mobile and Desktop.
