import { motion } from 'framer-motion'
import { ratingColor, formatRating, titleHue } from '../lib/data.js'

const EYEBROW = {
  films: 'Latest screening',
  books: 'Latest read',
  music: 'Latest review',
}

const EYEBROW_CURRENT = {
  films: 'Now watching',
  books: 'Currently reading',
  music: 'Now listening',
}

export default function Hero({ mode, latest, isCurrent = false, stats }) {
  if (!latest) return null
  const aspect = mode === 'music' ? 'aspect-square' : 'aspect-[2/3]'
  return (
    <div className="relative overflow-hidden pt-[54px]">
      {/* Bass-style color field: a flat angled block the artwork is mounted on,
          anchored to the bottom so the cover always breaks its lower edge */}
      <div className="absolute inset-x-0 -top-10 bottom-32 origin-top-left -skew-y-2 bg-accent" />

      <div className="relative mx-auto max-w-3xl px-5 pb-6 pt-10">
        <div className="flex items-end gap-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="w-32 shrink-0 shadow-print-lg sm:w-40"
          >
            {latest.cover ? (
              <img src={latest.cover} alt={latest.title} className={`${aspect} w-full object-cover`} />
            ) : (
              <div
                className={`flex ${aspect} w-full items-end p-2.5`}
                style={{ background: `hsl(${titleHue(latest.title)} 30% 30%)` }}
              >
                <span className="text-sm font-semibold text-[#F2ECDF]">{latest.title}</span>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12, ease: 'easeOut' }}
            className="min-w-0 pb-10"
          >
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-ground/80">
              {isCurrent && (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ground opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-ground" />
                </span>
              )}
              {isCurrent ? EYEBROW_CURRENT[mode] : EYEBROW[mode]}
            </p>
            <h1 className="mt-1.5 break-words text-2xl font-extrabold leading-[1.05] tracking-tight text-ground sm:text-4xl sm:leading-[1.02]">
              {latest.title}
            </h1>
            <div className="mt-2.5 flex items-center gap-2.5 text-sm text-ground/80">
              {latest.rating != null && (
                <span
                  className="px-2 py-0.5 text-sm font-bold text-ground"
                  style={{ background: 'var(--mc-ink)' }}
                >
                  {formatRating(latest.rating)}
                </span>
              )}
              {latest.subtitle && <span className="truncate">{latest.subtitle}</span>}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.28 }}
          className="mt-10 grid grid-cols-3 gap-3"
        >
          {stats.map(s => (
            <div key={s.label} className="border-t-[3px] border-ink pt-2">
              <div className="text-xl font-extrabold tracking-tight sm:text-2xl">{s.value}</div>
              <div className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-dim">
                {s.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
