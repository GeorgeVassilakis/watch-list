import { motion } from 'framer-motion'
import PosterCard from './PosterCard.jsx'
import { ratingColor, formatRating, titleHue } from '../lib/data.js'

function ListRow({ item, index, ghost, square, onClick }) {
  const clickable = Boolean(onClick)
  return (
    <motion.li
      initial={{ opacity: 0, x: -10 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ duration: 0.35, delay: (index % 10) * 0.02 }}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick()) : undefined}
      className={`flex items-center gap-3.5 border-b border-line py-2.5
        ${ghost ? 'opacity-45 saturate-[0.4]' : ''}
        ${clickable ? 'cursor-pointer hover:bg-paper' : ''}`}
    >
      <div className={`${square ? 'h-12 w-12' : 'h-14 w-10'} shrink-0 overflow-hidden bg-paper shadow-print`}>
        {item.cover ? (
          <img src={item.cover} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: `hsl(${titleHue(item.title)} 30% 30%)` }}
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[15px] font-semibold">{item.title}</span>
          {item.current && (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-2 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-2" />
            </span>
          )}
        </div>
        {item.subtitle && <div className="truncate text-xs text-dim">{item.subtitle}</div>}
      </div>
      {item.rating != null && (
        <span className="text-[15px] font-bold" style={{ color: ratingColor(item.rating) }}>
          {formatRating(item.rating)}
        </span>
      )}
    </motion.li>
  )
}

// Sections render newest year first; within a year, newest entries first
// (bottom of the source file is the most recent).
export default function PosterWall({ sections, filter = () => true, ghostUndone = true, square = false, layout = 'cards', onItemClick }) {
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
              <h2 className="text-2xl font-extrabold tracking-tight text-accent">{s.year}</h2>
              <span className="text-xs font-medium text-dim">{s.items.length}</span>
              <div className="h-[3px] flex-1 self-center bg-ink" />
            </div>
          )}
          {layout === 'list' ? (
            <ol className="flex flex-col">
              {s.items.map((item, i) => (
                <ListRow
                  key={`${item.title}-${i}`}
                  item={item}
                  index={i}
                  square={square}
                  ghost={ghostUndone && !item.done && !item.current}
                  onClick={onItemClick ? () => onItemClick(item) : undefined}
                />
              ))}
            </ol>
          ) : (
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
              {s.items.map((item, i) => (
                <PosterCard
                  key={`${item.title}-${i}`}
                  item={item}
                  index={i}
                  square={square}
                  ghost={ghostUndone && !item.done && !item.current}
                  onClick={onItemClick ? () => onItemClick(item) : undefined}
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
