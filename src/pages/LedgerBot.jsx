import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useExpenses } from '../hooks/useExpenses'
import { useIncome } from '../hooks/useIncome'
import { getExchangeRates, convertToGBP } from '../lib/currency'
import PageWrapper from '../components/layout/PageWrapper'
import ChatBubble from '../components/ledger-bot/ChatBubble'
import ConfirmationCard from '../components/ledger-bot/ConfirmationCard'
import FileUploadButton from '../components/ledger-bot/FileUploadButton'

// ── PDF text extraction (dynamically imported to keep initial bundle lean) ────

async function extractPdfText(arrayBuffer) {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).href
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map((item) => item.str).join(' ') + '\n'
  }
  return text.trim()
}

// ── File processing ────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif']

async function processFile(file) {
  if (file.size > MAX_FILE_SIZE) {
    return { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.` }
  }

  const ext = file.name.split('.').pop().toLowerCase()

  if (ALLOWED_IMAGE_EXTS.includes(ext)) {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64 = e.target.result.split(',')[1]
        resolve({ type: 'image', data: base64, mediaType: file.type, name: file.name })
      }
      reader.onerror = () => resolve({ error: 'Could not read image file.' })
      reader.readAsDataURL(file)
    })
  }

  if (ext === 'csv') {
    const text = await file.text()
    return { type: 'csv', data: text, name: file.name }
  }

  if (ext === 'pdf') {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const text = await extractPdfText(arrayBuffer)
      if (!text) return { error: 'PDF appears to be empty or image-only. Try uploading a photo instead.' }
      return { type: 'pdf', data: text, name: file.name }
    } catch (e) {
      return { error: `Could not read PDF: ${e.message}` }
    }
  }

  return { error: 'Unsupported file type. Please upload a JPG, PNG, PDF, or CSV.' }
}

// ── Example prompt chips shown in the welcome state ───────────────────────────

const EXAMPLE_PROMPTS = [
  'Paid £49 for Figma Pro last month',
  'Received £1,200 from a client today',
  'Monthly AWS bill of $85',
]

// ── Welcome state (empty conversation) ───────────────────────────────────────

function WelcomeState({ onPrompt }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 py-12 text-center">
      {/* Bot icon */}
      <div className="w-14 h-14 rounded-2xl bg-accent/15 border border-accent/25 flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-7 h-7 text-accent"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
          />
        </svg>
      </div>

      <div className="flex flex-col items-center gap-3">
        <h2 className="text-white text-lg font-semibold">Log an income or expense</h2>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-md bg-success/10 border border-success/20 text-success text-xs font-medium">+ Income</span>
          <span className="text-muted/40 text-xs">·</span>
          <span className="px-2.5 py-1 rounded-md bg-danger/10 border border-danger/20 text-danger text-xs font-medium">− Expense</span>
        </div>
        <p className="text-muted text-sm max-w-sm">
          Describe the transaction and I'll extract the details. You can also upload a receipt, invoice, or CSV.
        </p>
      </div>

      {/* Example prompt chips */}
      <div className="flex flex-wrap justify-center gap-2">
        {EXAMPLE_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onPrompt(prompt)}
            className="px-3.5 py-2 rounded-lg bg-surface-elevated border border-surface-border text-muted hover:text-white hover:border-accent/40 text-sm transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Usage badge shown in the page header ─────────────────────────────────────

function UsageBadge({ dailyUsed, dailyLimit, weeklyUsed, weeklyLimit }) {
  const dailyFull = dailyUsed >= dailyLimit
  const weeklyFull = weeklyUsed >= weeklyLimit
  return (
    <div className={`flex items-center gap-2 text-xs ${dailyFull || weeklyFull ? 'text-warning' : 'text-muted'}`}>
      <span>{dailyUsed}/{dailyLimit} today</span>
      <span className="opacity-40">·</span>
      <span>{weeklyUsed}/{weeklyLimit} this week</span>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LedgerBot() {
  const { user } = useAuth()

  // Use current month/year for hooks — we only need the add* functions
  const now = new Date()
  const { addExpense, addRecurring } = useExpenses(now.getMonth() + 1, now.getFullYear())
  const { addIncome } = useIncome(now.getMonth() + 1, now.getFullYear())

  // ── Chat state ──────────────────────────────────────────────────────────────
  const [status, setStatus] = useState('idle') // 'idle' | 'thinking' | 'confirming' | 'saving'
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [uploadedFile, setUploadedFile] = useState(null)
  const [pendingTransaction, setPendingTransaction] = useState(null)

  // ── Usage tracking ──────────────────────────────────────────────────────────
  const [dailyUsed, setDailyUsed] = useState(0)
  const [weeklyUsed, setWeeklyUsed] = useState(0)
  const [dailyLimit, setDailyLimit] = useState(10)
  const [weeklyLimit, setWeeklyLimit] = useState(40)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const textareaRef = useRef(null)

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, status])

  // Fetch usage counts + profile limits on mount
  const fetchUsage = useCallback(async () => {
    if (!user) return
    const today = new Date().toISOString().slice(0, 10)
    const weekStart = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const [{ data: usageRows }, { data: profile }] = await Promise.all([
      supabase
        .from('bot_usage')
        .select('usage_date, completed_count')
        .eq('user_id', user.id)
        .gte('usage_date', weekStart),
      supabase
        .from('user_profiles')
        .select('bot_daily_limit, bot_weekly_limit')
        .eq('id', user.id)
        .single(),
    ])

    if (usageRows) {
      setDailyUsed(usageRows.find((r) => r.usage_date === today)?.completed_count ?? 0)
      setWeeklyUsed(usageRows.reduce((sum, r) => sum + r.completed_count, 0))
    }
    if (profile) {
      setDailyLimit(profile.bot_daily_limit)
      setWeeklyLimit(profile.bot_weekly_limit)
    }
  }, [user])

  useEffect(() => {
    fetchUsage()
  }, [fetchUsage])

  // ── File handling ────────────────────────────────────────────────────────────

  const handleFileSelect = async (file, sizeError) => {
    if (sizeError) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: sizeError, isError: true },
      ])
      return
    }
    const result = await processFile(file)
    if (result.error) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: result.error, isError: true },
      ])
      return
    }
    setUploadedFile(result)
  }

  // ── Send message ─────────────────────────────────────────────────────────────

  const handleSend = useCallback(
    async (overrideText) => {
      const text = (overrideText ?? input).trim()
      if (!text && !uploadedFile) return
      if (status === 'thinking' || status === 'saving') return

      const userMessage = {
        role: 'user',
        content: text || `[Uploaded: ${uploadedFile?.name}]`,
        ...(uploadedFile ? { fileData: uploadedFile } : {}),
      }

      const updatedMessages = [...messages, userMessage]
      setMessages(updatedMessages)
      setInput('')
      setStatus('thinking')

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        const response = await fetch('/api/ledger-bot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
              ...(m.fileData ? { fileData: m.fileData } : {}),
            })),
            currentDate: new Date().toISOString().slice(0, 10),
          }),
        })

        const json = await response.json()

        if (!response.ok || !json.success) {
          throw new Error(json.error || `Server error ${response.status}`)
        }

        const aiData = json.data
        const botMessage = { role: 'assistant', content: aiData.message }

        if (aiData.rateLimited) {
          setMessages((prev) => [...prev, botMessage])
          setStatus('idle')
          return
        }

        if (aiData.status === 'clarifying') {
          setMessages((prev) => [...prev, botMessage])
          setUploadedFile(null) // Clear attachment after first send
          setStatus('idle')
          setTimeout(() => textareaRef.current?.focus(), 100)
        } else if (aiData.status === 'complete') {
          setMessages((prev) => [...prev, botMessage])
          setPendingTransaction(aiData.transaction)
          setStatus('confirming')
          setDailyUsed((prev) => prev + 1)
          setWeeklyUsed((prev) => prev + 1)
        }
      } catch (err) {
        const capturedText = text
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `Something went wrong: ${err.message}`,
            isError: true,
            onRetry: () => handleSend(capturedText),
          },
        ])
        setStatus('idle')
      }
    },
    [input, uploadedFile, messages, status]
  )

  // ── Confirm transaction ──────────────────────────────────────────────────────

  const handleConfirm = async () => {
    setStatus('saving')
    try {
      const tx = pendingTransaction
      let amount_gbp = tx.amount_original
      let exchange_rate = 1
      const conversion_date = new Date().toISOString()

      if (tx.currency_original !== 'GBP') {
        const rates = await getExchangeRates()
        const result = convertToGBP(tx.amount_original, tx.currency_original, rates)
        amount_gbp = result.amountGBP
        exchange_rate = result.rate
      }

      if (tx.type === 'expense') {
        const basePayload = {
          title: tx.title,
          amount_original: tx.amount_original,
          currency_original: tx.currency_original,
          amount_gbp,
          exchange_rate,
          conversion_date,
          category: tx.category,
          type: tx.expense_type,
          date: tx.date,
          notes: tx.notes || null,
        }

        if (tx.expense_type === 'recurring') {
          let end_date = null
          if (tx.duration_type === 'until_date' && tx.end_month && tx.end_year) {
            end_date = `${tx.end_year}-${String(tx.end_month).padStart(2, '0')}-01`
          }
          const result = await addRecurring({
            ...basePayload,
            duration_type: tx.duration_type || 'indefinite',
            duration_months: tx.duration_months || null,
            end_date,
          })
          if (result?.error) throw new Error(result.error.message)
        } else {
          const result = await addExpense(basePayload)
          if (result?.error) throw new Error(result.error.message)
        }
      } else {
        const result = await addIncome({
          title: tx.title,
          amount_original: tx.amount_original,
          currency_original: tx.currency_original,
          amount_gbp,
          exchange_rate,
          conversion_date,
          source_type: tx.source_type,
          date: tx.date,
          notes: tx.notes || null,
        })
        if (result?.error) throw new Error(result.error.message)
      }

      // Reset for next transaction
      setMessages([])
      setPendingTransaction(null)
      setUploadedFile(null)
      setStatus('idle')
      setTimeout(() => textareaRef.current?.focus(), 100)
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Failed to save: ${err.message}. Please try again.`,
          isError: true,
        },
      ])
      setPendingTransaction(null)
      setStatus('idle')
    }
  }

  // ── Edit — go back to conversation ──────────────────────────────────────────

  const handleEdit = () => {
    setPendingTransaction(null)
    setStatus('idle')
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: 'Sure, what would you like to change?' },
    ])
    setTimeout(() => textareaRef.current?.focus(), 100)
  }

  // ── Keyboard: Enter to send, Shift+Enter for newline ─────────────────────────

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isThinking = status === 'thinking' || status === 'saving'
  const isConfirming = status === 'confirming'
  const canSend = (input.trim() || uploadedFile) && status === 'idle'
  const hasMessages = messages.length > 0

  return (
    <PageWrapper
      title="Ledger Bot"
      action={
        <UsageBadge
          dailyUsed={dailyUsed}
          dailyLimit={dailyLimit}
          weeklyUsed={weeklyUsed}
          weeklyLimit={weeklyLimit}
        />
      }
    >
      <div className="max-w-2xl mx-auto flex flex-col gap-4 h-[calc(100vh-11rem)]">

        {/* ── Message thread ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1 min-h-0">
          {!hasMessages && !isThinking ? (
            <WelcomeState onPrompt={(prompt) => handleSend(prompt)} />
          ) : (
            <>
              {messages.map((msg, i) => (
                <ChatBubble
                  key={i}
                  role={msg.role}
                  content={msg.content}
                  fileData={msg.fileData}
                  isError={msg.isError}
                  onRetry={msg.onRetry}
                />
              ))}

              {/* Thinking indicator */}
              {isThinking && (
                <ChatBubble role="assistant" content="" isLoading />
              )}

              {/* Confirmation card */}
              {isConfirming && pendingTransaction && (
                <ConfirmationCard
                  transaction={pendingTransaction}
                  onConfirm={handleConfirm}
                  onEdit={handleEdit}
                  saving={status === 'saving'}
                />
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Input bar ───────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-end gap-2 bg-surface-card border border-surface-border rounded-xl px-3 py-3">
          <FileUploadButton
            onFile={handleFileSelect}
            disabled={isThinking || isConfirming}
            attachedFile={uploadedFile}
            onClear={() => setUploadedFile(null)}
          />

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isConfirming
                ? 'Confirm or edit the transaction above…'
                : 'Log an income or expense — or upload a receipt, invoice, or CSV…'
            }
            disabled={isThinking || isConfirming}
            rows={1}
            className="flex-1 bg-transparent text-white text-sm resize-none outline-none placeholder-muted disabled:opacity-40 leading-relaxed py-1.5 max-h-32 overflow-y-auto [color-scheme:dark]"
          />

          {/* Send button */}
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!canSend}
            title="Send (Enter)"
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4 text-white"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
              />
            </svg>
          </button>
        </div>

        {/* Hint text */}
        <p className="text-muted/50 text-xs text-center -mt-2">
          Enter to send · Shift+Enter for new line · 10MB file limit
        </p>
      </div>
    </PageWrapper>
  )
}
