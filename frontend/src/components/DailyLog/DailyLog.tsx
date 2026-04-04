import { useEffect, useState, useCallback } from 'react'
import { getMealPlans } from '../../api/mealPlans'
import { listRecipes } from '../../api/recipes'
import { getFoodLog, createFoodLogEntry, deleteFoodLogEntry } from '../../api/foodLog'
import { listPantry } from '../../api/pantry'
import { useProfile } from '../../context/ProfileContext'
import type { MealPlan, Recipe, FoodLogEntry, PantryItem } from '../../types'

function formatDate(d: Date) { return d.toISOString().split('T')[0] }

function getWeekString(date: Date): string {
  const d = new Date(date)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

function recipeNutrition(recipe: Recipe, servings: number) {
  const total = recipe.ingredients.reduce(
    (acc, ing) => ({
      calories: acc.calories + (ing.calories || 0),
      protein: acc.protein + (ing.protein || 0),
      carbs: acc.carbs + (ing.carbs || 0),
      fat: acc.fat + (ing.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )
  return {
    calories: total.calories / servings,
    protein: total.protein / servings,
    carbs: total.carbs / servings,
    fat: total.fat / servings,
  }
}

function NutritionLabel({ calories, protein, carbs, fat }: { calories: number; protein: number; carbs: number; fat: number }) {
  return (
    <span className="text-xs text-gray-500">
      <span className="font-medium text-gray-700">{Math.round(calories)}</span> kcal
      {' '}<span className="text-blue-500">P:{Math.round(protein)}g</span>
      {' '}<span className="text-amber-500">C:{Math.round(carbs)}g</span>
      {' '}<span className="text-red-400">F:{Math.round(fat)}g</span>
    </span>
  )
}

type PickerMode = { type: 'recipe'; slot: string } | { type: 'pantry'; slot: string | null }

export default function DailyLog() {
  const { activeProfile } = useProfile()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [plans, setPlans] = useState<MealPlan[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [foodLog, setFoodLog] = useState<FoodLogEntry[]>([])
  const [picker, setPicker] = useState<PickerMode | null>(null)
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [pickerServings, setPickerServings] = useState<number | ''>(1)
  const [pantryQty, setPantryQty] = useState<number | ''>(100)

  const profileId = activeProfile?.id
  const dateStr = formatDate(currentDate)
  const weekStr = getWeekString(currentDate)

  const loadData = useCallback(async () => {
    const [p, r, fl] = await Promise.all([
      getMealPlans(weekStr, profileId),
      listRecipes(),
      getFoodLog(dateStr, dateStr, profileId),
    ])
    setPlans(p.filter(mp => mp.date === dateStr))
    setRecipes(r)
    setFoodLog(fl)
  }, [dateStr, weekStr, profileId])

  useEffect(() => { loadData() }, [loadData])

  const navigate = (delta: number) => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + delta)
    setCurrentDate(d)
  }

  const openRecipePicker = (slot: string) => {
    setPicker({ type: 'recipe', slot })
    setSearchTerm('')
    setPickerServings(1)
  }

  const openPantryPicker = (slot: string | null) => {
    setPicker({ type: 'pantry', slot })
    setSearchTerm('')
    setPantryQty(100)
    listPantry().then(setPantryItems)
  }

  const searchPantryItems = (q: string) => {
    setSearchTerm(q)
    listPantry(q || undefined).then(setPantryItems)
  }

  const logRecipe = async (recipe: Recipe, slot: string) => {
    const servings = pickerServings || 1
    const n = recipeNutrition(recipe, servings)
    await createFoodLogEntry({
      date: dateStr,
      slot,
      name: recipe.name,
      recipe_id: recipe.id,
      recipe_servings: servings,
      profile_id: profileId ?? null,
      pantry_item_id: null,
      quantity_g: null,
      calories: Math.round(n.calories),
      protein: Math.round(n.protein * 10) / 10,
      carbs: Math.round(n.carbs * 10) / 10,
      fat: Math.round(n.fat * 10) / 10,
    })
    setPicker(null)
    loadData()
  }

  const confirmPlannedMeal = async (plan: MealPlan) => {
    const recipe = recipes.find(r => r.id === plan.recipe_id)
    if (!recipe) return
    const n = recipeNutrition(recipe, recipe.servings)
    await createFoodLogEntry({
      date: dateStr,
      slot: plan.slot,
      name: recipe.name,
      recipe_id: recipe.id,
      recipe_servings: recipe.servings,
      profile_id: profileId ?? null,
      pantry_item_id: null,
      quantity_g: null,
      calories: Math.round(n.calories),
      protein: Math.round(n.protein * 10) / 10,
      carbs: Math.round(n.carbs * 10) / 10,
      fat: Math.round(n.fat * 10) / 10,
    })
    loadData()
  }

  const logPantryItem = async (item: PantryItem, slot: string | null) => {
    const qty = pantryQty || 100
    const scale = qty / 100
    await createFoodLogEntry({
      date: dateStr,
      slot,
      name: [item.brand, item.name].filter(Boolean).join(' '),
      pantry_item_id: item.id,
      recipe_id: null,
      recipe_servings: null,
      profile_id: profileId ?? null,
      quantity_g: qty,
      calories: item.calories_per_100g != null ? Math.round(item.calories_per_100g * scale) : null,
      protein: item.protein_per_100g != null ? Math.round(item.protein_per_100g * scale * 10) / 10 : null,
      carbs: item.carbs_per_100g != null ? Math.round(item.carbs_per_100g * scale * 10) / 10 : null,
      fat: item.fat_per_100g != null ? Math.round(item.fat_per_100g * scale * 10) / 10 : null,
    })
    setPicker(null)
    loadData()
  }

  const removeEntry = async (id: string) => {
    await deleteFoodLogEntry(id)
    loadData()
  }

  const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'] as const
  const snacks = foodLog.filter(e => !e.slot)

  const dayTotal = { calories: 0, protein: 0, carbs: 0, fat: 0 }
  SLOTS.forEach(slot => {
    const logged = foodLog.filter(e => e.slot === slot)
    if (logged.length > 0) {
      logged.forEach(e => {
        dayTotal.calories += e.calories || 0
        dayTotal.protein += e.protein || 0
        dayTotal.carbs += e.carbs || 0
        dayTotal.fat += e.fat || 0
      })
    } else {
      const plan = plans.find(p => p.slot === slot)
      if (plan) {
        const recipe = recipes.find(r => r.id === plan.recipe_id)
        if (recipe) {
          const n = recipeNutrition(recipe, plan.servings || recipe.servings)
          dayTotal.calories += n.calories
          dayTotal.protein += n.protein
          dayTotal.carbs += n.carbs
          dayTotal.fat += n.fat
        }
      }
    }
  })
  snacks.forEach(e => {
    dayTotal.calories += e.calories || 0
    dayTotal.protein += e.protein || 0
    dayTotal.carbs += e.carbs || 0
    dayTotal.fat += e.fat || 0
  })

  const isToday = dateStr === formatDate(new Date())
  const dayLabel = isToday ? 'Today' : currentDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
  const targets = activeProfile ? {
    calories: activeProfile.calorie_target,
    protein: activeProfile.protein_target,
    carbs: activeProfile.carbs_target,
    fat: activeProfile.fat_target,
  } : null

  if (!activeProfile) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <h2 className="text-lg font-semibold mb-2">Select a profile</h2>
        <p className="text-sm text-gray-500">Choose a family member from the dropdown in the top bar to view their personal food log.</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="px-3 py-1 bg-white border rounded shadow-sm hover:bg-gray-50">Prev</button>
        <div className="text-center">
          <h2 className="text-lg font-semibold">{activeProfile.name} - {dayLabel}</h2>
          <p className="text-xs text-gray-400">{dateStr}</p>
        </div>
        <button onClick={() => navigate(1)} className="px-3 py-1 bg-white border rounded shadow-sm hover:bg-gray-50">Next</button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
        <div className="grid grid-cols-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-800">{Math.round(dayTotal.calories)}</p>
            {targets?.calories && <p className="text-xs text-gray-400">/ {targets.calories}</p>}
            <p className="text-xs text-gray-400">kcal</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">{Math.round(dayTotal.protein)}g</p>
            {targets?.protein && <p className="text-xs text-gray-400">/ {targets.protein}g</p>}
            <p className="text-xs text-gray-400">protein</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-500">{Math.round(dayTotal.carbs)}g</p>
            {targets?.carbs && <p className="text-xs text-gray-400">/ {targets.carbs}g</p>}
            <p className="text-xs text-gray-400">carbs</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-400">{Math.round(dayTotal.fat)}g</p>
            {targets?.fat && <p className="text-xs text-gray-400">/ {targets.fat}g</p>}
            <p className="text-xs text-gray-400">fat</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {SLOTS.map(slot => {
          const logged = foodLog.filter(e => e.slot === slot)
          const plan = plans.find(p => p.slot === slot)
          const hasLogged = logged.length > 0

          return (
            <div key={slot} className="bg-white rounded-lg shadow-sm border p-3">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-semibold text-gray-400 uppercase">{slot}</h3>
                <div className="flex gap-2">
                  <button onClick={() => openRecipePicker(slot)} className="text-indigo-500 text-xs hover:underline">recipe</button>
                  <button onClick={() => openPantryPicker(slot)} className="text-purple-500 text-xs hover:underline">ingredient</button>
                </div>
              </div>

              {hasLogged ? (
                logged.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-medium">{entry.name}</p>
                      <p className="text-xs text-gray-400">
                        {entry.recipe_servings && entry.recipe_servings > 1 ? `Your portion (1 of ${entry.recipe_servings})` : ''}
                        {entry.quantity_g ? `${entry.quantity_g}g` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <NutritionLabel calories={entry.calories || 0} protein={entry.protein || 0} carbs={entry.carbs || 0} fat={entry.fat || 0} />
                      <button onClick={() => removeEntry(entry.id)} className="text-red-300 hover:text-red-500">x</button>
                    </div>
                  </div>
                ))
              ) : plan ? (
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm text-gray-400 italic">{plan.recipe?.name} <span className="text-xs">(planned)</span></p>
                  </div>
                  <button
                    onClick={() => confirmPlannedMeal(plan)}
                    className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs hover:bg-green-200"
                  >
                    Ate this
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-300">Nothing planned or logged</p>
              )}
            </div>
          )
        })}

        <div className="bg-white rounded-lg shadow-sm border p-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-semibold text-gray-400 uppercase">Snacks & extras</h3>
            <button onClick={() => openPantryPicker(null)} className="text-purple-500 text-xs hover:underline">+ Add</button>
          </div>
          {snacks.length === 0 && <p className="text-sm text-gray-300">Nothing logged</p>}
          {snacks.map(entry => (
            <div key={entry.id} className="flex items-center justify-between py-1 border-t border-gray-50">
              <div>
                <p className="text-sm">{entry.name}</p>
                <p className="text-xs text-gray-400">{entry.quantity_g ? `${entry.quantity_g}g` : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <NutritionLabel calories={entry.calories || 0} protein={entry.protein || 0} carbs={entry.carbs || 0} fat={entry.fat || 0} />
                <button onClick={() => removeEntry(entry.id)} className="text-red-300 hover:text-red-500">x</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {picker?.type === 'recipe' && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setPicker(null)}>
          <div className="bg-white rounded-lg shadow-lg p-4 w-96 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-2">Log recipe for {picker.slot}</h3>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Search recipes..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="border rounded px-2 py-1 text-sm flex-1"
                autoFocus
              />
              <div className="flex items-center gap-1">
                <label className="text-xs text-gray-500">Portions:</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={pickerServings}
                  onChange={e => setPickerServings(e.target.value === '' ? '' : +e.target.value)}
                  className="border rounded px-2 py-1 text-sm w-14"
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {recipes
                .filter(r => !searchTerm || r.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(r => {
                  const n = recipeNutrition(r, pickerServings || 1)
                  return (
                    <button
                      key={r.id}
                      onClick={() => logRecipe(r, picker.slot)}
                      className="block w-full text-left px-3 py-2 rounded hover:bg-indigo-50 text-sm"
                    >
                      {r.name}
                      <span className="text-xs text-gray-400 ml-1">({Math.round(n.calories)} kcal/serving)</span>
                    </button>
                  )
                })}
            </div>
          </div>
        </div>
      )}

      {picker?.type === 'pantry' && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setPicker(null)}>
          <div className="bg-white rounded-lg shadow-lg p-4 w-96 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-2">Log food{picker.slot ? ` for ${picker.slot}` : ''}</h3>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Search pantry..."
                value={searchTerm}
                onChange={e => searchPantryItems(e.target.value)}
                className="border rounded px-2 py-1 text-sm flex-1"
                autoFocus
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={pantryQty}
                  onChange={e => setPantryQty(e.target.value === '' ? '' : +e.target.value)}
                  className="border rounded px-2 py-1 text-sm w-16"
                />
                <span className="text-xs text-gray-500">g</span>
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {pantryItems.length === 0 && <p className="text-gray-500 text-sm py-4 text-center">No pantry items found.</p>}
              {pantryItems.map(item => {
                const previewQty = pantryQty || 100
                const cal = item.calories_per_100g != null ? Math.round(item.calories_per_100g * previewQty / 100) : null
                return (
                  <button
                    key={item.id}
                    onClick={() => logPantryItem(item, picker.slot)}
                    className="w-full text-left p-2 rounded hover:bg-purple-50 flex gap-2 items-center text-sm"
                  >
                    {item.image_url && <img src={item.image_url} alt="" className="w-8 h-8 object-contain rounded" />}
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{item.brand ? `${item.brand} ` : ''}{item.name}</p>
                      <p className="text-xs text-gray-400">{cal != null ? `${cal} kcal for ${previewQty}g` : ''}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
