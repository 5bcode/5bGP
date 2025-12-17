# Project Debug Rules (Non-Obvious Only)

- Market data polling occurs every 60 seconds for prices, 5 minutes for 5m volume, 30 minutes for 1h volume
- Complex data transformations in useMarketData hook may cause silent failures if API responses change
- Alert system triggers based on market data updates - check alertStore for debugging
- Portfolio calculations use weighted average pricing - verify transaction order affects results
- Theme switching requires CSS variable updates across multiple theme classes