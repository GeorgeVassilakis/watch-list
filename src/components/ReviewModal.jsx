import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ratingColor, formatRating } from '../lib/data.js'

function labelize(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase())
}

function metaRows(item, review) {
  const meta = review.metadata && typeof review.metadata === 'object' ? { ...review.metadata } : {}
  const rows = [
    ['Genre', meta.genre ?? review.genre],
    ['Year', meta.releaseYear ?? meta.year ?? review.releaseYear ?? item.year],
    ['Length', meta.length ?? review.length],
  ]
  for (const k of ['genre', 'releaseYear', 'year', 'length', 'label', 'sourceUrl']) delete meta[k]
  for (const [k, v] of Object.entries(meta)) rows.push([labelize(k), v])
  return rows
    .map(([label, v]) => [label, Array.isArray(v) ? v.filter(Boolean).join(', ') : v == null ? '' : String(v).trim()])
    .filter(([, v]) => v)
}

export default function ReviewModal({ item, onClose }) {
  useEffect(() => {
    if (!item) return
    const onKey = e => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [item, onClose])

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={e => e.target === e.currentTarget && onClose()}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6"
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            role="dialog"
            aria-modal="true"
            className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-hairline bg-panel p-5 shadow-2xl shadow-black/60 sm:rounded-2xl"
          >
            <div className="flex items-center gap-4">
              {item.cover && (
                <img
                  src={item.cover}
                  alt=""
                  className="h-20 w-20 shrink-0 rounded-lg object-cover shadow-lg shadow-black/50"
                />
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-extrabold leading-tight tracking-tight">{item.title}</h2>
                {item.subtitle && <p className="mt-0.5 text-sm text-dim">{item.subtitle}</p>}
              </div>
              {item.rating != null && (
                <span className="text-xl font-extrabold" style={{ color: ratingColor(item.rating) }}>
                  {formatRating(item.rating)}
                </span>
              )}
            </div>

            {item.review.summary && (
              <p className="mt-4 text-[15px] leading-relaxed text-ink/90">{item.review.summary}</p>
            )}

            {Array.isArray(item.review.topSongs) && item.review.topSongs.length > 0 && (
              <div className="mt-5">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-dim">
                  Top three songs
                </h3>
                <ol className="mt-2 flex flex-col gap-1.5">
                  {item.review.topSongs.slice(0, 3).map((song, i) => (
                    <li key={song} className="flex items-center gap-2.5 text-sm">
                      <span className="w-4 text-right font-extrabold text-ink/40">{i + 1}</span>
                      <span className="font-medium">{song}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {metaRows(item, item.review).length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-hairline pt-4">
                {metaRows(item, item.review).map(([label, value]) => (
                  <div key={label}>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-dim">
                      {label}
                    </div>
                    <div className="mt-0.5 text-sm font-medium">{value}</div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={onClose}
              className="mt-6 w-full rounded-xl bg-white/[0.06] py-2.5 text-sm font-semibold text-dim hover:bg-white/[0.1] hover:text-ink"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
