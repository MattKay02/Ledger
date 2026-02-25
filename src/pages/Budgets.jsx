import { useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import BudgetForm, { EXPENSE_CATEGORIES } from '../components/forms/BudgetForm'
import { useBudgets, getBudgetStatus } from '../hooks/useBudgets'
import { usePeriodSelector } from '../hooks/useAvailablePeriods'
import Select from '../components/ui/Select'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const STATUS_CONFIG = {
  healthy: { bar: 'bg-success', text: 'text-success', label: 'On track' },
  warning: { bar: 'bg-warning', text: 'text-warning', label: 'Nearing limit' },
  over:    { bar: 'bg-danger',  text: 'text-danger',  label: 'Over budget' },
}

const formatGBP = (amount) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)

export default function Budgets() {
  const { month, year, setMonth, setYear, periodsLoaded, yearOptions, monthOptions } = usePeriodSelector('budgets')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  const { budgets, loading, error, addBudget, updateBudget, deleteBudget } = useBudgets(month, year)

  const totalBudgeted = budgets.reduce((sum, b) => sum + parseFloat(b.monthly_limit_gbp), 0)
  const totalSpent = budgets.reduce((sum, b) => sum + b.actual_spent, 0)
  const existingCategories = budgets.map((b) => b.category)
  const allCategoriesBudgeted = existingCategories.length >= EXPENSE_CATEGORIES.length

  const openAdd = () => {
    setEditingBudget(null)
    setFormError(null)
    setModalOpen(true)
  }

  const openEdit = (budget) => {
    setEditingBudget(budget)
    setFormError(null)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingBudget(null)
    setFormError(null)
  }

  const handleSubmit = async (payload) => {
    setSubmitting(true)
    setFormError(null)
    const result = editingBudget
      ? await updateBudget(editingBudget.id, { monthly_limit_gbp: payload.monthly_limit_gbp })
      : await addBudget(payload)
    setSubmitting(false)
    if (result.error) {
      setFormError(
        result.error.code === '23505'
          ? 'A budget for this category already exists this month.'
          : result.error.message || 'Something went wrong. Please try again.'
      )
    } else {
      closeModal()
    }
  }

  const confirmDelete = (budget) => {
    setPendingDelete({ id: budget.id, category: budget.category })
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    setDeletingId(pendingDelete.id)
    setPendingDelete(null)
    await deleteBudget(pendingDelete.id)
    setDeletingId(null)
  }

  return (
    <PageWrapper
      title="Budgets"
      action={
        <Button onClick={openAdd} disabled={allCategoriesBudgeted}>
          + Add Budget
        </Button>
      }
    >
      {/* Period selector + summary */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
        <div className="flex gap-2">
          <Select value={month} onChange={setMonth} options={monthOptions} disabled={!periodsLoaded} />
          <Select value={year} onChange={setYear} options={yearOptions} disabled={!periodsLoaded} />
        </div>

        {!loading && budgets.length > 0 && (
          <div className="flex gap-6 sm:ml-auto text-sm">
            <span className="text-muted">
              Budgeted: <span className="text-white font-semibold">{formatGBP(totalBudgeted)}</span>
            </span>
            <span className="text-muted">
              Spent:{' '}
              <span className={`font-semibold ${totalSpent > totalBudgeted ? 'text-danger' : 'text-white'}`}>
                {formatGBP(totalSpent)}
              </span>
            </span>
            <span className="text-muted">
              Categories: <span className="text-white font-semibold">{budgets.length}</span>
            </span>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24 text-muted">
          Loading budgets…
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-center justify-center py-24 text-danger text-sm">
          Failed to load budgets: {error.message}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && budgets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <p className="text-muted text-sm">
            No budgets set for {MONTHS[month - 1]} {year}.
          </p>
          <Button onClick={openAdd}>Set your first budget</Button>
        </div>
      )}

      {/* Budget card grid */}
      {!loading && !error && budgets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              onEdit={() => openEdit(budget)}
              onDelete={() => confirmDelete(budget)}
              deleting={deletingId === budget.id}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Delete budget?"
      >
        <p className="text-muted text-sm mb-1">
          You are about to delete the budget for{' '}
          <span className="text-white font-medium">"{pendingDelete?.category}"</span>.
        </p>
        <p className="text-danger text-sm mb-6">This is permanent and cannot be undone.</p>
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
        title={editingBudget ? 'Edit Budget' : 'Add Budget'}
      >
        {formError && (
          <p className="text-danger text-sm mb-4 bg-danger/10 border border-danger/30 rounded-lg px-4 py-2.5">
            {formError}
          </p>
        )}
        <BudgetForm
          initialData={editingBudget}
          existingCategories={existingCategories}
          onSubmit={handleSubmit}
          onCancel={closeModal}
          submitting={submitting}
        />
      </Modal>
    </PageWrapper>
  )
}

function BudgetCard({ budget, onEdit, onDelete, deleting }) {
  const { monthly_limit_gbp, actual_spent, category } = budget
  const limit = parseFloat(monthly_limit_gbp)
  const status = getBudgetStatus(actual_spent, limit)
  const config = STATUS_CONFIG[status]

  // Percentage capped at 100 for the visual bar; raw percentage for the label
  const barPct = Math.min((actual_spent / limit) * 100, 100)
  const displayPct = Math.round((actual_spent / limit) * 100)
  const overBy = actual_spent - limit

  return (
    <Card className="flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-white font-medium">{category}</p>
          <p className={`text-xs mt-0.5 ${config.text}`}>{config.label}</p>
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

      {/* Progress bar — inline width is required for runtime-computed percentages */}
      <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${config.bar}`}
          style={{ width: `${barPct}%` }}
        />
      </div>

      {/* Amounts + percentage */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-white text-xl font-bold">{formatGBP(actual_spent)}</p>
          <p className="text-muted text-xs mt-0.5">of {formatGBP(limit)} limit</p>
        </div>
        <p className={`text-lg font-semibold tabular-nums ${config.text}`}>
          {displayPct}%
        </p>
      </div>

      {/* Over-budget callout */}
      {status === 'over' && (
        <p className="text-danger text-xs bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
          {formatGBP(overBy)} over budget
        </p>
      )}
    </Card>
  )
}
