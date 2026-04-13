'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { FolderKanban, Mail, Lock, Eye, EyeOff, LogIn, AlertTriangle } from 'lucide-react'

export default function LoginPage() {
  const router   = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const supabaseReady = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()

    if (!supabase) {
      // Supabase not configured — let user in for preview only
      router.push('/dashboard')
      return
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email:    email.trim().toLowerCase(),
      password: password,
    })

    if (authError) {
      setError('Incorrect email or password. Please try again.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 60%, #EDE9FE 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Setup warning banner */}
        {!supabaseReady && (
          <div style={{
            background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12,
            padding: '14px 18px', marginBottom: 20,
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <AlertTriangle size={18} color="#F59E0B" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#92400E' }}>
                Supabase not configured yet
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
                Click Sign In to preview the dashboard.<br />
                Add your .env.local keys to enable real login.
              </p>
            </div>
          </div>
        )}

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 62, height: 62, borderRadius: 18,
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 10px 28px rgba(99,102,241,0.35)', marginBottom: 16,
          }}>
            <FolderKanban size={28} color="#fff" />
          </div>
          <h1 style={{ margin: 0, fontSize: 27, fontWeight: 800, color: '#111', letterSpacing: '-0.5px' }}>
            ProjectFlow
          </h1>
          <p style={{ margin: '8px 0 0', color: '#6B7280', fontSize: 14 }}>
            Sign in to access your team workspace
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#fff', borderRadius: 24, padding: 36,
          boxShadow: '0 20px 60px rgba(99,102,241,0.12)',
          border: '1px solid rgba(99,102,241,0.08)',
        }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#DC2626', fontWeight: 600 }}>
                ⚠️ {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="#9CA3AF" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@aralsane.com"
                  style={{ width: '100%', padding: '13px 13px 13px 40px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, fontFamily: 'inherit', color: '#111', background: '#F9FAFB', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#9CA3AF" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{ width: '100%', padding: '13px 42px 13px 40px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, fontFamily: 'inherit', color: '#111', background: '#F9FAFB', outline: 'none', boxSizing: 'border-box' }}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                  {showPwd ? <EyeOff size={17} color="#9CA3AF" /> : <Eye size={17} color="#9CA3AF" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} style={{
              marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '14px',
              background: loading ? '#C4B5FD' : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800,
              fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(99,102,241,0.4)',
            }}>
              <LogIn size={17} />
              {loading ? 'Signing in...' : supabaseReady ? 'Sign In' : 'Preview Dashboard →'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginTop: 22, lineHeight: 1.5 }}>
          Access restricted to authorized team members only.
        </p>
      </div>
    </div>
  )
}
