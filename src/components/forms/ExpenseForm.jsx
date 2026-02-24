import { useState, useEffect } from 'react'
import Input from '../ui/Input'
import Button from '../ui/Button'
import { getExchangeRates, convertToGBP, COMMON_CURRENCIES } from '../../lib/currency'

const EXPENSE_CATEGORIES = [
  'Hosting & Infrastructure',
  'Software Subscriptions',
  'Marketing & Ads',
  'Equipment & Hardware',
  'Contractor Payments',
  'App Store Fees',
  'Office & Admin',
  'Other',
]

const today = () => new Date().toISOString().split('T')[0]

const emptyForm = {
  title: '',
  amount_original: '',
  currency_original: 'GBP',
  category: EXPENSE_CATEGORIES[0],
  type: 'one_off',
  date: today(),
  notes: '',
}

const ExpenseForm = ({ initialData, onSubmit, onCancel, submitting }) => {
  const [form, setForm] = useState(emptyForm)
  const [convertedGBP, setConvertedGBP] = useState(null)
  const [rateInfo, setRateInfo] = useState(null)
  const [converting, setConverting] = useState(false)
  const [errors, setErrors] = useState({})

  // Populate form when editing an existing expense
  useEffect(() => {
    if (initialData) {
      setForm({
        title: initialData.title ?? '',
        amount_original: String(initialData.amount_original ?? ''),
        currency_original: initialData.currency_original ?? 'GBP',
        category: initialData.category ?? EXPENSE_CATEGORIES[0],
        type: initialData.type ?? 'one_off',
        date: initialData.date ?? today(),
        notes: initialData.notes ?? '',
      })
      // Show stored GBP amount for reference when editing
      if (initialData.amount_gbp) {
        setConvertedGBP(initialData.amount_gbp)
        setRateInfo(
          initialData.currency_original !== 'GBP'
            ? { rate: initialData.exchange_rate, currency: initialData.currency_original }
            : null
        )
      }
    } else {
      setForm(emptyForm)
      setConvertedGBP(null)
      setRateInfo(null)
    }
    setErrors({})
  }, [initialData])

  // Live currency conversion preview
  useEffect(() => {
    if (form.currency_original === 'GBP') {
      const parsed = parseFloat(form.amount_original)
      setConvertedGBP(isNaN(parsed) ? null : parsed)
      setRateInfo(null)
      return
    }

    const amount = parseFloat(form.amount_original)
    if (!amount || isNaN(amount)) {
      setConvertedGBP(null)
      setRateInfo(null)
      return
    }

    let cancelled = false
    const run = async () => {
      setConverting(true)
      try {
        const rates = await getExchangeRates()
        if (cancelled) return
        const { amountGBP, rate } = convertToGBP(amount, form.currency_original, rates)
        setConvertedGBP(amountGBP)
        setRateInfo({ rate, currency: form.currency_original })
      } catch (err) {
        console.error('Currency conversion preview error:', err)
      } finally {
        if (!cancelled) setConverting(false)
      }
    }

    const timer = setTimeout(run, 400)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [form.amount_original, form.currency_original])

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const validate = () => {
    const errs = {}
    if (!form.title.trim()) errs.title = 'Title is required'
    const amt = parseFloat(form.amount_original)
    if (!form.amount_original || isNaN(amt) || amt <= 0) errs.amount_original = 'Enter a valid amount greater than 0'
    if (!form.category.trim()) errs.category = 'Category is required'
    if (!form.date) errs.date = 'Date is required'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    const amount = parseFloat(form.amount_original)
    let amount_gbp = amount
    let exchange_rate = 1
    let conversion_date = new Date().toISOString()

    if (form.currency_original !== 'GBP') {
      try {
        const rates = await getExchangeRates()
        const result = convertToGBP(amount, form.currency_original, rates)
        amount_gbp = result.amountGBP
        exchange_rate = result.rate
      } catch (err) {
        setErrors({ amount_original: `Currency conversion failed: ${err.message}` })
        return
      }
    }

    const payload = {
      title: form.title.trim(),
      amount_original: amount,
      currency_original: form.currency_original,
      amount_gbp,
      exchange_rate,
      conversion_date,
      category: form.category,
      type: form.type,
      date: form.date,
      notes: form.notes.trim() || null,
    }

    onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {initialData && (
        <div className="flex gap-2.5 items-start bg-warning/10 border border-warning/30 rounded-lg px-4 py-3">
          <span className="text-warning mt-0.5 shrink-0">⚠</span>
          <p className="text-warning text-xs leading-relaxed">
            You are editing an existing expense. Saving will permanently overwrite the stored data.
          </p>
        </div>
      )}
      <Input
        label="Title"
        placeholder="e.g. AWS billing, Adobe Creative Cloud"
        value={form.title}
        onChange={set('title')}
        error={errors.title}
      />

      <div className="flex gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-sm text-muted font-medium">Amount</label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={form.amount_original}
            onChange={set('amount_original')}
            className={`bg-surface-elevated border ${errors.amount_original ? 'border-danger' : 'border-surface-border'} text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:border-accent transition-colors placeholder:text-muted/50`}
          />
          {errors.amount_original && <p className="text-danger text-xs">{errors.amount_original}</p>}
        </div>

        <div className="flex flex-col gap-1 w-28">
          <label className="text-sm text-muted font-medium">Currency</label>
          <select
            value={form.currency_original}
            onChange={set('currency_original')}
            className="bg-surface-elevated border border-surface-border text-white rounded-lg px-3 py-2.5 text-sm outline-none focus:border-accent transition-colors"
          >
            {COMMON_CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* GBP conversion preview */}
      {form.amount_original && form.currency_original !== 'GBP' && (
        <div className="text-sm text-muted bg-surface-elevated rounded-lg px-4 py-2.5 border border-surface-border">
          {converting ? (
            <span>Converting…</span>
          ) : convertedGBP !== null ? (
            <span>
              <span className="text-white font-medium">£{convertedGBP.toFixed(2)}</span>
              {rateInfo && (
                <span className="ml-2">· Rate: 1 {rateInfo.currency} = £{rateInfo.rate.toFixed(4)}</span>
              )}
            </span>
          ) : null}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm text-muted font-medium">Category</label>
        <select
          value={form.category}
          onChange={set('category')}
          className="bg-surface-elevated border border-surface-border text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:border-accent transition-colors"
        >
          {EXPENSE_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        {errors.category && <p className="text-danger text-xs">{errors.category}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-muted font-medium">Type</label>
        <div className="flex gap-2">
          {['one_off', 'recurring'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, type: t }))}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                form.type === t
                  ? 'bg-accent border-accent text-white'
                  : 'bg-surface-elevated border-surface-border text-muted hover:text-white'
              }`}
            >
              {t === 'one_off' ? 'One-off' : 'Recurring'}
            </button>
          ))}
        </div>
      </div>

      <Input
        label="Date"
        type="date"
        value={form.date}
        onChange={set('date')}
        error={errors.date}
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm text-muted font-medium">Notes <span className="text-muted/60 font-normal">(optional)</span></label>
        <textarea
          rows={2}
          placeholder="Any additional details…"
          value={form.notes}
          onChange={set('notes')}
          className="bg-surface-elevated border border-surface-border text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:border-accent transition-colors placeholder:text-muted/50 resize-none"
        />
      </div>

      <div className="flex gap-3 mt-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={submitting} className="flex-1">
          {submitting ? 'Saving…' : initialData ? 'Save Changes' : 'Add Expense'}
        </Button>
      </div>
    </form>
  )
}

export default ExpenseForm
