const Input = ({ label, error, hint, className = '', ...props }) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-sm text-muted font-medium">{label}</label>}
    <input
      className={`bg-surface-elevated border ${error ? 'border-danger' : 'border-surface-border'} text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:border-accent transition-colors placeholder:text-muted/50 [color-scheme:dark] ${className}`}
      {...props}
    />
    {error && <p className="text-danger text-xs">{error}</p>}
    {!error && hint && <p className="text-muted/70 text-xs">{hint}</p>}
  </div>
)

export default Input
