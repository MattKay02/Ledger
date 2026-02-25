# Components — Ledger

## Overview
Dark mode only. Tailwind CSS throughout — no inline styles, no CSS modules. Component-first architecture with reusable base UI components. Card grid layout for expenses and income. All charts use Recharts.

## Design Tokens (Tailwind config extensions)
```js
// tailwind.config.js
module.exports = {
  darkMode: 'class', // dark mode always applied via class on <html>
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0f1117',  // page background
          card: '#1a1d27',     // card background
          elevated: '#22263a', // modals, dropdowns
          border: '#2d3149',   // borders
        },
        accent: {
          DEFAULT: '#6366f1',  // indigo — primary actions
          hover: '#4f46e5',
          muted: '#312e81',
        },
        success: '#22c55e',
        danger: '#ef4444',
        warning: '#f59e0b',
        muted: '#64748b',
      }
    }
  }
}
```

## Base UI Components

### Card
```jsx
// src/components/ui/Card.jsx
const Card = ({ children, className = '' }) => (
  <div className={`bg-surface-card border border-surface-border rounded-xl p-6 ${className}`}>
    {children}
  </div>
)
export default Card
```

### StatCard (for Overview summary stats)
```jsx
// src/components/ui/StatCard.jsx
const StatCard = ({ label, value, trend, trendLabel }) => (
  <div className="bg-surface-card border border-surface-border rounded-xl p-6">
    <p className="text-muted text-sm font-medium">{label}</p>
    <p className="text-white text-2xl font-bold mt-1">{value}</p>
    {trend && (
      <p className={`text-sm mt-2 ${trend >= 0 ? 'text-success' : 'text-danger'}`}>
        {trend >= 0 ? '↑' : '↓'} {trendLabel}
      </p>
    )}
  </div>
)
export default StatCard
```

### Button
```jsx
// src/components/ui/Button.jsx
const variants = {
  primary: 'bg-accent hover:bg-accent-hover text-white',
  ghost: 'bg-transparent hover:bg-surface-elevated text-muted hover:text-white border border-surface-border',
  danger: 'bg-danger hover:bg-red-600 text-white',
}

const Button = ({ children, variant = 'primary', className = '', ...props }) => (
  <button
    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${variants[variant]} ${className}`}
    {...props}
  >
    {children}
  </button>
)
export default Button
```

### Input
```jsx
// src/components/ui/Input.jsx
const Input = ({ label, error, className = '', ...props }) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-sm text-muted font-medium">{label}</label>}
    <input
      className={`bg-surface-elevated border ${error ? 'border-danger' : 'border-surface-border'} 
        text-white rounded-lg px-4 py-2.5 text-sm outline-none 
        focus:border-accent transition-colors ${className}`}
      {...props}
    />
    {error && <p className="text-danger text-xs">{error}</p>}
  </div>
)
export default Input
```

### Modal
```jsx
// src/components/ui/Modal.jsx
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface-card border border-surface-border rounded-xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white font-semibold text-lg">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-white">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
export default Modal
```

## Layout

### Sidebar
- Fixed left sidebar on desktop
- Icon + label navigation items
- Routes (in order): Overview, **Ledger Bot**, Expenses, Income, Budgets, Reports, Settings
- Bottom: user avatar + sign out
- All icons are inline SVG wrapped in a shared `<Icon>` component — no external icon library
- Active state: `bg-accent/10 text-accent`; inactive: `text-muted hover:text-white hover:bg-surface-elevated`

### Page layout pattern
```jsx
// src/components/layout/PageWrapper.jsx
const PageWrapper = ({ title, action, children }) => (
  <div className="flex-1 p-8">
    <div className="flex items-center justify-between mb-8">
      <h1 className="text-white text-2xl font-bold">{title}</h1>
      {action && <div>{action}</div>}
    </div>
    {children}
  </div>
)
```

## Chart Components (Recharts)

### Colours for charts (consistent palette)
```js
export const CHART_COLOURS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#f97316', '#14b8a6'
]
```

### Donut chart wrapper
```jsx
// src/components/charts/DonutChart.jsx
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const DonutChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={240}>
    <PieChart>
      <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
        dataKey="value" paddingAngle={3}>
        {data.map((entry, i) => (
          <Cell key={i} fill={entry.colour || CHART_COLOURS[i % CHART_COLOURS.length]} />
        ))}
      </Pie>
      <Tooltip
        contentStyle={{ backgroundColor: '#1a1d27', border: '1px solid #2d3149', borderRadius: '8px' }}
        labelStyle={{ color: '#fff' }}
      />
    </PieChart>
  </ResponsiveContainer>
)
```

### Line chart wrapper
```jsx
// src/components/charts/TrendLineChart.jsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const TrendLineChart = ({ data, dataKey = 'value' }) => (
  <ResponsiveContainer width="100%" height={240}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#2d3149" />
      <XAxis dataKey="label" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} />
      <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={v => `£${v}`} />
      <Tooltip
        contentStyle={{ backgroundColor: '#1a1d27', border: '1px solid #2d3149', borderRadius: '8px' }}
        formatter={v => [`£${v}`, '']}
      />
      <Line type="monotone" dataKey={dataKey} stroke="#6366f1" strokeWidth={2} dot={false} />
    </LineChart>
  </ResponsiveContainer>
)
```

## Expense / Income Card Grid
Cards displayed in a responsive grid: `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4`

Each card shows: title, amount in GBP, original currency if not GBP, category badge, date, type badge (recurring/one_off), and edit/delete actions.

## Currency Display Rule
Always display in GBP with £ symbol. If the original currency was not GBP, show the original value in muted text below:
```
£42.50
$54.00 USD · Rate: 1.27
```

---

## Ledger Bot Components (`src/components/ledger-bot/`)

### ChatBubble
```jsx
<ChatBubble
  role="user" | "assistant"
  content="string"
  fileData={{ name: 'receipt.jpg' }}  // optional — shows file chip on user bubbles
  isLoading={false}                   // shows animated dots instead of content
  isError={false}                     // red border variant
  onRetry={() => {}}                  // shows retry button when isError + onRetry provided
/>
```
- User bubbles: right-aligned, `bg-accent/15 border border-accent/25 rounded-br-sm`
- Bot bubbles: left-aligned, `bg-surface-card border border-surface-border rounded-bl-sm`
- Error bubbles: `bg-danger/10 border border-danger/30 text-danger`
- Loading state: three bouncing dots using `animate-bounce` with staggered delays
- File chip: `bg-accent/10 border border-accent/20 text-accent` with paperclip icon

### ConfirmationCard
```jsx
<ConfirmationCard
  transaction={transactionObject}  // from Haiku's complete response
  onConfirm={() => {}}
  onEdit={() => {}}
  saving={false}                   // shows spinner on Confirm button
/>
```
- Shows type badge (Expense=danger, Income=success) and optional Recurring badge
- Detail rows: category/source, date, duration (if recurring), notes (if present)
- Foreign currency: shows original amount + `(converted at save)` note
- Confirm button: accent; disabled + spinner while `saving`
- Edit button: ghost variant

### FileUploadButton
```jsx
<FileUploadButton
  onFile={(file, sizeError) => {}}  // sizeError is string | undefined
  disabled={false}
  attachedFile={{ name: 'receipt.pdf' } | null}
  onClear={() => {}}
/>
```
- Accepts: `.jpg .jpeg .png .webp .gif .pdf .csv`
- 10 MB client-side size check before calling `onFile`
- When `attachedFile` is set: shows file name chip with × button instead of paperclip icon
- Hidden `<input type="file">` triggered by button click

### Chat page layout pattern
The Ledger Bot page uses a fixed-height flex column within `PageWrapper`:
```jsx
<div className="max-w-2xl mx-auto flex flex-col gap-4 h-[calc(100vh-11rem)]">
  <div className="flex-1 overflow-y-auto min-h-0"> {/* message thread */} </div>
  <div className="flex-shrink-0">                  {/* input bar */}      </div>
</div>
```
`min-h-0` on the scroll container is required — without it, flex children ignore overflow constraints.

---

## Naming Conventions
- Components: PascalCase (`StatCard.jsx`)
- Hooks: camelCase prefixed with `use` (`useExpenses.js`)
- Pages: PascalCase (`Overview.jsx`)
- Utility files: camelCase (`currency.js`)
- Tailwind: utility classes only, no custom CSS files
