import { useEffect, useState } from 'react'

// window.scrollY clamped to the scrollable range, so iOS rubber-band
// overshoot at either end does not read as scrolling
export function scrollPosition() {
  const max = document.documentElement.scrollHeight - window.innerHeight
  return Math.min(Math.max(window.scrollY, 0), max)
}

// true while the page is being scrolled down, false again on any scroll up.
// Stays false near the top.
export default function useScrollingDown() {
  const [down, setDown] = useState(false)

  useEffect(() => {
    let last = scrollPosition()
    const onScroll = () => {
      const y = scrollPosition()
      if (Math.abs(y - last) < 8) return
      setDown(y > last && y > 120)
      last = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return down
}
