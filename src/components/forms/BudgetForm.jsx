import { useState, useEffect } from 'react'
import Button from '../ui/Button'

export const EXPENSE_CATEGORIES = [
  'Hosting & Infrastructure',
  'Software Subscriptions',
  'Marketing & Ads',
  'Equipment & Hardware',
  'Contractor Payments',
  'App Store Fees',
  'Office & Admin',
  'Other',
]

const BudgetForm = ({ initialData, existingCategories = [], onSubmit, onCancel, submitting }) => {
  const availableCategories = initialData
    ? [initialData.category]
    : EXPENSE_CATEGORIES.filter((c) => !existingCategories.includes(c))

  const [form, setForm] = useState({
    category: availableCategories[0] ?? '',
    monthly_limit_gbp: '',
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (initialData) {
      setForm({
        category: initialData.category,
        monthly_limit_gbp: String(initialData.monthly_limit_gbp),
      })
    } else {
      const first = EXPENSE_CATEGORIES.find((c) => !existingCategories.includes(c)) ?? ''
      setForm({ category: first, monthly_limit_gbp: '' })
    }
    setErrors({})
  }, [initialData])

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const validate = () => {
    const errs = {}
    if (!form.category.trim()) errs.category = 'Category is required'
    const limit = parseFloat(form.monthly_limit_gbp)
    if (!form.monthly_limit_gbp || isNaN(limit) || limit <= 0) {
      errs.monthly_limit_gbp = 'Enter a valid limit greater than £0'
    }
    return errs
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    onSubmit({
      category: form.category,
      monthly_limit_gbp: parseFloat(parseFloat(form.monthly_limit_gbp).toFixed(2)),
    })
  }

  const allBudgeted = !initialData && availableCategories.length === 0

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm text-muted font-medium">Category</label>
        {initialData ? (
          // Locked when editing — category is part of the unique key
          <div className="bg-surface-elevated border border-surface-border text-white rounded-lg px-4 py-2.5 text-sm">
            {form.category}
          </div>
        ) : allBudgeted ? (
          <div className="bg-surface-elevated border border-surface-border text-muted rounded-lg px-4 py-2.5 text-sm">
            All categories have budgets this month
          </div>
        ) : (
          <select
            value={form.category}
            onChange={set('category')}
            className="bg-surface-elevated border border-surface-border text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:border-accent transition-colors"
          >
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        )}
        {errors.category && <p className="text-danger text-xs">{errors.category}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-muted font-medium">Monthly limit (£)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={form.monthly_limit_gbp}
          onChange={set('monthly_limit_gbp')}
          disabled={allBudgeted}
          className={`bg-surface-elevated border ${
            errors.monthly_limit_gbp ? 'border-danger' : 'border-surface-border'
          } text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:border-accent transition-colors placeholder:text-muted/50 disabled:opacity-50`}
        />
        {errors.monthly_limit_gbp && (
          <p className="text-danger text-xs">{errors.monthly_limit_gbp}</p>
        )}
      </div>

      <div className="flex gap-3 mt-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={submitting || allBudgeted}
          className="flex-1"
        >
          {submitting ? 'Saving…' : initialData ? 'Save Changes' : 'Add Budget'}
        </Button>
      </div>
    </form>
  )
}

export default BudgetForm
