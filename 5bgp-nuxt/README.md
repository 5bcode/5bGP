# 5bGP - Grand Exchange Trading Dashboard

[![Nuxt UI](https://img.shields.io/badge/Made%20with-Nuxt%20UI-00DC82?logo=nuxt&labelColor=020420)](https://ui.nuxt.com)

A sophisticated Grand Exchange trading tool for RuneScape, built with Nuxt 4 + Vue 3. This application provides real-time market data, portfolio management, advanced analytics, and trading alerts for optimal flipping opportunities.

## Features

- **Real-time Market Data**: Live price feeds from RuneScape Wiki API
- **Advanced Analytics**: Flipper's Score, volatility analysis, technical indicators
- **Portfolio Management**: Track holdings, transactions, and performance
- **Alerts System**: Customizable price and volume alerts
- **Multi-theme Support**: Default, Midnight, and RuneLite themes
- **Responsive Design**: Optimized for desktop and mobile

## Tech Stack

- **Framework**: Nuxt 4 + Vue 3
- **UI**: Nuxt UI + Tailwind CSS
- **State Management**: Pinia
- **Charts**: Chart.js + Vue-ChartJS
- **Type Safety**: TypeScript + Zod
- **Package Manager**: pnpm

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm

### Installation

1. Navigate to the project directory:
```bash
cd 5bgp-nuxt
```

2. Install dependencies:
```bash
pnpm install
```

3. Start the development server:
```bash
pnpm dev
```

The application will be available at `http://localhost:3000`.

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm lint` - Run ESLint
- `pnpm typecheck` - Run TypeScript type checking

## Project Structure

```
5bgp-nuxt/
├── app/                    # Nuxt app directory
│   ├── assets/            # Static assets
│   ├── components/        # Vue components
│   ├── layouts/           # Layout components
│   ├── pages/             # File-based routing
│   └── stores/            # Pinia stores
├── server/                # Nuxt server API
├── types/                 # TypeScript definitions
└── public/                # Public static files
```

## API Integration

This application integrates with the RuneScape Wiki API (`prices.runescape.wiki`) for market data. The API requires a custom User-Agent header: `FlipTo5B-Client/1.0`.

## Deployment

Build the application for production:

```bash
pnpm build
```

The built files will be in the `.output/` directory, ready for deployment to any static hosting service or Nuxt-compatible platform.

For detailed deployment options, see the [Nuxt deployment documentation](https://nuxt.com/docs/getting-started/deployment).
