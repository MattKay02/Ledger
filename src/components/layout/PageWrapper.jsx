const PageWrapper = ({ title, action, children }) => (
  <div className="p-8">
    <div className="flex items-center justify-between mb-8">
      <h1 className="text-white text-2xl font-bold">{title}</h1>
      {action && <div>{action}</div>}
    </div>
    {children}
  </div>
)

export default PageWrapper
