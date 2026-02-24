import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export const CHART_COLOURS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#f97316', '#14b8a6',
]

const DonutChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-60 text-muted text-sm">
        No expense data for this period
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={58}
          outerRadius={88}
          dataKey="value"
          nameKey="name"
          paddingAngle={3}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.colour || CHART_COLOURS[i % CHART_COLOURS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: '#1a1d27', border: '1px solid #2d3149', borderRadius: '8px' }}
          itemStyle={{ color: '#fff' }}
          formatter={(value, name) => [`£${Number(value).toFixed(2)}`, name]}
        />
        <Legend
          iconSize={8}
          iconType="circle"
          formatter={(value) => (
            <span className="text-xs text-muted">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

export default DonutChart
