# Project Documentation Rules (Non-Obvious Only)

- `5bgp-nuxt/` contains the target Vue 3 implementation, `frontend/` is the React app being migrated from
- Shared root directories (composables/, stores/, types/) are intentionally empty during active migration
- Market data polling intervals: 60 seconds for prices, 5 minutes for 5m volume, 30 minutes for 1h volume
- API calls to prices.runescape.wiki require custom User-Agent header 'FlipTo5B-Client/1.0' for all requests
- Complex data transformations in useMarketData hook combine multiple API endpoints with specific timing requirements