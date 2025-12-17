# 5bGP - Grand Exchange Flipping Tool

This repository contains the source code for the 5bGP (5 Billion Gold Pieces) flipping dashboard, a sophisticated trading tool for Old School RuneScape.

## Project Status: Migration in Progress

We are currently migrating the application from a React-based architecture to a Nuxt 4 (Vue 3) monorepo structure.

### Repository Structure

- **`5bgp-nuxt/`**: The new Nuxt 4 + Vue 3 application. This is the active development target.
- **`frontend/`**: The legacy React + Vite application. This is being used as a reference for the migration.
- **`composables/`, `stores/`, `types/`**: Shared utilities (currently empty/WIP) intended for the monorepo structure.

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm

### Development

To work on the new Nuxt application:

```bash
cd 5bgp-nuxt
pnpm install
pnpm dev
```

To view the legacy React application (reference):

```bash
cd frontend
pnpm install
pnpm dev
```

## Documentation

- **[Implementation Plan](implementation_plan.md)**: Detailed plan for the migration to Nuxt.
- **[Task Progress](task_progress.md)**: Current status of the project and migration tasks.
- **[Agent Guidelines](AGENTS.md)**: Rules and context for AI agents working on this codebase.

## Features (Target)

- Real-time market data via OSRS Wiki API
- Advanced flipping metrics (Flipper's Score, Volatility Index)
- Portfolio management and performance tracking
- Technical analysis charts
- Price and volume alerts
