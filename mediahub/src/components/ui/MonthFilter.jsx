import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FiCalendar, FiChevronDown } from 'react-icons/fi'
import JellyRadio from './JellyRadio'

export default function MonthFilter({ items, value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const selected = items.find((item) => item.value === value)?.label || 'All months'

  useEffect(() => {
    const handleOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', handleOutside)
    return () => document.removeEventListener('pointerdown', handleOutside)
  }, [])

  return (
    <div ref={ref} className="relative z-20 flex justify-end">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-2 rounded-full px-3.5 py-2.5 text-xs font-semibold shadow-sm transition hover:shadow-md sm:px-4 sm:text-sm"
        style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
      >
        <FiCalendar size={15} />
        <span>{selected}</span>
        <FiChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-full mt-2 max-w-[calc(100vw-1rem)] rounded-2xl p-2 shadow-xl"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
          >
            <JellyRadio
              items={items}
              value={value}
              onChange={(next) => {
                onChange(next)
                setOpen(false)
              }}
              ariaLabel="Filter memories by month"
              className="max-w-[calc(100vw-2rem)] sm:max-w-[520px]"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
