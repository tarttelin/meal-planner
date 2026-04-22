import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getMealPlans, createMealPlan, deleteMealPlan } from '../../api/mealPlans'
import { listRecipes } from '../../api/recipes'
import type { MealPlan, Recipe } from '../../types'
import { useProfile } from '../../context/ProfileContext'

function getWeekString(date: Date): string {
  const d = new Date(date)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

function getWeekDates(date: Date): Date[] {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'] as const
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const FULL_DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const slotColors: Record<string, string> = {
  breakfast: 'ui-slot-breakfast',
  lunch: 'ui-slot-lunch',
  dinner: 'ui-slot-dinner',
  snack: 'ui-slot-snack',
}

function formatDate(d: Date) { return d.toISOString().split('T')[0] }

function DayCard({ date, dayIndex, plans, onAdd, onRemove, profileName }: {
  date: Date
  dayIndex: number
  plans: MealPlan[]
  onAdd: (dateStr: string, slot: string) => void
  onRemove: (id: string) => void
  profileName: (id: string | null) => string
}) {
  const dateStr = formatDate(date)
  return (
    <div className="ui-card p-2 min-h-[200px] flex flex-col">
      <div className="text-sm font-medium ui-muted mb-2">
        <span className="hidden sm:inline">{DAY_NAMES[dayIndex]}</span>
        <span className="sm:hidden">{FULL_DAY_NAMES[dayIndex]}</span>
        {' '}{date.getDate()}/{date.getMonth() + 1}
      </div>
      <div className="flex-1">
        {SLOTS.map(slot => {
          const slotPlans = plans.filter(p => p.date === dateStr && p.slot === slot)
          return (
            <div key={slot} className={`rounded px-2 py-1 mb-1 text-xs sm:text-xs ${slotColors[slot]}`}>
              <span className="font-medium capitalize ui-muted">{slot}</span>
              {slotPlans.map(plan => (
                <div key={plan.id} className="flex items-center justify-between mt-0.5">
                  <div className="min-w-0 flex-1">
                    {plan.recipe ? (
                      <Link
                        to={`/recipes/${plan.recipe.id}`}
                        className="ui-link-action hover:underline block truncate"
                      >
                        {plan.recipe.name}
                      </Link>
                    ) : (
                      <span className="truncate block">Recipe</span>
                    )}
                    <span className="ui-muted">
                      {plan.planned_servings && plan.planned_servings > 1 ? `(${plan.planned_servings}p) ` : ''}
                      {profileName(plan.profile_id) !== 'Everyone' ? profileName(plan.profile_id) : ''}
                    </span>
                  </div>
                  <button onClick={() => onRemove(plan.id)} className="ml-auto ui-btn ui-btn-danger-soft px-1 py-0 text-xs shrink-0">x</button>
                </div>
              ))}
              <button
                onClick={() => onAdd(dateStr, slot)}
                className="block ui-link-action mt-0.5"
              >
                + add
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function WeekView() {
  const { profiles } = useProfile()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [mobileDay, setMobileDay] = useState(() => {
    const today = new Date()
    const day = today.getDay()
    return day === 0 ? 6 : day - 1
  })
  const [plans, setPlans] = useState<MealPlan[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [showPicker, setShowPicker] = useState<{ date: string; slot: string } | null>(null)
  const [pickerSearch, setPickerSearch] = useState('')
  const [pickerTag, setPickerTag] = useState<string | null>(null)
  const [pickerServings, setPickerServings] = useState<number | ''>(1)
  const [pickerProfileId, setPickerProfileId] = useState<string>('')

  const weekStr = getWeekString(currentDate)
  const weekDates = getWeekDates(currentDate)

  const loadData = useCallback(async () => {
    const [p, r] = await Promise.all([getMealPlans(weekStr), listRecipes()])
    setPlans(p)
    setRecipes(r)
  }, [weekStr])

  useEffect(() => { loadData() }, [loadData])

  const navigateWeek = (delta: number) => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + delta * 7)
    setCurrentDate(d)
  }

  const navigateMobileDay = (delta: number) => {
    const next = mobileDay + delta
    if (next < 0) {
      navigateWeek(-1)
      setMobileDay(6)
    } else if (next > 6) {
      navigateWeek(1)
      setMobileDay(0)
    } else {
      setMobileDay(next)
    }
  }

  const handleAssign = async (recipeId: string) => {
    if (!showPicker) return
    await createMealPlan({
      date: showPicker.date,
      slot: showPicker.slot,
      recipe_id: recipeId,
      planned_servings: pickerServings || 1,
      profile_id: pickerProfileId || null,
    })
    setShowPicker(null)
    setPickerServings(1)
    setPickerProfileId('')
    loadData()
  }

  const handleRemove = async (id: string) => {
    await deleteMealPlan(id)
    loadData()
  }

  const openPicker = (dateStr: string, slot: string) => {
    setShowPicker({ date: dateStr, slot })
    setPickerServings(1)
    setPickerProfileId('')
  }

  const profileName = (profileId: string | null) => {
    if (!profileId) return 'Everyone'
    return profiles.find(p => p.id === profileId)?.name ?? '?'
  }

  return (
    <div>
      {/* Desktop: week nav */}
      <div className="hidden sm:flex items-center justify-between mb-4">
        <button onClick={() => navigateWeek(-1)} className="ui-btn ui-btn-secondary px-3 py-1 text-sm">Prev</button>
        <h2 className="ui-page-title text-lg font-semibold">{weekStr}</h2>
        <button onClick={() => navigateWeek(1)} className="ui-btn ui-btn-secondary px-3 py-1 text-sm">Next</button>
      </div>

      {/* Mobile: day nav */}
      <div className="sm:hidden flex items-center justify-between mb-4">
        <button onClick={() => navigateMobileDay(-1)} className="ui-btn ui-btn-secondary px-3 py-1 text-sm">Prev</button>
        <div className="text-center">
          <h2 className="ui-page-title text-lg font-semibold">
            {FULL_DAY_NAMES[mobileDay]} {weekDates[mobileDay]?.getDate()}/{(weekDates[mobileDay]?.getMonth() ?? 0) + 1}
          </h2>
          <p className="text-xs ui-muted">{weekStr}</p>
        </div>
        <button onClick={() => navigateMobileDay(1)} className="ui-btn ui-btn-secondary px-3 py-1 text-sm">Next</button>
      </div>

      {/* Desktop: 7-column grid */}
      <div className="hidden sm:grid grid-cols-7 gap-2">
        {weekDates.map((date, i) => (
          <DayCard
            key={i}
            date={date}
            dayIndex={i}
            plans={plans}
            onAdd={openPicker}
            onRemove={handleRemove}
            profileName={profileName}
          />
        ))}
      </div>

      {/* Mobile: single day */}
      <div className="sm:hidden">
        {weekDates[mobileDay] && (
          <DayCard
            date={weekDates[mobileDay]}
            dayIndex={mobileDay}
            plans={plans}
            onAdd={openPicker}
            onRemove={handleRemove}
            profileName={profileName}
          />
        )}
        <div className="flex gap-1 mt-3 justify-center">
          {DAY_NAMES.map((name, i) => (
            <button
              key={i}
              onClick={() => setMobileDay(i)}
              className={`w-9 h-9 text-xs font-medium ui-pill ${
                i === mobileDay ? 'ui-pill-active' : ''
              }`}
            >
              {name.charAt(0)}
            </button>
          ))}
        </div>
      </div>

      {showPicker && (() => {
        const allTags = [...new Set(recipes.flatMap(r => r.tags || []))].sort()
        const filtered = recipes.filter(r => {
          if (pickerSearch && !r.name.toLowerCase().includes(pickerSearch.toLowerCase())) return false
          if (pickerTag && !(r.tags || []).includes(pickerTag)) return false
          return true
        })
        return (
          <div className="fixed inset-0 ui-overlay flex items-center justify-center z-50" onClick={() => { setShowPicker(null); setPickerSearch(''); setPickerTag(null) }}>
            <div className="ui-modal-panel p-4 w-96 max-w-[95vw] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <h3 className="ui-page-title text-base font-semibold mb-2">Add to {showPicker.slot}</h3>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Search..."
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  className="ui-input px-2 py-1 text-sm flex-1"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 mb-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <label className="text-xs ui-muted">For:</label>
                  <select
                    value={pickerProfileId}
                    onChange={e => setPickerProfileId(e.target.value)}
                    className="ui-input px-2 py-1 text-sm"
                  >
                    <option value="">Everyone</option>
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
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
              {allTags.length > 0 && (
                <div className="flex gap-1 mb-2 flex-wrap">
                  <button
                    onClick={() => setPickerTag(null)}
                    className={`px-2 py-0.5 text-xs ui-pill ${pickerTag === null ? 'ui-pill-active' : ''}`}
                  >
                    All
                  </button>
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setPickerTag(pickerTag === tag ? null : tag)}
                      className={`px-2 py-0.5 text-xs ui-pill ${pickerTag === tag ? 'ui-pill-active' : ''}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
              <div className="overflow-y-auto flex-1">
                {filtered.length === 0 && <p className="ui-muted text-sm">No recipes match.</p>}
                {filtered.map(r => (
                  <button
                    key={r.id}
                    onClick={() => { handleAssign(r.id); setPickerSearch(''); setPickerTag(null) }}
                    className="ui-list-option block w-full text-left px-3 py-2 text-sm"
                  >
                    {r.name}
                    <span className="text-xs ui-muted ml-1">
                      ({Math.round(r.ingredients.reduce((s, ing) => s + (ing.calories || 0), 0) / (pickerServings || 1))} kcal/serving)
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
