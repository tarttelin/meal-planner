import { useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { resolveMode, type UIMode } from './modeMap'

export function useThemeMode(): UIMode {
  const { pathname } = useLocation()
  const mode = useMemo(() => resolveMode(pathname), [pathname])

  useEffect(() => {
    document.documentElement.setAttribute('data-mode', mode)
  }, [mode])

  return mode
}
