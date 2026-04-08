import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Beef, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

export default function LoginPage() {
  const { user, signIn, signUp } = useAuth()
  const { addToast } = useToast()

  const [mode, setMode]       = useState('login') // 'login' | 'register'
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [fullName, setName]   = useState('')
  const [showPass, setShowP]  = useState(false)
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/pos" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) { addToast('Email and password are required', 'error'); return }
    setLoading(true)

    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) { addToast(error.message, 'error'); setLoading(false) }
    } else {
      if (!fullName.trim()) { addToast('Full name is required', 'error'); setLoading(false); return }
      const { error } = await signUp(email, password, fullName)
      if (error) { addToast(error.message, 'error') }
      else { addToast('Account created! Please check your email to confirm.', 'success') }
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">
            <Beef size={28} />
          </div>
          <div>
            <div className="login-app-name">Earthwise Butcher</div>
            <div className="login-app-sub">Point of Sale System</div>
          </div>
        </div>

        <h2 className="login-title">{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
        <p className="login-sub">{mode === 'login' ? 'Sign in to your account' : 'Register a new cashier account'}</p>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-control" placeholder="e.g. Jean Pierre" value={fullName} onChange={e=>setName(e.target.value)} />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-control" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position:'relative' }}>
              <input
                className="form-control"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e=>setPass(e.target.value)}
                style={{ paddingRight:40 }}
              />
              <button
                type="button"
                onClick={() => setShowP(p=>!p)}
                style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'var(--color-text-muted)', background:'none', border:'none', cursor:'pointer' }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={loading}
            style={{ marginTop:'var(--space-2)' }}
          >
            {loading ? <><div className="spinner" /> {mode === 'login' ? 'Signing in…' : 'Creating account…'}</>
              : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="login-footer">
          {mode === 'login' ? (
            <>Don't have an account?{' '}
              <button onClick={() => setMode('register')} style={{ color:'var(--color-primary)', fontWeight:600, background:'none', border:'none', cursor:'pointer' }}>Register</button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button onClick={() => setMode('login')} style={{ color:'var(--color-primary)', fontWeight:600, background:'none', border:'none', cursor:'pointer' }}>Sign In</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
