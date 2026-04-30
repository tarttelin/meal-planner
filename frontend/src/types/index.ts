export interface Nutrition {
  calories: number
  protein: number
  carbs: number
  fat: number
  nutriments: Record<string, number | string>
}

export interface Ingredient {
  id?: string
  name: string
  quantity: number | null
  unit: string | null
  notes: string | null
  tesco_search_term: string | null
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  pantry_item_id?: string | null
}

export interface PantryItem {
  id: string
  name: string
  brand: string | null
  barcode: string | null
  category: string | null
  calories_per_100g: number | null
  protein_per_100g: number | null
  carbs_per_100g: number | null
  fat_per_100g: number | null
  image_url: string | null
  nutriments: Record<string, number | string> | null
}

export interface Recipe {
  id: string
  name: string
  description: string | null
  yield_servings: number
  prep_time_mins: number | null
  cook_time_mins: number | null
  instructions: string[] | null
  tags: string[] | null
  ingredients: Ingredient[]
  total: Nutrition
  per_serving: Nutrition
}

export interface RecipeCreate {
  name: string
  description?: string | null
  yield_servings?: number
  prep_time_mins?: number | null
  cook_time_mins?: number | null
  instructions?: string[] | null
  tags?: string[] | null
  ingredients?: Ingredient[]
}

export interface Profile {
  id: string
  name: string
  calorie_target: number | null
  protein_target: number | null
  carbs_target: number | null
  fat_target: number | null
}

export interface MealPlan {
  id: string
  date: string
  slot: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  recipe_id: string
  planned_servings: number | null
  profile_id: string | null
  recipe: { id: string; name: string; yield_servings: number } | null
}

export interface FoodLogEntry {
  id: string
  date: string
  slot: string | null
  name: string
  pantry_item_id: string | null
  recipe_id: string | null
  meal_plan_id: string | null
  consumed_servings: number | null
  profile_id: string | null
  quantity_g: number | null
  nutrition: Nutrition
  recipe_yield_servings_snapshot: number | null
  recipe_total_nutrition_snapshot: Nutrition | null
  recipe_per_serving_nutrition_snapshot: Nutrition | null
}

export interface ShoppingListItem {
  id: string
  ingredient_name: string
  quantity: number | null
  unit: string | null
  category: string | null
  tesco_search_term: string | null
  tesco_product_id: string | null
  added_to_basket: boolean
}

export interface StravaConnectionStatus {
  connected: boolean
  athlete_id: number | null
  athlete_name: string | null
  scope: string | null
}

export interface FitnessActivity {
  id: string
  provider: string
  provider_activity_id: string
  name: string
  sport_type: string | null
  start_date: string
  timezone: string | null
  distance_m: number | null
  moving_time_s: number | null
  elapsed_time_s: number | null
  total_elevation_gain_m: number | null
  average_speed_mps: number | null
  max_speed_mps: number | null
  average_heartrate: number | null
  max_heartrate: number | null
  calories: number | null
  summary_polyline: string | null
  strava_url: string | null
  fit_file_path: string | null
  fit_download_status: string
}

export interface FitnessActivityDetail extends FitnessActivity {
  streams: Record<string, unknown> | null
  raw: Record<string, unknown> | null
  derived_metrics: FitnessDerivedMetrics | null
}

export interface FitnessSplit {
  index: number
  distance_m: number
  moving_time_s: number
  pace_s_per_km: number
  average_heartrate: number | null
  elevation_gain_m: number
}

export interface FitnessInsight {
  kind: string
  title: string
  value: string
  detail: string
}

export interface FitnessDerivedMetrics {
  splits: FitnessSplit[]
  insights: FitnessInsight[]
  stopped_time_s: number
  ai_analysis: {
    status: 'not_analyzed' | string
    message: string
  }
}
