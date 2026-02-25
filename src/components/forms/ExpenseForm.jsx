import { useState, useEffect } from 'react'
import Input from '../ui/Input'
import DatePicker from '../ui/DatePicker'
import Select from '../ui/Select'
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

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
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
  duration_type: 'indefinite',
  duration_months: '',
  end_month: new Date().getMonth() + 1,
  end_year: new Date().getFullYear(),
}

/**
 * Props:
 *   initialData        — expense row for edit mode, null for add
 *   recurringTemplate  — recurring_expenses template row if editing a recurring instance
 *   onSubmit(payload)  — called with validated form data
 *   onStop()           — called when user clicks "Stop from this month"
 *   onCancel()
 *   submitting
 */
const ExpenseForm = ({ initialData, recurringTemplate, onSubmit, onStop, onCancel, submitting }) => {
  const [form, setForm] = useState(emptyForm)
  const [convertedGBP, setConvertedGBP] = useState(null)
  const [rateInfo, setRateInfo] = useState(null)
  const [converting, setConverting] = useState(false)
  const [errors, setErrors] = useState({})

  // Populate form when opening for edit (or reset when adding)
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
        // Duration fields come from the linked template, not the expense row
        duration_type: recurringTemplate?.duration_type ?? 'indefinite',
        duration_months: recurringTemplate?.duration_months ?? '',
        end_month: recurringTemplate?.end_date
          ? parseInt(recurringTemplate.end_date.slice(5, 7), 10)
          : new Date().getMonth() + 1,
        end_year: recurringTemplate?.end_date
          ? parseInt(recurringTemplate.end_date.slice(0, 4), 10)
          : new Date().getFullYear(),
      })
      if (initialData.amount_gbp) {
        setConvertedGBP(initialData.amount_gbp)
        setRateInfo(
          initialData.currency_original !== 'GBP'
            ? { rate: initialData.exchange_rate, currency: initialData.currency_original }
            : null,
        )
      }
    } else {
      setForm(emptyForm)
      setConvertedGBP(null)
      setRateInfo(null)
    }
    setErrors({})
  }, [initialData, recurringTemplate])

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
    if (!form.amount_original || isNaN(amt) || amt <= 0)
      errs.amount_original = 'Enter a valid amount greater than 0'
    if (!form.category.trim()) errs.category = 'Category is required'
    if (!form.date) errs.date = 'Date is required'

    if (form.type === 'recurring') {
      const day = parseInt(form.date.slice(8, 10), 10)
      if (day > 28) errs.date = 'Recurring expenses must use a day of 28 or earlier so every month is valid'
      if (form.duration_type === 'months') {
        const months = parseInt(form.duration_months, 10)
        if (!form.duration_months || isNaN(months) || months < 1)
          errs.duration_months = 'Enter a valid number of months (minimum 1)'
      }
      if (form.duration_type === 'until_date') {
        const endYear = parseInt(form.end_year, 10)
        if (!form.end_year || isNaN(endYear) || endYear < new Date().getFullYear())
          errs.end_year = 'Enter a valid end year'
      }
    }

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

    if (form.type === 'recurring') {
      payload.duration_type = form.duration_type
      payload.duration_months =
        form.duration_type === 'months' ? parseInt(form.duration_months, 10) : null
      payload.end_date =
        form.duration_type === 'until_date'
          ? `${form.end_year}-${String(form.end_month).padStart(2, '0')}-01`
          : null
    }

    onSubmit(payload)
  }

  const isRecurringInstance = !!recurringTemplate

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">

      {/* ── Notice: editing a recurring instance ── */}
      {isRecurringInstance && (
        <div className="flex gap-2.5 items-start bg-accent/10 border border-accent/30 rounded-lg px-4 py-3">
          <span className="text-accent mt-0.5 shrink-0 text-base">↻</span>
          <p className="text-accent text-xs leading-relaxed">
            You are editing a recurring expense. Changes apply to future months only — past months keep their recorded values.
          </p>
        </div>
      )}

      {/* ── Warning: editing an existing one-off ── */}
      {initialData && !isRecurringInstance && (
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

      {/* Type toggle — hidden when editing a recurring instance (type is locked) */}
      {!isRecurringInstance && (
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
      )}

      <DatePicker
        label={form.type === 'recurring' ? 'Start date' : 'Date'}
        value={form.date}
        onChange={(val) => setForm((prev) => ({ ...prev, date: val }))}
        error={errors.date}
        hint={form.type === 'recurring' ? 'Choose a day between 1–28 so the date is valid in every month' : undefined}
        maxDay={form.type === 'recurring' ? 28 : undefined}
      />

      {/* Duration section — shown when type is recurring */}
      {form.type === 'recurring' && (
        <div className="flex flex-col gap-3 bg-surface-elevated/50 border border-surface-border rounded-lg p-3">
          <label className="text-sm text-muted font-medium">Duration</label>
          <div className="flex gap-2">
            {[
              { value: 'indefinite', label: 'Indefinitely' },
              { value: 'months', label: 'Fixed months' },
              { value: 'until_date', label: 'Until date' },
            ].map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, duration_type: d.value }))}
                className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  form.duration_type === d.value
                    ? 'bg-accent border-accent text-white'
                    : 'bg-surface-elevated border-surface-border text-muted hover:text-white'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {form.duration_type === 'months' && (
            <Input
              label="Number of months"
              type="number"
              min="1"
              step="1"
              placeholder="e.g. 12"
              value={form.duration_months}
              onChange={set('duration_months')}
              error={errors.duration_months}
            />
          )}

          {form.duration_type === 'until_date' && (
            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-sm text-muted font-medium">End month</label>
                <Select
                  value={Number(form.end_month)}
                  onChange={(val) => setForm((prev) => ({ ...prev, end_month: val }))}
                  options={MONTH_NAMES.map((name, i) => ({ value: i + 1, label: name }))}
                  className="w-full"
                  placement="top-right"
                />
              </div>
              <div className="flex flex-col gap-1 w-32">
                <label className="text-sm text-muted font-medium">End year</label>
                <div className={`flex items-center bg-surface-elevated border ${errors.end_year ? 'border-danger' : 'border-surface-border'} rounded-lg overflow-hidden`}>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, end_year: Math.max(new Date().getFullYear(), Number(prev.end_year) - 1) }))}
                    className="px-3 py-2.5 text-muted hover:text-white transition-colors text-base leading-none"
                  >
                    −
                  </button>
                  <span className="flex-1 text-center text-white text-sm font-medium select-none">
                    {form.end_year}
                  </span>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, end_year: Number(prev.end_year) + 1 }))}
                    className="px-3 py-2.5 text-muted hover:text-white transition-colors text-base leading-none"
                  >
                    +
                  </button>
                </div>
                {errors.end_year && <p className="text-danger text-xs">{errors.end_year}</p>}
              </div>
            </div>
          )}
        </div>
      )}

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

      {/* Stop recurring — only shown when editing an active recurring instance */}
      {isRecurringInstance && onStop && (
        <button
          type="button"
          onClick={onStop}
          disabled={submitting}
          className="w-full py-2.5 rounded-lg text-sm text-danger border border-danger/30 hover:bg-danger/10 transition-colors disabled:opacity-50"
        >
          Stop from this month
        </button>
      )}

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

export { EXPENSE_CATEGORIES }
export default ExpenseForm
