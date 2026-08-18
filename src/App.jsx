import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { loadAll, allItems } from './lib/data.js'
import Hero from './components/Hero.jsx'
import PosterWall from './components/PosterWall.jsx'
import Ranked from './components/Ranked.jsx'
import DataPanel from './components/DataPanel.jsx'
import DetailModal from './components/DetailModal.jsx'

const MODES = [
  { id: 'films', label: 'Films' },
  { id: 'books', label: 'Books' },
  { id: 'music', label: 'Music' },
]

const TABS = {
  films: [
    { id: 'archive', label: 'Archive' },
    { id: 'ranked', label: 'Ranked' },
    { id: 'queue', label: 'Queue' },
    { id: 'data', label: 'Data' },
  ],
  books: [
    { id: 'archive', label: 'Archive' },
    { id: 'ranked', label: 'Ranked' },
    { id: 'queue', label: 'Shelf' },
    { id: 'data', label: 'Data' },
  ],
  music: [
    { id: 'archive', label: 'Archive' },
    { id: 'ranked', label: 'Ranked' },
    { id: 'queue', label: 'Queue' },
    { id: 'data', label: 'Data' },
  ],
}

const STAT_LABELS = {
  films: { done: 'Watched', todo: 'In queue' },
  books: { done: 'Read', todo: 'On the shelf' },
  music: { done: 'Reviewed', todo: 'In queue' },
}

export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('films')
  const [tab, setTab] = useState('archive')
  const [openItem, setOpenItem] = useState(null)
  const [layout, setLayout] = useState('cards')
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')

  useEffect(() => {
    loadAll().then(setData).catch(e => setError(String(e)))
  }, [])

  useEffect(() => {
    document.documentElement.dataset.mode = mode
  }, [mode])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('theme', theme)
  }, [theme])

  const view = data?.[mode]
  const items = useMemo(() => (view ? allItems(view.sections) : []), [view])

  const hero = useMemo(() => {
    const current = items.find(i => i.current)
    if (current) return { item: current, isCurrent: true }
    const done = items.filter(i => i.done)
    return { item: done[done.length - 1] ?? null, isCurrent: false }
  }, [items])

  const rated = useMemo(
    () => items.filter(i => i.done && i.rating != null).sort((a, b) => b.rating - a.rating),
    [items]
  )

  const avg = rated.length
    ? (rated.reduce((s, i) => s + i.rating, 0) / rated.length).toFixed(1)
    : '–'

  const stats = view
    ? [
        { label: STAT_LABELS[mode].done, value: items.filter(i => i.done).length },
        { label: STAT_LABELS[mode].todo, value: items.filter(i => !i.done).length },
        { label: 'Average', value: avg },
      ]
    : []

  const switchMode = m => {
    setMode(m)
    setTab('archive')
    window.scrollTo({ top: 0 })
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-dim">
        Failed to load the lists: {error}
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24">
      {/* flat three-block accent stripe, the masthead's print mark */}
      <div
        className="fixed inset-x-0 top-0 z-50 h-1.5"
        style={{
          background:
            'linear-gradient(90deg, var(--mc-accent) 0 44%, var(--mc-accent-2) 44% 76%, var(--mc-accent-3) 76% 100%)',
        }}
      />
      <header className="fixed inset-x-0 top-1.5 z-40 border-b-2 border-ink bg-ground">
        <div className="mx-auto flex h-12 max-w-3xl items-center justify-between px-5">
          <span className="text-sm font-extrabold uppercase tracking-[0.08em]">
            GV<span className="text-accent">/</span>Archive
          </span>
          <nav className="flex items-center gap-5">
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => switchMode(m.id)}
                className={`relative py-1 text-[13px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                  mode === m.id ? 'text-accent' : 'text-dim hover:text-ink'
                }`}
              >
                {m.label}
                {mode === m.id && (
                  <motion.div layoutId="mode-mark" className="absolute inset-x-0 bottom-0 h-0.5 bg-accent" />
                )}
              </button>
            ))}
            <button
              onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="text-dim transition-colors hover:text-ink"
            >
              {/* half-filled disc, the print mark for the theme toggle */}
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 1.5 A6.5 6.5 0 0 1 8 14.5 Z" fill="currentColor" />
              </svg>
            </button>
          </nav>
        </div>
      </header>

      {!data ? (
        <div className="flex min-h-screen items-center justify-center text-sm text-dim">
          Loading the archive…
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.main
            key={mode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Hero mode={mode} latest={hero.item} isCurrent={hero.isCurrent} stats={stats} />

            <div className="sticky top-[54px] z-30 border-b border-line bg-ground">
              <div className="mx-auto flex max-w-3xl items-center justify-between px-5">
                <div className="flex gap-6">
                  {TABS[mode].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`relative py-3 text-[13px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                        tab === t.id ? 'text-ink' : 'text-dim hover:text-ink'
                      }`}
                    >
                      {t.label}
                      {tab === t.id && (
                        <motion.div
                          layoutId={`tab-${mode}`}
                          className="absolute inset-x-0 -bottom-px h-[3px] bg-ink"
                        />
                      )}
                    </button>
                  ))}
                </div>
                <AnimatePresence>
                  {(tab === 'archive' || tab === 'queue') && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-2.5"
                    >
                    <button
                      onClick={() => setLayout('cards')}
                      aria-label="Card view"
                      aria-pressed={layout === 'cards'}
                      className={`transition-colors ${layout === 'cards' ? 'text-ink' : 'text-dim hover:text-ink'}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                        <rect x="0" y="0" width="6" height="6" fill="currentColor" />
                        <rect x="8" y="0" width="6" height="6" fill="currentColor" />
                        <rect x="0" y="8" width="6" height="6" fill="currentColor" />
                        <rect x="8" y="8" width="6" height="6" fill="currentColor" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setLayout('list')}
                      aria-label="List view"
                      aria-pressed={layout === 'list'}
                      className={`transition-colors ${layout === 'list' ? 'text-ink' : 'text-dim hover:text-ink'}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                        <rect x="0" y="1" width="14" height="2.5" fill="currentColor" />
                        <rect x="0" y="5.75" width="14" height="2.5" fill="currentColor" />
                        <rect x="0" y="10.5" width="14" height="2.5" fill="currentColor" />
                      </svg>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="mx-auto max-w-3xl px-5 pt-6">
              {tab === 'archive' && (
                <PosterWall
                  sections={view.sections}
                  filter={mode === 'films' ? () => true : i => i.done}
                  markSeen={mode === 'films'}
                  square={mode === 'music'}
                  layout={layout}
                  onItemClick={setOpenItem}
                />
              )}
              {tab === 'ranked' && (
                <>
                  {mode === 'films' && (
                    <p className="mb-4 text-center text-xs font-medium uppercase tracking-[0.14em] text-dim">
                      Scores are immediate post-watch ratings. Cannot change without a rewatch.
                    </p>
                  )}
                  <Ranked
                    items={rated}
                    square={mode === 'music'}
                    onItemClick={setOpenItem}
                  />
                </>
              )}
              {tab === 'queue' && (
                <PosterWall
                  sections={view.sections}
                  filter={i => !i.done}
                  markSeen={false}
                  square={mode === 'music'}
                  layout={layout}
                  onItemClick={setOpenItem}
                />
              )}
              {tab === 'data' && (
                <DataPanel items={items} mode={mode} onItemClick={setOpenItem} />
              )}
            </div>
          </motion.main>
        </AnimatePresence>
      )}

      <DetailModal item={openItem} onClose={() => setOpenItem(null)} />
    </div>
  )
}
