# Project Coding Rules (Non-Obvious Only)

- Always use custom User-Agent header 'FlipTo5B-Client/1.0' for prices.runescape.wiki API calls
- Complex market data processing in useMarketData requires multiple API endpoints with specific polling intervals (60s prices, 5m volume, 30m 1h volume)
- Advanced trading algorithms from frontend/src/utils/analysis.ts include flipper score, volatility analysis, and technical indicators
- Shared type definitions between React/Vue implementations must account for different framework patterns
- Custom theming system requires CSS variable updates across multiple theme classes (default, midnight, runelite)
