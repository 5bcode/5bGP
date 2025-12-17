# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project Structure
- Monorepo with pnpm using `shamefully-hoist=true` (configured in `5bgp-nuxt/.npmrc`)
- `5bgp-nuxt/` - Nuxt 4 + Vue 3 application (primary implementation)
- Shared utilities in root-level directories (composables/, stores/, types/, tools/, files/) - populated with reusable code

## Build Commands
- Package.json scripts must be run from their respective project directories

## Architecture Patterns
- Complex market data processing in `useMarketData` composable with multiple API endpoints (mapping, latest prices, 5m volume, 1h volume)
- Advanced trading algorithms: flipper score calculation, volatility analysis, technical indicators from `5bgp-nuxt/utils/analysis.ts`
- API calls to `prices.runescape.wiki` require custom User-Agent header 'FlipTo5B-Client/1.0'
- Shared type definitions in `5bgp-nuxt/types/index.ts`
- Custom theming system with CSS variables supporting multiple themes (default, midnight, runelite) defined in `5bgp-nuxt/app/assets/css/main.css`

## Critical Gotchas
- No testing framework currently configured
- Migration completed - all React code removed, Nuxt is the sole implementation