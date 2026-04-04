import type { MealPlan } from '../../types'

interface Props {
  slot: string
  plan?: MealPlan
  onAdd: () => void
  onRemove?: () => void
}

const slotColors: Record<string, string> = {
  breakfast: 'bg-amber-50 border-amber-200',
  lunch: 'bg-green-50 border-green-200',
  dinner: 'bg-blue-50 border-blue-200',
  snack: 'bg-purple-50 border-purple-200',
}

export default function MealSlot({ slot, plan, onAdd, onRemove }: Props) {
  const servings = plan?.planned_servings || plan?.recipe?.yield_servings || 1

  return (
    <div className={`rounded border px-2 py-1 mb-1 text-xs ${slotColors[slot] || 'bg-gray-50 border-gray-200'}`}>
      <span className="font-medium capitalize text-gray-500">{slot}</span>
      {plan?.recipe ? (
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-gray-800 truncate">
            {plan.recipe.name}
            {servings > 1 && <span className="text-gray-400 ml-1">({servings}p)</span>}
          </span>
          {onRemove && (
            <button onClick={onRemove} className="text-red-400 hover:text-red-600 ml-1 shrink-0">x</button>
          )}
        </div>
      ) : (
        <button onClick={onAdd} className="block text-indigo-500 hover:text-indigo-700 mt-0.5">+ add</button>
      )}
    </div>
  )
}
