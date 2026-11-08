import { useEffect, useState } from 'react'
import { TEMA } from './theme'
import { listarNegocios, listarDepartamentos, listarConsultores, getMeuConsultor } from './api'
import { ETAPAS, formatarMoeda } from './constants'
import PainelConversao from './PainelConversao.jsx'

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
  const hoje = new Date()
  const ha90 = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 90)
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const [dataInicio, setDataInicio] = useState(iso(ha90))
  const [dataFim, setDataFim] = useState(iso(hoje))

  useEffect(() => {
    Promise.all([listarNegocios(), listarDepartamentos(), listarConsultores(), getMeuConsultor()]).then(([n, d, c, eu]) => {
      setNegocios(n)
      setDepartamentos(d)
      setConsultores(c)
      setEuMesmo(eu)
      setCarregando(false)
    })
  }, [])

  if (carregando) return <p style={{ padding: 24, color: TEMA.textoPrincipal }}>Carregando...</p>

  const filtrados = negocios.filter(n => {
    if (deptSelecionado !== 'todos' && n.departamento?.nome !== deptSelecionado) return false
    if (vendedorSelecionado !== 'todos' && n.consultor?.id !== vendedorSelecionado) return false
    return true
  })

  const linhas = ETAPAS_FUNIL.map(e => {
    const itens = filtrados.filter(n => n.etapa === e.key)
    return { ...e, qtd: itens.length, valor: itens.reduce((s, n) => s + (n.valor_final || n.valor_cotacao || 0), 0) }
  })

  const maiorQtd = Math.max(1, ...linhas.map(l => l.qtd))
  const inicioPeriodo = new Date(dataInicio + 'T00:00:00')
  const fimPeriodo = new Date(dataFim + 'T23:59:59')

  return (
    <div style={{ padding: 24, color: TEMA.textoPrincipal }}>
      <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>Funil de conversão</p>
      <p style={{ fontSize: 13, color: '#777', margin: '0 0 16px' }}>
        Volume atual de cada etapa (carteira) e, abaixo, a conversão calculada pelo histórico dos mesmos negócios.
      </p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: '#999' }}>Período da conversão:</span>
        <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={selectStyle} />
        <span style={{ fontSize: 12, color: '#999' }}>até</span>
        <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={selectStyle} />
      </div>

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
          const larguraPct = 20 + (l.qtd / maiorQtd) * 80

          return (
            <div key={l.key} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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

      <PainelConversao
        negocios={filtrados}
        inicio={inicioPeriodo}
        fim={fimPeriodo}
        rotuloPeriodo={`${inicioPeriodo.toLocaleDateString('pt-BR')} – ${fimPeriodo.toLocaleDateString('pt-BR')}`}
      />
    </div>
  )
}

const selectStyle = {
  padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, background: '#fff', color: '#222',
}
