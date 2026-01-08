# Website Redesign Implementation Plan

The goal is to transform the current "messy" layout into a premium, modern, and highly functional dashboard. We will focus on visual excellence, consistent spacing, and improved data visualization.

## 1. Foundation & Design System Refresh
- **Color Palette**: Shift from generic slate to a custom "Deep Night" palette with "Neon Emerald" and "Amethyst" accents.
- **Typography**: Introduce modern sans-serif fonts (e.g., Inter/Outfit) with strict hierarchy.
- **Shadows & Glassmorphism**: Implement multi-layered shadows and refined backdrop blurs.
- **Micro-animations**: Add subtle entry animations and hover transitions.

## 2. Global Layout Overhaul (`App.tsx` & `Layout`)
- **Clean Navigation**: Redesign the top/side navigation to be less intrusive and more intuitive.
- **Unified Spacing**: Establish a strict 4px/8px grid system for all padding and margins.
- **Responsiveness**: Ensure fluid layouts across all screen sizes.

## 3. Component Standardization
- **Premium Cards**: A single, versatile `PremiumCard` component with glassmorphism and subtle border glows.
- **Enhanced Data Display**: Standardize how primary numbers (e.g., GP, Profit) are displayed with custom font weights and colors.
- **Interactive Elements**: Redesign buttons and inputs to feel tactile and modern.

## 4. Page-Specific Improvements
- **Dashboard**: Create a "Cockpit" feel with a main hero section and organized grid widgets.
- **Scanner**: Reduce table density. Implement "Expandable Rows" for details instead of cramming everything into one row. Improve sparkline visibility.
- **LiveSlots**: Refactor the grid to be more dynamic and less "empty".

## 5. Polish & "Wow" Factor
- **Particle/Glow Effects**: Add subtle background glow or particle effects for a high-tech feel.
- **Loading States**: Skeletons that pulse with a premium gradient.
- **Confetti/Feedback**: Visual rewards for successful flips or hitting milestones.

---
*Next Step: Update `src/globals.css` with the new design tokens.*
