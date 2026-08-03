import { useEffect, useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { BarChart3, Scale, Trophy, TrendingUp, Clock, Bell, Phone, MessageCircle, LogOut, PieChart as PieIcon } from 'lucide-react'
import { listarDepartamentos, listarNegocios, listarConsultores, voltarParaProspeccao, getMeuConsultor, sair, listarMetasMes } from './api'
import { ETAPAS, CORES_TEMPERATURA, CORES_GANHA, CORES_MARCA, formatarMoeda, classificarPci, classificarValorCliente } from './constants'
import NovoNegocio from './NovoNegocio.jsx'
import ProspeccaoCard from './ProspeccaoCard.jsx'
import CardDetalhado from './CardDetalhado.jsx'
import FilaLigar from './FilaLigar.jsx'
import AlertasCentral from './AlertasCentral.jsx'
import Dashboard from './Dashboard.jsx'
import Reativacao from './Reativacao.jsx'
import Sidebar from './Sidebar.jsx'
import Clientes from './Clientes.jsx'
import Atividades from './Atividades.jsx'
import Provisionado from './Provisionado.jsx'
import Mapa from './Mapa.jsx'
import Funil from './Funil.jsx'

const ETAPAS_ABERTAS = ['prospeccao', 'contato_realizado', 'orcamento_enviado', 'negociacao_decisao']

export default function Kanban() {
  const [departamentos, setDepartamentos] = useState([])
  const [consultores, setConsultores] = useState([])
  const [negocios, setNegocios] = useState([])
  const [euMesmo, setEuMesmo] = useState(null)
  const [deptSelecionado, setDeptSelecionado] = useState('todos')
  const [vendedorSelecionado, setVendedorSelecionado] = useState('todos')
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [negocioSelecionado, setNegocioSelecionado] = useState(null)
  const [visao, setVisao] = useState('visao_geral')
  const [busca, setBusca] = useState('')
  const [metas, setMetas] = useState([])
  const [periodoChave, setPeriodoChave] = useState('este_mes')
  const [periodoPersonalizado, setPeriodoPersonalizado] = useState({ de: '', ate: '' })

  async function carregar() {
    setCarregando(true)
    const agora = new Date()
    const [deps, negs, cons, eu, metasDoMes] = await Promise.all([
      listarDepartamentos(), listarNegocios(), listarConsultores(), getMeuConsultor(),
      listarMetasMes(agora.getFullYear(), agora.getMonth() + 1),
    ])
    setDepartamentos(deps)
    setNegocios(negs)
    setConsultores(cons)
    setEuMesmo(eu)
    setMetas(metasDoMes)
    setCarregando(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  const filtrados = useMemo(() => {
    let lista = negocios
    if (deptSelecionado !== 'todos') lista = lista.filter(n => n.departamento?.nome === deptSelecionado)
    if (vendedorSelecionado !== 'todos') lista = lista.filter(n => n.consultor?.id === vendedorSelecionado)
    if (busca) {
      const b = busca.toLowerCase()
      lista = lista.filter(n => n.cliente?.razao_social?.toLowerCase().includes(b) || n.produto_servico?.toLowerCase().includes(b))
    }
    return lista
  }, [negocios, deptSelecionado, vendedorSelecionado, busca])

  const periodo = useMemo(() => calcularPeriodo(periodoChave, periodoPersonalizado), [periodoChave, periodoPersonalizado])
  const metrics = useMemo(() => calcularMetricas(filtrados, periodo), [filtrados, periodo])

  if (carregando) return <p style={{ padding: 24 }}>Carregando...</p>

  const negocioAtual = negocioSelecionado ? (filtrados.find(n => n.id === negocioSelecionado) || negocios.find(n => n.id === negocioSelecionado)) : null

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar visao={visao} onMudarVisao={setVisao} />

      <div style={{
        flex: 1, minWidth: 0, minHeight: '100vh',
        background: `linear-gradient(rgba(246,245,242,0.93), rgba(246,245,242,0.96)), url('/banner-transpotech.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}>
        <div style={{
          background: '#fff', padding: '14px 24px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 16, borderBottom: '1px solid #eee', flexWrap: 'wrap',
        }}>
          <p style={{ fontWeight: 800, fontSize: 18, margin: 0, color: '#222' }}>CRM - PÓS VENDAS</p>
          <input
            placeholder="Buscar clientes, negócios..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{ flex: 1, maxWidth: 380, padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertasCentral negocios={negocios} onAbrir={id => setNegocioSelecionado(id)} />
            {euMesmo?.nome && (
              <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{euMesmo.nome}</span>
            )}
            <button
              onClick={() => sair()}
              title="Sair"
              style={{
                background: 'none', color: '#999', border: '1px solid #ddd',
                borderRadius: 8, padding: '9px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <LogOut size={16} />
            </button>
            <button
              onClick={() => setModalAberto(true)}
              style={{
                background: CORES_MARCA.laranja, color: '#fff', border: 'none',
                borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              + Nova oportunidade
            </button>
          </div>
        </div>

        {visao === 'visao_geral' && (
          <VisaoGeral
            negocios={negocios}
            filtrados={filtrados}
            metrics={metrics}
            euMesmo={euMesmo}
            departamentos={departamentos}
            consultores={consultores}
            deptSelecionado={deptSelecionado}
            setDeptSelecionado={setDeptSelecionado}
            vendedorSelecionado={vendedorSelecionado}
            setVendedorSelecionado={setVendedorSelecionado}
            onAbrir={id => setNegocioSelecionado(id)}
            onAtualizado={carregar}
            periodo={periodo}
            periodoChave={periodoChave}
            setPeriodoChave={setPeriodoChave}
            periodoPersonalizado={periodoPersonalizado}
            setPeriodoPersonalizado={setPeriodoPersonalizado}
          />
        )}

        {visao === 'pipeline' && (
          <PipelineBoard
            filtrados={filtrados}
            negocios={negocios}
            euMesmo={euMesmo}
            metas={metas}
            departamentos={departamentos}
            consultores={consultores}
            deptSelecionado={deptSelecionado}
            setDeptSelecionado={setDeptSelecionado}
            vendedorSelecionado={vendedorSelecionado}
            setVendedorSelecionado={setVendedorSelecionado}
            onAbrir={id => setNegocioSelecionado(id)}
            onAtualizado={carregar}
          />
        )}

        {visao === 'clientes' && <Clientes />}
        {visao === 'atividades' && <Atividades />}
        {visao === 'reativacao' && <Reativacao onAtualizado={carregar} />}
        {visao === 'funil' && <Funil />}
        {visao === 'mapa' && <Mapa />}
        {visao === 'provisionado' && <Provisionado />}
        {visao === 'relatorios' && <Dashboard />}
      </div>

      {modalAberto && (
        <NovoNegocio
          departamentos={departamentos}
          onFechar={() => setModalAberto(false)}
          onCriado={() => { setModalAberto(false); carregar() }}
        />
      )}

      {negocioAtual && (
        <CardDetalhado negocio={negocioAtual} onFechar={() => setNegocioSelecionado(null)} onAtualizado={carregar} />
      )}
    </div>
  )
}

const OPCOES_PERIODO = [
  { key: 'este_mes', label: 'Este mês' },
  { key: 'mes_passado', label: 'Mês passado' },
  { key: 'ultimos_3_meses', label: 'Últimos 3 meses' },
  { key: 'este_ano', label: 'Este ano' },
  { key: 'personalizado', label: 'Personalizado...' },
]

function calcularPeriodo(chave, personalizado) {
  const agora = new Date()
  if (chave === 'mes_passado') {
    const inicio = new Date(agora.getFullYear(), agora.getMonth() - 1, 1)
    const fim = new Date(agora.getFullYear(), agora.getMonth(), 0, 23, 59, 59)
    return { inicio, fim, rotulo: `Mês passado (${inicio.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })})` }
  }
  if (chave === 'ultimos_3_meses') {
    const inicio = new Date(agora.getFullYear(), agora.getMonth() - 2, 1)
    const fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59)
    return { inicio, fim, rotulo: 'Últimos 3 meses' }
  }
  if (chave === 'este_ano') {
    const inicio = new Date(agora.getFullYear(), 0, 1)
    const fim = new Date(agora.getFullYear(), 11, 31, 23, 59, 59)
    return { inicio, fim, rotulo: `Este ano (${agora.getFullYear()})` }
  }
  if (chave === 'personalizado' && personalizado?.de && personalizado?.ate) {
    const inicio = new Date(personalizado.de + 'T00:00:00')
    const fim = new Date(personalizado.ate + 'T23:59:59')
    return { inicio, fim, rotulo: `${inicio.toLocaleDateString('pt-BR')} – ${fim.toLocaleDateString('pt-BR')}` }
  }
  // este_mes (padrão)
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1)
  const fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59)
  return { inicio, fim, rotulo: `Este mês (01–${fim.getDate()} ${inicio.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })})` }
}

function calcularMetricas(negocios, periodo) {
  const agora = new Date()
  const inicio = periodo.inicio
  const fim = periodo.fim
  const duracaoMs = fim.getTime() - inicio.getTime()
  const inicioAnterior = new Date(inicio.getTime() - duracaoMs - 1)
  const fimAnterior = new Date(inicio.getTime() - 1)

  const abertos = negocios.filter(n => ETAPAS_ABERTAS.includes(n.etapa))
  const pipelineTotal = abertos.reduce((s, n) => s + (n.valor_cotacao || 0), 0)
  const pipelinePonderado = abertos.reduce((s, n) => {
    const prob = n.probabilidade_fechamento != null ? n.probabilidade_fechamento / 100 : 0.3
    return s + (n.valor_cotacao || 0) * prob
  }, 0)

  const dentro = (data, ini, f) => data && new Date(data) >= ini && new Date(data) <= f

  const ganhosMes = negocios.filter(n => n.etapa === 'ganha' && dentro(n.atualizado_em, inicio, fim))
  const ganhosMesAnterior = negocios.filter(n => n.etapa === 'ganha' && dentro(n.atualizado_em, inicioAnterior, fimAnterior))
  const valorGanhoMes = ganhosMes.reduce((s, n) => s + (n.valor_final || n.valor_cotacao || 0), 0)
  const valorGanhoMesAnterior = ganhosMesAnterior.reduce((s, n) => s + (n.valor_final || n.valor_cotacao || 0), 0)

  const perdidosMes = negocios.filter(n => n.etapa === 'perdida' && dentro(n.data_perda, inicio, fim))
  const perdidosMesAnterior = negocios.filter(n => n.etapa === 'perdida' && dentro(n.data_perda, inicioAnterior, fimAnterior))
  const conversaoMes = (ganhosMes.length + perdidosMes.length) > 0 ? ganhosMes.length / (ganhosMes.length + perdidosMes.length) * 100 : 0
  const conversaoMesAnterior = (ganhosMesAnterior.length + perdidosMesAnterior.length) > 0 ? ganhosMesAnterior.length / (ganhosMesAnterior.length + perdidosMesAnterior.length) * 100 : 0

  const followupsAtrasados = abertos.filter(n => n.proxima_acao_data && new Date(n.proxima_acao_data) < agora).length

  const ganhosTotal = negocios.filter(n => n.etapa === 'ganha')
  const ticketMedio = ganhosTotal.length > 0
    ? ganhosTotal.reduce((s, n) => s + (n.valor_final || n.valor_cotacao || 0), 0) / ganhosTotal.length
    : 0

  return {
    pipelineTotal, pipelinePonderado, valorGanhoMes, ticketMedio,
    variacaoGanho: valorGanhoMesAnterior > 0 ? ((valorGanhoMes - valorGanhoMesAnterior) / valorGanhoMesAnterior * 100) : null,
    conversaoMes,
    variacaoConversao: perdidosMesAnterior.length + ganhosMesAnterior.length > 0 ? (conversaoMes - conversaoMesAnterior) : null,
    followupsAtrasados,
  }
}

const CORES_ROSCA = { quente: '#C1440E', morno: '#C68A1E', frio: '#2F6FB0' }
const LABEL_ROSCA = { quente: 'Quente', morno: 'Morno', frio: 'Frio' }

function GraficoTemperatura({ filtrados }) {
  const [tempAberta, setTempAberta] = useState(null)
  const emNegociacao = filtrados.filter(n => n.etapa === 'negociacao_decisao')
  const dados = ['quente', 'morno', 'frio']
    .map(t => ({
      nome: LABEL_ROSCA[t], chave: t,
      valor: emNegociacao.filter(n => n.temperatura === t).reduce((s, n) => s + (n.valor_cotacao || 0), 0),
      qtd: emNegociacao.filter(n => n.temperatura === t).length,
    }))
    .filter(d => d.qtd > 0)
  const totalNegocios = emNegociacao.length

  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 16, flex: '1 0 280px' }}>
      <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 8px', color: '#333' }}>Temperatura das negociações</p>
      {dados.length === 0 ? (
        <p style={{ fontSize: 12, color: '#999' }}>Nenhum negócio em negociação agora.</p>
      ) : (
        <>
          <div style={{ position: 'relative' }}>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={dados} dataKey="valor" nameKey="nome" innerRadius={45} outerRadius={70} paddingAngle={2}
                  onClick={d => setTempAberta(d.chave)}
                  style={{ cursor: 'pointer' }}
                >
                  {dados.map(d => <Cell key={d.chave} fill={CORES_ROSCA[d.chave]} />)}
                </Pie>
                <Tooltip formatter={(valor, nome, item) => [`${formatarMoeda(valor)} · ${item.payload.qtd} negócio(s)`, nome]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 30,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
            }}>
              <p style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#222' }}>{totalNegocios}</p>
              <p style={{ fontSize: 11, color: '#999', margin: 0 }}>negócios</p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, fontSize: 11, color: '#666', marginTop: 4 }}>
            {dados.map(d => (
              <span key={d.chave} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: CORES_ROSCA[d.chave], display: 'inline-block' }} />
                {d.nome}
              </span>
            ))}
          </div>
        </>
      )}

      {tempAberta && (
        <ModalListaTemperatura
          temperatura={tempAberta}
          negocios={emNegociacao.filter(n => n.temperatura === tempAberta)}
          onFechar={() => setTempAberta(null)}
        />
      )}
    </div>
  )
}

function ModalListaTemperatura({ temperatura, negocios, onFechar }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16,
    }}>
      <div style={{ background: '#fff', borderRadius: 12, width: 560, maxWidth: '100%', maxHeight: '85vh', overflowY: 'auto', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p style={{ fontWeight: 700, fontSize: 15, margin: 0, color: CORES_ROSCA[temperatura] }}>
            Negócios — temperatura {LABEL_ROSCA[temperatura]}
          </p>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#999' }}>✕</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#777', borderBottom: '1px solid #eee' }}>
              <th style={{ padding: '6px 4px' }}>Cliente</th>
              <th style={{ padding: '6px 4px' }}>Vendedor</th>
              <th style={{ padding: '6px 4px' }}>Dias aberto</th>
              <th style={{ padding: '6px 4px' }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {negocios.map(n => {
              const dias = n.atualizado_em ? Math.floor((Date.now() - new Date(n.atualizado_em)) / 86400000) : 0
              return (
                <tr key={n.id} style={{ borderBottom: '1px solid #f2f2f2' }}>
                  <td style={{ padding: '6px 4px', fontWeight: 600 }}>{n.cliente?.razao_social}</td>
                  <td style={{ padding: '6px 4px' }}>{n.consultor?.nome}</td>
                  <td style={{ padding: '6px 4px' }}>{dias}</td>
                  <td style={{ padding: '6px 4px' }}>{formatarMoeda(n.valor_cotacao)}</td>
                </tr>
              )
            })}
            {negocios.length === 0 && (
              <tr><td colSpan={4} style={{ padding: 8, color: '#999' }}>Nenhum negócio.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PipelinePorEtapa({ filtrados }) {
  const linhas = ETAPAS.map(e => {
    const itens = filtrados.filter(n => n.etapa === e.key)
    const valor = itens.reduce((s, n) => s + (n.valor_final || n.valor_cotacao || 0), 0)
    return { ...e, qtd: itens.length, valor }
  })
  const maiorQtd = Math.max(1, ...linhas.map(l => l.qtd))
  const totalNegocios = linhas.reduce((s, l) => s + l.qtd, 0)

  function corBarra(chave) {
    if (chave === 'ganha') return '#3b6d11'
    if (chave === 'perdida') return '#a32d2d'
    return '#7CA6D9'
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 16, flex: '1 0 280px' }}>
      <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 10px', color: '#333' }}>Pipeline por etapa</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {linhas.map(l => (
          <div key={l.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#666', marginBottom: 2 }}>
              <span>{l.label}</span>
              <span>{l.qtd} · {formatarMoeda(l.valor)}</span>
            </div>
            <div style={{ background: '#f2f2f2', borderRadius: 4, height: 8 }}>
              <div style={{
                width: `${(l.qtd / maiorQtd) * 100}%`, background: corBarra(l.key),
                height: 8, borderRadius: 4, minWidth: l.qtd > 0 ? 4 : 0,
              }} />
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11, color: '#999', marginTop: 10, marginBottom: 0 }}>
        Total pipeline: {totalNegocios} negócio{totalNegocios !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

function TopVendedores({ filtrados }) {
  const mapa = {}
  filtrados.forEach(n => {
    const nome = n.consultor?.nome || 'Sem consultor'
    if (!mapa[nome]) mapa[nome] = { ganho: 0, ganhos: 0, perdidos: 0 }
    if (n.etapa === 'ganha') { mapa[nome].ganhos++; mapa[nome].ganho += (n.valor_final || n.valor_cotacao || 0) }
    if (n.etapa === 'perdida') mapa[nome].perdidos++
  })
  const lista = Object.entries(mapa)
    .map(([nome, v]) => ({ nome, ...v, conversao: (v.ganhos + v.perdidos) > 0 ? v.ganhos / (v.ganhos + v.perdidos) * 100 : 0 }))
    .sort((a, b) => b.ganho - a.ganho)
    .slice(0, 5)

  const maiorGanho = Math.max(1, ...lista.map(l => l.ganho))

  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 16, flex: '1 0 280px' }}>
      <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 10px', color: '#333' }}>Top vendedores</p>
      {lista.length === 0 && <p style={{ fontSize: 12, color: '#999' }}>Sem dados ainda.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {lista.map((l, i) => (
          <div key={l.nome}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
              <span style={{ fontWeight: 600 }}>{i + 1} {l.nome}</span>
              <span>
                <strong>{formatarMoeda(l.ganho)}</strong>
                <span style={{ color: '#999' }}> · {l.conversao.toFixed(1)}%</span>
              </span>
            </div>
            <div style={{ background: '#f2f2f2', borderRadius: 4, height: 6 }}>
              <div style={{ width: `${(l.ganho / maiorGanho) * 100}%`, background: '#F77E01', height: 6, borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function VisaoGeral(props) {
  const { filtrados, metrics, onAbrir, onAtualizado, periodo, periodoChave, setPeriodoChave, periodoPersonalizado, setPeriodoPersonalizado } = props
  const filtradosPeriodo = filtrados.filter(n => {
    if (!n.criado_em) return false
    const d = new Date(n.criado_em)
    return d >= periodo.inicio && d <= periodo.fim
  })
  const followupsHoje = filtrados.filter(n => {
    if (!n.proxima_acao_data) return false
    const d = new Date(n.proxima_acao_data)
    const hoje = new Date()
    return d.toDateString() === hoje.toDateString()
  }).length
  const negociosParados = filtrados.filter(n => {
    const diasParado = n.atualizado_em ? Math.floor((Date.now() - new Date(n.atualizado_em)) / 86400000) : 0
    return ETAPAS_ABERTAS.includes(n.etapa) && diasParado > 5
  })
  const valorParados = negociosParados.reduce((s, n) => s + (n.valor_cotacao || 0), 0)

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <p style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#333' }}>Visão geral comercial</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={periodoChave} onChange={e => setPeriodoChave(e.target.value)} style={selectStyle}>
            {OPCOES_PERIODO.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
          {periodoChave === 'personalizado' && (
            <>
              <input
                type="date" value={periodoPersonalizado.de}
                onChange={e => setPeriodoPersonalizado({ ...periodoPersonalizado, de: e.target.value })}
                style={selectStyle}
              />
              <span style={{ fontSize: 12, color: '#999' }}>até</span>
              <input
                type="date" value={periodoPersonalizado.ate}
                onChange={e => setPeriodoPersonalizado({ ...periodoPersonalizado, ate: e.target.value })}
                style={selectStyle}
              />
            </>
          )}

        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12, marginBottom: 20 }}>
        <KpiCard icone={Trophy} label="Ganho no mês" valor={formatarMoeda(metrics.valorGanhoMes)} variacao={metrics.variacaoGanho} corIcone="#3b6d11" />
        <KpiCard icone={TrendingUp} label="Conversão" valor={`${metrics.conversaoMes.toFixed(1)}%`} variacao={metrics.variacaoConversao} sufixoVariacao=" p.p." />
        <KpiCard icone={Scale} label="Ticket médio (TKM)" valor={formatarMoeda(metrics.ticketMedio)} />
        <KpiCard icone={Clock} label="Follow-ups atrasados" valor={metrics.followupsAtrasados} corIcone="#a32d2d" />
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <PipelinePorEtapa filtrados={filtradosPeriodo} />
        <GraficoTemperatura filtrados={filtradosPeriodo} />
        <TopVendedores filtrados={filtradosPeriodo} />
      </div>
      <p style={{ fontSize: 11, color: '#999', margin: '-14px 0 20px' }}>
        Funil, temperatura e ranking acima consideram a Data 1º contato dentro do período selecionado ({filtradosPeriodo.length} negócio{filtradosPeriodo.length !== 1 ? 's' : ''}). O quadro abaixo mostra tudo que está aberto agora, sem filtro de período.
      </p>

      <FiltrosLinha {...props} />

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <QuadroKanban filtrados={filtrados} onAbrir={onAbrir} onAtualizado={onAtualizado} colunasVisiveis={7} />
        </div>
        <div style={{ width: 300, flexShrink: 0 }}>
          <FilaLigar negocios={filtrados} onAbrir={onAbrir} onAtualizado={onAtualizado} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12, marginTop: 20 }}>
        <ResumoCard titulo="Follow-ups de hoje" valor={followupsHoje} />
        <ResumoCard titulo="Negócios parados" valor={negociosParados.length} sub={formatarMoeda(valorParados)} />
        <ResumoCard titulo="Clientes Ouro/Prata/Bronze" valor={filtrados.filter(n => classificarValorCliente(n.valor_cotacao)).length} sub="Ver medalha nos cards" />
      </div>
    </div>
  )
}

function PipelineBoard(props) {
  const [buscaOrcamento, setBuscaOrcamento] = useState('')

  const filtradosPorOrcamento = buscaOrcamento
    ? props.filtrados.filter(n => (n.numero_orcamento || '').toLowerCase().includes(buscaOrcamento.toLowerCase()))
    : props.filtrados

  return (
    <div style={{ padding: 24 }}>
      <PainelMeta negocios={props.negocios} euMesmo={props.euMesmo} metas={props.metas} />
      <FiltrosLinha {...props} />
      <div style={{ marginBottom: 12 }}>
        <input
          placeholder="Buscar por número do orçamento..."
          value={buscaOrcamento}
          onChange={e => setBuscaOrcamento(e.target.value)}
          style={{ ...selectStyle, width: 260 }}
        />
        {buscaOrcamento && (
          <span style={{ fontSize: 12, color: '#777', marginLeft: 8 }}>
            {filtradosPorOrcamento.length} encontrado{filtradosPorOrcamento.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <QuadroKanban filtrados={filtradosPorOrcamento} onAbrir={props.onAbrir} onAtualizado={props.onAtualizado} colunasVisiveis={7} />
    </div>
  )
}

function diasUteisRestantes() {
  const hoje = new Date()
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
  let dias = 0
  const cursor = new Date(hoje)
  while (cursor <= fimMes) {
    const diaSemana = cursor.getDay()
    if (diaSemana !== 0 && diaSemana !== 6) dias++
    cursor.setDate(cursor.getDate() + 1)
  }
  return dias
}

function PainelMeta({ negocios, euMesmo, metas }) {
  if (!euMesmo) return null

  const minhaMeta = metas.find(m => m.consultor_id === euMesmo.id)
  const meusNegocios = negocios.filter(n => n.consultor?.id === euMesmo.id)
  const meusGanhos = meusNegocios.filter(n => n.etapa === 'ganha')
  const meusPerdidos = meusNegocios.filter(n => n.etapa === 'perdida')
  const tkm = meusGanhos.length > 0 ? meusGanhos.reduce((s, n) => s + (n.valor_final || n.valor_cotacao || 0), 0) / meusGanhos.length : 0
  const conversao = (meusGanhos.length + meusPerdidos.length) > 0 ? meusGanhos.length / (meusGanhos.length + meusPerdidos.length) * 100 : 0

  if (!minhaMeta || !minhaMeta.valor_meta) {
    return (
      <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: '#999', margin: 0 }}>
          Nenhuma meta cadastrada pra você esse mês ainda — peça pro administrador cadastrar em Relatórios.
        </p>
      </div>
    )
  }

  const vendasNecessarias = tkm > 0 ? minhaMeta.valor_meta / tkm : 0
  const dias = diasUteisRestantes()
  const vendasPorDia = dias > 0 ? vendasNecessarias / dias : 0

  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 16, marginBottom: 16 }}>
      <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 10px', color: '#333' }}>Minha meta do mês</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 10 }}>
        <MetaCard label="Meta" valor={formatarMoeda(minhaMeta.valor_meta)} />
        <MetaCard label="Ticket médio" valor={formatarMoeda(tkm)} />
        <MetaCard label="Conversão" valor={`${conversao.toFixed(0)}%`} />
        <MetaCard label="Vendas necessárias" valor={vendasNecessarias.toFixed(1)} />
        <MetaCard label="Vendas por dia útil" valor={vendasPorDia.toFixed(2)} cor="#F77E01" />
      </div>
      <p style={{ fontSize: 11, color: '#999', margin: '8px 0 0' }}>
        Considerando {dias} dia(s) útil(eis) restante(s) no mês (aproximado, exclui só sábado/domingo).
      </p>
    </div>
  )
}

function MetaCard({ label, valor, cor }) {
  return (
    <div style={{ background: '#f7f5f0', borderRadius: 8, padding: 10, textAlign: 'center' }}>
      <p style={{ fontSize: 11, color: '#777', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 16, fontWeight: 700, margin: 0, color: cor || '#222' }}>{valor}</p>
    </div>
  )
}

function FiltrosLinha({ departamentos, consultores, deptSelecionado, setDeptSelecionado, vendedorSelecionado, setVendedorSelecionado, euMesmo }) {
  const ehAdmin = euMesmo?.perfil === 'administrador' || euMesmo?.perfil === 'gestor'
  if (!ehAdmin) return null

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
      <select value={deptSelecionado} onChange={e => setDeptSelecionado(e.target.value)} style={selectStyle}>
        <option value="todos">Todos os departamentos</option>
        {departamentos.map(d => <option key={d.id} value={d.nome}>{d.nome}</option>)}
      </select>
      <select value={vendedorSelecionado} onChange={e => setVendedorSelecionado(e.target.value)} style={selectStyle}>
        <option value="todos">Todos os vendedores</option>
        {consultores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
      </select>
    </div>
  )
}

function QuadroKanban({ filtrados, onAbrir, onAtualizado, colunasVisiveis }) {
  const etapas = colunasVisiveis === 5
    ? ETAPAS.filter(e => e.key !== 'ganha' && e.key !== 'perdida')
    : ETAPAS

  return (
    <>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
        {etapas.map(col => {
          const itens = filtrados.filter(n => n.etapa === col.key)
          const totalCol = itens.reduce((s, n) => s + (n.valor_cotacao || 0), 0)
          return (
            <div key={col.key} style={{ minWidth: 200, flex: '1 0 200px' }}>
              <div style={{ padding: '8px 10px', background: '#fff', border: '1px solid #eee', borderRadius: 8, marginBottom: 8 }}>
                <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{col.label}</p>
                <p style={{ fontSize: 12, color: '#666', margin: '2px 0 0' }}>{itens.length} negócios · {formatarMoeda(totalCol)}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {itens.map(n => {
                  if (col.key === 'prospeccao') {
                    return <ProspeccaoCard key={n.id} negocio={n} onAtualizado={onAtualizado} onAbrirDetalhe={() => onAbrir(n.id)} />
                  }
                  return <CardNegocio key={n.id} negocio={n} onClick={() => onAbrir(n.id)} />
                })}
              </div>
            </div>
          )
        })}
      </div>
      <ListaRetorno negocios={filtrados} onAtualizado={onAtualizado} />
      <ConversaoEtapas filtrados={filtrados} />
    </>
  )
}

const ETAPAS_FUNIL_CONVERSAO = [
  { key: 'prospeccao', label: 'Prospecção' },
  { key: 'contato_realizado', label: 'Contato realizado' },
  { key: 'orcamento_enviado', label: 'Orçamento enviado' },
  { key: 'negociacao_decisao', label: 'Negociação/decisão' },
  { key: 'ganha', label: 'Ganha' },
]

function ConversaoEtapas({ filtrados }) {
  const contagens = ETAPAS_FUNIL_CONVERSAO.map(e => ({
    ...e,
    total: filtrados.filter(n => n.etapa === e.key).length,
  }))

  return (
    <div style={{ marginTop: 24, background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 16 }}>
      <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 12px', color: '#333' }}>Conversão entre etapas</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto' }}>
        {contagens.map((c, i) => {
          const anterior = contagens[i - 1]
          const conversao = anterior && anterior.total > 0 ? (c.total / anterior.total * 100) : null
          return (
            <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              {i > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 6px' }}>
                  <span style={{ fontSize: 11, color: '#3b6d11', fontWeight: 700 }}>
                    {conversao !== null ? `${conversao.toFixed(1)}%` : '-'}
                  </span>
                  <span style={{ fontSize: 14, color: '#bbb' }}>→</span>
                </div>
              )}
              <div style={{ border: '1px solid #eee', borderRadius: 8, padding: '8px 14px', textAlign: 'center', minWidth: 110 }}>
                <p style={{ fontSize: 11, color: '#777', margin: '0 0 4px', whiteSpace: 'nowrap' }}>{c.label}</p>
                <p style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{c.total}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CardNegocio({ negocio, onClick }) {
  const temp = negocio.etapa === 'ganha'
    ? CORES_GANHA[negocio.status_faturamento === 'faturado' ? 'faturado' : 'previsto']
    : CORES_TEMPERATURA[negocio.temperatura]
  const notaPci = negocio.avaliacoes_pci?.[0]?.nota_total
  const pci = notaPci !== undefined ? classificarPci(notaPci) : null
  const atrasado = negocio.proxima_acao_data && new Date(negocio.proxima_acao_data) < new Date()
  const corBorda = negocio.urgencia === 'alta' ? '#F77E01' : (pci ? pci.cor : '#ddd')
  const classificacao = classificarValorCliente(negocio.valor_cotacao || negocio.valor_final)
  const diasAberto = negocio.criado_em ? Math.floor((Date.now() - new Date(negocio.criado_em)) / 86400000) : 0

  return (
    <div
      onClick={onClick}
      style={{
        background: temp ? temp.grad : '#fff',
        border: temp ? 'none' : '1px solid #eee',
        borderLeft: `4px solid ${atrasado ? '#c0392b' : corBorda}`,
        borderRadius: 10,
        padding: '10px 12px',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: temp ? temp.titulo : '#222' }}>
          {classificacao ? `${classificacao.medalha} ` : ''}{negocio.cliente?.razao_social}
        </p>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
          {pci && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: pci.cor, borderRadius: 4, padding: '1px 5px' }}>
              PCI {pci.sigla}
            </span>
          )}
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
            background: diasAberto === 0 ? '#eaf3de' : (diasAberto > 15 ? '#fcebeb' : '#f1efe8'),
            color: diasAberto === 0 ? '#3b6d11' : (diasAberto > 15 ? '#a32d2d' : '#666'),
            whiteSpace: 'nowrap',
          }}>
            {diasAberto === 0 ? 'Novo' : `${diasAberto}d`}
          </span>
        </div>
      </div>
      {negocio.cliente?.cidade && (
        <p style={{ fontSize: 10, margin: '2px 0 0', color: temp ? temp.sub : '#999', textTransform: 'uppercase', letterSpacing: 0.3 }}>
          {negocio.cliente.cidade}
        </p>
      )}
      {negocio.produto_servico && (
        <p style={{ fontSize: 11, margin: '3px 0 0', color: temp ? temp.sub : '#999' }}>{negocio.produto_servico}</p>
      )}
      {negocio.numero_orcamento && (
        <p style={{ fontSize: 11, margin: '3px 0 0', color: temp ? temp.sub : '#999' }}>Orçamento: {negocio.numero_orcamento}</p>
      )}
      <p style={{ fontSize: 13, margin: '4px 0 0', fontWeight: 600, color: temp ? temp.titulo : '#222' }}>
        {formatarMoeda(negocio.valor_cotacao)}
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <p style={{ fontSize: 11, margin: 0, color: temp ? temp.sub : '#777' }}>{negocio.consultor?.nome}</p>
        {negocio.proxima_acao_data && (
          <p style={{ fontSize: 11, margin: 0, color: atrasado ? '#c0392b' : (temp ? temp.sub : '#777'), fontWeight: atrasado ? 700 : 400 }}>
            {atrasado ? '⚠ ' : '📅 '}{new Date(negocio.proxima_acao_data).toLocaleDateString('pt-BR')}
          </p>
        )}
      </div>
    </div>
  )
}

function ListaRetorno({ negocios, onAtualizado }) {
  const itens = negocios.filter(n => n.etapa === 'retorno_futuro').sort((a, b) => (a.data_retorno || '').localeCompare(b.data_retorno || ''))
  if (itens.length === 0) return null
  return (
    <div style={{ marginTop: 24 }}>
      <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>Lista de retorno ({itens.length})</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {itens.map(n => (
          <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '8px 12px' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{n.cliente?.razao_social}</p>
              <p style={{ fontSize: 11, color: '#777', margin: '2px 0 0' }}>
                Voltar em {n.data_retorno ? new Date(n.data_retorno + 'T00:00:00').toLocaleDateString('pt-BR') : '-'} · {n.consultor?.nome}
              </p>
            </div>
            <button
              onClick={async () => { await voltarParaProspeccao(n.id); onAtualizado() }}
              style={{ background: '#F77E01', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
            >
              Voltar pra prospecção
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function KpiCard({ icone: Icone, label, valor, variacao, corIcone, sufixoVariacao = '%' }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p style={{ fontSize: 12, color: '#777', margin: '0 0 6px' }}>{label}</p>
        <div style={{ background: '#FFF3E8', borderRadius: 6, padding: 6 }}>
          <Icone size={16} color={corIcone || '#F77E01'} />
        </div>
      </div>
      <p style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{valor}</p>
      {variacao !== null && variacao !== undefined && (
        <p style={{ fontSize: 11, margin: '4px 0 0', color: variacao >= 0 ? '#3b6d11' : '#a32d2d' }}>
          {variacao >= 0 ? '↑' : '↓'} {Math.abs(variacao).toFixed(1)}{sufixoVariacao} vs mês anterior
        </p>
      )}
    </div>
  )
}

function ResumoCard({ titulo, valor, sub }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 16 }}>
      <p style={{ fontSize: 12, color: '#777', margin: '0 0 6px' }}>{titulo}</p>
      <p style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{valor}</p>
      {sub && <p style={{ fontSize: 11, color: '#999', margin: '4px 0 0' }}>{sub}</p>}
    </div>
  )
}

const selectStyle = {
  padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, background: '#fff',
}
