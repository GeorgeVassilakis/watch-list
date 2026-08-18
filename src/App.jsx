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

function decadeChart(items) {
  const counts = new Map()
  for (const item of items.filter(i => i.done)) {
    const m = String(item.year || '').match(/(\d{4})/)
    if (!m) continue
    const decade = Math.floor(Number(m[1]) / 10) * 10
    const label = decade <= 1950 ? '1950s & earlier' : `${decade}s`
    counts.set(label, (counts.get(label) || 0) + 1)
  }
  const rows = [...counts.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([label, count]) => ({ label, count }))
  return rows.length ? { title: 'Decade distribution', rows } : null
}

export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('films')
  const [tab, setTab] = useState('archive')
  const [openItem, setOpenItem] = useState(null)

  useEffect(() => {
    loadAll().then(setData).catch(e => setError(String(e)))
  }, [])

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
      <header className="fixed inset-x-0 top-0 z-40 border-b border-hairline bg-ground/70 backdrop-blur-xl">
        <div className="mx-auto flex h-12 max-w-3xl items-center justify-between px-5">
          <span className="text-sm font-extrabold tracking-tight">
            GV<span className="text-dim">/</span>ARCHIVE
          </span>
          <nav className="flex gap-1">
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => switchMode(m.id)}
                className={`rounded-full px-3 py-1 text-[13px] font-semibold transition-colors ${
                  mode === m.id ? 'bg-ink text-ground' : 'text-dim hover:text-ink'
                }`}
              >
                {m.label}
              </button>
            ))}
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

            <div className="sticky top-12 z-30 border-b border-hairline bg-ground/80 backdrop-blur-xl">
              <div className="mx-auto flex max-w-3xl gap-6 px-5">
                {TABS[mode].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`relative py-3 text-[13px] font-semibold transition-colors ${
                      tab === t.id ? 'text-ink' : 'text-dim hover:text-ink'
                    }`}
                  >
                    {t.label}
                    {tab === t.id && (
                      <motion.div
                        layoutId={`tab-${mode}`}
                        className="absolute inset-x-0 -bottom-px h-0.5 bg-ink"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="mx-auto max-w-3xl px-5 pt-6">
              {tab === 'archive' && (
                <PosterWall
                  sections={view.sections}
                  filter={mode === 'films' ? () => true : i => i.done}
                  ghostUndone={mode === 'films'}
                  square={mode === 'music'}
                  onItemClick={setOpenItem}
                />
              )}
              {tab === 'ranked' && (
                <Ranked
                  items={rated}
                  square={mode === 'music'}
                  onItemClick={setOpenItem}
                />
              )}
              {tab === 'queue' && (
                <PosterWall
                  sections={view.sections}
                  filter={i => !i.done}
                  ghostUndone={false}
                  square={mode === 'music'}
                  onItemClick={setOpenItem}
                />
              )}
              {tab === 'data' && (
                <DataPanel
                  items={items}
                  labels={STAT_LABELS[mode]}
                  extraChart={mode === 'music' ? decadeChart(items) : null}
                  onItemClick={setOpenItem}
                />
              )}
            </div>
          </motion.main>
        </AnimatePresence>
      )}

      <DetailModal item={openItem} onClose={() => setOpenItem(null)} />
    </div>
  )
}
