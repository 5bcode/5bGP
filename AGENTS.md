# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project Structure
- Monorepo with pnpm workspaces using `shamefully-hoist=true` (configured in `5bgp-nuxt/.npmrc`)
- `5bgp-nuxt/` - Nuxt 4 + Vue 3 application (target implementation)
- `frontend/` - React + Vite application (being migrated from)
- Shared utilities in root-level directories (composables/, stores/, types/, tools/, files/) - currently empty during migration

## Build Commands
- Package.json scripts must be run from their respective project directories

## Architecture Patterns
- Complex market data processing in `useMarketData` hook with multiple API endpoints (mapping, latest prices, 5m volume, 1h volume)
- Advanced trading algorithms: flipper score calculation, volatility analysis, technical indicators from `frontend/src/utils/analysis.ts`
- API calls to `prices.runescape.wiki` require custom User-Agent header 'FlipTo5B-Client/1.0'
- Shared type definitions between React and Vue implementations
- Custom theming system with CSS variables supporting multiple themes (default, midnight, runelite) defined in `frontend/src/index.css`

## Critical Gotchas
- No testing framework currently configured
- Migration in progress - shared code directories are empty (composables/, stores/, types/)