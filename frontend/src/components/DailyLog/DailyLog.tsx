import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getMealPlans } from '../../api/mealPlans'
import { listRecipes } from '../../api/recipes'
import { getFoodLog, createFoodLogEntry, updateFoodLogEntry, deleteFoodLogEntry } from '../../api/foodLog'
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

function NutritionLabel({ calories, protein, carbs, fat }: { calories: number; protein: number; carbs: number; fat: number }) {
  return (
    <span className="text-xs ui-muted">
      <span className="font-medium">{Math.round(calories)}</span> kcal
      {' '}<span className="ui-metric-protein">P:{Math.round(protein)}g</span>
      {' '}<span className="ui-metric-carb">C:{Math.round(carbs)}g</span>
      {' '}<span className="ui-metric-fat">F:{Math.round(fat)}g</span>
    </span>
  )
}

function formatQuantity(quantity: number | null): string {
  if (quantity == null) return ''
  const rounded = Math.round(quantity * 10) / 10
  return `${rounded}g`
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
  const [editingQuantityId, setEditingQuantityId] = useState<string | null>(null)
  const [editingQuantity, setEditingQuantity] = useState('')
  const [savingQuantityId, setSavingQuantityId] = useState<string | null>(null)

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
    await createFoodLogEntry({
      date: dateStr,
      slot,
      name: recipe.name,
      recipe_id: recipe.id,
      consumed_servings: pickerServings || 1,
      profile_id: profileId ?? null,
    })
    setPicker(null)
    loadData()
  }

  const confirmPlannedMeal = async (plan: MealPlan) => {
    const recipe = recipes.find(r => r.id === plan.recipe_id)
    if (!recipe) return
    await createFoodLogEntry({
      date: dateStr,
      slot: plan.slot,
      name: recipe.name,
      recipe_id: recipe.id,
      meal_plan_id: plan.id,
      consumed_servings: 1,
      profile_id: profileId ?? null,
    })
    loadData()
  }

  const logPantryItem = async (item: PantryItem, slot: string | null) => {
    await createFoodLogEntry({
      date: dateStr,
      slot,
      name: [item.brand, item.name].filter(Boolean).join(' '),
      pantry_item_id: item.id,
      profile_id: profileId ?? null,
      quantity_g: pantryQty || 100,
    })
    setPicker(null)
    loadData()
  }

  const removeEntry = async (id: string) => {
    await deleteFoodLogEntry(id)
    loadData()
  }

  const startQuantityEdit = (entry: FoodLogEntry) => {
    setEditingQuantityId(entry.id)
    setEditingQuantity(entry.quantity_g != null ? String(entry.quantity_g) : '100')
  }

  const cancelQuantityEdit = () => {
    setEditingQuantityId(null)
    setEditingQuantity('')
  }

  const saveQuantityEdit = async (entry: FoodLogEntry) => {
    const quantity = Number(editingQuantity)
    if (!Number.isFinite(quantity) || quantity <= 0) return
    setSavingQuantityId(entry.id)
    try {
      await updateFoodLogEntry(entry.id, { quantity_g: quantity })
      cancelQuantityEdit()
      await loadData()
    } finally {
      setSavingQuantityId(null)
    }
  }

  const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'] as const
  const snacks = foodLog.filter(e => !e.slot)

  const dayTotal = { calories: 0, protein: 0, carbs: 0, fat: 0 }
  SLOTS.forEach(slot => {
    const logged = foodLog.filter(e => e.slot === slot)
    if (logged.length > 0) {
      logged.forEach(e => {
        dayTotal.calories += e.nutrition?.calories || 0
        dayTotal.protein += e.nutrition?.protein || 0
        dayTotal.carbs += e.nutrition?.carbs || 0
        dayTotal.fat += e.nutrition?.fat || 0
      })
    } else {
      const plan = plans.find(p => p.slot === slot)
      if (plan) {
        const recipe = recipes.find(r => r.id === plan.recipe_id)
        if (recipe) {
          const servings = plan.planned_servings || recipe.yield_servings
          const perServing = recipe.per_serving
          dayTotal.calories += perServing.calories * servings
          dayTotal.protein += perServing.protein * servings
          dayTotal.carbs += perServing.carbs * servings
          dayTotal.fat += perServing.fat * servings
        }
      }
    }
  })
  snacks.forEach(e => {
    dayTotal.calories += e.nutrition?.calories || 0
    dayTotal.protein += e.nutrition?.protein || 0
    dayTotal.carbs += e.nutrition?.carbs || 0
    dayTotal.fat += e.nutrition?.fat || 0
  })

  const isToday = dateStr === formatDate(new Date())
  const dayLabel = isToday ? 'Today' : currentDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
  const targets = activeProfile ? {
    calories: activeProfile.calorie_target,
    protein: activeProfile.protein_target,
    carbs: activeProfile.carbs_target,
    fat: activeProfile.fat_target,
  } : null
  const parsedEditingQuantity = Number(editingQuantity)
  const quantityIsValid = editingQuantity.trim() !== '' && Number.isFinite(parsedEditingQuantity) && parsedEditingQuantity > 0

  const renderEntryName = (entry: FoodLogEntry) => {
    if (entry.recipe_id) {
      return (
        <Link to={`/recipes/${entry.recipe_id}`} className="text-sm font-medium ui-link-action hover:underline block truncate">
          {entry.name}
        </Link>
      )
    }
    return <p className="text-sm font-medium truncate">{entry.name}</p>
  }

  const renderEntryMeta = (entry: FoodLogEntry) => {
    const servingText = entry.consumed_servings && entry.consumed_servings > 1
      ? `Your portion (1 of ${entry.consumed_servings})`
      : ''
    const isEditing = editingQuantityId === entry.id
    const isSaving = savingQuantityId === entry.id
    const quantityText = formatQuantity(entry.quantity_g)

    if (!servingText && !entry.pantry_item_id) return null

    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs ui-muted">
        {servingText && <span>{servingText}</span>}
        {entry.pantry_item_id && !isEditing && (
          <>
            {quantityText && <span>{quantityText}</span>}
            <button onClick={() => startQuantityEdit(entry)} className="ui-link-action hover:underline">
              Edit qty
            </button>
          </>
        )}
        {entry.pantry_item_id && isEditing && (
          <>
            <input
              type="number"
              inputMode="decimal"
              min={1}
              step="1"
              value={editingQuantity}
              onChange={e => setEditingQuantity(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  void saveQuantityEdit(entry)
                }
                if (e.key === 'Escape') {
                  cancelQuantityEdit()
                }
              }}
              className="ui-input px-2 py-1 w-20"
            />
            <span>g</span>
            <button
              onClick={() => void saveQuantityEdit(entry)}
              disabled={!quantityIsValid || isSaving}
              className="ui-btn ui-btn-secondary px-2 py-0.5 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={cancelQuantityEdit} disabled={isSaving} className="ui-link-action hover:underline disabled:opacity-50">
              Cancel
            </button>
          </>
        )}
      </div>
    )
  }

  const renderLoggedEntry = (entry: FoodLogEntry, withBorder = false) => (
    <div
      key={entry.id}
      className={`flex items-center justify-between py-1 ${withBorder ? 'border-t' : ''}`}
      style={withBorder ? { borderColor: 'var(--border)' } : undefined}
    >
      <div className="min-w-0 flex-1">
        {renderEntryName(entry)}
        {renderEntryMeta(entry)}
      </div>
      <div className="flex items-center gap-2">
        <NutritionLabel calories={entry.nutrition?.calories || 0} protein={entry.nutrition?.protein || 0} carbs={entry.nutrition?.carbs || 0} fat={entry.nutrition?.fat || 0} />
        <button onClick={() => removeEntry(entry.id)} className="ui-btn ui-btn-danger-soft px-1 py-0 text-xs">x</button>
      </div>
    </div>
  )

  if (!activeProfile) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <h2 className="ui-page-title text-lg font-semibold mb-2">Select a profile</h2>
        <p className="text-sm ui-muted">Choose a family member from the dropdown in the top bar to view their personal food log.</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="ui-btn ui-btn-secondary px-3 py-1 text-sm">Prev</button>
        <div className="text-center">
          <h2 className="ui-page-title text-lg font-semibold">{activeProfile.name} - {dayLabel}</h2>
          <p className="text-xs ui-muted">{dateStr}</p>
        </div>
        <button onClick={() => navigate(1)} className="ui-btn ui-btn-secondary px-3 py-1 text-sm">Next</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="ui-fusion-panel ui-fusion-nutrition p-4">
          <h3 className="text-xs uppercase font-semibold ui-muted mb-2">Nutrition</h3>
          <div className="grid grid-cols-4 text-center">
            <div>
              <p className="text-2xl font-bold">{Math.round(dayTotal.calories)}</p>
              {targets?.calories && <p className="text-xs ui-muted">/ {targets.calories}</p>}
              <p className="text-xs ui-muted">kcal</p>
            </div>
            <div>
              <p className="text-2xl font-bold ui-metric-protein">{Math.round(dayTotal.protein)}g</p>
              {targets?.protein && <p className="text-xs ui-muted">/ {targets.protein}g</p>}
              <p className="text-xs ui-muted">protein</p>
            </div>
            <div>
              <p className="text-2xl font-bold ui-metric-carb">{Math.round(dayTotal.carbs)}g</p>
              {targets?.carbs && <p className="text-xs ui-muted">/ {targets.carbs}g</p>}
              <p className="text-xs ui-muted">carbs</p>
            </div>
            <div>
              <p className="text-2xl font-bold ui-metric-fat">{Math.round(dayTotal.fat)}g</p>
              {targets?.fat && <p className="text-xs ui-muted">/ {targets.fat}g</p>}
              <p className="text-xs ui-muted">fat</p>
            </div>
          </div>
        </div>
        <div className="ui-fusion-panel ui-fusion-training p-4">
          <h3 className="text-xs uppercase font-semibold ui-muted mb-2">Training</h3>
          <p className="text-sm ui-muted">Workout integration will appear here once training data is connected.</p>
        </div>
      </div>

      <div className="space-y-3">
        {SLOTS.map(slot => {
          const logged = foodLog.filter(e => e.slot === slot)
          const plan = plans.find(p => p.slot === slot)
          const hasLogged = logged.length > 0

          return (
            <div key={slot} className="ui-card p-3">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-semibold ui-muted uppercase">{slot}</h3>
                <div className="flex gap-2">
                  <button onClick={() => openRecipePicker(slot)} className="ui-link-action text-xs hover:underline">recipe</button>
                  <button onClick={() => openPantryPicker(slot)} className="ui-link-action text-xs hover:underline">ingredient</button>
                </div>
              </div>

              {hasLogged ? (
                logged.map(entry => renderLoggedEntry(entry))
              ) : plan ? (
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm ui-muted italic">
                      <Link to={`/recipes/${plan.recipe_id}`} className="ui-link-action hover:underline">
                        {plan.recipe?.name || 'Recipe'}
                      </Link>{' '}
                      <span className="text-xs">(planned)</span>
                    </p>
                  </div>
                  <button
                    onClick={() => confirmPlannedMeal(plan)}
                    className="ui-btn ui-btn-success px-2 py-0.5 text-xs"
                  >
                    Ate this
                  </button>
                </div>
              ) : (
                <p className="text-sm ui-muted">Nothing planned or logged</p>
              )}
            </div>
          )
        })}

        <div className="ui-card p-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-semibold ui-muted uppercase">Snacks & extras</h3>
            <button onClick={() => openPantryPicker(null)} className="ui-link-action text-xs hover:underline">+ Add</button>
          </div>
          {snacks.length === 0 && <p className="text-sm ui-muted">Nothing logged</p>}
          {snacks.map(entry => renderLoggedEntry(entry, true))}
        </div>
      </div>

      {picker?.type === 'recipe' && (
        <div className="fixed inset-0 ui-overlay flex items-center justify-center z-50" onClick={() => setPicker(null)}>
          <div className="ui-modal-panel p-4 w-96 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <h3 className="ui-page-title text-base font-semibold mb-2">Log recipe for {picker.slot}</h3>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Search recipes..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="ui-input px-2 py-1 text-sm flex-1"
                autoFocus
              />
              <div className="flex items-center gap-1">
                <label className="text-xs ui-muted">Portions:</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={pickerServings}
                  onChange={e => setPickerServings(e.target.value === '' ? '' : +e.target.value)}
                  className="ui-input px-2 py-1 text-sm w-14"
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {recipes
                .filter(r => !searchTerm || r.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(r => (
                  <button
                    key={r.id}
                    onClick={() => logRecipe(r, picker.slot)}
                    className="ui-list-option block w-full text-left px-3 py-2 text-sm"
                  >
                    {r.name}
                    <span className="text-xs ui-muted ml-1">({Math.round(r.per_serving.calories)} kcal/serving)</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {picker?.type === 'pantry' && (
        <div className="fixed inset-0 ui-overlay flex items-center justify-center z-50" onClick={() => setPicker(null)}>
          <div className="ui-modal-panel p-4 w-96 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <h3 className="ui-page-title text-base font-semibold mb-2">Log food{picker.slot ? ` for ${picker.slot}` : ''}</h3>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Search pantry..."
                value={searchTerm}
                onChange={e => searchPantryItems(e.target.value)}
                className="ui-input px-2 py-1 text-sm flex-1"
                autoFocus
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={pantryQty}
                  onChange={e => setPantryQty(e.target.value === '' ? '' : +e.target.value)}
                  className="ui-input px-2 py-1 text-sm w-16"
                />
                <span className="text-xs ui-muted">g</span>
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {pantryItems.length === 0 && <p className="ui-muted text-sm py-4 text-center">No pantry items found.</p>}
              {pantryItems.map(item => {
                const previewQty = pantryQty || 100
                const cal = item.calories_per_100g != null ? Math.round(item.calories_per_100g * previewQty / 100) : null
                return (
                  <button
                    key={item.id}
                    onClick={() => logPantryItem(item, picker.slot)}
                    className="ui-list-option w-full text-left p-2 flex gap-2 items-center text-sm"
                  >
                    {item.image_url && <img src={item.image_url} alt="" className="w-8 h-8 object-contain rounded" />}
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{item.brand ? `${item.brand} ` : ''}{item.name}</p>
                      <p className="text-xs ui-muted">{cal != null ? `${cal} kcal for ${previewQty}g` : ''}</p>
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
