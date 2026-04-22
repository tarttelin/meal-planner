import { Link } from 'react-router-dom'
import type { MealPlan } from '../../types'

interface Props {
  slot: string
  plan?: MealPlan
  onAdd: () => void
  onRemove?: () => void
}

const slotColors: Record<string, string> = {
  breakfast: 'ui-slot-breakfast',
  lunch: 'ui-slot-lunch',
  dinner: 'ui-slot-dinner',
  snack: 'ui-slot-snack',
}

export default function MealSlot({ slot, plan, onAdd, onRemove }: Props) {
  const servings = plan?.planned_servings || plan?.recipe?.yield_servings || 1

  return (
    <div className={`rounded px-2 py-1 mb-1 text-xs ${slotColors[slot] || 'ui-card-soft'}`}>
      <span className="font-medium capitalize ui-muted">{slot}</span>
      {plan?.recipe ? (
        <div className="flex items-center justify-between mt-0.5">
          <div className="min-w-0">
            <Link to={`/recipes/${plan.recipe.id}`} className="ui-link-action hover:underline block truncate">
              {plan.recipe.name}
            </Link>
            {servings > 1 && <span className="ui-muted">({servings}p)</span>}
          </div>
          {onRemove && (
            <button onClick={onRemove} className="ui-btn ui-btn-danger-soft ml-1 px-1 py-0 text-xs shrink-0">x</button>
          )}
        </div>
      ) : (
        <button onClick={onAdd} className="block ui-link-action mt-0.5">+ add</button>
      )}
    </div>
  )
}
