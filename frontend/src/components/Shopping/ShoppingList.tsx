import { useEffect, useState, useCallback } from 'react'
import { getShoppingList, generateShoppingList, addShoppingItem, updateShoppingItem, deleteShoppingItem } from '../../api/shopping'
import type { ShoppingListItem } from '../../types'
import TescoStatus from './TescoStatus'

const STORAGE_KEY = 'shopping-list-cache'
const PENDING_KEY = 'shopping-list-pending'

function loadCache(): ShoppingListItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch { return [] }
}

function saveCache(items: ShoppingListItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function loadPending(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || '{}')
  } catch { return {} }
}

function savePending(pending: Record<string, boolean>) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(pending))
}

export default function ShoppingList() {
  const [items, setItems] = useState<ShoppingListItem[]>(loadCache)
  const [pending, setPending] = useState<Record<string, boolean>>(loadPending)
  const [online, setOnline] = useState(navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [newItem, setNewItem] = useState('')
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().split('T')[0]
  })

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  const fetchFromServer = useCallback(async () => {
    try {
      const data = await getShoppingList()
      setItems(data)
      saveCache(data)
      setLastSynced(new Date().toLocaleTimeString())
    } catch {
      // Offline or server down — use cache
    }
  }, [])

  useEffect(() => { fetchFromServer() }, [fetchFromServer])

  const pendingCount = Object.keys(pending).length

  const syncPending = async () => {
    if (pendingCount === 0) return
    setSyncing(true)
    const toSync = { ...pending }
    let synced = 0
    for (const [id, checked] of Object.entries(toSync)) {
      try {
        await updateShoppingItem(id, { added_to_basket: checked })
        synced++
      } catch {
        break
      }
    }
    if (synced > 0) {
      const remaining = { ...toSync }
      for (const id of Object.keys(toSync).slice(0, synced)) {
        delete remaining[id]
      }
      setPending(remaining)
      savePending(remaining)
      await fetchFromServer()
    }
    setSyncing(false)
  }

  // Auto-sync when coming back online
  useEffect(() => {
    if (online && pendingCount > 0) {
      syncPending()
    }
  }, [online])

  const toggleChecked = (item: ShoppingListItem) => {
    const newChecked = !item.added_to_basket
    setItems(prev => {
      const updated = prev.map(i => i.id === item.id ? { ...i, added_to_basket: newChecked } : i)
      saveCache(updated)
      return updated
    })
    const newPending = { ...pending, [item.id]: newChecked }
    setPending(newPending)
    savePending(newPending)
  }

  const handleGenerate = async () => {
    if (!startDate || !endDate) return
    await generateShoppingList(startDate, endDate)
    setPending({})
    savePending({})
    await fetchFromServer()
  }

  const handleAdd = async () => {
    if (!newItem.trim()) return
    await addShoppingItem({ ingredient_name: newItem.trim() })
    setNewItem('')
    await fetchFromServer()
  }

  const handleDelete = async (id: string) => {
    await deleteShoppingItem(id)
    const newPending = { ...pending }
    delete newPending[id]
    setPending(newPending)
    savePending(newPending)
    await fetchFromServer()
  }

  const grouped = new Map<string, ShoppingListItem[]>()
  items.forEach(item => {
    const cat = item.category || 'Other'
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push(item)
  })
  const sortedCategories = [...grouped.keys()].sort((a, b) => {
    if (a === 'Other') return 1
    if (b === 'Other') return -1
    return a.localeCompare(b)
  })

  const checkedCount = items.filter(i => i.added_to_basket).length

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="ui-page-title text-xl font-bold">Shopping List</h1>
        <div className="flex items-center gap-2 text-xs">
          <span className={`inline-block w-2 h-2 rounded-full ${online ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="ui-muted">{online ? 'Online' : 'Offline'}</span>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="ui-alert-warning text-sm px-3 py-2 mb-4 flex items-center justify-between">
          <span>{pendingCount} unsaved change{pendingCount !== 1 ? 's' : ''}</span>
          <button
            onClick={syncPending}
            disabled={syncing || !online}
            className="ui-btn ui-btn-secondary px-3 py-1 text-xs disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Sync now'}
          </button>
        </div>
      )}

      {lastSynced && <p className="text-xs ui-muted mb-2">Last synced: {lastSynced}</p>}

      <div className="ui-card p-4 mb-4">
        <h2 className="text-sm font-semibold mb-2">Generate from meal plan</h2>
        <div className="flex gap-2 items-end flex-wrap">
          <div>
            <label className="block text-xs ui-muted">Start</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="ui-input px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="block text-xs ui-muted">End</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="ui-input px-2 py-1 text-sm" />
          </div>
          <button onClick={handleGenerate} disabled={!online} className="ui-btn ui-btn-primary px-3 py-1 text-sm disabled:opacity-50">Generate</button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Add item..."
          className="ui-input px-3 py-2 text-sm flex-1"
        />
        <button onClick={handleAdd} disabled={!online} className="ui-btn ui-btn-primary px-4 py-2 text-sm disabled:opacity-50">Add</button>
      </div>

      {items.length > 0 && (
        <p className="text-xs ui-muted mb-2">{checkedCount}/{items.length} items checked</p>
      )}

      {sortedCategories.map(cat => (
        <div key={cat} className="mb-4">
          <h2 className="text-sm font-semibold ui-muted mb-1">{cat}</h2>
          <ul className="space-y-1">
            {grouped.get(cat)!.map(item => (
              <li key={item.id} className={`ui-card flex items-center gap-2 px-3 py-2 text-sm ${pending[item.id] !== undefined ? 'border-amber-300' : ''}`}>
                <input type="checkbox" checked={item.added_to_basket} onChange={() => toggleChecked(item)} className="rounded" />
                <span className={item.added_to_basket ? 'line-through ui-muted' : ''}>
                  {item.quantity && `${item.quantity} ${item.unit || ''} `}{item.ingredient_name}
                </span>
                <button onClick={() => handleDelete(item.id)} disabled={!online} className="ml-auto ui-btn ui-btn-danger-soft px-1 py-0 text-xs disabled:opacity-30">x</button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {items.length === 0 && <p className="ui-muted text-sm">No items yet.</p>}

      <TescoStatus />
    </div>
  )
}
