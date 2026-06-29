// ─── Spinner ─────────────────────────────────────────────
export function Spinner({ size = 24, className = '' }) {
  return (
    <div
      className={`animate-spin rounded-full border-2 border-transparent ${className}`}
      style={{
        width: size,
        height: size,
        borderTopColor: '#f59e0b',
        borderRightColor: '#f59e0b',
      }}
    />
  )
}

// ─── Avatar ──────────────────────────────────────────────
export function Avatar({ src, name, size = 40, ring = false }) {
  const initials = (name || 'U')[0].toUpperCase()
  return (
    <div
      className={`relative rounded-full flex-shrink-0 overflow-hidden ${ring ? 'p-0.5' : ''}`}
      style={{
        width: size,
        height: size,
        background: ring ? 'conic-gradient(#f59e0b, #ef4444, #8b5cf6, #f59e0b)' : undefined,
      }}
    >
      <div
        className="w-full h-full rounded-full overflow-hidden bg-amber-500 flex items-center justify-center text-white font-bold"
        style={{ fontSize: size * 0.4 }}
      >
        {src
          ? <img src={src} alt={name} className="w-full h-full object-cover" />
          : initials
        }
      </div>
    </div>
  )
}

// ─── Button ──────────────────────────────────────────────
export function Button({
  children, onClick, type = 'button',
  variant = 'primary', className = '', disabled = false, loading = false
}) {
  const base = 'flex items-center justify-center gap-2 rounded-xl font-semibold text-sm transition-all px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-amber-500 hover:bg-amber-400 text-white',
    secondary: 'border hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]',
    ghost: 'hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]',
    danger: 'bg-red-500 hover:bg-red-400 text-white',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${className}`}
      style={variant === 'secondary' ? { borderColor: 'var(--border)' } : {}}
    >
      {loading ? <Spinner size={16} /> : children}
    </button>
  )
}

// ─── Input ───────────────────────────────────────────────
export function Input({ label, error, icon: Icon, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
            <Icon size={16} />
          </span>
        )}
        <input
          {...props}
          className={`w-full rounded-xl px-4 py-3 text-sm outline-none transition-all border focus:border-amber-500 ${Icon ? 'pl-10' : ''} ${className}`}
          style={{
            background: 'var(--bg-input)',
            color: 'var(--text-primary)',
            borderColor: error ? '#ef4444' : 'var(--border)',
          }}
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── Textarea ────────────────────────────────────────────
export function Textarea({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <textarea
        {...props}
        className={`w-full rounded-xl px-4 py-3 text-sm outline-none transition-all border focus:border-amber-500 resize-none ${className}`}
        style={{
          background: 'var(--bg-input)',
          color: 'var(--text-primary)',
          borderColor: error ? '#ef4444' : 'var(--border)',
        }}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── EmptyState ──────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-6">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
          <Icon size={28} color="#f59e0b" />
        </div>
      )}
      <div>
        <p className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>{title}</p>
        {description && <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{description}</p>}
      </div>
      {action}
    </div>
  )
}

// ─── Card ────────────────────────────────────────────────
export function Card({ children, className = '', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border overflow-hidden ${onClick ? 'cursor-pointer post-card' : ''} ${className}`}
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      {children}
    </div>
  )
}
