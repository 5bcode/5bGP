# 5bGP - Grand Exchange Flipping Tool

This repository contains the source code for the 5bGP (5 Billion Gold Pieces) flipping dashboard, a sophisticated trading tool for Old School RuneScape.

## Project Status: Active Development

The application is built with Nuxt 4 (Vue 3) and is in active development.

### Repository Structure

- **`5bgp-nuxt/`**: The Nuxt 4 + Vue 3 application (primary implementation)
- **`composables/`, `stores/`, `types/`**: Shared utilities for the monorepo structure

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm

### Development

To work on the Nuxt application:

```bash
cd 5bgp-nuxt
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
