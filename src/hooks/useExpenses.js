import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// ── Helpers ────────────────────────────────────────────────────────────────────

function monthBounds(month, year) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, '0')}-01`
  return { startDate, endDate }
}

// Returns true if the template is active for the given month/year
function isTemplateActiveForMonth(template, month, year) {
  if (!template.is_active) return false

  const startYear = parseInt(template.start_date.slice(0, 4), 10)
  const startMonth = parseInt(template.start_date.slice(5, 7), 10)

  // Template must have started on or before this month
  if (year < startYear || (year === startYear && month < startMonth)) return false

  if (template.duration_type === 'indefinite') return true

  if (template.duration_type === 'months' && template.duration_months) {
    let endMonth = startMonth + (template.duration_months - 1)
    let endYear = startYear
    while (endMonth > 12) { endMonth -= 12; endYear += 1 }
    return year < endYear || (year === endYear && month <= endMonth)
  }

  if (template.duration_type === 'until_date' && template.end_date) {
    const endYear = parseInt(template.end_date.slice(0, 4), 10)
    const endMonth = parseInt(template.end_date.slice(5, 7), 10)
    return year < endYear || (year === endYear && month <= endMonth)
  }

  return false
}

// Inserts expense rows for any active recurring templates that don't yet have
// a row for the given month. Returns true if any rows were inserted.
async function materializeRecurring(userId, month, year, existingExpenses) {
  const { data: templates, error } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error) {
    console.error('materializeRecurring fetch error:', error)
    return false
  }
  if (!templates || templates.length === 0) return false

  const activeTemplates = templates.filter((t) => isTemplateActiveForMonth(t, month, year))
  if (activeTemplates.length === 0) return false

  const existingTemplateIds = new Set(
    existingExpenses
      .filter((e) => e.recurring_expense_id)
      .map((e) => e.recurring_expense_id),
  )

  const missing = activeTemplates.filter((t) => !existingTemplateIds.has(t.id))
  if (missing.length === 0) return false

  const rows = missing.map((t) => ({
    user_id: userId,
    title: t.title,
    amount_original: t.amount_original,
    currency_original: t.currency_original,
    amount_gbp: t.amount_gbp,
    exchange_rate: t.exchange_rate,
    conversion_date: t.conversion_date,
    category: t.category,
    type: 'recurring',
    date: `${year}-${String(month).padStart(2, '0')}-${t.start_date.slice(8, 10)}`,
    notes: t.notes,
    recurring_expense_id: t.id,
  }))

  const { error: insertError } = await supabase.from('expenses').insert(rows)
  if (insertError) {
    console.error('materializeRecurring insert error:', insertError)
    return false
  }
  return true
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export const useExpenses = (month, year) => {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchExpenses = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    const { startDate, endDate } = monthBounds(month, year)

    const { data, error: fetchError } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lt('date', endDate)
      .order('date', { ascending: false })

    if (fetchError) {
      setError(fetchError)
      console.error('useExpenses fetch error:', fetchError)
      setLoading(false)
      return
    }

    // Auto-insert any missing recurring expense rows for this month
    const inserted = await materializeRecurring(user.id, month, year, data)

    if (inserted) {
      const { data: refreshed, error: refreshError } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lt('date', endDate)
        .order('date', { ascending: false })

      if (refreshError) {
        console.error('useExpenses refresh error:', refreshError)
        setExpenses(data)
      } else {
        setExpenses(refreshed)
      }
    } else {
      setExpenses(data)
    }

    setLoading(false)
  }, [user, month, year])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  // ── One-off CRUD ─────────────────────────────────────────────────────────────

  const addExpense = async (expenseData) => {
    const { data, error: insertError } = await supabase
      .from('expenses')
      .insert([{ ...expenseData, user_id: user.id }])
      .select()
      .single()

    if (insertError) {
      console.error('addExpense error:', insertError)
      return { error: insertError }
    }
    await fetchExpenses()
    return { data }
  }

  const updateExpense = async (id, updates) => {
    const { data, error: updateError } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('updateExpense error:', updateError)
      return { error: updateError }
    }
    await fetchExpenses()
    return { data }
  }

  const deleteExpense = async (id) => {
    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('deleteExpense error:', deleteError)
      return { error: deleteError }
    }
    await fetchExpenses()
    return {}
  }

  // ── Recurring CRUD ───────────────────────────────────────────────────────────

  // Creates a recurring_expenses template and materialises the current month's row
  const addRecurring = async (payload) => {
    const templateData = {
      user_id: user.id,
      title: payload.title,
      amount_original: payload.amount_original,
      currency_original: payload.currency_original,
      amount_gbp: payload.amount_gbp,
      exchange_rate: payload.exchange_rate,
      conversion_date: payload.conversion_date,
      category: payload.category,
      notes: payload.notes,
      start_date: payload.date,
      duration_type: payload.duration_type,
      duration_months: payload.duration_months ?? null,
      end_date: payload.end_date ?? null,
      is_active: true,
    }

    const { data: template, error: templateError } = await supabase
      .from('recurring_expenses')
      .insert([templateData])
      .select()
      .single()

    if (templateError) {
      console.error('addRecurring template error:', templateError)
      return { error: templateError }
    }

    // Immediately materialise the current month's expense row
    if (isTemplateActiveForMonth(template, month, year)) {
      const expenseRow = {
        user_id: user.id,
        title: template.title,
        amount_original: template.amount_original,
        currency_original: template.currency_original,
        amount_gbp: template.amount_gbp,
        exchange_rate: template.exchange_rate,
        conversion_date: template.conversion_date,
        category: template.category,
        type: 'recurring',
        date: `${year}-${String(month).padStart(2, '0')}-${template.start_date.slice(8, 10)}`,
        notes: template.notes,
        recurring_expense_id: template.id,
      }
      const { error: expError } = await supabase.from('expenses').insert([expenseRow])
      if (expError) console.error('addRecurring expense row error:', expError)
    }

    await fetchExpenses()
    return { data: template }
  }

  // Updates the recurring template and refreshes current month's row.
  // Deletes future auto-created rows so they re-materialise with new values.
  const updateRecurring = async (templateId, payload) => {
    const templateUpdates = {
      title: payload.title,
      amount_original: payload.amount_original,
      currency_original: payload.currency_original,
      amount_gbp: payload.amount_gbp,
      exchange_rate: payload.exchange_rate,
      conversion_date: payload.conversion_date,
      category: payload.category,
      notes: payload.notes,
      duration_type: payload.duration_type,
      duration_months: payload.duration_months ?? null,
      end_date: payload.end_date ?? null,
    }

    const { error: updateError } = await supabase
      .from('recurring_expenses')
      .update(templateUpdates)
      .eq('id', templateId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('updateRecurring template error:', updateError)
      return { error: updateError }
    }

    // Update the current month's materialised expense row to reflect new values
    const { startDate, endDate } = monthBounds(month, year)
    const expenseFieldUpdates = {
      title: payload.title,
      amount_original: payload.amount_original,
      currency_original: payload.currency_original,
      amount_gbp: payload.amount_gbp,
      exchange_rate: payload.exchange_rate,
      conversion_date: payload.conversion_date,
      category: payload.category,
      notes: payload.notes,
    }
    const { error: rowUpdateError } = await supabase
      .from('expenses')
      .update(expenseFieldUpdates)
      .eq('recurring_expense_id', templateId)
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lt('date', endDate)

    if (rowUpdateError) console.error('updateRecurring current row error:', rowUpdateError)

    // Delete future auto-created rows — they will re-materialise with new values
    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('recurring_expense_id', templateId)
      .eq('user_id', user.id)
      .gte('date', endDate)

    if (deleteError) console.error('updateRecurring delete future rows error:', deleteError)

    await fetchExpenses()
    return {}
  }

  // Deactivates a recurring template and deletes future auto-created rows.
  // The current and past months keep their materialised rows.
  const stopRecurring = async (templateId) => {
    const { error: stopError } = await supabase
      .from('recurring_expenses')
      .update({ is_active: false })
      .eq('id', templateId)
      .eq('user_id', user.id)

    if (stopError) {
      console.error('stopRecurring error:', stopError)
      return { error: stopError }
    }

    const { endDate } = monthBounds(month, year)
    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('recurring_expense_id', templateId)
      .eq('user_id', user.id)
      .gte('date', endDate)

    if (deleteError) console.error('stopRecurring delete future rows error:', deleteError)

    await fetchExpenses()
    return {}
  }

  // Fetches a single recurring_expenses template by ID
  const fetchRecurringTemplate = async (templateId) => {
    const { data, error: fetchError } = await supabase
      .from('recurring_expenses')
      .select('*')
      .eq('id', templateId)
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      console.error('fetchRecurringTemplate error:', fetchError)
      return null
    }
    return data
  }

  return {
    expenses,
    loading,
    error,
    refetch: fetchExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
    addRecurring,
    updateRecurring,
    stopRecurring,
    fetchRecurringTemplate,
  }
}
