import { useState, useRef, useEffect } from 'react'

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const ChevronLeft = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
)

const ChevronRight = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
)

const CalendarIcon = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
)

// Parse YYYY-MM-DD without UTC timezone shift
function parseISO(str) {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  return { year: y, month: m, day: d }
}

function toISO(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function formatDisplay(str) {
  const p = parseISO(str)
  if (!p) return ''
  return `${p.day} ${MONTH_NAMES[p.month - 1]} ${p.year}`
}

// Builds 42 cells (6 rows × 7 cols) for a given month view, starting on Monday
function buildCalendar(viewMonth, viewYear) {
  const firstDow = (new Date(viewYear, viewMonth - 1, 1).getDay() + 6) % 7 // Mon=0
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate()

  const prevMonth = viewMonth === 1 ? 12 : viewMonth - 1
  const prevYear = viewMonth === 1 ? viewYear - 1 : viewYear
  const daysInPrev = new Date(prevYear, prevMonth, 0).getDate()

  const nextMonth = viewMonth === 12 ? 1 : viewMonth + 1
  const nextYear = viewMonth === 12 ? viewYear + 1 : viewYear

  const now = new Date()
  const todayISO = toISO(now.getFullYear(), now.getMonth() + 1, now.getDate())

  const cells = []

  for (let i = firstDow - 1; i >= 0; i--) {
    const d = daysInPrev - i
    const iso = toISO(prevYear, prevMonth, d)
    cells.push({ day: d, current: false, iso, isToday: iso === todayISO })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = toISO(viewYear, viewMonth, d)
    cells.push({ day: d, current: true, iso, isToday: iso === todayISO })
  }

  let next = 1
  while (cells.length < 42) {
    const iso = toISO(nextYear, nextMonth, next)
    cells.push({ day: next, current: false, iso, isToday: iso === todayISO })
    next++
  }

  return cells
}

/**
 * Custom date picker matching the project's dark design system.
 *
 * Props:
 *   value    — YYYY-MM-DD string (controlled)
 *   onChange — (YYYY-MM-DD: string) => void
 *   label, error, hint, disabled
 *   maxDay   — if set, days above this number are disabled (used for recurring expenses)
 */
const DatePicker = ({ value, onChange, label, error, hint, disabled = false, maxDay }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const parsed = parseISO(value)
  const now = new Date()

  const [viewMonth, setViewMonth] = useState(parsed?.month ?? now.getMonth() + 1)
  const [viewYear, setViewYear] = useState(parsed?.year ?? now.getFullYear())

  // Sync the calendar view when the value changes externally
  useEffect(() => {
    if (parsed) {
      setViewMonth(parsed.month)
      setViewYear(parsed.year)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

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

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }

  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }

  const selectDay = (cell) => {
    if (!cell.current) return
    if (maxDay != null && cell.day > maxDay) return
    onChange(cell.iso)
    setOpen(false)
  }

  const cells = buildCalendar(viewMonth, viewYear)

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm text-muted font-medium">{label}</label>}

      <div ref={ref} className="relative">
        {/* Trigger button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className={`w-full flex items-center justify-between gap-2 bg-surface-elevated border text-sm rounded-lg px-4 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            open
              ? 'border-accent text-white'
              : 'border-surface-border text-white hover:border-accent/50'
          }`}
        >
          <span className={value ? 'text-white' : 'text-muted/50'}>
            {value ? formatDisplay(value) : 'Select a date'}
          </span>
          <span className="text-muted">
            <CalendarIcon />
          </span>
        </button>

        {/* Calendar dropdown */}
        {open && (
          <div className="absolute bottom-full mb-1.5 right-0 z-50 bg-surface-card border border-surface-border rounded-xl shadow-2xl p-4 w-72">

            {/* Month / year navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-surface-elevated transition-colors"
              >
                <ChevronLeft />
              </button>
              <span className="text-white text-sm font-semibold select-none">
                {MONTH_NAMES[viewMonth - 1]} {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-surface-elevated transition-colors"
              >
                <ChevronRight />
              </button>
            </div>

            {/* Day-of-week header */}
            <div className="grid grid-cols-7 mb-1">
              {DAY_LABELS.map((d) => (
                <div key={d} className="h-8 flex items-center justify-center text-xs text-muted/50 font-medium select-none">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {cells.map((cell, i) => {
                const isSelected = cell.iso === value
                const isDisabledByMax = maxDay != null && cell.day > maxDay
                const isOtherMonth = !cell.current

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectDay(cell)}
                    className={`h-9 w-full flex items-center justify-center rounded-lg text-sm transition-colors select-none ${
                      isSelected
                        ? 'bg-accent text-white font-semibold'
                        : isOtherMonth || isDisabledByMax
                        ? 'text-muted/20 cursor-default'
                        : cell.isToday
                        ? 'text-accent font-semibold hover:bg-surface-elevated'
                        : 'text-white/80 hover:bg-surface-elevated hover:text-white cursor-pointer'
                    }`}
                  >
                    {cell.day}
                  </button>
                )
              })}
            </div>

          </div>
        )}
      </div>

      {error && <p className="text-danger text-xs">{error}</p>}
      {!error && hint && <p className="text-muted/70 text-xs">{hint}</p>}
    </div>
  )
}

export default DatePicker
