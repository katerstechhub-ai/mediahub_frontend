import { useEffect, useState } from 'react'

// Shows an image and never removes it.
// On failure it tries the original (un-resized) file, then retries a couple of times
// after a short pause (the first load can fail while many images load at once).
// If it still fails it shows an empty tile and logs the broken URL in the console.
const MAX_RETRIES = 2

export default function SafeImage({ src, fallback, onFail, alt, className, ...rest }) {
  const sources = fallback && fallback !== src ? [src, fallback] : [src]
  const [index, setIndex] = useState(0)
  const [retries, setRetries] = useState(0)
  const [dead, setDead] = useState(false)

  useEffect(() => {
    setIndex(0)
    setRetries(0)
    setDead(false)
  }, [src, fallback])

  const handleError = () => {
    if (index < sources.length - 1) {
      setIndex(index + 1)
      return
    }
    if (retries < MAX_RETRIES) {
      setTimeout(() => {
        setRetries((n) => n + 1)
        setIndex(0)
      }, 1200)
      return
    }
    console.warn('Image failed to load:', sources)
    setDead(true)
    if (onFail) onFail()
  }

  if (dead) return <div className={className} role="img" aria-label={alt || 'Memory'} />

  return (
    <img
      {...rest}
      key={`${index}-${retries}`}
      src={sources[index]}
      alt={alt}
      className={className}
      onError={handleError}
    />
  )
}