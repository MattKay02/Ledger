import { useState, useRef, useEffect } from 'react'

const ChevronIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
)

/**
 * Custom styled dropdown replacing native <select>.
 * options: { value: any, label: string, disabled?: boolean }[]
 * onChange: (value) => void
 */
const Select = ({ value, onChange, options, disabled = false, className = '' }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const selected = options.find((o) => o.value === value)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>

      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center gap-2 bg-surface-elevated border text-sm font-medium rounded-lg px-3 py-2 transition-colors select-none whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${
          open
            ? 'border-accent text-white'
            : 'border-surface-border text-white hover:border-accent/50'
        }`}
      >
        <span>{selected?.label ?? '—'}</span>
        <span className={`text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <ChevronIcon />
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-50 min-w-full overflow-hidden bg-surface-card border border-surface-border rounded-xl shadow-2xl py-1">
          {options.map((option) => {
            const isSelected = option.value === value
            const isDisabled = !!option.disabled
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  if (isDisabled) return
                  onChange(option.value)
                  setOpen(false)
                }}
                className={`w-full flex items-center justify-between gap-6 px-3 py-2 text-sm transition-colors ${
                  isDisabled
                    ? 'text-muted/40 cursor-not-allowed'
                    : isSelected
                    ? 'bg-accent/10 text-white font-medium cursor-pointer'
                    : 'text-white/80 hover:bg-surface-elevated hover:text-white cursor-pointer'
                }`}
              >
                <span>{option.label}</span>
                {isSelected && !isDisabled && <CheckIcon />}
              </button>
            )
          })}
        </div>
      )}

    </div>
  )
}

export default Select
