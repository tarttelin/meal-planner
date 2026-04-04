import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getRecipe, createRecipe, updateRecipe } from '../../api/recipes'
import { lookupBarcode, type BarcodeResult } from '../../api/barcode'
import { listPantry } from '../../api/pantry'
import type { Ingredient, PantryItem } from '../../types'

export default function RecipeEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [servings, setServings] = useState<number | ''>(4)
  const [prepTime, setPrepTime] = useState<number | ''>('')
  const [cookTime, setCookTime] = useState<number | ''>('')
  const [instructions, setInstructions] = useState('')
  const [tags, setTags] = useState('')
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [barcodeInput, setBarcodeInput] = useState('')
  const [barcodeResult, setBarcodeResult] = useState<BarcodeResult | null>(null)
  const [barcodeError, setBarcodeError] = useState('')
  const [barcodeLoading, setBarcodeLoading] = useState(false)
  const [pantryOpen, setPantryOpen] = useState(false)
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([])
  const [pantrySearch, setPantrySearch] = useState('')
  const [per100gMap, setPer100gMap] = useState<Record<number, { calories: number | null; protein: number | null; carbs: number | null; fat: number | null }>>({})

  useEffect(() => {
    if (!isNew && id) {
      getRecipe(id).then(r => {
        setName(r.name)
        setDescription(r.description || '')
        setServings(r.yield_servings)
        setPrepTime(r.prep_time_mins ?? '')
        setCookTime(r.cook_time_mins ?? '')
        setInstructions(r.instructions?.join('\n') || '')
        setTags(r.tags?.join(', ') || '')
        setIngredients(r.ingredients)
      })
    }
  }, [id, isNew])

  const addIngredient = () =>
    setIngredients([...ingredients, { name: '', quantity: null, unit: null, notes: null, tesco_search_term: null, calories: null, protein: null, carbs: null, fat: null }])

  const updateIngredient = (i: number, field: string, value: string | number | null) => {
    setIngredients(ingredients.map((ing, idx) => {
      if (idx !== i) return ing
      const updated = { ...ing, [field]: value }
      if (field === 'quantity' && per100gMap[i] && value != null) {
        const scale = (value as number) / 100
        const p = per100gMap[i]
        updated.calories = p.calories != null ? Math.round(p.calories * scale) : null
        updated.protein = p.protein != null ? Math.round(p.protein * scale * 10) / 10 : null
        updated.carbs = p.carbs != null ? Math.round(p.carbs * scale * 10) / 10 : null
        updated.fat = p.fat != null ? Math.round(p.fat * scale * 10) / 10 : null
      }
      return updated
    }))
  }

  const removeIngredient = (i: number) => {
    setIngredients(ingredients.filter((_, idx) => idx !== i))
    setPer100gMap(prev => {
      const next = { ...prev }
      delete next[i]
      return next
    })
  }

  const openPantryPicker = () => {
    setPantryOpen(true)
    listPantry().then(setPantryItems).catch(() => {})
  }

  const searchPantry = (q: string) => {
    setPantrySearch(q)
    listPantry(q || undefined).then(setPantryItems).catch(() => {})
  }

  const addFromPantry = (item: PantryItem) => {
    const label = [item.brand, item.name].filter(Boolean).join(' ')
    const idx = ingredients.length
    setIngredients([...ingredients, {
      name: label,
      quantity: 100,
      unit: 'g',
      notes: null,
      tesco_search_term: null,
      pantry_item_id: item.id,
      calories: item.calories_per_100g != null ? Math.round(item.calories_per_100g) : null,
      protein: item.protein_per_100g != null ? Math.round(item.protein_per_100g * 10) / 10 : null,
      carbs: item.carbs_per_100g != null ? Math.round(item.carbs_per_100g * 10) / 10 : null,
      fat: item.fat_per_100g != null ? Math.round(item.fat_per_100g * 10) / 10 : null,
    }])
    setPer100gMap(prev => ({ ...prev, [idx]: { calories: item.calories_per_100g, protein: item.protein_per_100g, carbs: item.carbs_per_100g, fat: item.fat_per_100g } }))
    setPantryOpen(false)
    setPantrySearch('')
  }

  const handleBarcodeScan = async () => {
    const code = barcodeInput.trim()
    if (!code) return
    setBarcodeError('')
    setBarcodeResult(null)
    setBarcodeLoading(true)
    try {
      const result = await lookupBarcode(code)
      setBarcodeResult(result)
    } catch {
      setBarcodeError('Product not found')
    } finally {
      setBarcodeLoading(false)
    }
  }

  const addFromBarcode = (weightG: number) => {
    if (!barcodeResult) return
    const per100 = barcodeResult.per_100g
    const scale = weightG / 100
    const label = [barcodeResult.brand, barcodeResult.name].filter(Boolean).join(' ')
    setIngredients([...ingredients, {
      name: label,
      quantity: weightG,
      unit: 'g',
      notes: null,
      tesco_search_term: null,
      calories: per100.calories != null ? Math.round(per100.calories * scale) : null,
      protein: per100.protein != null ? Math.round(per100.protein * scale * 10) / 10 : null,
      carbs: per100.carbs != null ? Math.round(per100.carbs * scale * 10) / 10 : null,
      fat: per100.fat != null ? Math.round(per100.fat * scale * 10) / 10 : null,
    }])
    setBarcodeInput('')
    setBarcodeResult(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      name,
      description: description || null,
      yield_servings: servings || 1,
      prep_time_mins: prepTime || null,
      cook_time_mins: cookTime || null,
      instructions: instructions ? instructions.split('\n').filter(Boolean) : null,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : null,
      ingredients,
    }
    if (isNew) {
      const r = await createRecipe(data)
      navigate(`/recipes/${r.id}`)
    } else {
      await updateRecipe(id!, data)
      navigate(`/recipes/${id}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">{isNew ? 'New Recipe' : 'Edit Recipe'}</h1>

      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input value={name} onChange={e => setName(e.target.value)} required className="border rounded px-3 py-2 w-full text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} className="border rounded px-3 py-2 w-full text-sm" rows={2} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Servings</label>
          <input type="number" inputMode="numeric" min={1} value={servings} onChange={e => setServings(e.target.value === '' ? '' : +e.target.value)} className="border rounded px-3 py-2 w-full text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Prep (mins)</label>
          <input type="number" value={prepTime} onChange={e => setPrepTime(e.target.value ? +e.target.value : '')} className="border rounded px-3 py-2 w-full text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Cook (mins)</label>
          <input type="number" value={cookTime} onChange={e => setCookTime(e.target.value ? +e.target.value : '')} className="border rounded px-3 py-2 w-full text-sm" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Tags (comma separated)</label>
        <input value={tags} onChange={e => setTags(e.target.value)} className="border rounded px-3 py-2 w-full text-sm" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">Ingredients</label>
          <div className="flex gap-3">
            <button type="button" onClick={openPantryPicker} className="text-green-600 text-sm hover:underline">Pick from pantry</button>
            <button type="button" onClick={addIngredient} className="text-indigo-600 text-sm hover:underline">+ Add</button>
          </div>
        </div>

        <div className="mb-3 p-3 border rounded bg-indigo-50 border-indigo-200">
          <label className="block text-xs font-medium text-indigo-700 mb-1">Add by barcode</label>
          <div className="flex gap-2">
            <input
              placeholder="Scan or type barcode..."
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleBarcodeScan() } }}
              className="border rounded px-2 py-1 text-sm flex-1"
            />
            <button type="button" onClick={handleBarcodeScan} disabled={barcodeLoading} className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 disabled:opacity-50">
              {barcodeLoading ? '...' : 'Look up'}
            </button>
          </div>
          {barcodeError && <p className="text-red-500 text-xs mt-1">{barcodeError}</p>}
          {barcodeResult && (
            <BarcodeResultCard result={barcodeResult} onAdd={addFromBarcode} />
          )}
        </div>

        {pantryOpen && (
          <div className="mb-3 p-3 border rounded bg-green-50 border-green-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-green-700">Pick from pantry</label>
              <button type="button" onClick={() => { setPantryOpen(false); setPantrySearch('') }} className="text-gray-400 hover:text-gray-600 text-sm">x</button>
            </div>
            <input
              placeholder="Search pantry..."
              value={pantrySearch}
              onChange={e => searchPantry(e.target.value)}
              className="border rounded px-2 py-1 text-sm w-full mb-2"
            />
            <div className="max-h-48 overflow-y-auto space-y-1">
              {pantryItems.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addFromPantry(item)}
                  className="w-full text-left p-2 rounded hover:bg-green-100 flex gap-2 items-center text-sm"
                >
                  {item.image_url && <img src={item.image_url} alt="" className="w-8 h-8 object-contain rounded" />}
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{item.brand ? `${item.brand} ` : ''}{item.name}</p>
                    <p className="text-xs text-gray-500">
                      Per 100g: {item.calories_per_100g ?? '?'} kcal | P: {item.protein_per_100g ?? '?'}g | C: {item.carbs_per_100g ?? '?'}g | F: {item.fat_per_100g ?? '?'}g
                    </p>
                  </div>
                </button>
              ))}
              {pantryItems.length === 0 && <p className="text-xs text-gray-400 py-2">No items found.</p>}
            </div>
          </div>
        )}

        {ingredients.map((ing, i) => (
          <div key={i} className="mb-3 p-2 border rounded bg-gray-50">
            <div className="flex gap-2 mb-1">
              <input placeholder="Name" value={ing.name} onChange={e => updateIngredient(i, 'name', e.target.value)} className="border rounded px-2 py-1 text-sm flex-1" />
              <input placeholder="Qty" type="number" value={ing.quantity ?? ''} onChange={e => updateIngredient(i, 'quantity', e.target.value ? +e.target.value : null)} className="border rounded px-2 py-1 text-sm w-20" />
              <input placeholder="Unit" value={ing.unit ?? ''} onChange={e => updateIngredient(i, 'unit', e.target.value || null)} className="border rounded px-2 py-1 text-sm w-20" />
              <button type="button" onClick={() => removeIngredient(i)} className="text-red-400 hover:text-red-600">x</button>
            </div>
            <input placeholder="Notes (e.g. skinless, chopped)" value={ing.notes ?? ''} onChange={e => updateIngredient(i, 'notes', e.target.value || null)} className="border rounded px-2 py-1 text-xs w-full mb-1" />
            <div className="flex gap-2">
              <input placeholder="kcal" type="number" value={ing.calories ?? ''} onChange={e => updateIngredient(i, 'calories', e.target.value ? +e.target.value : null)} className="border rounded px-2 py-1 text-xs w-20" />
              <input placeholder="Protein g" type="number" value={ing.protein ?? ''} onChange={e => updateIngredient(i, 'protein', e.target.value ? +e.target.value : null)} className="border rounded px-2 py-1 text-xs w-20" />
              <input placeholder="Carbs g" type="number" value={ing.carbs ?? ''} onChange={e => updateIngredient(i, 'carbs', e.target.value ? +e.target.value : null)} className="border rounded px-2 py-1 text-xs w-20" />
              <input placeholder="Fat g" type="number" value={ing.fat ?? ''} onChange={e => updateIngredient(i, 'fat', e.target.value ? +e.target.value : null)} className="border rounded px-2 py-1 text-xs w-20" />
            </div>
          </div>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Instructions (one step per line)</label>
        <textarea value={instructions} onChange={e => setInstructions(e.target.value)} className="border rounded px-3 py-2 w-full text-sm" rows={6} />
      </div>

      <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded text-sm hover:bg-indigo-700">
        {isNew ? 'Create' : 'Save'}
      </button>
    </form>
  )
}

function BarcodeResultCard({ result, onAdd }: { result: BarcodeResult; onAdd: (weightG: number) => void }) {
  const [weight, setWeight] = useState<number | ''>(100)
  const per100 = result.per_100g
  const effectiveWeight = weight || 100

  return (
    <div className="mt-2 p-2 bg-white rounded border text-sm">
      <div className="flex gap-2 items-start">
        {result.image_url && <img src={result.image_url} alt="" className="w-12 h-12 object-contain rounded" />}
        <div className="flex-1">
          <p className="font-medium">{result.brand ? `${result.brand} - ` : ''}{result.name}</p>
          {result.quantity && <p className="text-xs text-gray-400">{result.quantity}</p>}
          <div className="text-xs text-gray-500 mt-1">
            Per 100g: {per100.calories ?? '?'} kcal | P: {per100.protein ?? '?'}g | C: {per100.carbs ?? '?'}g | F: {per100.fat ?? '?'}g
          </div>
        </div>
      </div>
      <div className="flex gap-2 items-center mt-2">
        <label className="text-xs text-gray-500">Weight:</label>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={weight}
          onChange={e => setWeight(e.target.value === '' ? '' : +e.target.value)}
          className="border rounded px-2 py-1 text-xs w-20"
        />
        <span className="text-xs text-gray-400">g</span>
        <span className="text-xs text-gray-500 ml-2">
          = {per100.calories != null ? Math.round(per100.calories * effectiveWeight / 100) : '?'} kcal
        </span>
        <button
          type="button"
          onClick={() => onAdd(effectiveWeight)}
          className="ml-auto bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
        >
          Add ingredient
        </button>
      </div>
    </div>
  )
}
