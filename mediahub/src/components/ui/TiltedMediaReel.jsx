import { useMemo } from 'react'
import MemoryVideo from './MemoryVideo'

const KEYFRAMES = `
@keyframes tilted-media-reel-forward {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(-50%, 0, 0); }
}
@keyframes tilted-media-reel-reverse {
  from { transform: translate3d(-50%, 0, 0); }
  to { transform: translate3d(0, 0, 0); }
}
.tilted-media-reel-track {
  display: flex;
  width: max-content;
  will-change: transform;
  animation: tilted-media-reel-forward var(--reel-duration) linear infinite;
}
.tilted-media-reel-track.reverse {
  animation-name: tilted-media-reel-reverse;
}
.tilted-media-reel:hover .tilted-media-reel-track {
  animation-play-state: paused;
}
@media (max-width: 768px) {
  .tilted-media-reel-track { animation-duration: 48s; }
  .tilted-media-reel-card { transform: rotate(var(--reel-tilt)) !important; }
}
@media (prefers-reduced-motion: reduce) {
  .tilted-media-reel-track { animation: none; transform: none; }
}
`

function TiltedMediaReel({ items = [], rows = 3, tilt = 4, className = '' }) {
  const rowItems = useMemo(() => Array.from({ length: rows }, (_, row) => (
    items.filter((_, index) => index % rows === row)
  )), [items, rows])

  if (!items.length) return null

  return (
    <div className={`tilted-media-reel relative w-full overflow-hidden ${className}`}>
      <style>{KEYFRAMES}</style>
      <div className="space-y-1.5 py-1 sm:space-y-2 sm:py-2">
        {rowItems.map((row, rowIndex) => {
          const repeated = [...row, ...row]
          return (
            <div key={rowIndex} className="overflow-hidden">
              <div
                className={`tilted-media-reel-track ${rowIndex % 2 ? 'reverse' : ''}`}
                style={{ '--reel-duration': `${34 + rowIndex * 7}s` }}
              >
                {repeated.map((item, index) => {
                  const source = typeof item === 'string' ? item : item.src
                  const isVideo = typeof item !== 'string' && item.type === 'video'
                  const cardTilt = ((index + rowIndex) % 2 ? 1 : -1) * tilt
                  return (
                    <div
                      key={`${source}-${rowIndex}-${index}`}
                      className="tilted-media-reel-card mx-1 h-[76px] w-[108px] shrink-0 overflow-hidden rounded-[16px] border-[3px] border-white bg-white shadow-[0_8px_16px_rgba(50,35,20,0.16)] transition-transform duration-300 hover:!rotate-0 hover:scale-[1.04] sm:mx-1.5 sm:h-[108px] sm:w-[154px]"
                      style={{ '--reel-tilt': `${cardTilt}deg`, transform: `rotate(${cardTilt}deg)` }}
                    >
                      {isVideo ? (
                        <MemoryVideo src={source} poster={item.poster} className="h-full w-full object-cover" />
                      ) : (
                        <img src={source} alt="Memory" loading="lazy" className="h-full w-full object-cover" draggable={false} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { TiltedMediaReel }
export default TiltedMediaReel
