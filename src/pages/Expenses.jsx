import { useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ExpenseForm from '../components/forms/ExpenseForm'
import { useExpenses } from '../hooks/useExpenses'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const TYPE_LABELS = { recurring: 'Recurring', one_off: 'One-off' }

const TYPE_COLOURS = {
  recurring: 'bg-accent/20 text-accent',
  one_off: 'bg-surface-elevated text-muted',
}

const formatGBP = (amount) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)

const now = new Date()

export default function Expenses() {
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [modalOpen, setModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null) // { id, title }
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  const { expenses, loading, error, addExpense, updateExpense, deleteExpense } = useExpenses(month, year)

  const totalGBP = expenses.reduce((sum, e) => sum + parseFloat(e.amount_gbp), 0)
  const recurringTotal = expenses
    .filter((e) => e.type === 'recurring')
    .reduce((sum, e) => sum + parseFloat(e.amount_gbp), 0)

  const openAdd = () => {
    setEditingExpense(null)
    setFormError(null)
    setModalOpen(true)
  }

  const openEdit = (expense) => {
    setEditingExpense(expense)
    setFormError(null)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingExpense(null)
    setFormError(null)
  }

  const handleSubmit = async (payload) => {
    setSubmitting(true)
    setFormError(null)
    const result = editingExpense
      ? await updateExpense(editingExpense.id, payload)
      : await addExpense(payload)
    setSubmitting(false)
    if (result.error) {
      setFormError(result.error.message || 'Something went wrong. Please try again.')
    } else {
      closeModal()
    }
  }

  const confirmDelete = (expense) => {
    setPendingDelete({ id: expense.id, title: expense.title })
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    setDeletingId(pendingDelete.id)
    setPendingDelete(null)
    await deleteExpense(pendingDelete.id)
    setDeletingId(null)
  }

  // Build year options: current year ± 2
  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

  return (
    <PageWrapper
      title="Expenses"
      action={
        <Button onClick={openAdd}>+ Add Expense</Button>
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

        {!loading && expenses.length > 0 && (
          <div className="flex gap-6 sm:ml-auto text-sm">
            <span className="text-muted">
              Total: <span className="text-white font-semibold">{formatGBP(totalGBP)}</span>
            </span>
            <span className="text-muted">
              Recurring: <span className="text-white font-semibold">{formatGBP(recurringTotal)}</span>
            </span>
            <span className="text-muted">
              Entries: <span className="text-white font-semibold">{expenses.length}</span>
            </span>
          </div>
        )}
      </div>

      {/* States */}
      {loading && (
        <div className="flex items-center justify-center py-24 text-muted">
          Loading expenses…
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center justify-center py-24 text-danger text-sm">
          Failed to load expenses: {error.message}
        </div>
      )}

      {!loading && !error && expenses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <p className="text-muted text-sm">No expenses for {MONTHS[month - 1]} {year}.</p>
          <Button onClick={openAdd}>Add your first expense</Button>
        </div>
      )}

      {/* Card grid */}
      {!loading && !error && expenses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {expenses.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              onEdit={() => openEdit(expense)}
              onDelete={() => confirmDelete(expense)}
              deleting={deletingId === expense.id}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Delete expense?"
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
        title={editingExpense ? 'Edit Expense' : 'Add Expense'}
      >
        {formError && (
          <p className="text-danger text-sm mb-4 bg-danger/10 border border-danger/30 rounded-lg px-4 py-2.5">
            {formError}
          </p>
        )}
        <ExpenseForm
          initialData={editingExpense}
          onSubmit={handleSubmit}
          onCancel={closeModal}
          submitting={submitting}
        />
      </Modal>
    </PageWrapper>
  )
}

function ExpenseCard({ expense, onEdit, onDelete, deleting }) {
  const isForeign = expense.currency_original !== 'GBP'

  return (
    <Card className="flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate">{expense.title}</p>
          <p className="text-muted text-xs mt-0.5">
            {new Date(expense.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
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

      {/* Amount */}
      <div>
        <p className="text-white text-xl font-bold">{formatGBP(expense.amount_gbp)}</p>
        {isForeign && (
          <p className="text-muted text-xs mt-0.5">
            {parseFloat(expense.amount_original).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {expense.currency_original}
            {expense.exchange_rate && expense.exchange_rate !== 1 && (
              <span className="ml-1">· Rate: {parseFloat(expense.exchange_rate).toFixed(4)}</span>
            )}
          </p>
        )}
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs px-2 py-0.5 rounded-full bg-surface-elevated border border-surface-border text-muted">
          {expense.category}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLOURS[expense.type]}`}>
          {TYPE_LABELS[expense.type]}
        </span>
      </div>

      {/* Notes */}
      {expense.notes && (
        <p className="text-muted text-xs border-t border-surface-border pt-3 leading-relaxed">
          {expense.notes}
        </p>
      )}
    </Card>
  )
}
