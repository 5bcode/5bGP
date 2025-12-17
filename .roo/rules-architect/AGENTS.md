# Project Architecture Rules (Non-Obvious Only)

- Migration from React to Vue requires maintaining shared type definitions across frameworks
- Complex market data processing in useMarketData must handle multiple API endpoints with different polling intervals
- Custom theming system requires coordinated CSS variable updates across multiple theme variants
- API calls to prices.runescape.wiki require persistent custom User-Agent headers across all implementations
- Monorepo pnpm workspaces with shamefully-hoist=true affects dependency resolution and build processes