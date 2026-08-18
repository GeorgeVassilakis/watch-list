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
    <div className="relative overflow-hidden">
      {/* backdrop: the artwork itself, blown up and blurred */}
      <div className="absolute inset-0">
        {latest.cover ? (
          <img
            src={latest.cover}
            alt=""
            aria-hidden="true"
            className="h-full w-full scale-125 object-cover opacity-50 blur-2xl saturate-150"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: `hsl(${titleHue(latest.title)} 25% 14%)` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-ground/60 via-ground/30 to-ground" />
      </div>

      <div className="relative mx-auto max-w-3xl px-5 pb-6 pt-20">
        <div className="flex items-end gap-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="w-28 shrink-0 overflow-hidden rounded-lg shadow-2xl shadow-black/60 sm:w-36"
          >
            {latest.cover ? (
              <img src={latest.cover} alt={latest.title} className={`${aspect} w-full object-cover`} />
            ) : (
              <div
                className={`flex ${aspect} w-full items-end p-2.5`}
                style={{
                  background: `linear-gradient(160deg,
                    hsl(${titleHue(latest.title)} 18% 24%),
                    hsl(${titleHue(latest.title)} 22% 12%))`,
                }}
              >
                <span className="text-sm font-semibold text-ink/90">{latest.title}</span>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12, ease: 'easeOut' }}
            className="min-w-0 pb-1"
          >
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-dim">
              {isCurrent && (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#97C97C] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#97C97C]" />
                </span>
              )}
              {isCurrent ? EYEBROW_CURRENT[mode] : EYEBROW[mode]}
            </p>
            <h1 className="mt-1.5 text-3xl font-extrabold leading-[1.02] tracking-tight sm:text-4xl">
              {latest.title}
            </h1>
            <div className="mt-2.5 flex items-center gap-2.5 text-sm text-dim">
              {latest.rating != null && (
                <span
                  className="rounded-md bg-black/50 px-2 py-0.5 text-sm font-bold backdrop-blur-sm"
                  style={{ color: ratingColor(latest.rating) }}
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
          className="mt-7 grid grid-cols-3 gap-3 border-t border-hairline pt-4"
        >
          {stats.map(s => (
            <div key={s.label}>
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
