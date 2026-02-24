# Auth — Ledger

## Overview
Ledger uses Supabase Auth with three providers: email/password, Google OAuth, and Apple OAuth. All three are configured through the Supabase dashboard. The frontend manages session state via a global AuthContext.

## Providers

### 1. Email / Password
- Supabase handles hashing and session management entirely
- User signs up with email + password
- Supabase returns a JWT stored in a secure cookie/session (handled automatically by the SDK)
- On every app load, `supabase.auth.getSession()` is called to restore the session

### 2. Google OAuth
**How it works:**
1. User clicks "Sign in with Google"
2. App calls `supabase.auth.signInWithOAuth({ provider: 'google' })`
3. Browser redirects to Google's consent screen
4. Google redirects back to your app's callback URL with an auth code
5. Supabase exchanges the code for a session automatically

**Setup steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable the Google+ API
4. Create OAuth 2.0 credentials (Web Application type)
5. Add authorised redirect URI: `https://<your-supabase-project>.supabase.co/auth/v1/callback`
6. Copy Client ID and Client Secret
7. In Supabase Dashboard → Authentication → Providers → Google → paste credentials

### 3. Apple OAuth
**How it works:** Same OAuth 2.0 redirect flow as Google but Apple requires more setup.

**Important Apple-specific behaviour:**
- Apple only shares the user's real email on the **first login** — after that it provides a relay email (`@privaterelay.appleid.com`)
- You must handle this gracefully — do not assume email is always the user's real address
- Apple requires a verified domain

**Setup steps:**
1. Requires Apple Developer account (£79/year)
2. In Apple Developer Portal:
   - Create an App ID with "Sign in with Apple" capability
   - Create a Services ID (this is your OAuth client)
   - Register your domain and return URL
   - Generate a private key (download the `.p8` file — you only get this once)
3. Host verification file at: `https://yourdomain.com/.well-known/apple-developer-domain-association.txt`
4. In Supabase Dashboard → Authentication → Providers → Apple → paste Service ID, Team ID, Key ID, and private key contents

## Supabase Client Setup
```js
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

## AuthContext
```jsx
// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Restore session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signInWithEmail = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signUpWithEmail = (email, password) =>
    supabase.auth.signUp({ email, password })

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({ provider: 'google' })

  const signInWithApple = () =>
    supabase.auth.signInWithOAuth({ provider: 'apple' })

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ user, loading, signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

## Protected Route
```jsx
// src/routes/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

export default ProtectedRoute
```

## Environment Variables
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```
**Never commit these to GitHub.** Add `.env` to `.gitignore` immediately.

## Key Gotchas
- The `service_role` key bypasses RLS entirely — never use it in frontend code
- Apple auth must be the last provider you configure — it's the most complex and will block progress if attempted first
- On Vercel, add environment variables in the Vercel dashboard under Project Settings → Environment Variables
- OAuth redirect URLs must be updated when moving from localhost to production — update both Google Cloud Console and Supabase dashboard
