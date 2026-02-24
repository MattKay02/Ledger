const variants = {
  primary: 'bg-accent hover:bg-accent-hover text-white',
  ghost: 'bg-transparent hover:bg-surface-elevated text-muted hover:text-white border border-surface-border',
  danger: 'bg-danger hover:bg-red-600 text-white',
}

const Button = ({ children, variant = 'primary', className = '', ...props }) => (
  <button
    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    {...props}
  >
    {children}
  </button>
)

export default Button
