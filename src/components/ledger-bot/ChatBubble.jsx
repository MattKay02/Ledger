// Loading dots animation for the "thinking" state
function ThinkingDots() {
  return (
    <span className="flex items-center gap-1 py-1">
      <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce [animation-delay:0ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce [animation-delay:150ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce [animation-delay:300ms]" />
    </span>
  )
}

// File attachment chip shown on user bubbles
function FilePill({ name }) {
  return (
    <span className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-md bg-accent/10 border border-accent/20 text-accent text-xs">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-3.5 h-3.5 flex-shrink-0"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 002.112 2.13"
        />
      </svg>
      {name}
    </span>
  )
}

export default function ChatBubble({ role, content, fileData, isLoading, isError, onRetry }) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Bubble */}
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-accent/15 border border-accent/25 text-white rounded-br-sm'
              : isError
              ? 'bg-danger/10 border border-danger/30 text-danger rounded-bl-sm'
              : 'bg-surface-card border border-surface-border text-white rounded-bl-sm'
          }`}
        >
          {isLoading ? <ThinkingDots /> : content}
        </div>

        {/* File attachment chip (user messages only) */}
        {isUser && fileData?.name && <FilePill name={fileData.name} />}

        {/* Retry button on error bubbles */}
        {isError && onRetry && (
          <button
            onClick={onRetry}
            className="mt-1.5 text-xs text-muted hover:text-white transition-colors flex items-center gap-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-3.5 h-3.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            Retry
          </button>
        )}
      </div>
    </div>
  )
}
