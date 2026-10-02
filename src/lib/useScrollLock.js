import { useEffect } from 'react'

// counted, so closing a detail card opened from search keeps the page locked
let locks = 0

export default function useScrollLock(active) {
  useEffect(() => {
    if (!active) return
    locks += 1
    document.body.style.overflow = 'hidden'
    return () => {
      locks -= 1
      if (locks === 0) document.body.style.overflow = ''
    }
  }, [active])
}
