import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import { exportToCSV } from '../lib/export'

const PROVIDER_LIST = [
  { key: 'email', label: 'Email / Password' },
  { key: 'google', label: 'Google' },
  { key: 'apple', label: 'Apple' },
]

export default function Settings() {
  const { user, signOut } = useAuth()

  // Profile
  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? ''
  )
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState(null)
  const [profileSaved, setProfileSaved] = useState(false)

  // Export
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(null)

  // Delete account
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  const linkedProviders = user?.identities?.map((i) => i.provider) ?? []

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    setProfileError(null)
    setProfileSaved(false)
    const { error } = await supabase.auth.updateUser({
      data: { full_name: displayName.trim() },
    })
    setSavingProfile(false)
    if (error) {
      setProfileError(error.message)
    } else {
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3000)
    }
  }

  const handleExportAll = async () => {
    setExporting(true)
    setExportError(null)

    const [expensesResult, incomeResult] = await Promise.all([
      supabase.from('expenses').select('*').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('income').select('*').eq('user_id', user.id).order('date', { ascending: false }),
    ])

    if (expensesResult.error || incomeResult.error) {
      setExportError((expensesResult.error || incomeResult.error).message)
      setExporting(false)
      return
    }

    if (expensesResult.data?.length > 0) exportToCSV(expensesResult.data, 'ledger-expenses')
    if (incomeResult.data?.length > 0) exportToCSV(incomeResult.data, 'ledger-income')

    setExporting(false)
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    setDeleteError(null)

    const [expResult, incResult, budgetResult] = await Promise.all([
      supabase.from('expenses').delete().eq('user_id', user.id),
      supabase.from('income').delete().eq('user_id', user.id),
      supabase.from('budgets').delete().eq('user_id', user.id),
    ])

    if (expResult.error || incResult.error || budgetResult.error) {
      setDeleteError(
        (expResult.error || incResult.error || budgetResult.error).message
      )
      setDeleting(false)
      return
    }

    await signOut()
    // AuthContext sets user → null, ProtectedRoute redirects to /login
  }

  return (
    <PageWrapper title="Settings">
      <div className="max-w-2xl space-y-6">

        {/* ── Profile ── */}
        <Card>
          <h2 className="text-white font-semibold text-base mb-5">Profile</h2>
          <div className="space-y-4">
            <Input
              label="Display Name"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value)
                setProfileSaved(false)
              }}
              placeholder="Your name"
            />
            <Input
              label="Email"
              value={user?.email ?? ''}
              readOnly
              className="opacity-60 cursor-not-allowed"
            />
          </div>
          {profileError && (
            <p className="text-danger text-xs mt-3">{profileError}</p>
          )}
          <div className="flex items-center gap-3 mt-5">
            <Button onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? 'Saving…' : 'Save'}
            </Button>
            {profileSaved && (
              <span className="text-success text-sm">Saved</span>
            )}
          </div>
        </Card>

        {/* ── Connected Accounts ── */}
        <Card>
          <h2 className="text-white font-semibold text-base mb-5">Connected Accounts</h2>
          <div>
            {PROVIDER_LIST.map(({ key, label }) => {
              const connected = linkedProviders.includes(key)
              return (
                <div
                  key={key}
                  className="flex items-center justify-between py-3.5 border-b border-surface-border last:border-0"
                >
                  <span className="text-white text-sm">{label}</span>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                      connected
                        ? 'bg-success/10 text-success border-success/20'
                        : 'bg-surface-elevated text-muted border-surface-border'
                    }`}
                  >
                    {connected ? 'Connected' : 'Not connected'}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>

        {/* ── Privacy & Legal ── */}
        <Card>
          <h2 className="text-white font-semibold text-base mb-3">Privacy &amp; Legal</h2>
          <p className="text-muted text-sm mb-4">
            Learn how Ledger collects, uses, and protects your personal data.
          </p>
          <Link
            to="/privacy"
            className="inline-flex items-center gap-1.5 text-accent hover:text-accent-hover text-sm transition-colors"
          >
            Read Privacy Policy →
          </Link>
        </Card>

        {/* ── Data ── */}
        <Card>
          <h2 className="text-white font-semibold text-base mb-5">Data</h2>

          {/* Export */}
          <div className="mb-6">
            <p className="text-muted text-sm mb-3">
              Download all your expenses and income as CSV files.
            </p>
            <Button variant="ghost" onClick={handleExportAll} disabled={exporting}>
              {exporting ? 'Exporting…' : 'Export All Data'}
            </Button>
            {exportError && (
              <p className="text-danger text-xs mt-2">{exportError}</p>
            )}
          </div>

          {/* Danger zone */}
          <div className="border-t border-surface-border pt-5">
            <p className="text-white text-sm font-medium mb-1">Delete Account</p>
            <p className="text-muted text-sm mb-3">
              Permanently delete all your data. This cannot be undone.
            </p>
            <Button variant="danger" onClick={() => setDeleteModalOpen(true)}>
              Delete Account
            </Button>
          </div>
        </Card>

      </div>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => { if (!deleting) setDeleteModalOpen(false) }}
        title="Delete account?"
      >
        <p className="text-muted text-sm mb-1">
          This will permanently delete all your expenses, income, and budgets.
        </p>
        <p className="text-danger text-sm mb-5">
          This action cannot be undone.
        </p>
        {deleteError && (
          <p className="text-danger text-xs mb-4 bg-danger/10 border border-danger/30 rounded-lg px-4 py-2.5">
            {deleteError}
          </p>
        )}
        <div className="flex gap-3">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => setDeleteModalOpen(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={handleDeleteAccount}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Yes, delete everything'}
          </Button>
        </div>
      </Modal>
    </PageWrapper>
  )
}
