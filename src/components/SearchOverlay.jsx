import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ratingColor, formatRating, titleHue } from '../lib/data.js'
import { buildIndex, search, highlight } from '../lib/search.js'
import useScrollLock from '../lib/useScrollLock.js'
import useScrollingDown from '../lib/useScrollingDown.js'

const NOUNS = { films: 'films', books: 'books', music: 'albums' }

// a mouse or trackpad: Enter opens the highlighted result and focus returns to
// the input after a detail card; on touch, Enter just lowers the keyboard
const finePointer = () => window.matchMedia('(pointer: fine)').matches

const optionId = hit => `search-option-${hit.id}`

export function SearchIcon({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <circle cx="6.75" cy="6.75" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 10.5 L14.5 14.5" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

// phones: the header is full, and the thumb lives at the bottom; it ducks out
// of the way while scrolling down, back on any scroll up
export function SearchFab({ onClick }) {
  const hidden = useScrollingDown()
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={hidden ? { opacity: 0, y: 24 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      inert={hidden}
      onClick={onClick}
      aria-label="Search"
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] right-5 z-30 flex h-13 w-13 items-center justify-center bg-accent text-ground shadow-print-lg active:translate-0.5 active:shadow-print sm:hidden"
    >
      <SearchIcon size={20} />
    </motion.button>
  )
}

function Marked({ text, query }) {
  return highlight(text, query).map((s, i) =>
    s.hit ? (
      <mark key={i} className="bg-transparent text-accent">
        {s.text}
      </mark>
    ) : (
      <span key={i}>{s.text}</span>
    )
  )
}

function Result({ hit, query, active, onPick, onHover }) {
  const { item } = hit
  const square = hit.mode === 'music'
  return (
    <div
      id={optionId(hit)}
      role="option"
      aria-selected={active}
      onClick={onPick}
      onMouseMove={onHover}
      className={`-mx-5 flex cursor-pointer items-center gap-3.5 border-b border-line px-5 py-2.5 active:bg-line/50 ${
        active ? 'pointer-fine:bg-line/50' : ''
      }`}
    >
      <div className="shrink-0">
        <div className={`${square ? 'h-12 w-12' : 'h-14 w-10'} overflow-hidden bg-paper shadow-print`}>
          {item.cover ? (
            <img src={item.cover} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" style={{ background: `hsl(${titleHue(item.title)} 30% 30%)` }} />
          )}
        </div>
        {item.current ? (
          <div className="mt-1 h-[3px] bg-accent-2" />
        ) : item.done ? (
          <div className="mt-1 h-[3px] bg-accent" />
        ) : (
          <div className="mt-1 border-t-[3px] border-dashed border-dim/60" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[15px] font-semibold">
            <Marked text={item.title} query={query} />
          </span>
          {item.current && (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-2 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-2" />
            </span>
          )}
        </div>
        {item.subtitle && (
          <div className="truncate text-xs text-dim">
            <Marked text={item.subtitle} query={query} />
          </div>
        )}
      </div>
      {item.rating != null && (
        <span className="text-[15px] font-bold" style={{ color: ratingColor(item.rating) }}>
          {formatRating(item.rating)}
        </span>
      )}
    </div>
  )
}

function Panel({ index, modes, inputRef, paused, onClose, onPick }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const deferred = useDeferredValue(query)
  const hits = useMemo(() => search(index, deferred), [index, deferred])
  const groups = modes
    .map(m => ({ ...m, hits: hits.filter(h => h.mode === m.id) }))
    .filter(g => g.hits.length > 0)
  const flat = groups.flatMap(g => g.hits)
  const current = flat[Math.min(active, flat.length - 1)]

  const scope = modes.map(m => `${index.filter(e => e.mode === m.id).length} ${NOUNS[m.id]}`)
  const scopeText = `${scope.slice(0, -1).join(', ')} and ${scope[scope.length - 1]}`

  useEffect(() => {
    if (paused) return
    const onKey = e => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [paused, onClose])

  useEffect(() => {
    if (!paused && finePointer()) inputRef.current?.focus({ preventScroll: true })
  }, [paused, inputRef])

  const pick = hit => {
    inputRef.current?.blur()
    onPick(hit.item)
  }

  const type = value => {
    setQuery(value)
    setActive(0)
  }

  const onKeyDown = e => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    if (!flat.length) return
    const from = flat.indexOf(current)
    const next = (from + (e.key === 'ArrowDown' ? 1 : -1) + flat.length) % flat.length
    setActive(next)
    document.getElementById(optionId(flat[next]))?.scrollIntoView({ block: 'nearest' })
  }

  const onSubmit = e => {
    e.preventDefault()
    if (!finePointer()) inputRef.current?.blur()
    else if (current) pick(current)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={e => e.target === e.currentTarget && onClose()}
      className="fixed inset-x-0 bottom-0 top-1.5 z-50 flex flex-col sm:top-0 sm:items-center sm:bg-black/60 sm:px-6 sm:pb-6 sm:pt-[12vh]"
    >
      <motion.div
        initial={{ y: -12 }}
        animate={{ y: 0 }}
        exit={{ y: -12 }}
        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="flex min-h-0 w-full flex-1 flex-col bg-ground sm:max-h-[min(40rem,100%)] sm:max-w-xl sm:flex-none sm:border-[3px] sm:border-ink sm:bg-paper sm:shadow-print-lg"
      >
        <form
          role="search"
          onSubmit={onSubmit}
          className="flex h-14 shrink-0 items-center gap-3 border-b-2 border-ink px-5"
        >
          <SearchIcon className="shrink-0 text-dim" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => type(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search the archive"
            aria-label="Search films, books and music"
            role="combobox"
            aria-expanded={flat.length > 0}
            aria-controls="search-results"
            aria-autocomplete="list"
            aria-activedescendant={current ? optionId(current) : undefined}
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            className="min-w-0 flex-1 appearance-none rounded-none bg-transparent text-base font-medium text-ink outline-none placeholder:text-dim [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onMouseDown={e => e.preventDefault()}
              onClick={() => {
                type('')
                inputRef.current?.focus()
              }}
              className="-m-2 shrink-0 p-2 text-dim transition-colors hover:text-ink"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M2 2 L12 12 M12 2 L2 12" stroke="currentColor" strokeWidth="1.75" />
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="-my-2 shrink-0 py-2 pl-1 text-[13px] font-semibold uppercase tracking-[0.1em] text-dim transition-colors hover:text-ink"
          >
            Cancel
          </button>
        </form>

        <div
          onTouchMove={() => inputRef.current?.blur()}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
        >
          {!deferred.trim() ? (
            <p className="mx-auto max-w-xs py-10 text-center text-sm leading-relaxed text-dim">
              Search {scopeText} by title, director, author, artist, genre or year.
            </p>
          ) : flat.length === 0 ? (
            <p className="py-10 text-center text-sm text-dim">No matches for “{deferred.trim()}”</p>
          ) : (
            <div id="search-results" role="listbox" aria-label="Search results">
              {groups.map(g => (
                <div key={g.id} role="group" aria-labelledby={`search-group-${g.id}`}>
                  <div className="mb-1 mt-6 flex items-baseline gap-3">
                    <h2
                      id={`search-group-${g.id}`}
                      className="text-lg font-extrabold uppercase tracking-[0.08em] text-accent"
                    >
                      {g.label}
                    </h2>
                    <span className="text-xs font-medium text-dim">{g.hits.length}</span>
                    <div className="h-[3px] flex-1 self-center bg-ink" />
                  </div>
                  {g.hits.map(hit => (
                    <Result
                      key={hit.id}
                      hit={hit}
                      query={deferred}
                      active={hit === current}
                      onPick={() => pick(hit)}
                      onHover={() => hit !== current && setActive(flat.indexOf(hit))}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="hidden shrink-0 gap-4 border-t border-line px-5 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-dim pointer-fine:flex">
          <span>↑↓ Move</span>
          <span>Enter Open</span>
          <span>Esc Close</span>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function SearchOverlay({ open, data, modes, inputRef, paused, onClose, onPick }) {
  const index = useMemo(() => buildIndex(data, modes), [data, modes])
  useScrollLock(open)
  return (
    <AnimatePresence>
      {open && (
        <Panel
          index={index}
          modes={modes}
          inputRef={inputRef}
          paused={paused}
          onClose={onClose}
          onPick={onPick}
        />
      )}
    </AnimatePresence>
  )
}
