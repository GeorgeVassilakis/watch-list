import PosterCard from './PosterCard.jsx'

// Sections render newest year first; within a year, newest entries first
// (bottom of the source file is the most recent).
export default function PosterWall({ sections, filter = () => true, ghostUndone = true, square = false, onItemClick }) {
  const groups = [...sections]
    .reverse()
    .map(s => ({ year: s.year, items: [...s.items].reverse().filter(filter) }))
    .filter(s => s.items.length > 0)

  return (
    <div className="flex flex-col gap-8">
      {groups.map((s, gi) => (
        <section key={s.year ?? `s${gi}`}>
          {s.year && (
            <div className="mb-3 flex items-baseline gap-3">
              <h2 className="text-2xl font-extrabold tracking-tight text-ink/30">{s.year}</h2>
              <span className="text-xs font-medium text-dim">{s.items.length}</span>
              <div className="h-px flex-1 self-center bg-hairline" />
            </div>
          )}
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
            {s.items.map((item, i) => (
              <PosterCard
                key={`${item.title}-${i}`}
                item={item}
                index={i}
                square={square}
                ghost={ghostUndone && !item.done}
                onClick={onItemClick && item.review ? () => onItemClick(item) : undefined}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
