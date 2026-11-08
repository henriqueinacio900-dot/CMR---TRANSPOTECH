import { useEffect, useState } from 'react'
import { TEMA } from './theme'
import { listarTodosClientes, listarDepartamentos, getMeuConsultor } from './api'
import { classificarPciNovo } from './constants'
import FichaCliente from './FichaCliente.jsx'

export default function Clientes({ onNegocioCriado }) {
  const [clientes, setClientes] = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [clienteSelecionado, setClienteSelecionado] = useState(null)
  const [euMesmo, setEuMesmo] = useState(null)

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    setCarregando(true)
    const [c, d, eu] = await Promise.all([listarTodosClientes(), listarDepartamentos(), getMeuConsultor()])
    setClientes(c)
    setDepartamentos(d)
    setEuMesmo(eu)
    setCarregando(false)
  }

  const filtrados = clientes.filter(c =>
    !busca || c.razao_social?.toLowerCase().includes(busca.toLowerCase()) || (c.cnpj || '').includes(busca)
  )

  if (carregando) return <p style={{ padding: 24, color: TEMA.textoPrincipal }}>Carregando...</p>

  return (
    <div style={{ padding: 24, color: TEMA.textoPrincipal }}>
      <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>Clientes ({clientes.length})</p>
      <input
        placeholder="Buscar por nome ou CNPJ..."
        value={busca}
        onChange={e => setBusca(e.target.value)}
        style={{ width: '100%', maxWidth: 340, padding: 8, borderRadius: 6, border: '1px solid #ddd', marginBottom: 16, fontSize: 13 }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtrados.map(c => (
          <div
            key={c.id}
            onClick={() => setClienteSelecionado(c)}
            style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: 12, display: 'flex', justifyContent: 'space-between', cursor: 'pointer', color: '#222' }}
          >
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{c.razao_social}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#777' }}>
                {c.cnpj ? `CNPJ ${c.cnpj} · ` : ''}{c.cidade || 'sem cidade'} · {c.telefone_whats}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: 11, color: '#999' }}>{c.departamento?.nome}</p>
              {c.pci_nota !== null && c.pci_nota !== undefined && (
                <span style={{
                  display: 'inline-block', fontSize: 12, fontWeight: 800, padding: '2px 9px', borderRadius: 10, marginRight: 4,
                  background: classificarPciNovo(c.pci_nota).cor + '22', color: classificarPciNovo(c.pci_nota).cor,
                  border: `1px solid ${classificarPciNovo(c.pci_nota).cor}55`,
                }}>
                  PCI {c.pci_nota}
                </span>
              )}
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

      {clienteSelecionado && (
        <FichaCliente
          cliente={clienteSelecionado}
          departamentos={departamentos}
          euMesmo={euMesmo}
          onNegocioCriado={onNegocioCriado}
          onFechar={() => setClienteSelecionado(null)}
          onSalvo={() => { setClienteSelecionado(null); carregar() }}
        />
      )}
    </div>
  )
}
