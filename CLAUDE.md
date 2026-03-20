## Python / Backend

**IMPORTANT: This project uses `uv` for Python project and dependency management. Never use `pip`, `pip install`, or `source .venv/bin/activate`.**

The backend is a uv-managed project defined in `backend/pyproject.toml`.

- Add a dependency: `uv add <package>` (from backend/ directory)
- Remove a dependency: `uv remove <package>`
- Sync deps: `uv sync`
- Run backend: `uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
- Run a script: `uv run python script.py`
- Run a one-liner: `uv run python -c "..."`

Never activate the venv manually. `uv run` handles everything.

### Environment variables
- `REPO_TYPE=sqlite` (default) — uses SQLAlchemy + SQLite at backend/data/meals.db
- `REPO_TYPE=firestore` — uses Google Cloud Firestore
- `ALLOWED_DOMAIN` — restrict Firebase Auth to this email domain (empty = auth disabled)
- `API_KEY` — shared secret for machine access (Claude Code, scripts)

### Deployed API access
The deployed API at `https://meal-planner-567448989003.europe-west1.run.app` requires auth.
Use the `X-API-Key` header for machine access:
```bash
curl -H "X-API-Key: $MEAL_PLANNER_API_KEY" https://meal-planner-567448989003.europe-west1.run.app/api/recipes
```

### Running locally
- Backend: `cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
- Frontend: `cd frontend && npm run dev -- --host`
- Frontend at http://localhost:5173, API at http://localhost:8000

## Frontend

- Install deps: `npm install` (in frontend/)
- Dev server: `npm run dev -- --host`
- Type check: `npx tsc --noEmit` (must be run from frontend/ directory)
- Build: `npx vite build`

## Shopping App API (localhost:8000)

### Create a recipe
```bash
curl -X POST http://localhost:8000/api/recipes -H "Content-Type: application/json" -d '{
  "name": "Chicken Stir Fry",
  "servings": 4,
  "prep_time_mins": 15,
  "cook_time_mins": 10,
  "instructions": ["Slice chicken", "Heat wok", "Stir fry vegetables", "Add sauce"],
  "tags": ["quick", "asian"],
  "ingredients": [
    {"name": "chicken breast", "quantity": 500, "unit": "g"},
    {"name": "soy sauce", "quantity": 3, "unit": "tbsp"}
  ]
}'
```

### List recipes
```bash
curl http://localhost:8000/api/recipes
curl http://localhost:8000/api/recipes?search=chicken
```

### Plan a meal
```bash
curl -X POST http://localhost:8000/api/meal-plans -H "Content-Type: application/json" -d '{
  "date": "2026-03-23",
  "slot": "dinner",
  "recipe_id": "<recipe-uuid>"
}'
```

### Get week's meal plan
```bash
curl "http://localhost:8000/api/meal-plans?week=2026-W13"
```

### Generate shopping list from meal plan
```bash
curl -X POST http://localhost:8000/api/shopping-list/generate -H "Content-Type: application/json" -d '{
  "start_date": "2026-03-23",
  "end_date": "2026-03-29"
}'
```
