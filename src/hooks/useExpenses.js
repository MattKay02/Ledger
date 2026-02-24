import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export const useExpenses = (month, year) => {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchExpenses = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, '0')}-01`

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
    } else {
      setExpenses(data)
    }
    setLoading(false)
  }, [user, month, year])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

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

  return { expenses, loading, error, refetch: fetchExpenses, addExpense, updateExpense, deleteExpense }
}
