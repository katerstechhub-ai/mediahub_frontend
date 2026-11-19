import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiGift, FiChevronRight } from 'react-icons/fi'

const SEEN_KEY = 'gift_popup_seen'

function readSeen() {
  try {
    return localStorage.getItem(SEEN_KEY) === '1'
  } catch (err) {
    return false
  }
}

function writeSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1')
  } catch (err) {
    // storage blocked: the pop-up may show again, which is harmless
  }
}

/* Gift registry banner for the top of the feed, plus a one-time pop-up.
   The banner is always there (never dismissible) so nobody can miss it.
   The pop-up shows once per device, a couple of seconds after the feed opens. */
export default function GiftBanner() {
  const navigate = useNavigate()
  const [popup, setPopup] = useState(false)

  useEffect(() => {
    if (readSeen()) return undefined
    const timer = setTimeout(() => setPopup(true), 2500)
    return () => clearTimeout(timer)
  }, [])

  const closePopup = () => {
    writeSeen()
    setPopup(false)
  }

  const openGifts = () => {
    writeSeen()
    setPopup(false)
    navigate('/gifts')
  }

  return (
    <>
      <motion.button
        type="button"
        onClick={() => navigate('/gifts')}
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        aria-label="Open the wedding gift registry"
        style={{
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          width: '100%',
          marginBottom: 20,
          padding: '14px 16px',
          borderRadius: 28,
          textAlign: 'left',
          cursor: 'pointer',
          background: 'linear-gradient(135deg, rgba(252,211,77,0.22), rgba(245,158,11,0.10) 55%, rgba(234,88,12,0.14))',
          border: '1px solid rgba(245,158,11,0.55)',
          boxShadow: '0 12px 32px rgba(245,158,11,0.20), inset 0 1px 0 rgba(255,255,255,0.30)',
          backdropFilter: 'saturate(160%) blur(18px)',
          WebkitBackdropFilter: 'saturate(160%) blur(18px)',
        }}
      >
        <motion.span
          aria-hidden="true"
          initial={{ x: '-120%' }}
          animate={{ x: '320%' }}
          transition={{ duration: 1.6, ease: 'easeInOut', repeat: Infinity, repeatDelay: 2.2 }}
          style={{
            position: 'absolute', top: 0, bottom: 0, left: 0, width: '35%', pointerEvents: 'none',
            background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.45), transparent)',
          }}
        />

        <motion.span
          animate={{ rotate: [0, -14, 14, -10, 10, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2.2 }}
          style={{
            position: 'relative', width: 50, height: 50, borderRadius: 25, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            background: 'linear-gradient(145deg, #fcd34d, #f59e0b 50%, #ea580c)',
            boxShadow: '0 6px 16px rgba(245,158,11,0.45), inset 0 1px 0 rgba(255,255,255,0.5)',
          }}
        >
          <FiGift size={24} strokeWidth={2.4} />
        </motion.span>

        <span style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 10, fontWeight: 800, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#d97706' }}>
            Wedding gift registry
          </span>
          <span className="font-display" style={{ display: 'block', marginTop: 2, fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Want to bless the couple?
          </span>
          <span style={{ display: 'block', marginTop: 1, fontSize: 13, color: 'var(--text-muted)' }}>
            Tap to see the gifts we would love
          </span>
        </span>

        <span
          style={{
            position: 'relative', flexShrink: 0, height: 40, padding: '0 14px', borderRadius: 20,
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 800, color: '#fff',
            background: 'linear-gradient(145deg, #fcd34d, #f59e0b 50%, #ea580c)',
            boxShadow: '0 6px 16px rgba(245,158,11,0.35), inset 0 1px 0 rgba(255,255,255,0.45)',
          }}
        >
          View <FiChevronRight size={16} strokeWidth={2.8} />
        </span>
      </motion.button>

      {createPortal(
        <AnimatePresence>
          {popup && (
            <motion.div
              key="gift-popup"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closePopup}
              style={{
                position: 'fixed', inset: 0, zIndex: 99998,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.88, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 16 }}
                transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-label="Wedding gift registry"
                style={{
                  width: '100%', maxWidth: 360, textAlign: 'center', padding: '30px 24px 22px', borderRadius: 32,
                  background: 'color-mix(in srgb, var(--bg-primary) 92%, transparent)',
                  border: '1px solid rgba(245,158,11,0.45)',
                  boxShadow: '0 30px 70px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.25)',
                  backdropFilter: 'saturate(180%) blur(24px)',
                  WebkitBackdropFilter: 'saturate(180%) blur(24px)',
                }}
              >
                <motion.div
                  animate={{ rotate: [0, -12, 12, -8, 8, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 1.6 }}
                  style={{
                    width: 72, height: 72, borderRadius: 36, margin: '0 auto 16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                    background: 'linear-gradient(145deg, #fcd34d, #f59e0b 50%, #ea580c)',
                    boxShadow: '0 10px 26px rgba(245,158,11,0.45), inset 0 1px 0 rgba(255,255,255,0.5)',
                  }}
                >
                  <FiGift size={32} strokeWidth={2.3} />
                </motion.div>
                <h2 className="font-display" style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>
                  Celebrating with us?
                </h2>
                <p style={{ margin: '8px 0 22px', fontSize: 14, lineHeight: 1.5, color: 'var(--text-muted)' }}>
                  See the gifts Paloma and Kenneth would love, or send a cash gift.
                </p>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={openGifts}
                  style={{
                    width: '100%', height: 50, borderRadius: 25, border: 'none', cursor: 'pointer',
                    fontSize: 15, fontWeight: 800, color: '#fff',
                    background: 'linear-gradient(145deg, #fcd34d, #f59e0b 50%, #ea580c)',
                    boxShadow: '0 8px 22px rgba(245,158,11,0.40), inset 0 1px 0 rgba(255,255,255,0.45)',
                  }}
                >
                  See the gift list
                </motion.button>
                <button
                  type="button"
                  onClick={closePopup}
                  style={{ marginTop: 6, height: 44, width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}
                >
                  Maybe later
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}