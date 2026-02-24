const Card = ({ children, className = '' }) => (
  <div className={`bg-surface-card border border-surface-border rounded-xl p-6 ${className}`}>
    {children}
  </div>
)

export default Card
