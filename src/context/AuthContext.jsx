import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Beef, ExternalLink } from 'lucide-react'

const AuthContext = createContext({})

const isSupabaseConfigured = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    }).catch(() => setLoading(false))

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) fetchProfile(session.user.id)
        else { setProfile(null); setLoading(false) }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId) => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (data) setProfile(data)
      else {
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({ id: userId, full_name: user?.email?.split('@')[0] || 'User', role: 'cashier' })
          .select().single()
        setProfile(newProfile)
      }
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  const signUp = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (!error && data.user) {
      await supabase.from('profiles').upsert({ id: data.user.id, full_name: fullName, role: 'cashier' })
    }
    return { data, error }
  }

  const signOut = async () => { await supabase.auth.signOut() }

  const isAdmin = profile?.role === 'admin'

  // Show setup screen if Supabase not configured
  if (!isSupabaseConfigured) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#162316 0%,#2d5a2d 100%)', padding:24 }}>
        <div style={{ background:'#fff', borderRadius:16, padding:'48px 40px', maxWidth:520, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:32 }}>
            <div style={{ width:52, height:52, background:'#2d5a2d', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Beef size={28} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:'1.25rem' }}>Earthwise Butcher POS</div>
              <div style={{ fontSize:'0.875rem', color:'#6b7280' }}>Setup Required</div>
            </div>
          </div>
          <h2 style={{ fontSize:'1.5rem', fontWeight:800, marginBottom:8 }}>Connect your database</h2>
          <p style={{ color:'#6b7280', marginBottom:24, fontSize:'0.9375rem' }}>To use this app, you need a free Supabase account. Follow the steps below to get started — it takes about 5 minutes.</p>
          <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:28 }}>
            {[
              { step:'1', text:'Go to supabase.com and create a free account' },
              { step:'2', text:'Create a new project (free tier, no credit card)' },
              { step:'3', text:'Go to SQL Editor and run the supabase_migration.sql file included in this project' },
              { step:'4', text:'Go to Project Settings → API and copy your Project URL and anon key' },
              { step:'5', text:'Create a .env file in the project root with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY' },
              { step:'6', text:'Restart the app with npm run dev' },
            ].map(({ step, text }) => (
              <div key={step} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                <div style={{ width:26, height:26, borderRadius:'50%', background:'#2d5a2d', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'0.8125rem', flexShrink:0 }}>{step}</div>
                <div style={{ fontSize:'0.875rem', color:'#374151', paddingTop:4 }}>{text}</div>
              </div>
            ))}
          </div>
          <a href="https://supabase.com" target="_blank" rel="noopener noreferrer"
            style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#2d5a2d', color:'#fff', padding:'12px 24px', borderRadius:8, fontWeight:600, fontSize:'0.9375rem' }}>
            <ExternalLink size={16} /> Open Supabase.com
          </a>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
