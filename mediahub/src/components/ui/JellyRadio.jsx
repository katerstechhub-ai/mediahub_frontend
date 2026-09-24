import { motion } from 'framer-motion'

export default function JellyRadio({ items = [], value, defaultValue, onChange, className = '', ariaLabel = 'Options' }) {
  const current = value ?? defaultValue ?? items[0]?.value ?? items[0]
  const normalized = items.map((item) => typeof item === 'string' ? { value: item, label: item } : item)

  return (
    <div role="radiogroup" aria-label={ariaLabel} className={`flex max-w-full gap-1.5 overflow-x-auto rounded-full p-1 ${className}`} style={{ background: 'var(--bg-secondary)', scrollbarWidth: 'none' }}>
      {normalized.map((item) => {
        const selected = item.value === current
        return (
          <motion.button
            key={item.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={item.disabled}
            onClick={() => !item.disabled && onChange?.(item.value)}
            whileTap={{ scale: 0.94 }}
            animate={{ scale: selected ? 1.04 : 1 }}
            transition={{ type: 'spring', stiffness: 520, damping: 24 }}
            className="relative shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:text-sm"
            style={{
              color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
              background: selected ? 'var(--bg-primary)' : 'transparent',
              boxShadow: selected ? '0 3px 12px rgba(15, 23, 42, 0.12)' : 'none',
            }}
          >
            {item.icon}
            {item.label}
          </motion.button>
        )
      })}
    </div>
  )
}
