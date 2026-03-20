import { useEffect, useState, useCallback } from 'react'
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

const SLOTS = ['breakfast', 'lunch', 'dinner'] as const
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const FULL_DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const slotColors: Record<string, string> = {
  breakfast: 'bg-amber-50 border-amber-200',
  lunch: 'bg-green-50 border-green-200',
  dinner: 'bg-blue-50 border-blue-200',
}

function formatDate(d: Date) { return d.toISOString().split('T')[0] }

function DayCard({ date, dayIndex, plans, profiles, onAdd, onRemove, profileName }: {
  date: Date
  dayIndex: number
  plans: MealPlan[]
  profiles: { id: string; name: string }[]
  onAdd: (dateStr: string, slot: string) => void
  onRemove: (id: string) => void
  profileName: (id: string | null) => string
}) {
  const dateStr = formatDate(date)
  return (
    <div className="bg-white rounded-lg shadow-sm border p-2 min-h-[200px] flex flex-col">
      <div className="text-sm font-medium text-gray-500 mb-2">
        <span className="hidden sm:inline">{DAY_NAMES[dayIndex]}</span>
        <span className="sm:hidden">{FULL_DAY_NAMES[dayIndex]}</span>
        {' '}{date.getDate()}/{date.getMonth() + 1}
      </div>
      <div className="flex-1">
        {SLOTS.map(slot => {
          const slotPlans = plans.filter(p => p.date === dateStr && p.slot === slot)
          return (
            <div key={slot} className={`rounded border px-2 py-1 mb-1 text-xs sm:text-xs ${slotColors[slot]}`}>
              <span className="font-medium capitalize text-gray-500">{slot}</span>
              {slotPlans.map(plan => (
                <div key={plan.id} className="flex items-center justify-between mt-0.5">
                  <span className="text-gray-800 truncate">
                    {plan.recipe?.name}
                    <span className="text-gray-400 ml-1">
                      {plan.servings && plan.servings > 1 ? `(${plan.servings}p) ` : ''}
                      {profileName(plan.profile_id) !== 'Everyone' ? profileName(plan.profile_id) : ''}
                    </span>
                  </span>
                  <button onClick={() => onRemove(plan.id)} className="text-red-400 hover:text-red-600 ml-1 shrink-0">x</button>
                </div>
              ))}
              <button
                onClick={() => onAdd(dateStr, slot)}
                className="block text-indigo-500 hover:text-indigo-700 mt-0.5"
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
  const [pickerServings, setPickerServings] = useState(1)
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
      servings: pickerServings,
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
        <button onClick={() => navigateWeek(-1)} className="px-3 py-1 bg-white border rounded shadow-sm hover:bg-gray-50">Prev</button>
        <h2 className="text-lg font-semibold">{weekStr}</h2>
        <button onClick={() => navigateWeek(1)} className="px-3 py-1 bg-white border rounded shadow-sm hover:bg-gray-50">Next</button>
      </div>

      {/* Mobile: day nav */}
      <div className="sm:hidden flex items-center justify-between mb-4">
        <button onClick={() => navigateMobileDay(-1)} className="px-3 py-1 bg-white border rounded shadow-sm hover:bg-gray-50">Prev</button>
        <div className="text-center">
          <h2 className="text-lg font-semibold">
            {FULL_DAY_NAMES[mobileDay]} {weekDates[mobileDay]?.getDate()}/{(weekDates[mobileDay]?.getMonth() ?? 0) + 1}
          </h2>
          <p className="text-xs text-gray-400">{weekStr}</p>
        </div>
        <button onClick={() => navigateMobileDay(1)} className="px-3 py-1 bg-white border rounded shadow-sm hover:bg-gray-50">Next</button>
      </div>

      {/* Desktop: 7-column grid */}
      <div className="hidden sm:grid grid-cols-7 gap-2">
        {weekDates.map((date, i) => (
          <DayCard
            key={i}
            date={date}
            dayIndex={i}
            plans={plans}
            profiles={profiles}
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
            profiles={profiles}
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
              className={`w-9 h-9 rounded-full text-xs font-medium ${
                i === mobileDay ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-500 hover:bg-gray-50'
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
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => { setShowPicker(null); setPickerSearch(''); setPickerTag(null) }}>
            <div className="bg-white rounded-lg shadow-lg p-4 w-96 max-w-[95vw] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <h3 className="font-semibold mb-2">Add to {showPicker.slot}</h3>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Search..."
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  className="border rounded px-2 py-1 text-sm flex-1"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 mb-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <label className="text-xs text-gray-500">For:</label>
                  <select
                    value={pickerProfileId}
                    onChange={e => setPickerProfileId(e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="">Everyone</option>
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <label className="text-xs text-gray-500">Portions:</label>
                  <input
                    type="number"
                    min={1}
                    value={pickerServings}
                    onChange={e => setPickerServings(Math.max(1, +e.target.value))}
                    className="border rounded px-2 py-1 text-sm w-14"
                  />
                </div>
              </div>
              {allTags.length > 0 && (
                <div className="flex gap-1 mb-2 flex-wrap">
                  <button
                    onClick={() => setPickerTag(null)}
                    className={`px-2 py-0.5 rounded text-xs ${pickerTag === null ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    All
                  </button>
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setPickerTag(pickerTag === tag ? null : tag)}
                      className={`px-2 py-0.5 rounded text-xs ${pickerTag === tag ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
              <div className="overflow-y-auto flex-1">
                {filtered.length === 0 && <p className="text-gray-500 text-sm">No recipes match.</p>}
                {filtered.map(r => (
                  <button
                    key={r.id}
                    onClick={() => { handleAssign(r.id); setPickerSearch(''); setPickerTag(null) }}
                    className="block w-full text-left px-3 py-2 rounded hover:bg-indigo-50 text-sm"
                  >
                    {r.name}
                    <span className="text-xs text-gray-400 ml-1">
                      ({Math.round(r.ingredients.reduce((s, ing) => s + (ing.calories || 0), 0) / pickerServings)} kcal/serving)
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
