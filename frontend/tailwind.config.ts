import type { Config } from 'tailwindcss'

export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: 'var(--bg-app)',
                sidebar: 'var(--bg-sidebar)',
                card: 'var(--bg-card)',
                hover: 'var(--bg-hover)',
                primary: 'var(--text-primary)',
                secondary: 'var(--text-secondary)',
                muted: 'var(--text-muted)',
                gold: 'var(--accent-gold)',
                green: 'var(--accent-green)',
                red: 'var(--accent-red)',
                border: 'var(--border-color)',
            }
        }
    },
    plugins: [],
} satisfies Config
