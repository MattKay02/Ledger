import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export const useIncome = (month, year) => {
  const { user } = useAuth()
  const [income, setIncome] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchIncome = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, '0')}-01`

    const { data, error: fetchError } = await supabase
      .from('income')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lt('date', endDate)
      .order('date', { ascending: false })

    if (fetchError) {
      setError(fetchError)
      console.error('useIncome fetch error:', fetchError)
    } else {
      setIncome(data)
    }
    setLoading(false)
  }, [user, month, year])

  useEffect(() => {
    fetchIncome()
  }, [fetchIncome])

  const addIncome = async (incomeData) => {
    const { data, error: insertError } = await supabase
      .from('income')
      .insert([{ ...incomeData, user_id: user.id }])
      .select()
      .single()

    if (insertError) {
      console.error('addIncome error:', insertError)
      return { error: insertError }
    }
    await fetchIncome()
    return { data }
  }

  const updateIncome = async (id, updates) => {
    const { data, error: updateError } = await supabase
      .from('income')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('updateIncome error:', updateError)
      return { error: updateError }
    }
    await fetchIncome()
    return { data }
  }

  const deleteIncome = async (id) => {
    const { error: deleteError } = await supabase
      .from('income')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('deleteIncome error:', deleteError)
      return { error: deleteError }
    }
    await fetchIncome()
    return {}
  }

  return { income, loading, error, refetch: fetchIncome, addIncome, updateIncome, deleteIncome }
}
