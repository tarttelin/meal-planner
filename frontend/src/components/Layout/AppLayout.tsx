import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useProfile } from '../../context/ProfileContext'

const navItems = [
  { to: '/', label: 'Meal Plan' },
  { to: '/recipes', label: 'Recipes' },
  { to: '/shopping', label: 'Shopping' },
  { to: '/pantry', label: 'Pantry' },
  { to: '/log', label: 'My Log' },
  { to: '/profiles', label: 'Family' },
]

export default function AppLayout() {
  const { profiles, activeProfile, setActiveProfileId } = useProfile()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Desktop nav */}
          <div className="hidden sm:flex h-14 items-center gap-4">
            <span className="font-bold text-lg text-indigo-600 shrink-0">Meal Planner</span>
            <div className="flex gap-2 flex-1">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap ${
                      isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:text-gray-900'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
            {profiles.length > 0 && (
              <select
                value={activeProfile?.id ?? ''}
                onChange={e => setActiveProfileId(e.target.value || null)}
                className="border rounded px-2 py-1 text-sm bg-white shrink-0"
              >
                <option value="">No profile</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Mobile nav */}
          <div className="sm:hidden flex h-14 items-center justify-between">
            <span className="font-bold text-lg text-indigo-600">Meal Planner</span>
            <div className="flex items-center gap-2">
              {profiles.length > 0 && (
                <select
                  value={activeProfile?.id ?? ''}
                  onChange={e => setActiveProfileId(e.target.value || null)}
                  className="border rounded px-2 py-1 text-xs bg-white"
                >
                  <option value="">No profile</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
              <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 text-gray-600 hover:text-gray-900">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {menuOpen
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  }
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {menuOpen && (
          <div className="sm:hidden border-t bg-white px-4 pb-3 pt-1">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 text-sm font-medium rounded-md ${
                    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:text-gray-900'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        )}
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  )
}
