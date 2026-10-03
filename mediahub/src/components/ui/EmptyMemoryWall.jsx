// src/components/ui/EmptyMemoryWall.jsx
import { motion, useReducedMotion } from 'framer-motion'
import { FiCamera, FiImage, FiVideo, FiPlus, FiClock } from 'react-icons/fi'

/* Empty state for a profile with no posts.
   variant="own"   → invites the owner to post and shows a Create button (pass onCreate).
   variant="other" → tells a visitor this person hasn't posted yet (pass their name). */

const CARD_W = 92
const CARD_H = 118

const AMBER_GRADIENT = 'linear-gradient(145deg, #fcd34d, #f59e0b 50%, #ea580c)'

// One tilted "polaroid" in the fan. tone: 'ghost' (dashed, quiet) | 'amber' (call to action) | 'solid' (quiet but filled)
function FanCard({ tone, rotate, x, delay, floatSeconds, reduce, zIndex, children }) {
  const toneStyle = {
    ghost: {
      background: 'color-mix(in srgb, var(--bg-secondary) 85%, transparent)',
      border: '1.5px dashed color-mix(in srgb, var(--text-muted) 45%, transparent)',
      color: 'var(--text-muted)',
      boxShadow: '0 10px 24px rgba(15,23,42,0.08)',
    },
    solid: {
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      color: 'var(--text-muted)',
      boxShadow: '0 14px 30px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.18)',
    },
    amber: {
      background: AMBER_GRADIENT,
      border: '1px solid rgba(255,255,255,0.28)',
      color: '#fff',
      boxShadow: '0 16px 34px rgba(245,158,11,0.38), inset 0 1px 0 rgba(255,255,255,0.45)',
    },
  }[tone]

  const barColor = tone === 'amber' ? 'rgba(255,255,255,0.42)' : 'color-mix(in srgb, var(--text-muted) 28%, transparent)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotate: 0, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, rotate, scale: 1 }}
      transition={{ type: 'spring', stiffness: 150, damping: 16, delay }}
      style={{
        position: 'absolute', left: '50%', top: 14, width: CARD_W, height: CARD_H,
        marginLeft: -CARD_W / 2 + x, zIndex,
      }}
    >
      <motion.div
        animate={reduce ? undefined : { y: [0, -6, 0] }}
        transition={reduce ? undefined : { duration: floatSeconds, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'relative', width: '100%', height: '100%', borderRadius: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          ...toneStyle,
        }}
      >
        <div style={{ marginTop: -10 }}>{children}</div>
        {/* caption lines, like the strip under a polaroid */}
        <span style={{ position: 'absolute', left: 14, right: 14, bottom: 22, height: 5, borderRadius: 3, background: barColor }} />
        <span style={{ position: 'absolute', left: 14, right: 40, bottom: 12, height: 5, borderRadius: 3, background: barColor, opacity: 0.7 }} />
      </motion.div>
    </motion.div>
  )
}

export default function EmptyMemoryWall({ variant = 'own', name, onCreate }) {
  const reduce = useReducedMotion()
  const own = variant === 'own'
  const who = (name && String(name).trim()) || 'This person'

  const eyebrow = own ? 'Your memory wall' : 'Memory wall'
  const headline = own ? 'Your story starts with one photo' : `${who} hasn't posted yet`
  const sub = own
    ? "Share a moment — a photo, a video, a day you don't want to forget — and it will live right here."
    : 'When they share a photo or video, it will show up right here. Check back soon.'

  return (
    <section
      role="status"
      style={{ position: 'relative', margin: '48px auto 0', maxWidth: 420, padding: '8px 8px 24px', textAlign: 'center' }}
    >
      {/* soft amber glow behind the fan */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', left: '50%', top: -16, width: 340, height: 270, marginLeft: -170,
          background: 'radial-gradient(closest-side, rgba(245,158,11,0.20), transparent)', pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', width: 260, height: 160, margin: '0 auto' }}>
        <FanCard tone="ghost" rotate={-11} x={-62} delay={0.05} floatSeconds={3.6} reduce={reduce} zIndex={1}>
          <FiImage size={24} strokeWidth={1.6} />
        </FanCard>
        <FanCard tone="ghost" rotate={11} x={62} delay={0.15} floatSeconds={4.2} reduce={reduce} zIndex={2}>
          <FiVideo size={24} strokeWidth={1.6} />
        </FanCard>
        <FanCard tone={own ? 'amber' : 'solid'} rotate={own ? -2 : 0} x={0} delay={0.25} floatSeconds={3.2} reduce={reduce} zIndex={3}>
          {own ? <FiCamera size={30} strokeWidth={1.8} /> : <FiClock size={28} strokeWidth={1.6} />}
        </FanCard>
      </div>

      <p style={{ position: 'relative', margin: '18px 0 0', fontSize: 11, fontWeight: 800, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#d97706' }}>
        {eyebrow}
      </p>
      <h2
        className="font-display"
        style={{ position: 'relative', margin: '8px 0 0', fontSize: 21, lineHeight: 1.25, fontWeight: 700, letterSpacing: '-0.022em', color: 'var(--text-primary)' }}
      >
        {headline}
      </h2>
      <p style={{ position: 'relative', margin: '10px auto 0', maxWidth: 330, fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-muted)' }}>
        {sub}
      </p>

      {own ? (
        <motion.button
          type="button"
          onClick={onCreate}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          style={{
            position: 'relative', marginTop: 24, height: 46, padding: '0 24px', borderRadius: 23,
            display: 'inline-flex', alignItems: 'center', gap: 8,
            border: 'none', fontSize: 14, fontWeight: 700, color: '#fff', background: AMBER_GRADIENT,
            boxShadow: '0 10px 24px rgba(245,158,11,0.36), inset 0 1px 0 rgba(255,255,255,0.45)',
          }}
        >
          <FiPlus size={18} strokeWidth={2.6} />
          Create your first memory
        </motion.button>
      ) : (
        <span
          style={{
            position: 'relative', marginTop: 22, height: 34, padding: '0 14px', borderRadius: 17,
            display: 'inline-flex', alignItems: 'center', gap: 7,
            fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
            background: 'color-mix(in srgb, var(--bg-secondary) 80%, transparent)',
            border: '1px solid var(--border)',
          }}
        >
          <FiClock size={13} strokeWidth={2.2} />
          Quiet for now
        </span>
      )}
    </section>
  )
}