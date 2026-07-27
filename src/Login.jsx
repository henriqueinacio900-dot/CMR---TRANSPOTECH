import { useState } from 'react'
import { supabase } from './supabaseClient'
import { CORES_MARCA } from './constants'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
    setCarregando(false)
    if (error) {
      setErro('E-mail ou senha inválidos.')
      return
    }
    onLogin(data.user)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `linear-gradient(160deg, ${CORES_MARCA.laranja}55 0%, #fff 70%)`,
    }}>
      <form onSubmit={entrar} style={{
        background: '#fff',
        borderRadius: 12,
        padding: '32px 28px',
        width: 320,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      }}>
        <h1 style={{ fontSize: 18, marginBottom: 20 }}>CRM Transpotech</h1>

        <label style={{ fontSize: 13, color: '#555' }}>E-mail</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: 8, marginBottom: 12, marginTop: 4, borderRadius: 6, border: '1px solid #ddd', boxSizing: 'border-box' }}
        />

        <label style={{ fontSize: 13, color: '#555' }}>Senha</label>
        <input
          type="password"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          required
          style={{ width: '100%', padding: 8, marginBottom: 16, marginTop: 4, borderRadius: 6, border: '1px solid #ddd', boxSizing: 'border-box' }}
        />

        {erro && <p style={{ color: '#a32d2d', fontSize: 13, marginBottom: 12 }}>{erro}</p>}

        <button type="submit" disabled={carregando} style={{
          width: '100%',
          padding: 10,
          background: CORES_MARCA.laranja,
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          fontWeight: 600,
          cursor: 'pointer',
        }}>
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
