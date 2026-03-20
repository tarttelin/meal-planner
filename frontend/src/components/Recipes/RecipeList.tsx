import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listRecipes, deleteRecipe } from '../../api/recipes'
import type { Recipe } from '../../types'

export default function RecipeList() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  const load = async () => {
    const data = await listRecipes(search || undefined, selectedTag || undefined)
    setRecipes(data)
  }

  useEffect(() => {
    listRecipes().then(all => {
      const tags = new Set<string>()
      all.forEach(r => r.tags?.forEach(t => tags.add(t)))
      setAllTags([...tags].sort())
    })
  }, [])

  useEffect(() => { load() }, [search, selectedTag])

  const handleDelete = async (id: string) => {
    await deleteRecipe(id)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <input
          type="text"
          placeholder="Search recipes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded px-3 py-2 text-sm w-64"
        />
        <Link to="/recipes/new" className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700">
          New Recipe
        </Link>
      </div>
      {allTags.length > 0 && (
        <div className="flex gap-1 mb-4 flex-wrap">
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-2 py-1 rounded text-xs ${selectedTag === null ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            All
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`px-2 py-1 rounded text-xs ${selectedTag === tag ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {recipes.map(r => (
          <div key={r.id} className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex justify-between items-start">
              <Link to={`/recipes/${r.id}`} className="font-medium text-indigo-600 hover:underline">{r.name}</Link>
              <button onClick={() => handleDelete(r.id)} className="text-red-400 hover:text-red-600 text-sm">Delete</button>
            </div>
            {r.description && <p className="text-sm text-gray-500 mt-1">{r.description}</p>}
            <div className="flex gap-2 mt-2 text-xs text-gray-400">
              <span>{r.servings} servings</span>
              {r.prep_time_mins && <span>{r.prep_time_mins}m prep</span>}
              {r.cook_time_mins && <span>{r.cook_time_mins}m cook</span>}
            </div>
            {r.tags && r.tags.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {r.tags.map(t => (
                  <button key={t} onClick={() => setSelectedTag(t)} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs hover:bg-gray-200">
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {recipes.length === 0 && <p className="text-gray-500 col-span-full">No recipes found.</p>}
      </div>
    </div>
  )
}
