# Implementation Plan

## Overview
Migrate the existing React-based 5bGP trading dashboard to the Nuxt UI SaaS template to achieve better UI/UX, SEO performance, specific Nuxt features, and a cleaner codebase foundation.

This migration involves transitioning from a React + Vite + Tailwind stack to Nuxt 4 + Nuxt UI + Vue 3, while preserving all existing business logic, data models, and trading functionality. The project is a sophisticated Grand Exchange trading tool with real-time market data, portfolio management, alerts system, and advanced analytics.

## Types
Complete type system migration from TypeScript interfaces to Vue-compatible definitions with Nuxt-specific enhancements.

### Core Business Types (Vue/Nuxt compatible)
```typescript
// composables/types.ts
export interface Item {
  id: number
  name: string
  icon: string
  members: boolean
  limit?: number
  value?: number
  highalch?: number
  lowalch?: number
  examine?: string
}

export interface MarketItem extends Item {
  buyPrice: number
  sellPrice: number
  margin: number
  tax: number
  roi: number
  volume: number
  potentialProfit: number
  timestamp: number
  fav: boolean
  score?: number
  pump?: boolean
  alchProfit?: number
  flipperScore: number
  volatilityIndex: number
  riskLevel: 'low' | 'medium' | 'high' | 'extreme'
  priceStability: number
}

// Nuxt-specific enhancements
export interface MarketState {
  items: Ref<MarketItem[]>
  isLoading: Ref<boolean>
  error: Ref<string | null>
  lastUpdated: Ref<number>
}

// Pinia stores for Vue reactivity
export interface PortfolioStore {
  cash: number
  holdings: Record<number, Holding>
  transactions: Transaction[]
  addTransaction: (tx: TransactionInput) => Promise<void>
  setCash: (amount: number) => void
  resetPortfolio: () => void
}
```

## Files
Complete restructuring from React component hierarchy to Nuxt's file-based routing and composables pattern.

### New Files to Create
```
nuxt.config.ts                    # Nuxt configuration with UI, Image, Content modules
composables/
  ├── useMarketData.ts           # Vue composable replacing React hook
  ├── useFlipPerformance.ts      # Performance tracking composable
  ├── usePortfolio.ts            # Portfolio management composable
  └── useAlerts.ts               # Alerts system composable

stores/
  ├── portfolio.ts               # Pinia store for portfolio state
  ├── alerts.ts                  # Pinia store for alerts
  └── preferences.ts             # Pinia store for user preferences

pages/
  ├── index.vue                  # Dashboard (replaces Dashboard.tsx)
  ├── item/
  │   └── [id].vue              # Item detail page
  ├── portfolio.vue             # Portfolio management
  ├── performance.vue           # Performance analytics
  ├── screener.vue              # Advanced screener
  ├── alerts.vue                # Alerts management
  ├── highlights.vue            # Market highlights
  └── compare/
      └── [ids].vue             # Comparative analysis

components/
  ├── ui/                       # Nuxt UI components + custom
  │   ├── CandlestickChart.vue  # Trading chart component
  │   ├── PriceChart.vue        # Price visualization
  │   ├── PortfolioPerformanceChart.vue
  │   ├── ComparativeChart.vue
  │   └── MiniTable.vue         # Reusable table component
  ├── layout/
  │   ├── DefaultHeader.vue     # Navigation header
  │   ├── DefaultSidebar.vue    # Navigation sidebar
  │   └── ThemeToggle.vue       # Theme switching
  └── dashboard/
      └── MarketOverview.vue    # Dashboard widgets

server/api/
  ├── market/
  │   ├── items.get.ts          # Market data API
  │   └── prices/[id].get.ts    # Item pricing
  ├── portfolio/
  │   ├── transactions.post.ts # Transaction logging
  │   └── performance.get.ts    # Performance analytics
  └── alerts/
      ├── rules.post.ts         # Alert rule management
      └── notifications.get.ts  # Alert notifications

types/
  ├── index.ts                  # Core type definitions
  ├── api.ts                    # API response types
  └── market.ts                 # Market-specific types
```

### Files to Modify
```
package.json                    # Replace React deps with Nuxt/Vue deps
tailwind.config.ts               # Adapt for Nuxt UI theming
tsconfig.json                   # Update for Vue/Nuxt compatibility
README.md                       # Update documentation
```

### Files to Remove
```
frontend/src/App.tsx            # Replaced by Nuxt app.vue
frontend/src/main.tsx           # Replaced by Nuxt entry
frontend/vite.config.ts         # Replaced by nuxt.config.ts
frontend/src/components/*.tsx   # All React components
frontend/src/hooks/*.ts         # React hooks (migrate to composables)
frontend/src/store/*.ts         # Zustand stores (migrate to Pinia)
```

## Functions
Migration of React hooks and utility functions to Vue composables and Nuxt-specific patterns.

### New Functions (Vue Composables)
```typescript
// composables/useMarketData.ts
export function useMarketData() {
  const items = ref<MarketItem[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  const fetchMarketData = async () => {
    // Nuxt $fetch usage with error handling
  }
  
  const recentItems = computed(() => 
    items.value.filter(item => isWithinTime(item.lastBuyAgo, 10))
  )
  
  return { items, isLoading, error, recentItems, fetchMarketData }
}

// composables/useFlipPerformance.ts
export function useFlipPerformance() {
  const flips = ref<FlipPerformance[]>([])
  const stats = ref<HistoricalPerformance | null>(null)
  
  const addFlip = (flip: FlipPerformanceInput) => {
    // Flip tracking logic
  }
  
  const calculateROI = (buyPrice: number, sellPrice: number) => {
    // ROI calculation
  }
  
  return { flips, stats, addFlip, calculateROI }
}
```

### Modified Functions
```typescript
// utils/analysis.ts → utils/market.ts
export function calculateFlipperScore(
  roi: number, 
  margin: number, 
  potentialProfit: number, 
  limit: number, 
  volume: number
): number {
  // Same logic, Vue-compatible
}

// utils/formatters.ts (enhanced for Nuxt)
export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num)
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(amount)
}
```

### Removed Functions
```typescript
// React-specific hooks to remove:
- useMarketData (React version)
- useFlipPerformance (React version)
- All useEffect and useState patterns
```

## Classes
Transition from React component classes to Vue's Composition API and Nuxt-specific patterns.

### New Vue Components
```typescript
// components/ui/CandlestickChart.vue
<template>
  <div ref="chartContainer" class="w-full h-96">
    <!-- TradingView or Chart.js integration -->
  </div>
</template>

<script setup lang="ts">
interface Props {
  data: TimeseriesPoint[]
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  height: 384
})

const chartContainer = ref<HTMLElement>()
// Chart initialization logic
</script>

// pages/index.vue (Dashboard)
<template>
  <div class="space-y-6">
    <MarketOverview />
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <DumpAlerts :items="dumpAlerts" />
      <TopFlipperPicks :items="topPicks" />
      <HotItems :items="hotItems" />
      <!-- Additional dashboard widgets -->
    </div>
  </div>
</template>

<script setup lang="ts">
// SEO and meta
useHead({
  title: '5bGP Market Dashboard',
  meta: [
    { name: 'description', content: 'Real-time Grand Exchange trading dashboard' }
  ]
})

// Composables
const { items, isLoading } = useMarketData()
const { holdings, cash } = usePortfolio()

// Computed properties
const recentItems = computed(() => items.value.filter(isRecent))
</script>
```

### Modified Classes
```typescript
// No classes to modify - complete paradigm shift from React to Vue
// All component logic moved to Composition API
```

### Removed Classes
```typescript
// All React component classes removed:
- Dashboard.tsx
- ItemDetail.tsx
- Portfolio.tsx
- Performance.tsx
- Alerts.tsx
- All other React components
```

## Dependencies
Major dependency shift from React ecosystem to Vue/Nuxt ecosystem.

### New Dependencies
```json
{
  "dependencies": {
    "nuxt": "^4.2.2",
    "@nuxt/ui": "^4.2.1",
    "@nuxt/image": "^2.0.0",
    "@nuxt/content": "^3.8.2",
    "@vueuse/nuxt": "^13.9.0",
    "@pinia/nuxt": "^0.5.1",
    "pinia": "^2.1.7",
    "vue": "^3.4.0",
    "chart.js": "^4.4.0",
    "vue-chartjs": "^5.3.0",
    "zod": "^4.1.13",
    "better-sqlite3": "^12.4.6"
  },
  "devDependencies": {
    "@nuxt/eslint": "^1.10.0",
    "@nuxt/typescript": "^3.9.3",
    "vue-tsc": "^3.1.5",
    "typescript": "^5.9.3"
  }
}
```

### Dependencies to Remove
```json
{
  "removed": [
    "react",
    "react-dom",
    "react-router-dom",
    "@tanstack/react-query",
    "zustand",
    "sonner",
    "vite",
    "@vitejs/plugin-react"
  ]
}
```

## Testing
Comprehensive testing strategy for Nuxt application with Vue Test Utils and Nuxt-specific testing patterns.

### Test Files to Create
```
tests/
  ├── unit/
  │   ├── composables/
  │   │   ├── useMarketData.spec.ts
  │   │   └── useFlipPerformance.spec.ts
  │   ├── components/
  │   │   ├── ui/CandlestickChart.spec.ts
  │   │   └── dashboard/MarketOverview.spec.ts
  │   └── utils/
  │       └── market.spec.ts
  ├── e2e/
  │   ├── dashboard.spec.ts
  │   ├── portfolio.spec.ts
  │   └── screener.spec.ts
  └── api/
      ├── market.items.spec.ts
      └── portfolio.transactions.spec.ts
```

### Testing Tools
- **@vue/test-utils** for component testing
- **@nuxt/test-utils** for Nuxt-specific testing
- **Playwright** for E2E testing
- **Vitest** for unit testing

### Test Migration Strategy
```typescript
// Example: tests/unit/composables/useMarketData.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useMarketData } from '~/composables/useMarketData'

describe('useMarketData', () => {
  beforeEach(() => {
    // Reset state before each test
  })

  it('should fetch market data successfully', async () => {
    const { items, isLoading, fetchMarketData } = useMarketData()
    
    await fetchMarketData()
    
    expect(isLoading.value).toBe(false)
    expect(items.value).toHaveLength(greaterThan(0))
  })
})
```

## Implementation Order
Strategic phased approach to minimize disruption and ensure successful migration.

### Phase 1: Foundation Setup (Week 1)
1. **Initialize Nuxt Project**
   - Set up Nuxt 4 with UI, Image, Content modules
   - Configure TypeScript and ESLint for Vue
   - Establish project structure

2. **Core Type System**
   - Migrate all TypeScript interfaces to Vue-compatible types
   - Set up Pinia store structure
   - Create base composables architecture

3. **Basic UI Framework**
   - Configure Nuxt UI theming to match current design
   - Set up layout components (header, sidebar, navigation)
   - Implement theme switching functionality

### Phase 2: Core Functionality (Week 2-3)
4. **Data Layer Migration**
   - Convert React hooks to Vue composables
   - Migrate Zustand stores to Pinia stores
   - Implement API layer with Nuxt server routes

5. **Essential Pages**
   - Dashboard (index.vue) with market overview
   - Item detail pages with dynamic routing
   - Portfolio management functionality

6. **UI Components**
   - Migrate all custom UI components to Vue
   - Implement charts with Vue-chartjs
   - Create reusable component library

### Phase 3: Advanced Features (Week 4-5)
7. **Complex Features**
   - Alerts system with real-time notifications
   - Advanced screener with filtering
   - Performance analytics and reporting
   - Comparative analysis tools

8. **Data Persistence**
   - Migrate local storage to Nuxt-compatible storage
   - Implement database integration if needed
   - Set up data synchronization

### Phase 4: Optimization & Launch (Week 6)
9. **Performance Optimization**
   - Implement SSR/SSG for SEO benefits
   - Optimize bundle size and loading
   - Set up image optimization with Nuxt Image

10. **Testing & QA**
    - Complete test coverage
    - E2E testing of critical user flows
    - Performance testing and optimization

11. **Deployment & Migration**
    - Set up production deployment
    - Data migration from existing system
    - User training and documentation

### Risk Mitigation
- **Parallel Development**: Maintain React version during initial Nuxt development
- **Incremental Migration**: Migrate feature by feature to reduce risk
- **Backup Strategy**: Full backup of existing codebase and data
- **Rollback Plan**: Quick reversion to React version if issues arise

### Success Criteria
- All existing functionality preserved and enhanced
- Improved page load times and SEO scores
- Better developer experience and maintainability
- Successful deployment with zero data loss
- Positive user feedback on UI/UX improvements
