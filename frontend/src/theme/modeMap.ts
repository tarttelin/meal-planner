export type UIMode = 'kitchen' | 'performance' | 'log'

type RouteModeEntry = {
  prefix: string
  mode: UIMode
}

export const routeModeMap: ReadonlyArray<RouteModeEntry> = [
  { prefix: '/log', mode: 'log' },
  { prefix: '/timeline', mode: 'log' },
  { prefix: '/trends', mode: 'log' },
  { prefix: '/workouts', mode: 'performance' },
  { prefix: '/strava', mode: 'performance' },
  { prefix: '/training', mode: 'performance' },
  { prefix: '/performance', mode: 'performance' },
  { prefix: '/', mode: 'kitchen' },
]

export function resolveMode(pathname: string): UIMode {
  const normalized = pathname || '/'
  const match = [...routeModeMap]
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find(entry => normalized === entry.prefix || normalized.startsWith(`${entry.prefix}/`))
  return match?.mode ?? 'kitchen'
}
