import type { CSSProperties } from 'react'
import type { UIMode } from '../../theme/modeMap'

export type RouteHeroConfig = {
  path: string
  eyebrow: string
  title: string
  description: string
  imageSrc: string
  imagePosition?: CSSProperties['objectPosition']
  highlights: string[]
}

const routeHeroes: ReadonlyArray<RouteHeroConfig> = [
  {
    path: '/',
    eyebrow: 'Kitchen Mode',
    title: 'Meal Plan',
    description: 'Plan the week ahead without losing the quick scan across breakfasts, lunches, dinners, and shared portions.',
    imageSrc: '/imagery/kitchen-hero.png',
    imagePosition: 'right center',
    highlights: ['Weekly plan', 'Shared portions', 'Low-friction edits'],
  },
  {
    path: '/recipes',
    eyebrow: 'Kitchen Mode',
    title: 'Recipes',
    description: 'Keep staple dishes, faster weeknight options, and tagged favourites close to the planner.',
    imageSrc: '/imagery/kitchen-hero.png',
    imagePosition: 'right center',
    highlights: ['Searchable recipes', 'Tags', 'Meal-plan ready'],
  },
  {
    path: '/shopping',
    eyebrow: 'Kitchen Mode',
    title: 'Shopping List',
    description: 'Turn the meal plan into something you can scan quickly at home or in the aisle.',
    imageSrc: '/imagery/pantry-hero.png',
    imagePosition: 'right center',
    highlights: ['Store-friendly grouping', 'Quick add', 'Meal-plan sync'],
  },
  {
    path: '/pantry',
    eyebrow: 'Kitchen Mode',
    title: 'Pantry',
    description: 'Keep staples, scanned products, and nutrition details organised before you buy duplicates.',
    imageSrc: '/imagery/pantry-hero.png',
    imagePosition: 'right center',
    highlights: ['Barcode scans', 'Categories', 'Nutrition data'],
  },
  {
    path: '/log',
    eyebrow: 'Fusion Mode',
    title: 'Daily Log',
    description: 'Keep meals, macros, and performance context together without losing single-screen clarity.',
    imageSrc: '/imagery/log-hero.png',
    imagePosition: 'right center',
    highlights: ['Daily totals', 'Planned meals', 'Training context'],
  },
  {
    path: '/profiles',
    eyebrow: 'Kitchen Mode',
    title: 'Family Members',
    description: 'Keep household planning and personal nutrition targets close enough to work together.',
    imageSrc: '/imagery/kitchen-hero.png',
    imagePosition: 'right center',
    highlights: ['Family profiles', 'Macro targets', 'Shared planning'],
  },
]

export function resolveRouteHero(pathname: string): RouteHeroConfig | null {
  return routeHeroes.find(hero => hero.path === pathname) ?? null
}

export default function RouteHero({ hero, mode }: { hero: RouteHeroConfig; mode: UIMode }) {
  return (
    <section className={`ui-route-hero ui-route-hero-${mode}`}>
      <img
        src={hero.imageSrc}
        alt=""
        aria-hidden="true"
        className="ui-route-hero-image"
        style={hero.imagePosition ? { objectPosition: hero.imagePosition } : undefined}
      />
      <div className="ui-route-hero-content">
        <p className="ui-route-hero-eyebrow">{hero.eyebrow}</p>
        <h1 className="ui-route-hero-title">{hero.title}</h1>
        <p className="ui-route-hero-copy">{hero.description}</p>
        <ul className="ui-route-hero-support">
          {hero.highlights.map(highlight => (
            <li key={highlight} className="ui-route-hero-support-item">
              {highlight}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
