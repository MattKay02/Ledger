import { useRef } from 'react'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export default function FileUploadButton({ onFile, disabled, attachedFile, onClear }) {
  const inputRef = useRef(null)

  const handleChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset input so the same file can be re-selected if cleared
    e.target.value = ''

    if (file.size > MAX_FILE_SIZE) {
      onFile(null, `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum is 10MB.`)
      return
    }

    onFile(file)
  }

  // If a file is already attached, show the chip with a clear button
  if (attachedFile) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs flex-shrink-0 max-w-[180px]">
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
        <span className="truncate">{attachedFile.name}</span>
        <button
          type="button"
          onClick={onClear}
          disabled={disabled}
          className="ml-0.5 text-accent/60 hover:text-accent flex-shrink-0 transition-colors"
          aria-label="Remove file"
        >
          ×
        </button>
      </div>
    )
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.csv"
        onChange={handleChange}
        className="hidden"
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        title="Upload receipt, invoice, or CSV"
        className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-muted hover:text-white hover:bg-surface-elevated transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 002.112 2.13"
          />
        </svg>
      </button>
    </>
  )
}
