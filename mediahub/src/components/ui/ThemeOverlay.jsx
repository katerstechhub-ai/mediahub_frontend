import { useThemeStore } from '../../store'
import { FiMonitor, FiMoon, FiSun } from 'react-icons/fi'

const OPTIONS = [
  { value: 'light', label: 'Light', Icon: FiSun },
  { value: 'dark', label: 'Dark', Icon: FiMoon },
  { value: 'system', label: 'System', Icon: FiMonitor },
]

export default function ThemeOverlay({ className = '' }) {
  const { theme, setTheme } = useThemeStore()

  return (
    <div
      className={`pointer-events-auto flex items-center gap-0.5 rounded-full border p-1 shadow-lg backdrop-blur-xl ${className}`}
      style={{
        background: 'color-mix(in srgb, var(--bg-primary) 88%, transparent)',
        borderColor: 'var(--border)',
      }}
      role="radiogroup"
      aria-label="Color theme"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const selected = theme === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${label} theme`}
            title={`${label} theme`}
            onClick={() => setTheme(value)}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-all"
            style={{
              background: selected ? '#f59e0b' : 'transparent',
              color: selected ? '#fff' : 'var(--text-muted)',
            }}
          >
            <Icon size={15} strokeWidth={2.25} />
          </button>
        )
      })}
    </div>
  )
}
