import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export const getBudgetStatus = (spent, limit) => {
  if (!limit || limit <= 0) return 'healthy'
  const percentage = (spent / limit) * 100
  if (percentage >= 100) return 'over'
  if (percentage >= 80) return 'warning'
  return 'healthy'
}

export const useBudgets = (month, year) => {
  const { user } = useAuth()
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchBudgets = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate =
      month === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 1).padStart(2, '0')}-01`

    const [budgetsResult, expensesResult] = await Promise.all([
      supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', month)
        .eq('year', year)
        .order('category', { ascending: true }),
      supabase
        .from('expenses')
        .select('category, amount_gbp')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lt('date', endDate),
    ])

    if (budgetsResult.error) {
      setError(budgetsResult.error)
      console.error('useBudgets fetch error:', budgetsResult.error)
      setLoading(false)
      return
    }

    if (expensesResult.error) {
      setError(expensesResult.error)
      console.error('useBudgets expenses fetch error:', expensesResult.error)
      setLoading(false)
      return
    }

    // Build category → total spend map from expenses
    const spendMap = {}
    for (const expense of expensesResult.data) {
      spendMap[expense.category] =
        (spendMap[expense.category] || 0) + parseFloat(expense.amount_gbp)
    }

    // Merge actuals into each budget record
    const merged = budgetsResult.data.map((b) => ({
      ...b,
      actual_spent: parseFloat((spendMap[b.category] || 0).toFixed(2)),
    }))

    setBudgets(merged)
    setLoading(false)
  }, [user, month, year])

  useEffect(() => {
    fetchBudgets()
  }, [fetchBudgets])

  const addBudget = async (budgetData) => {
    const { data, error: insertError } = await supabase
      .from('budgets')
      .insert([{ ...budgetData, user_id: user.id, month, year }])
      .select()
      .single()

    if (insertError) {
      console.error('addBudget error:', insertError)
      return { error: insertError }
    }
    await fetchBudgets()
    return { data }
  }

  const updateBudget = async (id, updates) => {
    const { data, error: updateError } = await supabase
      .from('budgets')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('updateBudget error:', updateError)
      return { error: updateError }
    }
    await fetchBudgets()
    return { data }
  }

  const deleteBudget = async (id) => {
    const { error: deleteError } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('deleteBudget error:', deleteError)
      return { error: deleteError }
    }
    await fetchBudgets()
    return {}
  }

  return {
    budgets,
    loading,
    error,
    refetch: fetchBudgets,
    addBudget,
    updateBudget,
    deleteBudget,
  }
}
