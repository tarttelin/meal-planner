import { useState } from 'react'
import { createProfile, updateProfile, deleteProfile } from '../../api/profiles'
import { useProfile } from '../../context/ProfileContext'
import type { Profile } from '../../types'

export default function ProfileManager() {
  const { profiles, refreshProfiles } = useProfile()
  const [editing, setEditing] = useState<Profile | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Family Members</h1>
        <button onClick={() => setShowAdd(true)} className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700">
          Add Person
        </button>
      </div>

      {showAdd && (
        <ProfileForm
          onSave={async (data) => { await createProfile(data); await refreshProfiles(); setShowAdd(false) }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      <div className="space-y-3">
        {profiles.map(p => (
          editing?.id === p.id ? (
            <ProfileForm
              key={p.id}
              initial={p}
              onSave={async (data) => { await updateProfile(p.id, data); await refreshProfiles(); setEditing(null) }}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <div key={p.id} className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{p.name}</h2>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(p)} className="text-indigo-500 text-sm hover:underline">Edit</button>
                  <button onClick={async () => { await deleteProfile(p.id); await refreshProfiles() }} className="text-red-400 text-sm hover:underline">Delete</button>
                </div>
              </div>
              {(p.calorie_target || p.protein_target || p.carbs_target || p.fat_target) && (
                <p className="text-sm text-gray-500 mt-1">
                  Daily targets:
                  {p.calorie_target ? ` ${p.calorie_target} kcal` : ''}
                  {p.protein_target ? ` | P: ${p.protein_target}g` : ''}
                  {p.carbs_target ? ` | C: ${p.carbs_target}g` : ''}
                  {p.fat_target ? ` | F: ${p.fat_target}g` : ''}
                </p>
              )}
            </div>
          )
        ))}
        {profiles.length === 0 && !showAdd && (
          <p className="text-gray-500 text-sm">No family members yet. Add someone to get started with personal meal logs.</p>
        )}
      </div>
    </div>
  )
}

function ProfileForm({ initial, onSave, onCancel }: {
  initial?: Profile
  onSave: (data: Omit<Profile, 'id'>) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [calTarget, setCalTarget] = useState<number | ''>(initial?.calorie_target ?? '')
  const [proTarget, setProTarget] = useState<number | ''>(initial?.protein_target ?? '')
  const [carbTarget, setCarbTarget] = useState<number | ''>(initial?.carbs_target ?? '')
  const [fatTarget, setFatTarget] = useState<number | ''>(initial?.fat_target ?? '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      calorie_target: calTarget || null,
      protein_target: proTarget || null,
      carbs_target: carbTarget || null,
      fat_target: fatTarget || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-4 mb-3 space-y-2">
      <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} required className="border rounded px-3 py-2 w-full text-sm" />
      <p className="text-xs text-gray-500">Daily targets (optional):</p>
      <div className="grid grid-cols-4 gap-2">
        <input placeholder="kcal" type="number" value={calTarget} onChange={e => setCalTarget(e.target.value ? +e.target.value : '')} className="border rounded px-2 py-1 text-sm" />
        <input placeholder="Protein g" type="number" value={proTarget} onChange={e => setProTarget(e.target.value ? +e.target.value : '')} className="border rounded px-2 py-1 text-sm" />
        <input placeholder="Carbs g" type="number" value={carbTarget} onChange={e => setCarbTarget(e.target.value ? +e.target.value : '')} className="border rounded px-2 py-1 text-sm" />
        <input placeholder="Fat g" type="number" value={fatTarget} onChange={e => setFatTarget(e.target.value ? +e.target.value : '')} className="border rounded px-2 py-1 text-sm" />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="bg-indigo-600 text-white px-4 py-1 rounded text-sm hover:bg-indigo-700">Save</button>
        <button type="button" onClick={onCancel} className="text-gray-500 text-sm hover:underline">Cancel</button>
      </div>
    </form>
  )
}
