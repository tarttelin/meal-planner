# UI Baseline Audit

Date: 2026-04-15
Scope: current frontend before Kitchen/Performance/Fusion rollout.

## Route Inventory
- `/` Meal plan week view (Kitchen)
- `/recipes` Recipe list (Kitchen)
- `/recipes/new` Recipe editor (Kitchen)
- `/recipes/:id` Recipe detail (Kitchen)
- `/recipes/:id/edit` Recipe editor (Kitchen)
- `/shopping` Shopping list (Kitchen)
- `/pantry` Pantry list (Kitchen)
- `/log` Daily log (Fusion target)
- `/profiles` Family profiles (Kitchen)

Performance routes are not implemented yet.

## Current Visual Baseline Summary
- Dominant palette is generic gray/indigo utility classes.
- Navigation and shell are not mode-aware.
- Kitchen and log surfaces currently share near-identical visual language.
- No explicit running/performance brand cues exist.

## Hard-Coded Color Utility Snapshot
Top recurring color classes:
- `text-gray-500` (45)
- `text-gray-400` (42)
- `bg-indigo-600` (18)
- `hover:bg-indigo-700` (13)
- `text-gray-600` (10)

Top files by color-class volume:
- 54 `frontend/src/components/Pantry/PantryList.tsx`
- 46 `frontend/src/components/DailyLog/DailyLog.tsx`
- 37 `frontend/src/components/Calendar/WeekView.tsx`
- 28 `frontend/src/components/Recipes/RecipeEditor.tsx`
- 22 `frontend/src/components/Shopping/ShoppingList.tsx`
- 19 `frontend/src/components/Recipes/RecipeList.tsx`
- 17 `frontend/src/components/Calendar/MealSlot.tsx`
- 16 `frontend/src/components/Recipes/RecipeDetail.tsx`
- 13 `frontend/src/components/Layout/AppLayout.tsx`

## Baseline UX Measurements (To Capture)
Measure on desktop and mobile viewport:
- Task A: Generate shopping list for next 7 days.
- Task B: Add recipe from recipe list flow.
- Task C: Mark planned meal as eaten in daily log.

Track:
- completion time
- error count
- taps/clicks
- confidence rating (1-5)

## Screenshot Set (To Capture)
Desktop + mobile screenshots required for:
- `/`
- `/recipes`
- `/shopping`
- `/pantry`
- `/log`

Store in `docs/screenshots/ui-baseline/`.

## Notes
- This file is the reference baseline for post-theme comparison.
- Update only when baseline is intentionally re-established.
