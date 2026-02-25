const SOURCE_TYPE_LABELS = {
  client_work: 'Client Work',
  software_product_sale: 'Software Product Sale',
  app_store_apple: 'App Store (Apple)',
  google_play: 'Google Play',
  subscription_saas: 'Subscription / SaaS',
  other: 'Other',
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const [year, month, day] = dateStr.split('-').map(Number)
  return `${day} ${MONTH_NAMES[month - 1]} ${year}`
}

function formatDuration(tx) {
  if (!tx.duration_type) return null
  if (tx.duration_type === 'indefinite') return 'Ongoing (no end date)'
  if (tx.duration_type === 'months' && tx.duration_months) {
    return `${tx.duration_months} month${tx.duration_months === 1 ? '' : 's'}`
  }
  if (tx.duration_type === 'until_date' && tx.end_month && tx.end_year) {
    return `Until ${MONTH_NAMES[tx.end_month - 1]} ${tx.end_year}`
  }
  return null
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-surface-border last:border-0">
      <span className="text-muted text-sm flex-shrink-0">{label}</span>
      <span className="text-white text-sm text-right">{value}</span>
    </div>
  )
}

export default function ConfirmationCard({ transaction: tx, onConfirm, onEdit, saving }) {
  if (!tx) return null

  const isExpense = tx.type === 'expense'
  const isRecurring = isExpense && tx.expense_type === 'recurring'
  const isForeignCurrency = tx.currency_original !== 'GBP'
  const duration = formatDuration(tx)

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span
          className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide ${
            isExpense
              ? 'bg-danger/15 text-danger border border-danger/25'
              : 'bg-success/15 text-success border border-success/25'
          }`}
        >
          {isExpense ? 'Expense' : 'Income'}
        </span>
        {isRecurring && (
          <span className="px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide bg-accent/15 text-accent border border-accent/25">
            Recurring
          </span>
        )}
        <span className="text-muted text-xs ml-auto">Review before saving</span>
      </div>

      {/* Transaction details */}
      <div>
        <div className="mb-1">
          <span className="text-white font-semibold text-base leading-snug">{tx.title}</span>
        </div>

        {/* Amount */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-white text-2xl font-bold">
            £{Number(tx.amount_original).toFixed(2)}
          </span>
          {isForeignCurrency && (
            <span className="text-muted text-sm">
              ({tx.currency_original} {Number(tx.amount_original).toFixed(2)} — converted at save)
            </span>
          )}
        </div>

        {/* Detail rows */}
        <div>
          {isExpense && (
            <Row label="Category" value={tx.category} />
          )}
          {!isExpense && (
            <Row label="Source" value={SOURCE_TYPE_LABELS[tx.source_type] ?? tx.source_type} />
          )}
          <Row label="Date" value={formatDate(tx.date)} />
          {isRecurring && duration && (
            <Row label="Duration" value={duration} />
          )}
          {tx.notes && (
            <Row label="Notes" value={tx.notes} />
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={onConfirm}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          {saving ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving…
            </>
          ) : (
            'Confirm & Save'
          )}
        </button>
        <button
          onClick={onEdit}
          disabled={saving}
          className="px-4 py-2.5 rounded-lg bg-transparent hover:bg-surface-elevated border border-surface-border text-muted hover:text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Edit
        </button>
      </div>
    </div>
  )
}
