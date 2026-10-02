import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import PosterCard from './PosterCard.jsx'
import { ratingColor, formatRating, titleHue } from '../lib/data.js'
import { scrollPosition } from '../lib/useScrollingDown.js'

// flush under the fixed header (54px) and the sticky tab bar (45px)
const PIN_TOP = 99
// scroll distance over which a pinned header goes from full size to slim
const COLLAPSE_RANGE = 60

// Text boxes are trimmed to the cap height and baseline, so the padding is
// exactly the visible gap above and below the digits in every browser
// (Safari and Chrome place the same font differently inside a line box).
const TRIM = '[text-box:trim-both_cap_alphabetic]'

// every size is interpolated by --collapse (0 full, 1 slim), which is set
// straight on the element as you scroll, so the band tracks the finger
const lerp = (full, slim) => `calc(${full}px + ${slim - full}px * var(--collapse, 0))`

function YearBand({ year, count, pinned = false }) {
  return (
    <div
      className={`flex items-baseline gap-3 bg-ground px-5 transition-shadow duration-150 ${
        pinned ? 'shadow-[0_1px_0_var(--mc-line)]' : ''
      }`}
      style={{ paddingBlock: lerp(20, 10) }}
    >
      <h2
        className={`font-extrabold leading-[1.333] tracking-tight text-accent ${TRIM}`}
        style={{ fontSize: lerp(24, 14) }}
      >
        {year}
      </h2>
      <span className={`font-medium leading-[1.333] text-dim ${TRIM}`} style={{ fontSize: lerp(12, 10) }}>
        {count}
      </span>
      <div className="flex-1 self-center bg-ink" style={{ height: lerp(3, 1) }} />
    </div>
  )
}

// Pins under the tab bar while its year is on screen. Once pinned it shrinks
// in step with the scroll, like Safari's toolbar: fully slim after
// COLLAPSE_RANGE px down, fully grown again after the same distance up. An
// invisible full-size copy holds the slot open, so the wall never moves.
function YearHeader({ year, count }) {
  const slotRef = useRef(null)
  const bandRef = useRef(null)
  const [pinned, setPinned] = useState(false)

  useEffect(() => {
    let last = scrollPosition()
    let collapse = 0
    const update = () => {
      const y = scrollPosition()
      const isPinned = slotRef.current.getBoundingClientRect().top <= PIN_TOP + 0.5
      const next = isPinned ? Math.min(1, Math.max(0, collapse + (y - last) / COLLAPSE_RANGE)) : 0
      last = y
      if (next !== collapse) {
        collapse = next
        bandRef.current.style.setProperty('--collapse', collapse)
      }
      setPinned(isPinned)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <div ref={slotRef} className="pointer-events-none sticky top-[99px] z-20 -mx-5 grid">
      <div aria-hidden="true" className="invisible col-start-1 row-start-1">
        <YearBand year={year} count={count} />
      </div>
      <div ref={bandRef} className="pointer-events-auto col-start-1 row-start-1 self-start">
        <YearBand year={year} count={count} pinned={pinned} />
      </div>
    </div>
  )
}

function ListRow({ item, index, mark, square, onClick }) {
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
        ${clickable ? 'cursor-pointer hover:bg-paper' : ''}`}
    >
      <div className="shrink-0">
        <div className={`${square ? 'h-12 w-12' : 'h-14 w-10'} overflow-hidden bg-paper shadow-print`}>
          {item.cover ? (
            <img src={item.cover} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div
              className="h-full w-full"
              style={{ background: `hsl(${titleHue(item.title)} 30% 30%)` }}
            />
          )}
        </div>
        {mark === 'done' && <div className="mt-1 h-[3px] bg-accent" />}
        {mark === 'current' && <div className="mt-1 h-[3px] bg-accent-2" />}
        {mark === 'queue' && <div className="mt-1 border-t-[3px] border-dashed border-dim/60" />}
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
export default function PosterWall({ sections, filter = () => true, markSeen = true, square = false, layout = 'cards', onItemClick }) {
  const markOf = item =>
    markSeen ? (item.current ? 'current' : item.done ? 'done' : 'queue') : null
  const groups = [...sections]
    .reverse()
    .map(s => ({ year: s.year, items: [...s.items].reverse().filter(filter) }))
    .filter(s => s.items.length > 0)

  return (
    <div className="flex flex-col gap-8">
      {groups.map((s, gi) => (
        <section key={s.year ?? `s${gi}`}>
          {s.year && <YearHeader year={s.year} count={s.items.length} />}
          {layout === 'list' ? (
            <ol className="flex flex-col">
              {s.items.map((item, i) => (
                <ListRow
                  key={`${item.title}-${i}`}
                  item={item}
                  index={i}
                  square={square}
                  mark={markOf(item)}
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
                  mark={markOf(item)}
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
