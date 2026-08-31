import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './Login.jsx'
import Kanban from './Kanban.jsx'
import VisitasMobile from './VisitasMobile.jsx'

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

  // Atalho mobile: abre direto na lista de visitas programadas, sem o CRM inteiro.
  // Salve esse link na tela inicial do celular: seusite.vercel.app/?mobile=visitas
  const params = new URLSearchParams(window.location.search)
  if (params.get('mobile') === 'visitas') return <VisitasMobile />

  return <Kanban />
}
