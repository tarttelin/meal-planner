import { useEffect, useState, useCallback } from 'react'
import { listPantry, scanBarcode, createPantryItem, updatePantryItem, deletePantryItem, scanToUpdatePantryItem } from '../../api/pantry'
import { searchFood, type BarcodeResult } from '../../api/barcode'
import type { PantryItem } from '../../types'
import BarcodeScanner from './BarcodeScanner'

const CATEGORIES = [
  'Fresh fruit & veg',
  'Meat & fish',
  'Dairy & eggs',
  'Bakery',
  'Tins & store cupboard',
  'Frozen',
  'Drinks',
  'Snacks',
  'Condiments & sauces',
  'Herbs & spices',
]

export default function PantryList() {
  const [items, setItems] = useState<PantryItem[]>([])
  const [search, setSearch] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanningItemId, setScanningItemId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<PantryItem>>({})
  const [showFoodSearch, setShowFoodSearch] = useState(false)
  const [foodQuery, setFoodQuery] = useState('')
  const [foodResults, setFoodResults] = useState<BarcodeResult[]>([])
  const [foodSearching, setFoodSearching] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('pantry-collapsed') || '{}') } catch { return {} }
  })
  const [newItem, setNewItem] = useState({ name: '', brand: '', category: '', calories_per_100g: '', protein_per_100g: '', carbs_per_100g: '', fat_per_100g: '' })

  const toggleCategory = (cat: string) => {
    const next = { ...collapsed, [cat]: !collapsed[cat] }
    setCollapsed(next)
    localStorage.setItem('pantry-collapsed', JSON.stringify(next))
  }

  const refresh = useCallback(() => {
    listPantry(search || undefined).then(setItems).catch(() => {})
  }, [search])

  useEffect(() => { refresh() }, [refresh])

  const flash = (msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => setMessage(''), 4000)
  }

  const handleScan = async (code: string) => {
    try {
      const item = await scanBarcode(code)
      setScanning(false)
      flash(`Added: ${item.brand ? item.brand + ' ' : ''}${item.name}`)
      refresh()
    } catch (e: any) {
      setScanning(false)
      const detail = e?.response?.data?.detail || 'Product not found'
      flash(`Barcode ${code}: ${detail}`, 'error')
    }
  }

  const handleScanToUpdate = async (code: string) => {
    if (!scanningItemId) return
    const itemId = scanningItemId
    setScanningItemId(null)
    try {
      const updated = await scanToUpdatePantryItem(itemId, code)
      flash(`Updated ${updated.name} with barcode ${code}`)
      refresh()
    } catch (e: any) {
      const detail = e?.response?.data?.detail || 'Failed to update from barcode'
      flash(detail, 'error')
    }
  }

  const handleFoodSearch = async () => {
    if (!foodQuery.trim()) return
    setFoodSearching(true)
    try {
      const results = await searchFood(foodQuery.trim())
      setFoodResults(results)
    } catch {
      flash('Search failed', 'error')
    } finally {
      setFoodSearching(false)
    }
  }

  const addFromFoodResult = async (result: BarcodeResult) => {
    await createPantryItem({
      name: result.name,
      brand: result.brand || null,
      barcode: result.barcode || null,
      calories_per_100g: result.per_100g.calories,
      protein_per_100g: result.per_100g.protein,
      carbs_per_100g: result.per_100g.carbs,
      fat_per_100g: result.per_100g.fat,
      image_url: result.image_url,
      nutriments: result.nutriments,
    })
    flash(`Added: ${result.brand ? result.brand + ' ' : ''}${result.name}`)
    refresh()
  }

  const startEditing = (item: PantryItem) => {
    setEditingId(item.id)
    setEditData({ ...item })
  }

  const saveEdit = async () => {
    if (!editingId || !editData.name?.trim()) return
    await updatePantryItem(editingId, editData as PantryItem)
    setEditingId(null)
    refresh()
  }

  const handleDelete = async (id: string) => {
    await deletePantryItem(id)
    refresh()
  }

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    await createPantryItem({
      name: newItem.name,
      brand: newItem.brand || null,
      category: newItem.category || null,
      calories_per_100g: newItem.calories_per_100g ? +newItem.calories_per_100g : null,
      protein_per_100g: newItem.protein_per_100g ? +newItem.protein_per_100g : null,
      carbs_per_100g: newItem.carbs_per_100g ? +newItem.carbs_per_100g : null,
      fat_per_100g: newItem.fat_per_100g ? +newItem.fat_per_100g : null,
    })
    setNewItem({ name: '', brand: '', category: '', calories_per_100g: '', protein_per_100g: '', carbs_per_100g: '', fat_per_100g: '' })
    setShowAddForm(false)
    refresh()
  }

  const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name))
  const grouped = new Map<string, PantryItem[]>()
  sorted.forEach(item => {
    const cat = item.category || 'Uncategorised'
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push(item)
  })
  const sortedCategories = [...grouped.keys()].sort((a, b) => {
    if (a === 'Uncategorised') return 1
    if (b === 'Uncategorised') return -1
    return a.localeCompare(b)
  })

  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="text-xl font-bold">Pantry</h1>

      {message && (
        <div className={`text-sm px-3 py-2 rounded ${messageType === 'success' ? 'bg-green-100 border border-green-300 text-green-800' : 'bg-red-100 border border-red-300 text-red-800'}`}>
          {message}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <input
          placeholder="Search pantry..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded px-3 py-2 text-sm flex-1 min-w-[150px]"
        />
        <button type="button" onClick={() => { setShowFoodSearch(!showFoodSearch); setScanning(false); setShowAddForm(false) }} className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700">
          {showFoodSearch ? 'Close Search' : 'Search Food'}
        </button>
        <button type="button" onClick={() => { setScanning(!scanning); setShowFoodSearch(false); setShowAddForm(false) }} className="bg-indigo-600 text-white px-3 py-2 rounded text-sm hover:bg-indigo-700">
          {scanning ? 'Close Scanner' : 'Scan Barcode'}
        </button>
        <button type="button" onClick={() => { setShowAddForm(!showAddForm); setScanning(false); setShowFoodSearch(false) }} className="bg-gray-600 text-white px-3 py-2 rounded text-sm hover:bg-gray-700">
          {showAddForm ? 'Cancel' : '+ Manual'}
        </button>
      </div>

      {showFoodSearch && (
        <div className="p-3 border rounded bg-green-50 border-green-200 space-y-2">
          <div className="flex gap-2">
            <input
              placeholder="Search Open Food Facts (e.g. demerara sugar)..."
              value={foodQuery}
              onChange={e => setFoodQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleFoodSearch() }}
              className="border rounded px-3 py-2 text-sm flex-1"
              autoFocus
            />
            <button type="button" onClick={handleFoodSearch} disabled={foodSearching} className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50">
              {foodSearching ? '...' : 'Search'}
            </button>
          </div>
          {foodResults.length > 0 && (
            <div className="max-h-80 overflow-y-auto space-y-1">
              {foodResults.map((result, i) => (
                <div key={i} className="bg-white rounded border p-2 flex gap-2 items-center text-sm">
                  {result.image_url && <img src={result.image_url} alt="" className="w-10 h-10 object-contain rounded shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{result.brand ? `${result.brand} ` : ''}{result.name}</p>
                    {result.quantity && <p className="text-xs text-gray-400">{result.quantity}</p>}
                    <p className="text-xs text-gray-500">
                      {result.per_100g.calories ?? '?'} kcal | P:{result.per_100g.protein ?? '?'}g | C:{result.per_100g.carbs ?? '?'}g | F:{result.per_100g.fat ?? '?'}g per 100g
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addFromFoodResult(result)}
                    className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 shrink-0"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
          {foodResults.length === 0 && foodQuery && !foodSearching && (
            <p className="text-sm text-gray-500 text-center py-2">No results. Try different search terms.</p>
          )}
        </div>
      )}

      {scanning && <BarcodeScanner onScan={handleScan} onClose={() => setScanning(false)} />}
      {scanningItemId && (
        <div className="p-3 border rounded bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-700 mb-2">Scan barcode to update: <strong>{items.find(i => i.id === scanningItemId)?.name}</strong></p>
          <BarcodeScanner onScan={handleScanToUpdate} onClose={() => setScanningItemId(null)} />
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleManualAdd} className="p-3 border rounded bg-gray-50 space-y-2">
          <div className="flex gap-2">
            <input placeholder="Name" required value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} className="border rounded px-2 py-1 text-sm flex-1" />
            <input placeholder="Brand" value={newItem.brand} onChange={e => setNewItem({ ...newItem, brand: e.target.value })} className="border rounded px-2 py-1 text-sm flex-1" />
          </div>
          <select value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} className="border rounded px-2 py-1 text-sm w-full">
            <option value="">No category</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="flex gap-2">
            <input placeholder="kcal/100g" type="number" value={newItem.calories_per_100g} onChange={e => setNewItem({ ...newItem, calories_per_100g: e.target.value })} className="border rounded px-2 py-1 text-xs w-24" />
            <input placeholder="P g/100g" type="number" step="0.1" value={newItem.protein_per_100g} onChange={e => setNewItem({ ...newItem, protein_per_100g: e.target.value })} className="border rounded px-2 py-1 text-xs w-24" />
            <input placeholder="C g/100g" type="number" step="0.1" value={newItem.carbs_per_100g} onChange={e => setNewItem({ ...newItem, carbs_per_100g: e.target.value })} className="border rounded px-2 py-1 text-xs w-24" />
            <input placeholder="F g/100g" type="number" step="0.1" value={newItem.fat_per_100g} onChange={e => setNewItem({ ...newItem, fat_per_100g: e.target.value })} className="border rounded px-2 py-1 text-xs w-24" />
          </div>
          <button type="submit" className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">Save</button>
        </form>
      )}

      {sortedCategories.map(cat => {
        const catItems = grouped.get(cat)!
        const isCollapsed = collapsed[cat]
        return (
        <div key={cat}>
          <button
            type="button"
            onClick={() => toggleCategory(cat)}
            className="flex items-center gap-2 mt-4 mb-2 w-full text-left"
          >
            <span className={`text-xs text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}>&#9654;</span>
            <h2 className="text-sm font-semibold text-gray-500">{cat}</h2>
            <span className="text-xs text-gray-400">({catItems.length})</span>
          </button>
          {!isCollapsed && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {catItems.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => startEditing(item)}
                className="border rounded bg-white p-2 text-sm flex items-center gap-2 text-left w-full hover:border-indigo-300"
              >
                {item.image_url && <img src={item.image_url} alt="" className="w-10 h-10 object-contain rounded shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.brand ? `${item.brand} ` : ''}{item.name}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {item.calories_per_100g != null
                      ? `${item.calories_per_100g} kcal | P:${item.protein_per_100g ?? '?'}g | C:${item.carbs_per_100g ?? '?'}g | F:${item.fat_per_100g ?? '?'}g`
                      : item.barcode || 'No nutrition data'}
                  </p>
                </div>
              </button>
            ))}
          </div>
          )}
        </div>
        )
      })}

      {items.length === 0 && <p className="text-gray-400 text-sm">No pantry items found.</p>}

      {editingId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setEditingId(null)}>
          <div className="bg-white rounded-lg shadow-lg p-5 w-96 max-w-[95vw] space-y-3" onClick={e => e.stopPropagation()}>
            {editData.image_url && (
              <div className="flex justify-center">
                <img src={editData.image_url} alt="" className="w-20 h-20 object-contain rounded" />
              </div>
            )}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name</label>
              <input value={editData.name || ''} onChange={e => setEditData({ ...editData, name: e.target.value })} className="border rounded px-3 py-2 text-sm w-full" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Brand</label>
              <input value={editData.brand || ''} onChange={e => setEditData({ ...editData, brand: e.target.value || null })} className="border rounded px-3 py-2 text-sm w-full" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Category</label>
              <select value={editData.category || ''} onChange={e => setEditData({ ...editData, category: e.target.value || null })} className="border rounded px-3 py-2 text-sm w-full">
                <option value="">No category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nutrition per 100g</label>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <input placeholder="kcal" type="number" value={editData.calories_per_100g ?? ''} onChange={e => setEditData({ ...editData, calories_per_100g: e.target.value ? +e.target.value : null })} className="border rounded px-2 py-2 text-sm w-full" />
                  <span className="text-xs text-gray-400">kcal</span>
                </div>
                <div>
                  <input placeholder="Protein" type="number" step="0.1" value={editData.protein_per_100g ?? ''} onChange={e => setEditData({ ...editData, protein_per_100g: e.target.value ? +e.target.value : null })} className="border rounded px-2 py-2 text-sm w-full" />
                  <span className="text-xs text-gray-400">protein g</span>
                </div>
                <div>
                  <input placeholder="Carbs" type="number" step="0.1" value={editData.carbs_per_100g ?? ''} onChange={e => setEditData({ ...editData, carbs_per_100g: e.target.value ? +e.target.value : null })} className="border rounded px-2 py-2 text-sm w-full" />
                  <span className="text-xs text-gray-400">carbs g</span>
                </div>
                <div>
                  <input placeholder="Fat" type="number" step="0.1" value={editData.fat_per_100g ?? ''} onChange={e => setEditData({ ...editData, fat_per_100g: e.target.value ? +e.target.value : null })} className="border rounded px-2 py-2 text-sm w-full" />
                  <span className="text-xs text-gray-400">fat g</span>
                </div>
              </div>
            </div>
            {editData.nutriments && Object.keys(editData.nutriments).length > 0 && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Full nutrition (per 100g)</label>
                <div className="max-h-40 overflow-y-auto bg-gray-50 rounded p-2 text-xs space-y-0.5">
                  {Object.entries(editData.nutriments)
                    .filter(([k]) => k.endsWith('_100g'))
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([key, val]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-600">{key.replace('_100g', '').replace(/-/g, ' ')}</span>
                        <span className="text-gray-800 font-mono">{typeof val === 'number' ? Math.round(val * 100) / 100 : val}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
            {editData.barcode && <p className="text-xs text-gray-400">Barcode: {editData.barcode}</p>}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={saveEdit} className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700 flex-1">Save</button>
              <button type="button" onClick={() => { setScanningItemId(editingId); setEditingId(null) }} className="bg-white border text-indigo-600 px-4 py-2 rounded text-sm hover:bg-indigo-50">Scan</button>
              <button type="button" onClick={() => { if (confirm(`Delete ${editData.name}?`)) { handleDelete(editingId); setEditingId(null) } }} className="bg-white border text-red-500 px-4 py-2 rounded text-sm hover:bg-red-50">Delete</button>
            </div>
            <button type="button" onClick={() => setEditingId(null)} className="w-full text-gray-400 text-sm hover:text-gray-600 pt-1">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
