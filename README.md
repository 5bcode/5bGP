# 5bGP - FlipTo5B Terminal

## Project Structure

- **`web-dashboard/`**: The modern React/Vite-based trading terminal web application.
- **`runelite-plugin/`**: The Java-based RuneLite plugin for in-game integration.
- **`supabase/`**: Database migrations and Edge Functions.
- **`scripts/`**: Utility scripts for database maintenance and testing.
- **`docs/`**: Project documentation and plans.
- **`legacy/`**: Deprecated source code.

## Getting Started

### Web Dashboard
```bash
cd web-dashboard
pnpm install
pnpm run dev
```

### RuneLite Plugin
```bash
cd runelite-plugin
./gradlew runClient
```
