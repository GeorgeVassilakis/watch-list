import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const SPRING = { type: 'spring', damping: 30, stiffness: 320 }
import { ratingColor, formatRating, titleHue } from '../lib/data.js'

function labelize(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase())
}

function clean(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ')
  return value == null ? '' : String(value).trim()
}

function metaRows(item) {
  const fetched = item.meta ?? {}
  const review = item.review
  let rows
  if (review) {
    const extra = review.metadata && typeof review.metadata === 'object' ? { ...review.metadata } : {}
    rows = [
      ['Genre', extra.genre ?? review.genre ?? fetched.genre],
      ['Year', extra.releaseYear ?? extra.year ?? review.releaseYear ?? item.year],
      ['Length', extra.length ?? review.length ?? fetched.length],
      ['Tracks', fetched.tracks],
      ['Label', fetched.label],
    ]
    for (const k of ['genre', 'releaseYear', 'year', 'length', 'label', 'sourceUrl']) delete extra[k]
    for (const [k, v] of Object.entries(extra)) rows.push([labelize(k), v])
  } else {
    rows = [
      ['Year', fetched.year ?? item.year],
      ['Director', fetched.directors],
      ['Runtime', fetched.runtime && `${fetched.runtime} min`],
      ['Genre', fetched.genres ?? fetched.genre],
      ['Pages', fetched.pages],
      ['Subjects', fetched.subjects],
      ['Length', fetched.length],
      ['Tracks', fetched.tracks],
      ['Label', fetched.label],
    ]
  }
  return rows.map(([label, v]) => [label, clean(v)]).filter(([, v]) => v)
}

export default function DetailModal({ item, onClose }) {
  const [zoomed, setZoomed] = useState(false)
  // true while the artwork is flying back into its slot; the card must not
  // clip it and it must render above everything until the spring settles
  const [settling, setSettling] = useState(false)

  const closeZoom = () => {
    setZoomed(false)
    setSettling(true)
  }

  useEffect(() => {
    setZoomed(false)
    setSettling(false)
  }, [item])

  useEffect(() => {
    if (!item) return
    const onKey = e => {
      if (e.key !== 'Escape') return
      if (zoomed) closeZoom()
      else onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [item, zoomed, onClose])

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={e => e.target === e.currentTarget && onClose()}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-6"
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            role="dialog"
            aria-modal="true"
            className={`max-h-[88vh] w-full max-w-xl border-t-[3px] border-ink bg-paper p-5 shadow-print-lg sm:border-[3px] ${
              settling ? 'overflow-visible' : 'overflow-y-auto'
            }`}
          >
            <div className="flex items-center gap-4">
              {item.cover ? (
                zoomed ? (
                  <div className="h-24 w-16 shrink-0" />
                ) : (
                  <motion.img
                    layoutId="detail-cover"
                    transition={SPRING}
                    onLayoutAnimationComplete={() => setSettling(false)}
                    src={item.cover}
                    alt={`${item.title} artwork, tap to enlarge`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setZoomed(true)}
                    onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setZoomed(true))}
                    whileHover={{ scale: 1.04 }}
                    style={settling ? { zIndex: 80 } : undefined}
                    className="relative h-24 w-auto max-w-20 shrink-0 cursor-zoom-in object-cover shadow-print"
                  />
                )
              ) : (
                <div
                  className="h-24 w-16 shrink-0 shadow-print"
                  style={{ background: `hsl(${titleHue(item.title)} 30% 30%)` }}
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

            {item.review?.summary && (
              <p className="mt-4 text-[15px] leading-relaxed text-ink/90">{item.review.summary}</p>
            )}

            {Array.isArray(item.review?.topSongs) && item.review.topSongs.length > 0 && (
              <div className="mt-5">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-dim">
                  Top three songs
                </h3>
                <ol className="mt-2 flex flex-col gap-1.5">
                  {item.review.topSongs.slice(0, 3).map((song, i) => (
                    <li key={song} className="flex items-center gap-2.5 text-sm">
                      <span className="w-4 text-right font-extrabold text-accent">{i + 1}</span>
                      <span className="font-medium">{song}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {metaRows(item).length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4">
                {metaRows(item).map(([label, value]) => (
                  <div key={label} className={value.length > 60 ? 'col-span-2' : ''}>
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
              className="mt-6 w-full border-2 border-ink py-2.5 text-sm font-semibold uppercase tracking-[0.1em] text-ink transition-colors hover:bg-ink hover:text-paper"
            >
              Close
            </button>

            <AnimatePresence>
              {zoomed && item.cover && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  onClick={closeZoom}
                  role="button"
                  aria-label="Close full artwork view"
                  className="fixed inset-0 z-[70] flex cursor-zoom-out items-center justify-center bg-black/90 p-5"
                >
                  <motion.img
                    layoutId="detail-cover"
                    transition={SPRING}
                    src={item.cover}
                    alt={`${item.title} artwork`}
                    className="max-h-[92vh] max-w-[94vw] object-contain"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
