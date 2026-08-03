import { useEffect, useState } from 'react'
import { listarNegocios, listarDepartamentos, listarConsultores, getMeuConsultor } from './api'
import { ETAPAS, formatarMoeda } from './constants'

const ETAPAS_FUNIL = ETAPAS.filter(e => e.key !== 'perdida')
const CORES_FUNIL = ['#F9D9B5', '#F4C08C', '#EFA763', '#EA8E3A', '#3b6d11']

export default function Funil() {
  const [negocios, setNegocios] = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [consultores, setConsultores] = useState([])
  const [deptSelecionado, setDeptSelecionado] = useState('todos')
  const [vendedorSelecionado, setVendedorSelecionado] = useState('todos')
  const [carregando, setCarregando] = useState(true)
  const [euMesmo, setEuMesmo] = useState(null)

  useEffect(() => {
    Promise.all([listarNegocios(), listarDepartamentos(), listarConsultores(), getMeuConsultor()]).then(([n, d, c, eu]) => {
      setNegocios(n)
      setDepartamentos(d)
      setConsultores(c)
      setEuMesmo(eu)
      setCarregando(false)
    })
  }, [])

  if (carregando) return <p style={{ padding: 24 }}>Carregando...</p>

  const filtrados = negocios.filter(n => {
    if (deptSelecionado !== 'todos' && n.departamento?.nome !== deptSelecionado) return false
    if (vendedorSelecionado !== 'todos' && n.consultor?.id !== vendedorSelecionado) return false
    return true
  })

  const linhas = ETAPAS_FUNIL.map(e => {
    const itens = filtrados.filter(n => n.etapa === e.key)
    return { ...e, qtd: itens.length, valor: itens.reduce((s, n) => s + (n.valor_final || n.valor_cotacao || 0), 0) }
  })

  const primeiraQtd = linhas[0]?.qtd || 1
  const maiorQtd = Math.max(1, ...linhas.map(l => l.qtd))
  const conversaoGeral = primeiraQtd > 0 ? ((linhas[linhas.length - 1]?.qtd || 0) / primeiraQtd * 100) : 0

  return (
    <div style={{ padding: 24 }}>
      <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>Funil de conversão</p>
      <p style={{ fontSize: 13, color: '#777', margin: '0 0 16px' }}>
        Conversão geral (Prospecção → Ganha): <strong style={{ color: '#3b6d11' }}>{conversaoGeral.toFixed(1)}%</strong>
      </p>

      {(euMesmo?.perfil === 'administrador' || euMesmo?.perfil === 'gestor') && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <select value={deptSelecionado} onChange={e => setDeptSelecionado(e.target.value)} style={selectStyle}>
            <option value="todos">Todos os departamentos</option>
            {departamentos.map(d => <option key={d.id} value={d.nome}>{d.nome}</option>)}
          </select>
          <select value={vendedorSelecionado} onChange={e => setVendedorSelecionado(e.target.value)} style={selectStyle}>
            <option value="todos">Todos os vendedores</option>
            {consultores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        {linhas.map((l, i) => {
          const anterior = linhas[i - 1]
          const conversaoPasso = anterior && anterior.qtd > 0 ? (l.qtd / anterior.qtd * 100) : null
          const larguraPct = 20 + (l.qtd / maiorQtd) * 80

          return (
            <div key={l.key} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {conversaoPasso !== null && (
                <div style={{ fontSize: 12, color: '#666', fontWeight: 700, padding: '4px 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: conversaoPasso >= 50 ? '#3b6d11' : '#a32d2d' }}>▼ {conversaoPasso.toFixed(1)}%</span>
                </div>
              )}
              <div
                style={{
                  width: `${larguraPct}%`, maxWidth: 640,
                  background: CORES_FUNIL[i] || '#F77E01',
                  borderRadius: 8, padding: '14px 20px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  color: i === linhas.length - 1 ? '#fff' : '#4A1B0C',
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 14 }}>{l.label}</span>
                <span style={{ fontSize: 13 }}>{l.qtd} negócio{l.qtd !== 1 ? 's' : ''} · {formatarMoeda(l.valor)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const selectStyle = {
  padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, background: '#fff',
}
