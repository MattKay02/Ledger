import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Parses YYYY-MM-DD strings directly to avoid UTC timezone shifts
function buildPeriodsFromDates(rows) {
  const periods = new Map()
  rows.forEach(({ date }) => {
    if (!date) return
    const y = parseInt(date.slice(0, 4), 10)
    const m = parseInt(date.slice(5, 7), 10)
    if (!periods.has(y)) periods.set(y, new Set())
    periods.get(y).add(m)
  })
  return periods
}

/**
 * Fetches all distinct year-month pairs that have data.
 * source: 'expenses' | 'income' | 'both' | 'budgets'
 * Returns Map<year, Set<month>> or null while loading.
 */
export function useAvailablePeriods(source) {
  const { user } = useAuth()
  const [availablePeriods, setAvailablePeriods] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    const fetchPeriods = async () => {
      if (source === 'budgets') {
        const { data, error } = await supabase
          .from('budgets')
          .select('month, year')
          .eq('user_id', user.id)
        if (error) console.error('useAvailablePeriods budgets error:', error)
        const periods = new Map()
        ;(data || []).forEach(({ month, year }) => {
          if (!periods.has(year)) periods.set(year, new Set())
          periods.get(year).add(month)
        })
        setAvailablePeriods(periods)
        return
      }

      const queries = []
      if (source === 'expenses' || source === 'both') {
        queries.push(supabase.from('expenses').select('date').eq('user_id', user.id))
      }
      if (source === 'income' || source === 'both') {
        queries.push(supabase.from('income').select('date').eq('user_id', user.id))
      }
      const results = await Promise.all(queries)
      results.forEach((r) => {
        if (r.error) console.error('useAvailablePeriods error:', r.error)
      })
      const allRows = results.flatMap((r) => r.data || [])
      setAvailablePeriods(buildPeriodsFromDates(allRows))
    }
    fetchPeriods()
  }, [user?.id, source])

  return availablePeriods
}

/**
 * Manages month/year selection state, auto-corrects to the most recent period
 * with data, and returns filtered selector options.
 *
 * source: 'expenses' | 'income' | 'both' | 'budgets'
 *
 * Returns:
 *   month, year          — selected values
 *   setMonth, setYear    — setters (setYear also auto-adjusts month)
 *   periodsLoaded        — false while the availability fetch is in progress
 *   yearOptions          — number[] of years that have data
 *   monthOptions         — { value, label }[] of months that have data in the selected year
 */
export function usePeriodSelector(source) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const availablePeriods = useAvailablePeriods(source)

  // Auto-correct to most recent period with data once periods load
  useEffect(() => {
    if (!availablePeriods || availablePeriods.size === 0) return
    const months = availablePeriods.get(year)
    if (months && months.has(month)) return
    const latestYear = Math.max(...availablePeriods.keys())
    const latestMonth = Math.max(...availablePeriods.get(latestYear))
    setYear(latestYear)
    setMonth(latestMonth)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availablePeriods])

  const periodsLoaded = availablePeriods !== null

  const yearOptions =
    periodsLoaded && availablePeriods.size > 0
      ? [...availablePeriods.keys()].sort((a, b) => a - b).map((y) => ({ value: y, label: String(y) }))
      : [{ value: year, label: String(year) }]

  const availableMonthsSet = availablePeriods?.get(year)
  // All 12 months always shown; months without data are disabled (grayed out, not clickable)
  const monthOptions = MONTH_NAMES.map((name, i) => ({
    value: i + 1,
    label: name,
    disabled: periodsLoaded ? !availableMonthsSet?.has(i + 1) : false,
  }))

  const handleYearChange = (newYear) => {
    setYear(newYear)
    const months = availablePeriods?.get(newYear)
    if (months && !months.has(month)) setMonth(Math.max(...months))
  }

  return { month, year, setMonth, setYear: handleYearChange, periodsLoaded, yearOptions, monthOptions }
}
