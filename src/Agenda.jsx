import { useEffect, useState } from 'react'
import { TEMA } from './theme'
import { listarNegocios, listarDepartamentos, listarConsultores, getMeuConsultor } from './api'
import { CORES_AGENDA, PROXIMAS_ACOES, formatarMoeda } from './constants'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function Agenda({ onAbrir }) {
  const [negocios, setNegocios] = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [consultores, setConsultores] = useState([])
  const [euMesmo, setEuMesmo] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [mesAtual, setMesAtual] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [deptSelecionado, setDeptSelecionado] = useState('todos')
  const [vendedorSelecionado, setVendedorSelecionado] = useState('todos')

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

  const ehAdmin = euMesmo?.perfil === 'administrador' || euMesmo?.perfil === 'gestor'

  const agendados = negocios.filter(n => {
    if (!n.proxima_acao_data) return false
    if (deptSelecionado !== 'todos' && n.departamento?.nome !== deptSelecionado) return false
    if (vendedorSelecionado !== 'todos' && n.consultor?.id !== vendedorSelecionado) return false
    return true
  })

  const ano = mesAtual.getFullYear()
  const mes = mesAtual.getMonth()
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay()
  const totalDias = new Date(ano, mes + 1, 0).getDate()
  const celulas = []
  for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null)
  for (let dia = 1; dia <= totalDias; dia++) celulas.push(dia)

  function eventosDoDia(dia) {
    if (!dia) return []
    return agendados.filter(n => {
      const d = new Date(n.proxima_acao_data)
      return d.getFullYear() === ano && d.getMonth() === mes && d.getDate() === dia
    })
  }

  const hoje = new Date()

  return (
    <div style={{ padding: 24, color: TEMA.textoPrincipal }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Agenda</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setMesAtual(new Date(ano, mes - 1, 1))} style={botaoNav}>◀</button>
          <span style={{ fontSize: 13, fontWeight: 600, minWidth: 130, textAlign: 'center' }}>
            {mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => setMesAtual(new Date(ano, mes + 1, 1))} style={botaoNav}>▶</button>
        </div>
      </div>

      {ehAdmin && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
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

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        {Object.entries(CORES_AGENDA).map(([chave, info]) => (
          <span key={chave} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#666' }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: info.cor, display: 'inline-block' }} />
            {info.label}
          </span>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 6 }}>
        {DIAS_SEMANA.map(d => (
          <p key={d} style={{ fontSize: 11, fontWeight: 700, color: '#999', textAlign: 'center', margin: 0 }}>{d}</p>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {celulas.map((dia, i) => {
          const eventos = eventosDoDia(dia)
          const ehHoje = dia && ano === hoje.getFullYear() && mes === hoje.getMonth() && dia === hoje.getDate()
          return (
            <div key={i} style={{
              minHeight: 90, background: dia ? '#fff' : 'transparent', border: dia ? '1px solid #eee' : 'none',
              borderRadius: 8, padding: 6, outline: ehHoje ? '2px solid #F77E01' : 'none',
            }}>
              {dia && (
                <>
                  <p style={{ fontSize: 11, fontWeight: 700, color: ehHoje ? '#F77E01' : '#999', margin: '0 0 4px' }}>{dia}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {eventos.slice(0, 4).map(n => {
                      const info = CORES_AGENDA[n.proxima_acao] || CORES_AGENDA.outro
                      return (
                        <button
                          key={n.id}
                          onClick={() => onAbrir(n.id)}
                          title={`${n.cliente?.razao_social} — ${n.consultor?.nome}`}
                          style={{
                            display: 'block', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                            background: info.cor, color: '#fff', borderRadius: 4, padding: '2px 4px',
                            fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}
                        >
                          {n.consultor?.nome || 'Sem consultor'}
                        </button>
                      )
                    })}
                    {eventos.length > 4 && (
                      <span style={{ fontSize: 10, color: '#999' }}>+{eventos.length - 4} mais</span>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const botaoNav = {
  background: '#fff', border: '1px solid #ddd', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: 12, color: '#222',
}

const selectStyle = {
  padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, background: '#fff', color: '#222',
}
