import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useProfile } from '../../context/ProfileContext'
import { useThemeMode } from '../../theme/useThemeMode'
import NavIcon, { type NavIconName } from './NavIcon'
import RouteHero, { resolveRouteHero } from './RouteHero'

const navItems = [
  { to: '/', label: 'Meal Plan', icon: 'calendar' },
  { to: '/recipes', label: 'Recipes', icon: 'recipes' },
  { to: '/shopping', label: 'Shopping', icon: 'shopping' },
  { to: '/pantry', label: 'Pantry', icon: 'pantry' },
  { to: '/log', label: 'My Log', icon: 'log' },
  { to: '/profiles', label: 'Family', icon: 'family' },
] as const satisfies ReadonlyArray<{ to: string; label: string; icon: NavIconName }>

export default function AppLayout() {
  const { profiles, activeProfile, setActiveProfileId } = useProfile()
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const mode = useThemeMode()
  const hero = resolveRouteHero(pathname)

  return (
    <div className="ui-app">
      <nav className="ui-shell-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Desktop nav */}
          <div className="hidden sm:flex h-14 items-center gap-4">
            <span className="ui-brand font-bold text-lg shrink-0">Meal Planner</span>
            <div className="flex gap-2 flex-1">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `ui-nav-link px-3 py-2 text-sm font-medium whitespace-nowrap ${
                      isActive ? 'ui-nav-link-active' : ''
                    }`
                  }
                >
                  <NavIcon name={item.icon} className="ui-nav-icon" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
            {profiles.length > 0 && (
              <select
                value={activeProfile?.id ?? ''}
                onChange={e => setActiveProfileId(e.target.value || null)}
                className="ui-input px-2 py-1 text-sm shrink-0"
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
            <span className="ui-brand font-bold text-lg">Meal Planner</span>
            <div className="flex items-center gap-2">
              {profiles.length > 0 && (
                <select
                  value={activeProfile?.id ?? ''}
                  onChange={e => setActiveProfileId(e.target.value || null)}
                  className="ui-input px-2 py-1 text-xs"
                >
                  <option value="">No profile</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
              <button onClick={() => setMenuOpen(!menuOpen)} className="ui-icon-btn p-2">
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
          <div className="sm:hidden ui-mobile-menu px-4 pb-3 pt-1">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `ui-nav-link block px-3 py-2 text-sm font-medium ${
                    isActive ? 'ui-nav-link-active' : ''
                  }`
                }
              >
                <NavIcon name={item.icon} className="ui-nav-icon" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </nav>
      <main className="ui-main max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {hero && <RouteHero hero={hero} mode={mode} />}
        <Outlet />
      </main>
    </div>
  )
}
