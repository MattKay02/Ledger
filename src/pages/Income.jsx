import { useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import IncomeForm, { SOURCE_TYPES } from '../components/forms/IncomeForm'
import { useIncome } from '../hooks/useIncome'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const SOURCE_TYPE_LABELS = Object.fromEntries(SOURCE_TYPES.map(({ value, label }) => [value, label]))

const SOURCE_TYPE_COLOURS = {
  client_work: 'bg-success/20 text-success',
  software_product_sale: 'bg-cyan-500/20 text-cyan-400',
  app_store_apple: 'bg-purple-500/20 text-purple-400',
  google_play: 'bg-orange-500/20 text-orange-400',
  subscription_saas: 'bg-teal-500/20 text-teal-400',
  other: 'bg-surface-elevated text-muted',
}

const formatGBP = (amount) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)

const now = new Date()

export default function Income() {
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [modalOpen, setModalOpen] = useState(false)
  const [editingIncome, setEditingIncome] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null) // { id, title }
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  const { income, loading, error, addIncome, updateIncome, deleteIncome } = useIncome(month, year)

  const totalGBP = income.reduce((sum, e) => sum + parseFloat(e.amount_gbp), 0)

  const openAdd = () => {
    setEditingIncome(null)
    setFormError(null)
    setModalOpen(true)
  }

  const openEdit = (entry) => {
    setEditingIncome(entry)
    setFormError(null)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingIncome(null)
    setFormError(null)
  }

  const handleSubmit = async (payload) => {
    setSubmitting(true)
    setFormError(null)
    const result = editingIncome
      ? await updateIncome(editingIncome.id, payload)
      : await addIncome(payload)
    setSubmitting(false)
    if (result.error) {
      setFormError(result.error.message || 'Something went wrong. Please try again.')
    } else {
      closeModal()
    }
  }

  const confirmDelete = (entry) => {
    setPendingDelete({ id: entry.id, title: entry.title })
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    setDeletingId(pendingDelete.id)
    setPendingDelete(null)
    await deleteIncome(pendingDelete.id)
    setDeletingId(null)
  }

  // Build year options: current year ± 2
  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

  return (
    <PageWrapper
      title="Income"
      action={
        <Button onClick={openAdd}>+ Add Income</Button>
      }
    >
      {/* Period selector + summary */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
        <div className="flex gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="bg-surface-elevated border border-surface-border text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition-colors"
          >
            {MONTHS.map((label, i) => (
              <option key={label} value={i + 1}>{label}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-surface-elevated border border-surface-border text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition-colors"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {!loading && income.length > 0 && (
          <div className="flex gap-6 sm:ml-auto text-sm">
            <span className="text-muted">
              Total: <span className="text-success font-semibold">{formatGBP(totalGBP)}</span>
            </span>
            <span className="text-muted">
              Entries: <span className="text-white font-semibold">{income.length}</span>
            </span>
          </div>
        )}
      </div>

      {/* States */}
      {loading && (
        <div className="flex items-center justify-center py-24 text-muted">
          Loading income…
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center justify-center py-24 text-danger text-sm">
          Failed to load income: {error.message}
        </div>
      )}

      {!loading && !error && income.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <p className="text-muted text-sm">No income for {MONTHS[month - 1]} {year}.</p>
          <Button onClick={openAdd}>Add your first income entry</Button>
        </div>
      )}

      {/* Card grid */}
      {!loading && !error && income.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {income.map((entry) => (
            <IncomeCard
              key={entry.id}
              entry={entry}
              onEdit={() => openEdit(entry)}
              onDelete={() => confirmDelete(entry)}
              deleting={deletingId === entry.id}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Delete income entry?"
      >
        <p className="text-muted text-sm mb-1">
          You are about to delete <span className="text-white font-medium">"{pendingDelete?.title}"</span>.
        </p>
        <p className="text-danger text-sm mb-6">
          This is permanent and cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => setPendingDelete(null)}>
            Cancel
          </Button>
          <Button variant="danger" className="flex-1" onClick={handleDelete}>
            Yes, delete it
          </Button>
        </div>
      </Modal>

      {/* Add / Edit modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingIncome ? 'Edit Income' : 'Add Income'}
      >
        {formError && (
          <p className="text-danger text-sm mb-4 bg-danger/10 border border-danger/30 rounded-lg px-4 py-2.5">
            {formError}
          </p>
        )}
        <IncomeForm
          initialData={editingIncome}
          onSubmit={handleSubmit}
          onCancel={closeModal}
          submitting={submitting}
        />
      </Modal>
    </PageWrapper>
  )
}

function IncomeCard({ entry, onEdit, onDelete, deleting }) {
  const isForeign = entry.currency_original !== 'GBP'

  return (
    <Card className="flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate">{entry.title}</p>
          <p className="text-muted text-xs mt-0.5">
            {new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onEdit}
            className="text-muted hover:text-white text-xs px-2.5 py-1.5 rounded-md hover:bg-surface-elevated transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="text-muted hover:text-danger text-xs px-2.5 py-1.5 rounded-md hover:bg-danger/10 transition-colors disabled:opacity-50"
          >
            {deleting ? '…' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Amount — green for income */}
      <div>
        <p className="text-success text-xl font-bold">
          {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(entry.amount_gbp)}
        </p>
        {isForeign && (
          <p className="text-muted text-xs mt-0.5">
            {parseFloat(entry.amount_original).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {entry.currency_original}
            {entry.exchange_rate && entry.exchange_rate !== 1 && (
              <span className="ml-1">· Rate: {parseFloat(entry.exchange_rate).toFixed(4)}</span>
            )}
          </p>
        )}
      </div>

      {/* Source type badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs px-2 py-0.5 rounded-full ${SOURCE_TYPE_COLOURS[entry.source_type] ?? 'bg-surface-elevated text-muted'}`}>
          {SOURCE_TYPE_LABELS[entry.source_type] ?? entry.source_type}
        </span>
      </div>

      {/* Notes */}
      {entry.notes && (
        <p className="text-muted text-xs border-t border-surface-border pt-3 leading-relaxed">
          {entry.notes}
        </p>
      )}
    </Card>
  )
}
