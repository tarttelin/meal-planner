import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getRecipe } from '../../api/recipes'
import { importRecipeIngredients } from '../../api/pantry'
import type { Recipe } from '../../types'

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>()
  const [recipe, setRecipe] = useState<Recipe | null>(null)

  useEffect(() => {
    if (id) getRecipe(id).then(setRecipe)
  }, [id])

  if (!recipe) return <p className="ui-muted">Loading...</p>

  return (
    <div className="max-w-2xl">
      <Link to="/recipes" className="ui-link-action text-sm hover:underline mb-4 block">Back to recipes</Link>
      <h1 className="ui-page-title text-2xl font-bold mb-2">{recipe.name}</h1>
      {recipe.description && <p className="ui-muted mb-4">{recipe.description}</p>}
      <div className="flex gap-4 text-sm ui-muted mb-4">
        <span>{recipe.yield_servings} servings</span>
        {recipe.prep_time_mins && <span>{recipe.prep_time_mins}m prep</span>}
        {recipe.cook_time_mins && <span>{recipe.cook_time_mins}m cook</span>}
      </div>

      {recipe.ingredients.length > 0 && (() => {
        const totals = recipe.ingredients.reduce(
          (acc, ing) => ({
            calories: acc.calories + (ing.calories || 0),
            protein: acc.protein + (ing.protein || 0),
            carbs: acc.carbs + (ing.carbs || 0),
            fat: acc.fat + (ing.fat || 0),
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 },
        )
        const hasNutrition = totals.calories > 0
        const perServing = {
          calories: Math.round(totals.calories / recipe.yield_servings),
          protein: Math.round(totals.protein / recipe.yield_servings),
          carbs: Math.round(totals.carbs / recipe.yield_servings),
          fat: Math.round(totals.fat / recipe.yield_servings),
        }
        return (
          <div className="ui-card p-4 mb-4">
            <h2 className="font-semibold mb-2">Ingredients</h2>
            <table className="ui-table">
              <thead>
                <tr className="text-left">
                  <th className="py-1">Ingredient</th>
                  <th className="py-1 w-20 text-right">kcal</th>
                  <th className="py-1 w-20 text-right">Protein</th>
                  <th className="py-1 w-20 text-right">Carbs</th>
                  <th className="py-1 w-20 text-right">Fat</th>
                </tr>
              </thead>
              <tbody>
                {recipe.ingredients.map((ing, i) => (
                  <tr key={i}>
                    <td className="py-1">{ing.quantity} {ing.unit} {ing.name}{ing.notes && <span className="ui-muted ml-1">({ing.notes})</span>}</td>
                    <td className="py-1 text-right ui-muted">{ing.calories ?? '-'}</td>
                    <td className="py-1 text-right ui-muted">{ing.protein ? `${ing.protein}g` : '-'}</td>
                    <td className="py-1 text-right ui-muted">{ing.carbs ? `${ing.carbs}g` : '-'}</td>
                    <td className="py-1 text-right ui-muted">{ing.fat ? `${ing.fat}g` : '-'}</td>
                  </tr>
                ))}
              </tbody>
              {hasNutrition && (
                <tfoot>
                  <tr className="font-medium">
                    <td className="py-1">Total</td>
                    <td className="py-1 text-right">{Math.round(totals.calories)}</td>
                    <td className="py-1 text-right">{Math.round(totals.protein)}g</td>
                    <td className="py-1 text-right">{Math.round(totals.carbs)}g</td>
                    <td className="py-1 text-right">{Math.round(totals.fat)}g</td>
                  </tr>
                  <tr className="ui-muted">
                    <td className="py-1">Per serving ({recipe.yield_servings})</td>
                    <td className="py-1 text-right">{perServing.calories}</td>
                    <td className="py-1 text-right">{perServing.protein}g</td>
                    <td className="py-1 text-right">{perServing.carbs}g</td>
                    <td className="py-1 text-right">{perServing.fat}g</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )
      })()}

      {recipe.instructions && recipe.instructions.length > 0 && (
        <div className="ui-card p-4">
          <h2 className="font-semibold mb-2">Instructions</h2>
          <ol className="list-decimal list-inside text-sm space-y-1">
            {recipe.instructions.map((step, i) => <li key={i}>{step}</li>)}
          </ol>
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <Link to={`/recipes/${recipe.id}/edit`} className="ui-btn ui-btn-primary px-4 py-2 text-sm">
          Edit
        </Link>
        <button
          onClick={async () => {
            const items = await importRecipeIngredients(recipe.id)
            alert(`Added ${items.length} ingredient${items.length !== 1 ? 's' : ''} to pantry. Go to Pantry to set categories.`)
          }}
          className="ui-btn ui-btn-success px-4 py-2 text-sm"
        >
          Add ingredients to pantry
        </button>
      </div>
    </div>
  )
}
