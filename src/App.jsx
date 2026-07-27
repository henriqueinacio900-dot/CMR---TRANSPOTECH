import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './Login.jsx'
import Kanban from './Kanban.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setCarregando(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (carregando) return null
  if (!user) return <Login onLogin={setUser} />
  return <Kanban />
}
