import { useEffect, useState } from 'react'
import { TEMA } from './theme'
import { listarTodosClientes, listarDepartamentos, atualizarCliente } from './api'
import { formatarTelefoneInput } from './constants'

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [clienteSelecionado, setClienteSelecionado] = useState(null)

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    setCarregando(true)
    const [c, d] = await Promise.all([listarTodosClientes(), listarDepartamentos()])
    setClientes(c)
    setDepartamentos(d)
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
        <ModalEditarCliente
          cliente={clienteSelecionado}
          departamentos={departamentos}
          onFechar={() => setClienteSelecionado(null)}
          onSalvo={() => { setClienteSelecionado(null); carregar() }}
        />
      )}
    </div>
  )
}

function ModalEditarCliente({ cliente, departamentos, onFechar, onSalvo }) {
  const [campos, setCampos] = useState({
    razao_social: cliente.razao_social || '',
    nome_fantasia: cliente.nome_fantasia || '',
    cnpj: cliente.cnpj || '',
    cidade: cliente.cidade || '',
    estado: cliente.estado || '',
    telefone_whats: cliente.telefone_whats || '',
    departamento_id: cliente.departamento_id || cliente.departamento?.id || '',
    qtd_maquinas_estimada: cliente.qtd_maquinas_estimada || '',
    status_cliente: cliente.status_cliente || 'prospect',
    observacoes_gerais: cliente.observacoes_gerais || '',
  })
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    setSalvando(true)
    try {
      await atualizarCliente(cliente.id, {
        ...campos,
        qtd_maquinas_estimada: campos.qtd_maquinas_estimada ? Number(campos.qtd_maquinas_estimada) : null,
        departamento_id: campos.departamento_id || null,
      })
      onSalvo()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20,
    }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 440, maxHeight: '90vh', overflowY: 'auto', color: '#222' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, margin: 0 }}>Editar cliente</h2>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#999' }}>✕</button>
        </div>

        <Campo label="Razão social / Nome do cliente">
          <input value={campos.razao_social} onChange={e => setCampos({ ...campos, razao_social: e.target.value })} style={inputStyle} />
        </Campo>
        <Campo label="Nome fantasia">
          <input value={campos.nome_fantasia} onChange={e => setCampos({ ...campos, nome_fantasia: e.target.value })} style={inputStyle} />
        </Campo>
        <Campo label="CNPJ">
          <input value={campos.cnpj} onChange={e => setCampos({ ...campos, cnpj: e.target.value })} style={inputStyle} />
        </Campo>
        <div style={{ display: 'flex', gap: 8 }}>
          <Campo label="Cidade" style={{ flex: 2 }}>
            <input value={campos.cidade} onChange={e => setCampos({ ...campos, cidade: e.target.value })} style={inputStyle} />
          </Campo>
          <Campo label="Estado" style={{ flex: 1 }}>
            <input maxLength={2} value={campos.estado} onChange={e => setCampos({ ...campos, estado: e.target.value.toUpperCase() })} style={inputStyle} />
          </Campo>
        </div>
        <Campo label="Telefone / WhatsApp">
          <input value={campos.telefone_whats} onChange={e => setCampos({ ...campos, telefone_whats: formatarTelefoneInput(e.target.value) })} style={inputStyle} />
        </Campo>
        <Campo label="Departamento">
          <select value={campos.departamento_id} onChange={e => setCampos({ ...campos, departamento_id: e.target.value })} style={inputStyle}>
            <option value="">-</option>
            {departamentos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </select>
        </Campo>
        <Campo label="Quantidade estimada de máquinas">
          <input type="number" value={campos.qtd_maquinas_estimada} onChange={e => setCampos({ ...campos, qtd_maquinas_estimada: e.target.value })} style={inputStyle} />
        </Campo>
        <Campo label="Status">
          <select value={campos.status_cliente} onChange={e => setCampos({ ...campos, status_cliente: e.target.value })} style={inputStyle}>
            <option value="prospect">Prospect</option>
            <option value="ativo">Ativo</option>
          </select>
        </Campo>
        <Campo label="Observações gerais">
          <textarea rows={3} value={campos.observacoes_gerais} onChange={e => setCampos({ ...campos, observacoes_gerais: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} />
        </Campo>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={onFechar} style={{ flex: 1, padding: 10, borderRadius: 6, border: 'none', background: '#eee', color: '#333', fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando} style={{ flex: 1, padding: 10, borderRadius: 6, border: 'none', background: '#F77E01', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Campo({ label, children, style }) {
  return (
    <div style={{ marginBottom: 10, ...style }}>
      <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd', boxSizing: 'border-box', fontSize: 13,
}
