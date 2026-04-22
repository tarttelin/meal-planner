export type NavIconName = 'calendar' | 'recipes' | 'shopping' | 'pantry' | 'log' | 'family'

type NavIconProps = {
  name: NavIconName
  className?: string
}

export default function NavIcon({ name, className }: NavIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {renderIcon(name)}
    </svg>
  )
}

function renderIcon(name: NavIconName) {
  switch (name) {
    case 'calendar':
      return (
        <>
          <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
          <path d="M7.5 3.5v3" />
          <path d="M16.5 3.5v3" />
          <path d="M3.5 9.5h17" />
          <path d="M8 13h3" />
          <path d="M13 13h3" />
          <path d="M8 17h3" />
        </>
      )
    case 'recipes':
      return (
        <>
          <path d="M6.5 4.5h8.25a3.25 3.25 0 0 1 3.25 3.25V19a2 2 0 0 0-2-2H6.5a2.5 2.5 0 0 1 0-5H16" />
          <path d="M6.5 4.5A2.5 2.5 0 0 0 4 7v9.5A2.5 2.5 0 0 1 6.5 19" />
          <path d="M8.5 8h5" />
          <path d="M8.5 11h4" />
        </>
      )
    case 'shopping':
      return (
        <>
          <path d="M6.5 9h11l-1.1 8.25a2 2 0 0 1-1.98 1.75H9.58a2 2 0 0 1-1.98-1.75z" />
          <path d="M9 9V7.5a3 3 0 0 1 6 0V9" />
          <path d="M9.5 12.5h5" />
        </>
      )
    case 'pantry':
      return (
        <>
          <path d="M8 4.5h8" />
          <path d="M9 4.5V7" />
          <path d="M15 4.5V7" />
          <path d="M7 8.5A2.5 2.5 0 0 1 9.5 6h5A2.5 2.5 0 0 1 17 8.5V17a3.5 3.5 0 0 1-3.5 3.5h-3A3.5 3.5 0 0 1 7 17z" />
          <path d="M9 11.5h6" />
        </>
      )
    case 'log':
      return (
        <>
          <rect x="5" y="3.5" width="14" height="17" rx="3" />
          <path d="M9 3.5v17" />
          <path d="M12 8h4" />
          <path d="M12 12h4" />
          <path d="M12 16h3" />
          <circle cx="7.5" cy="8" r="0.75" fill="currentColor" stroke="none" />
          <circle cx="7.5" cy="12" r="0.75" fill="currentColor" stroke="none" />
          <circle cx="7.5" cy="16" r="0.75" fill="currentColor" stroke="none" />
        </>
      )
    case 'family':
      return (
        <>
          <circle cx="9" cy="8.25" r="2.75" />
          <path d="M4.5 18a4.5 4.5 0 0 1 9 0" />
          <circle cx="16.75" cy="9.25" r="2.25" />
          <path d="M14.25 18a4 4 0 0 1 5 0" />
        </>
      )
  }
}
