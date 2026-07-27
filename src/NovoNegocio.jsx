import { useState } from 'react'
import { criarCliente, criarNegocio } from './api'
import { CORES_MARCA } from './constants'

export default function NovoNegocio({ departamentos, onFechar, onCriado }) {
  const [razaoSocial, setRazaoSocial] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cidade, setCidade] = useState('')
  const [departamentoId, setDepartamentoId] = useState(departamentos[0]?.id || '')
  const [valor, setValor] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)
    try {
      const cliente = await criarCliente({
        razao_social: razaoSocial,
        telefone_whats: telefone,
        cidade,
        departamento_id: departamentoId,
      })
      await criarNegocio({
        cliente_id: cliente.id,
        departamento_id: departamentoId,
        valor_cotacao: valor ? Number(valor) : null,
      })
      onCriado()
    } catch (err) {
      console.error(err)
      setErro('Não deu pra salvar. Confere se todos os campos obrigatórios estão preenchidos.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
    }}>
      <form onSubmit={salvar} style={{
        background: '#fff', borderRadius: 12, padding: 24, width: 360,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      }}>
        <h2 style={{ fontSize: 16, margin: '0 0 16px' }}>Novo negócio</h2>

        <Campo label="Razão social / Nome do cliente">
          <input required value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} style={inputStyle} />
        </Campo>

        <Campo label="Telefone / WhatsApp">
          <input value={telefone} onChange={e => setTelefone(e.target.value)} style={inputStyle} />
        </Campo>

        <Campo label="Cidade">
          <input value={cidade} onChange={e => setCidade(e.target.value)} style={inputStyle} />
        </Campo>

        <Campo label="Departamento">
          <select required value={departamentoId} onChange={e => setDepartamentoId(e.target.value)} style={inputStyle}>
            {departamentos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </select>
        </Campo>

        <Campo label="Valor da cotação (R$)">
          <input type="number" value={valor} onChange={e => setValor(e.target.value)} style={inputStyle} />
        </Campo>

        {erro && <p style={{ color: '#a32d2d', fontSize: 13, margin: '0 0 12px' }}>{erro}</p>}

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button type="button" onClick={onFechar} style={{ ...botaoStyle, background: '#eee', color: '#333' }}>
            Cancelar
          </button>
          <button type="submit" disabled={salvando} style={{ ...botaoStyle, background: CORES_MARCA.laranja, color: '#fff' }}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Campo({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd', boxSizing: 'border-box', fontSize: 13,
}

const botaoStyle = {
  flex: 1, padding: 10, border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13,
}
