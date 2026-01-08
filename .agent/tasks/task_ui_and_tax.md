# Task: Fix UI Navigation and Logic Issues

## Status
- [ ] Tax Rate Correction (2% -> 1%)
- [ ] UI Navigation Fix ("Disappearing suggestions")
- [ ] Code Cleanup (Unused fields)

## Context
The user reported two main issues:
1. "tax is 2%" - The filtering logic uses a 2% tax rate which is incorrect for OSRS (1%) and likely filters out most valid flips, resulting in empty Quick Picks.
2. "suggestions show on the sidebar but they dissapear when clicked and dont come back" - Navigation between the Overview and Details views seems broken or state is lost.

## Implementation Plan

### 1. Fix Tax Rate
- **Target**: `d:\Repo\5bGP\runelite-plugin\src\main\java\com\flipto5b\FlipTo5BPlugin.java`
- **Action**: Change tax calculation from `0.02` to `0.01` in `getBestFlips`.
- **Reason**: 1% tax is the OSRS standard. 2% is too aggressive.

### 2. Fix UI Navigation
- **Target**: `d:\Repo\5bGP\runelite-plugin\src\main\java\com\flipto5b\ui\FlipTo5BPanel.java`
- **Action**: 
    - Verify `CardLayout` usage.
    - Improve `showItemDetails` to robustly find the `DETAILS` panel.
    - Ensure "Back" button correctly switches to `OVERVIEW`.
    - **Hypothesis**: The "Back" button might be working, but the main panel is empty because `QuickPicks` update ran and cleared the list (due to tax issue) or `Overview` panel reference is lost.
    - **Fix**: Re-trigger updates when returning to Overview, and ensure `getComponent(0)` is reliable.

### 3. Code Cleanup
- **Target**: `FlipTo5BPlugin.java`
- **Action**: Remove `pricingEngine` and `cachedSuggestion` fields to resolve warnings.

## Verification
- Restart client.
- Check logs for "Back button clicked".
- Verify Quick Picks populate with 1% tax.
