const StatCard = ({ label, value, valueClassName = 'text-white', trend, trendLabel }) => (
  <div className="bg-surface-card border border-surface-border rounded-xl p-6">
    <p className="text-muted text-sm font-medium">{label}</p>
    <p className={`text-2xl font-bold mt-1 ${valueClassName}`}>{value}</p>
    {trend !== undefined && trendLabel && (
      <p className={`text-sm mt-2 ${trend >= 0 ? 'text-success' : 'text-danger'}`}>
        {trend >= 0 ? '↑' : '↓'} {trendLabel}
      </p>
    )}
  </div>
)

export default StatCard
