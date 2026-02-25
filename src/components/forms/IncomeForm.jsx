import { useState, useEffect } from 'react'
import Input from '../ui/Input'
import DatePicker from '../ui/DatePicker'
import Select from '../ui/Select'
import Button from '../ui/Button'
import { getExchangeRates, convertToGBP, COMMON_CURRENCIES, CURRENCY_SYMBOLS } from '../../lib/currency'

export const SOURCE_TYPES = [
  { value: 'client_work', label: 'Client Work' },
  { value: 'software_product_sale', label: 'Software Product Sale' },
  { value: 'app_store_apple', label: 'App Store (Apple)' },
  { value: 'google_play', label: 'Google Play' },
  { value: 'subscription_saas', label: 'Subscription / SaaS' },
  { value: 'other', label: 'Other' },
]

const today = () => new Date().toISOString().split('T')[0]

const emptyForm = {
  title: '',
  amount_original: '',
  currency_original: 'GBP',
  source_type: 'client_work',
  date: today(),
  notes: '',
}

const IncomeForm = ({ initialData, onSubmit, onCancel, submitting }) => {
  const [form, setForm] = useState(emptyForm)
  const [convertedGBP, setConvertedGBP] = useState(null)
  const [rateInfo, setRateInfo] = useState(null)
  const [converting, setConverting] = useState(false)
  const [errors, setErrors] = useState({})

  // Populate form when editing an existing income entry
  useEffect(() => {
    if (initialData) {
      setForm({
        title: initialData.title ?? '',
        amount_original: String(initialData.amount_original ?? ''),
        currency_original: initialData.currency_original ?? 'GBP',
        source_type: initialData.source_type ?? 'client_work',
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
      source_type: form.source_type,
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
            You are editing an existing income entry. Saving will permanently overwrite the stored data.
          </p>
        </div>
      )}

      <Input
        label="Title"
        placeholder="e.g. Invoice #42 — Acme Corp, App Store payout"
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
          <Select
            value={form.currency_original}
            onChange={(val) => setForm((prev) => ({ ...prev, currency_original: val }))}
            options={COMMON_CURRENCIES.map((c) => ({ value: c, label: `${c} (${CURRENCY_SYMBOLS[c]})` }))}
            scrollable
            className="w-full"
          />
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
        <label className="text-sm text-muted font-medium">Source</label>
        <Select
          value={form.source_type}
          onChange={(val) => setForm((prev) => ({ ...prev, source_type: val }))}
          options={SOURCE_TYPES}
          className="w-full"
        />
      </div>

      <DatePicker
        label="Date"
        value={form.date}
        onChange={(val) => setForm((prev) => ({ ...prev, date: val }))}
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
          {submitting ? 'Saving…' : initialData ? 'Save Changes' : 'Add Income'}
        </Button>
      </div>
    </form>
  )
}

export default IncomeForm
