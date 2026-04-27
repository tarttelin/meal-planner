# Servings And Nutrition Refactor Plan

## Goal

Fix the current ambiguity around recipe servings, planned servings, and logged servings by:

- separating recipe yield from planning quantity and consumed quantity
- introducing a reusable `Nutrition` value object
- snapshotting logged nutrition so historical food log entries do not change when a recipe is edited later

## Current Problems

- `Recipe.servings` means "how many servings the recipe yields"
- `MealPlan.servings` currently behaves like "how many servings to cook"
- `FoodLogEntry.recipe_servings` is treated like "how many servings this log entry represents"
- frontend code divides recipe nutrition by whatever serving number happens to be passed in, so some flows divide when they should multiply
- planned meals and logged meals are using different interpretations of the same field name
- recipe nutrition is recomputed ad hoc in multiple frontend components instead of being represented consistently in one model

## Target Domain Model

### Nutrition value object

Use a nested nutrition object wherever nutrition needs to be represented.

```python
Nutrition(
    calories=0,
    protein=0,
    carbs=0,
    fat=0,
    nutriments={},
)
```

Rules:

- `calories`, `protein`, `carbs`, and `fat` are the commonly displayed top-level values
- `nutriments` stores any extra named nutrient values without flattening the model further
- nutrition math should be centralized in one place with operations such as `add`, `scale`, and `divide`

### Recipe

```python
Recipe(
    id=...,
    name=...,
    yield_servings=4,
    total=Nutrition(...),
    per_serving=Nutrition(...),
    ingredients=[...],
)
```

Semantics:

- `yield_servings` means how many servings the full recipe makes
- `total` means nutrition for the full recipe as written
- `per_serving` is derived as `total / yield_servings`

### MealPlan

```python
MealPlan(
    id=...,
    date=...,
    slot=...,
    recipe_id=...,
    planned_servings=5,
    profile_id=None,
)
```

Semantics:

- `planned_servings` means how much of the recipe is intended to be cooked
- it is used for shopping and planning displays
- it must not be assumed to equal what a specific person eats

### FoodLogEntry

```python
FoodLogEntry(
    id=...,
    date=...,
    slot=...,
    recipe_id=...,
    meal_plan_id=...,
    consumed_servings=1,
    nutrition=Nutrition(...),
)
```

Semantics:

- `consumed_servings` means how much the user actually ate
- default is `1`
- it can be edited per log entry
- `nutrition` is a snapshot taken at log time

## Core Behavioral Rules

### Recipe math

- recipe total nutrition is the sum of ingredient nutrition
- recipe per-serving nutrition is `recipe.total / recipe.yield_servings`

### Meal planning

- planning answers: "How much am I cooking?"
- meal plan nutrition preview is `recipe.per_serving * meal_plan.planned_servings`
- shopping ingredient scale for a single meal plan row is `meal_plan.planned_servings / recipe.yield_servings`

### Shopping list generation

- the generator sums `planned_servings` per recipe across every meal plan row in the selected period
- for each recipe, the ingredient scale factor is `sum(planned_servings_in_period) / recipe.yield_servings`
- ingredients are then aggregated across recipes as today
- a recipe that appears multiple times in the period contributes once to the recipe loop, with its planned servings summed first — not once per meal plan row

### Food logging

- logging answers: "How much did I eat?"
- default logged amount for a recipe is `1` serving
- when logging from a meal plan, the selected recipe can come from the plan, but the consumed servings still default to `1`
- food log nutrition is `recipe.per_serving_snapshot * consumed_servings`

## Snapshot Persistence Requirements

Historical logs must not change when:

- a recipe yield changes
- recipe ingredients change
- recipe ingredient nutrition changes
- pantry nutrition changes
- derived per-serving nutrition changes due to any later recipe edits

To guarantee this, the food log entry must persist a complete nutrition snapshot and the relevant serving snapshot data at the time the entry is created.

## Persistence Plan

### 1. Persist nutrition as structured data in the application model

At the application and API level, use:

```json
{
  "nutrition": {
    "calories": 300,
    "protein": 20,
    "carbs": 25,
    "fat": 10,
    "nutriments": {}
  }
}
```

This should be the canonical shape returned by the backend and consumed by the frontend.

### 2. Persist recipe nutrition snapshots for food log entries

Each `FoodLogEntry` for a recipe should store:

- `recipe_id`
- `meal_plan_id` nullable
- `consumed_servings`
- `recipe_name_snapshot`
- `recipe_yield_servings_snapshot`
- `recipe_total_nutrition_snapshot`
- `recipe_per_serving_nutrition_snapshot`
- `nutrition`

Meaning:

- `recipe_total_nutrition_snapshot` is the total recipe nutrition at the time of logging
- `recipe_per_serving_nutrition_snapshot` is the derived per-serving nutrition at the time of logging
- `nutrition` is the actual consumed nutrition for this specific entry, equal to `recipe_per_serving_nutrition_snapshot * consumed_servings`

This allows:

- exact historical display of what the recipe looked like nutritionally when it was logged
- future recalculation or auditing if needed
- decoupling the log entry from later recipe edits

### 3. Keep food log entries self-contained

A food log entry must be displayable without reading the current recipe.

That means the entry should contain enough data to render:

- entry name
- consumed servings
- actual consumed nutrition

The current recipe relation should be optional enhancement data only, not the source of truth for the log entry.

### 4. Persist meal plans independently from food logs

Meal plan rows should remain planning records.

Persist:

- `recipe_id`
- `planned_servings`
- `profile_id`
- `date`
- `slot`

Do not mutate or reinterpret meal plan rows when a food log entry is created.

Optional:

- add `meal_plan_id` to `FoodLogEntry` when a log is created from a plan for traceability

## Suggested Backend Schema Changes

### Recipe API schema

Replace the current flat serving semantics with:

```json
{
  "id": "recipe-id",
  "name": "Lasagna",
  "yield_servings": 4,
  "total": {
    "calories": 1200,
    "protein": 80,
    "carbs": 100,
    "fat": 40,
    "nutriments": {}
  },
  "per_serving": {
    "calories": 300,
    "protein": 20,
    "carbs": 25,
    "fat": 10,
    "nutriments": {}
  }
}
```

Implementation note:

- ingredient rows may stay as they are initially, but each ingredient should move toward exposing `nutrition` too

### MealPlan schema

Rename:

- `servings` -> `planned_servings`

Type:

- use `float` or fixed-precision decimal instead of integer so partial planned servings are supported

### FoodLog schema

Rename:

- `recipe_servings` -> `consumed_servings`

Add:

- `meal_plan_id`
- `recipe_name_snapshot`
- `recipe_yield_servings_snapshot`
- `recipe_total_nutrition_snapshot`
- `recipe_per_serving_nutrition_snapshot`
- `nutrition`

For non-recipe pantry entries:

- keep `quantity_g`
- store a nutrition snapshot in the same `nutrition` field
- optionally store `pantry_item_name_snapshot` and `per_100g_nutrition_snapshot`

## Storage Representation

Nutrition snapshots are persisted as structured JSON columns in SQLite and as nested objects in Firestore.

SQLite columns:

- `recipe_total_nutrition_json`
- `recipe_per_serving_nutrition_json`
- `nutrition_json`

Rationale:

- cleanly matches the domain model
- avoids schema churn every time a new nutrient is added
- Firestore already maps naturally to nested objects
- SQLite's JSON1 support is sufficient for snapshot payloads
- the aggregation downside (harder per-nutrient filtering in SQL) is not a concern for this app's read patterns

## Logging Flow

### Log recipe directly

1. User selects a recipe.
2. UI defaults `consumed_servings = 1`.
3. Backend loads the current recipe.
4. Backend computes:
   - `recipe_total_snapshot`
   - `recipe_per_serving_snapshot`
   - `entry_nutrition = recipe_per_serving_snapshot * consumed_servings`
5. Backend stores a self-contained food log entry snapshot.

### Log recipe from meal plan

1. User clicks from a meal plan entry.
2. UI preselects the recipe from the plan.
3. UI defaults `consumed_servings = 1`.
4. User may adjust servings before saving.
5. Backend stores the same food log snapshot as above and optionally includes `meal_plan_id`.

Important:

- `planned_servings` is not copied into `consumed_servings`

### Log pantry item

1. User selects pantry item and grams consumed.
2. Backend computes nutrition from current pantry values.
3. Backend stores:
   - item name snapshot
   - grams
   - per-100g nutrition snapshot if useful
   - final entry nutrition snapshot

## Migration Strategy

### Phase 1: Introduce new names and nested API shape

- add `yield_servings` for recipes
- add `planned_servings` for meal plans
- add `consumed_servings` for food logs
- add `Nutrition` schema/type in backend and frontend
- expose `Recipe.total` and `Recipe.per_serving` from backend

### Phase 2: Add snapshot persistence to food log

- add snapshot fields to SQL and Firestore repositories
- create all new food log entries using snapshots
- migrate existing food log entries as part of the release:
  - for each existing entry, look up the referenced recipe (or pantry item) as it stands at migration time
  - compute `recipe_total_nutrition_snapshot`, `recipe_per_serving_nutrition_snapshot`, and the entry `nutrition` from that current state
  - populate `recipe_name_snapshot` and `recipe_yield_servings_snapshot` from the same source
  - for entries whose recipe no longer exists, fall back to whatever legacy fields are available and flag the row so it can be reviewed
  - run the migration for both the SQLite and Firestore repositories
- legacy fields are removed in the same release once the backfill has run; no dual-write compatibility window

### Phase 3: Update frontend behavior

- meal planner UI label: `Cook servings`
- daily log UI label: `Ate servings`
- daily log default recipe amount to `1`
- editing a food log entry should update `consumed_servings` and recompute entry nutrition from the persisted per-serving snapshot, not from the current recipe

### Phase 4: Remove ambiguous legacy fields

- remove old `recipe_servings` semantics
- remove frontend nutrition math duplicated across components
- centralize nutrition math in backend services and shared frontend utilities only where needed for display

## UI Expectations

### Recipe editor

- show `Recipe yields N servings`
- show total nutrition
- show per-serving nutrition

### Meal planner

- show `Cook N servings`
- show nutrition preview for the whole planned cook quantity if useful
- do not imply that the planner quantity equals a specific person's consumed amount

### Daily log

- when logging a recipe, default to `1` serving
- allow changing to `0.5`, `1`, `1.5`, `2`, etc.
- show entry nutrition from the stored snapshot
- if the recipe has changed since the entry was logged, the displayed entry remains unchanged

## Open Decisions

1. Whether `meal_plan_id` should be stored on food log entries from planned meals
2. Whether ingredient and pantry nutrition should also be normalized to the same `Nutrition` object immediately or in a later phase

## Recommendation

Implement the refactor with these defaults:

- `Recipe.yield_servings`
- `MealPlan.planned_servings`
- `FoodLogEntry.consumed_servings`
- nested `Nutrition` objects in API/domain models
- snapshot-based persistence for all food log nutrition
- `consumed_servings` defaults to `1` even when logging from a meal plan
- optional `meal_plan_id` link for traceability, but no behavioral coupling
