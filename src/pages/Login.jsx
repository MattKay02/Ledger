import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
  </svg>
)

const AppleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
    <path d="M12.24 0c.07.664-.19 1.337-.612 1.83-.414.493-1.086.87-1.766.816-.087-.656.2-1.33.584-1.79C10.85.38 11.565.03 12.24 0ZM14.91 12.065c-.28.64-.618 1.228-1.01 1.764-.527.726-1.076 1.45-1.893 1.463-.8.014-1.057-.472-1.97-.467-.912.005-1.19.482-2.033.481-.815-.001-1.334-.706-1.863-1.43C4.98 11.898 4.31 9.534 5.22 7.248c.435-1.103 1.345-1.798 2.308-1.815.861-.016 1.675.553 2.2.553.528 0 1.515-.684 2.551-.583.434.018 1.654.175 2.437 1.32-.063.04-1.455.838-1.438 2.5.019 1.985 1.756 2.645 1.775 2.655-.019.055-.28.956-.143.187Z" />
  </svg>
)

export default function Login() {
  const { user, signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple } = useAuth()

  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [signupDone, setSignupDone] = useState(false)

  // Already authenticated — go straight to the app
  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'signin') {
      const { error } = await signInWithEmail(email, password)
      if (error) {
        setError(error.message)
        setLoading(false)
      }
      // On success, AuthContext updates user → this component redirects above
    } else {
      const { data, error } = await signUpWithEmail(email, password)
      if (error) {
        setError(error.message)
        setLoading(false)
      } else if (!data.session) {
        // Email confirmation required
        setSignupDone(true)
        setLoading(false)
      }
      // If session exists (confirmation disabled), AuthContext handles redirect
    }
  }

  const handleOAuth = async (fn) => {
    setError('')
    const { error } = await fn()
    if (error) setError(error.message)
  }

  const switchMode = (next) => {
    setMode(next)
    setError('')
    setSignupDone(false)
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="mb-8 text-center">
          <h1 className="text-white text-3xl font-bold tracking-tight">Ledger</h1>
          <p className="text-muted text-sm mt-1">Business finance, simplified</p>
        </div>

        {/* Card */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-8">

          {signupDone ? (
            <div className="text-center">
              <p className="text-white font-semibold mb-2">Check your email</p>
              <p className="text-muted text-sm">
                We sent a confirmation link to <span className="text-white">{email}</span>.
                Click it to activate your account.
              </p>
              <button
                onClick={() => switchMode('signin')}
                className="mt-6 text-accent hover:text-accent-hover text-sm transition-colors"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-white font-semibold text-lg mb-6">
                {mode === 'signin' ? 'Sign in to your account' : 'Create an account'}
              </h2>

              {error && (
                <div className="mb-4 px-4 py-3 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-muted font-medium">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="bg-surface-elevated border border-surface-border text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:border-accent transition-colors placeholder:text-muted/50"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm text-muted font-medium">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    placeholder="••••••••"
                    className="bg-surface-elevated border border-surface-border text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:border-accent transition-colors placeholder:text-muted/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
                >
                  {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
                </button>
              </form>

              {/* Divider */}
              <div className="my-6 flex items-center gap-3">
                <div className="flex-1 h-px bg-surface-border" />
                <span className="text-muted text-xs">or continue with</span>
                <div className="flex-1 h-px bg-surface-border" />
              </div>

              {/* OAuth */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleOAuth(signInWithGoogle)}
                  className="flex items-center justify-center gap-3 bg-transparent hover:bg-surface-elevated border border-surface-border text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
                >
                  <GoogleIcon />
                  Continue with Google
                </button>

                <button
                  onClick={() => handleOAuth(signInWithApple)}
                  className="flex items-center justify-center gap-3 bg-transparent hover:bg-surface-elevated border border-surface-border text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
                >
                  <AppleIcon />
                  Continue with Apple
                </button>
              </div>

              {/* Mode toggle */}
              <p className="mt-6 text-center text-sm text-muted">
                {mode === 'signin' ? (
                  <>
                    Don&apos;t have an account?{' '}
                    <button
                      onClick={() => switchMode('signup')}
                      className="text-accent hover:text-accent-hover transition-colors"
                    >
                      Create one
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      onClick={() => switchMode('signin')}
                      className="text-accent hover:text-accent-hover transition-colors"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
