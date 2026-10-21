import { useRef } from 'react'
import { motion } from 'framer-motion'
import { ratingColor, formatRating, titleHue } from '../lib/data.js'
import { TRIM } from '../lib/textTrim.js'
import Byline from './Byline.jsx'
import DitherField from './DitherField.jsx'

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

// the field's lower edge climbs 2deg to the right; cut with a clip rather
// than a skew, since any transform would resample the dither cells
const FIELD_EDGE = 'polygon(0 0, 100% 0, 100% calc(100% - tan(2deg) * 100cqw), 0 100%)'

export default function Hero({ mode, latest, isCurrent = false, stats }) {
  const coverRef = useRef(null)
  const textRef = useRef(null)
  if (!latest) return null
  const aspect = mode === 'music' ? 'aspect-square' : 'aspect-[2/3]'
  return (
    <div className="@container relative overflow-hidden pt-[54px]">
      {/* Bass-style color field: an angled block the artwork is mounted on,
          anchored to the bottom so the cover always breaks its lower edge.
          Its face is a live dither with its own motion for each mode. */}
      <div
        className="absolute inset-x-0 -top-10 bottom-32 overflow-hidden bg-accent"
        style={{ clipPath: FIELD_EDGE }}
      >
        <DitherField pattern={mode} anchorRef={coverRef} quietRef={textRef} />
      </div>

      <div className="relative mx-auto max-w-3xl px-5 pb-6 pt-10">
        <div className="flex items-end gap-5">
          <motion.div
            ref={coverRef}
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
            ref={textRef}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12, ease: 'easeOut' }}
            className="min-w-0 pb-10"
          >
            {/* the small type sits on solid print pieces mounted on the dither
                like the poster: a tab for the eyebrow, then a ticket stub of
                rating and byline */}
            <p className="flex w-fit items-center gap-1.5 bg-ground px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink shadow-print">
              {isCurrent && (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
                </span>
              )}
              <span className={TRIM}>{isCurrent ? EYEBROW_CURRENT[mode] : EYEBROW[mode]}</span>
            </p>
            <h1 className="mt-2 break-words text-2xl font-extrabold leading-[1.05] tracking-tight text-ground sm:text-4xl sm:leading-[1.02]">
              {latest.title}
            </h1>
            <div className="mt-3 flex w-fit text-sm shadow-print">
              {latest.rating != null && (
                <span
                  className="flex items-center px-2 py-2 font-bold text-ground"
                  style={{ background: 'var(--mc-ink)' }}
                >
                  <span className={TRIM}>{formatRating(latest.rating)}</span>
                </span>
              )}
              {latest.subtitle && (
                <span className={`min-w-0 bg-ground px-2.5 py-2 text-ink/80 ${TRIM}`}>
                  <Byline parts={latest.subtitleParts} />
                </span>
              )}
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
