import { useEffect, useState } from 'react'
import { listarTodosClientes } from './api'

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    listarTodosClientes().then(c => { setClientes(c); setCarregando(false) })
  }, [])

  const filtrados = clientes.filter(c =>
    !busca || c.razao_social?.toLowerCase().includes(busca.toLowerCase()) || (c.cnpj || '').includes(busca)
  )

  if (carregando) return <p style={{ padding: 24 }}>Carregando...</p>

  return (
    <div style={{ padding: 24 }}>
      <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>Clientes ({clientes.length})</p>
      <input
        placeholder="Buscar por nome ou CNPJ..."
        value={busca}
        onChange={e => setBusca(e.target.value)}
        style={{ width: '100%', maxWidth: 340, padding: 8, borderRadius: 6, border: '1px solid #ddd', marginBottom: 16, fontSize: 13 }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtrados.map(c => (
          <div key={c.id} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: 12, display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{c.razao_social}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#777' }}>
                {c.cnpj ? `CNPJ ${c.cnpj} · ` : ''}{c.cidade} · {c.telefone_whats}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: 11, color: '#999' }}>{c.departamento?.nome}</p>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                background: c.status_cliente === 'ativo' ? '#eaf3de' : '#f1efe8',
                color: c.status_cliente === 'ativo' ? '#3b6d11' : '#777',
              }}>
                {c.status_cliente === 'ativo' ? 'Ativo' : 'Prospect'}
              </span>
            </div>
          </div>
        ))}
        {filtrados.length === 0 && <p style={{ color: '#999' }}>Nenhum cliente encontrado.</p>}
      </div>
    </div>
  )
}
