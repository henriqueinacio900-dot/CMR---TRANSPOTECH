import { useEffect, useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts'
import {
  BarChart3, Scale, Trophy, TrendingUp, Clock, Bell, Phone, MessageCircle, LogOut, PieChart as PieIcon,
  Search, Calendar, ChevronDown, CircleDollarSign, Disc, ShoppingCart, Wrench,
} from 'lucide-react'
import { listarDepartamentos, listarNegocios, listarConsultores, voltarParaProspeccao, getMeuConsultor, sair, listarMetasMes } from './api'
import { ETAPAS, CORES_TEMPERATURA, CORES_GANHA, CORES_PERDIDA, CORES_FATURAMENTO_PROXIMO, CORES_MARCA, formatarMoeda, classificarPci, classificarValorCliente } from './constants'
import { TEMA, cardBase, cardElevadoBase } from './theme'
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
import Agenda from './Agenda.jsx'

const ETAPAS_ABERTAS = ['prospeccao', 'contato_realizado', 'orcamento_enviado', 'negociacao_decisao']

const LABEL_SECAO = {
  visao_geral: 'Visão geral comercial', pipeline: 'Pipeline', funil: 'Funil de conversão', agenda: 'Agenda',
  clientes: 'Clientes', mapa: 'Mapa de clientes', atividades: 'Atividades', reativacao: 'Reativação',
  provisionado: 'Provisionado', relatorios: 'Relatórios',
}

const ESTILOS_GLOBAIS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
  .tp-card { transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease; }
  .tp-card:hover { transform: translateY(-3px); border-color: rgba(255,137,0,0.45); box-shadow: 0 14px 34px rgba(0,0,0,0.45); }
  .tp-item-menu:hover { background: rgba(255,121,0,0.10) !important; color: #F8FAFC !important; }
  .tp-btn-primary { transition: box-shadow 200ms ease, transform 200ms ease; }
  .tp-btn-primary:hover { box-shadow: 0 0 18px rgba(255,137,0,0.55); transform: translateY(-1px); }
  .tp-input:focus { outline: none; border-color: rgba(255,137,0,0.5) !important; }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.25); border-radius: 8px; }
  .tp-grid-4 { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 14px; }
  .tp-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 14px; }
  @media (max-width: 980px) {
    .tp-grid-4 { grid-template-columns: repeat(2, minmax(0,1fr)); }
    .tp-grid-3 { grid-template-columns: repeat(2, minmax(0,1fr)); }
  }
  @media (max-width: 600px) {
    .tp-grid-4 { grid-template-columns: 1fr; }
    .tp-grid-3 { grid-template-columns: 1fr; }
  }
`

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
  const [menuUsuarioAberto, setMenuUsuarioAberto] = useState(false)

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

  if (carregando) {
    return (
      <div style={{ minHeight: '100vh', background: TEMA.fundoPrincipal, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: TEMA.textoSecundario, fontSize: 13 }}>Carregando...</p>
      </div>
    )
  }

  const negocioAtual = negocioSelecionado ? (filtrados.find(n => n.id === negocioSelecionado) || negocios.find(n => n.id === negocioSelecionado)) : null
  const iniciais = (euMesmo?.nome || '').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()

  return (
    <div style={{ display: 'flex' }}>
      <style>{ESTILOS_GLOBAIS}</style>
      <Sidebar visao={visao} onMudarVisao={setVisao} />

      <div style={{
        flex: 1, minWidth: 0, minHeight: '100vh',
        background: `radial-gradient(circle at 15% 0%, #0d1c2e 0%, ${TEMA.fundoPrincipal} 45%), ${TEMA.fundoPrincipal}`,
      }}>
        <div style={{
          background: `${TEMA.fundoSecundario}cc`, backdropFilter: 'blur(6px)',
          padding: '14px 24px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 16, borderBottom: `1px solid ${TEMA.linhaInterna}`, flexWrap: 'wrap',
          position: 'relative', zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <p style={{ fontWeight: 800, fontSize: 20, margin: 0, color: TEMA.textoPrincipal, letterSpacing: 0.2 }}>CRM Pós-Vendas</p>
            <div style={{ width: 1, height: 22, background: TEMA.linhaInterna }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: TEMA.laranjaLuminoso }}>{LABEL_SECAO[visao]}</p>
              <div style={{ width: 28, height: 2, background: TEMA.laranja, borderRadius: 2, marginTop: 3, boxShadow: `0 0 6px ${TEMA.laranja}` }} />
            </div>
          </div>

          <div style={{ position: 'relative', flex: 1, maxWidth: 380, minWidth: 180 }}>
            <Search size={14} color={TEMA.textoDiscreto} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              className="tp-input"
              placeholder="Buscar clientes, negócios..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 34px', borderRadius: 8,
                border: `1px solid ${TEMA.linhaInterna}`, background: 'rgba(255,255,255,0.03)', color: TEMA.textoPrincipal, fontSize: 13,
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SeletorPeriodo periodoChave={periodoChave} setPeriodoChave={setPeriodoChave} periodoPersonalizado={periodoPersonalizado} setPeriodoPersonalizado={setPeriodoPersonalizado} />
            <AlertasCentral negocios={negocios} onAbrir={id => setNegocioSelecionado(id)} />

            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setMenuUsuarioAberto(!menuUsuarioAberto)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg, ${TEMA.laranja}, ${TEMA.laranjaLuminoso})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700,
                }}>
                  {iniciais || 'U'}
                </div>
                {euMesmo?.nome && <span style={{ fontSize: 13, fontWeight: 600, color: TEMA.textoPrincipal }}>{euMesmo.nome.split(' ')[0]}</span>}
                <ChevronDown size={14} color={TEMA.textoSecundario} />
              </button>
              {menuUsuarioAberto && (
                <div style={{
                  position: 'absolute', top: '110%', right: 0, background: TEMA.cardElevado, border: `1px solid ${TEMA.borda}`,
                  borderRadius: 8, padding: 6, minWidth: 130, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 20,
                }}>
                  <button
                    onClick={() => sair()}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none',
                      color: TEMA.textoSecundario, fontSize: 13, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <LogOut size={14} /> Sair
                  </button>
                </div>
              )}
            </div>

            <button
              className="tp-btn-primary"
              onClick={() => setModalAberto(true)}
              style={{
                background: `linear-gradient(135deg, ${TEMA.laranja}, ${TEMA.laranjaLuminoso})`, color: '#fff', border: 'none',
                borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                boxShadow: '0 4px 14px rgba(255,121,0,0.3)',
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
            metas={metas}
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
        {visao === 'agenda' && <Agenda onAbrir={id => setNegocioSelecionado(id)} />}
        {visao === 'funil' && <Funil />}
        {visao === 'mapa' && <Mapa />}
        {visao === 'provisionado' && <Provisionado />}
        {visao === 'relatorios' && <Dashboard />}
      </div>

      {modalAberto && (
        <NovoNegocio
          departamentos={departamentos}
          euMesmo={euMesmo}
          onFechar={() => setModalAberto(false)}
          onCriado={() => { setModalAberto(false); carregar() }}
        />
      )}

      {negocioAtual && (
        <CardDetalhado negocio={negocioAtual} euMesmo={euMesmo} onFechar={() => setNegocioSelecionado(null)} onAtualizado={carregar} />
      )}
    </div>
  )
}

function SeletorPeriodo({ periodoChave, setPeriodoChave, periodoPersonalizado, setPeriodoPersonalizado }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Calendar size={14} color={TEMA.textoDiscreto} />
      <select
        value={periodoChave}
        onChange={e => setPeriodoChave(e.target.value)}
        style={{
          background: 'rgba(255,255,255,0.03)', color: TEMA.textoPrincipal, border: `1px solid ${TEMA.linhaInterna}`,
          borderRadius: 8, padding: '8px 10px', fontSize: 12,
        }}
      >
        {OPCOES_PERIODO.map(o => <option key={o.key} value={o.key} style={{ color: '#111' }}>{o.label}</option>)}
      </select>
      {periodoChave === 'personalizado' && (
        <>
          <input type="date" value={periodoPersonalizado.de} onChange={e => setPeriodoPersonalizado({ ...periodoPersonalizado, de: e.target.value })}
            style={{ background: 'rgba(255,255,255,0.03)', color: TEMA.textoPrincipal, border: `1px solid ${TEMA.linhaInterna}`, borderRadius: 8, padding: '8px 8px', fontSize: 12 }} />
          <input type="date" value={periodoPersonalizado.ate} onChange={e => setPeriodoPersonalizado({ ...periodoPersonalizado, ate: e.target.value })}
            style={{ background: 'rgba(255,255,255,0.03)', color: TEMA.textoPrincipal, border: `1px solid ${TEMA.linhaInterna}`, borderRadius: 8, padding: '8px 8px', fontSize: 12 }} />
        </>
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

const CORES_ROSCA = { quente: '#FF5A3D', morno: TEMA.ambar, frio: TEMA.azulAnalitico }
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
  const totalNegocios = emNegociacao.length

  return (
    <div className="tp-card" style={{ ...cardBase, flex: '1 0 280px' }}>
      <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 8px', color: TEMA.textoPrincipal }}>Temperatura das negociações</p>
      {totalNegocios === 0 ? (
        <p style={{ fontSize: 12, color: TEMA.textoDiscreto }}>Nenhum negócio em negociação agora.</p>
      ) : (
        <>
          <div style={{ position: 'relative', filter: 'drop-shadow(0 0 10px rgba(255,90,61,0.15))' }}>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={dados.filter(d => d.qtd > 0)} dataKey="valor" nameKey="nome" innerRadius={45} outerRadius={70} paddingAngle={3}
                  onClick={d => setTempAberta(d.chave)}
                  style={{ cursor: 'pointer' }}
                  stroke={TEMA.fundoSecundario}
                  strokeWidth={2}
                >
                  {dados.filter(d => d.qtd > 0).map(d => <Cell key={d.chave} fill={CORES_ROSCA[d.chave]} />)}
                </Pie>
                <Tooltip
                  formatter={(valor, nome, item) => [`${formatarMoeda(valor)} · ${item.payload.qtd} negócio(s)`, nome]}
                  contentStyle={{ background: TEMA.cardElevado, border: `1px solid ${TEMA.borda}`, borderRadius: 8, color: TEMA.textoPrincipal }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 30,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
            }}>
              <p style={{ fontSize: 24, fontWeight: 700, margin: 0, color: TEMA.textoPrincipal }}>{totalNegocios}</p>
              <p style={{ fontSize: 11, color: TEMA.textoDiscreto, margin: 0 }}>negócios</p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, fontSize: 11, color: TEMA.textoSecundario, marginTop: 4 }}>
            {dados.map(d => (
              <span key={d.chave} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: CORES_ROSCA[d.chave], display: 'inline-block', boxShadow: `0 0 5px ${CORES_ROSCA[d.chave]}` }} />
                {d.nome} ({d.qtd})
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
    if (chave === 'ganha') return TEMA.verde
    if (chave === 'perdida') return TEMA.vermelho
    if (chave === 'contato_realizado') return TEMA.textoDiscreto
    if (chave === 'orcamento_enviado') return TEMA.azulAnalitico
    return '#5B8DEF'
  }

  return (
    <div className="tp-card" style={{ ...cardBase, flex: '1 0 280px' }}>
      <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 12px', color: TEMA.textoPrincipal }}>Pipeline por etapa</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {linhas.map(l => (
          <div key={l.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: TEMA.textoSecundario, marginBottom: 3 }}>
              <span>{l.label}</span>
              <span>{l.qtd} · {formatarMoeda(l.valor)}</span>
            </div>
            <div style={{ background: 'rgba(148,163,184,0.15)', borderRadius: 4, height: 7 }}>
              <div style={{
                width: `${(l.qtd / maiorQtd) * 100}%`, background: corBarra(l.key),
                height: 7, borderRadius: 4, minWidth: l.qtd > 0 ? 4 : 0, transition: 'width 400ms ease',
              }} />
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11, color: TEMA.textoDiscreto, marginTop: 12, marginBottom: 0 }}>
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
    <div className="tp-card" style={{ ...cardBase, flex: '1 0 280px' }}>
      <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 12px', color: TEMA.textoPrincipal }}>Top vendedores</p>
      {lista.length === 0 && <p style={{ fontSize: 12, color: TEMA.textoDiscreto }}>Sem dados ainda.</p>}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {lista.map((l, i) => {
          const iniciais = l.nome.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()
          return (
            <div key={l.nome} style={{ padding: '9px 0', borderBottom: i < lista.length - 1 ? `1px solid ${TEMA.linhaInterna}` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: TEMA.textoDiscreto, width: 14 }}>{i + 1}</span>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: `linear-gradient(135deg, ${TEMA.laranja}, ${TEMA.laranjaLuminoso})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 700,
                }}>
                  {iniciais}
                </div>
                <span style={{ fontWeight: 600, fontSize: 12, color: TEMA.textoPrincipal, flex: 1 }}>{l.nome}</span>
                <span style={{ fontSize: 12, textAlign: 'right' }}>
                  <strong style={{ color: TEMA.textoPrincipal }}>{formatarMoeda(l.ganho)}</strong>
                  <span style={{ color: TEMA.textoDiscreto }}> · {l.conversao.toFixed(1)}%</span>
                </span>
              </div>
              <div style={{ background: 'rgba(148,163,184,0.15)', borderRadius: 4, height: 6, marginLeft: 30 }}>
                <div style={{
                  width: `${(l.ganho / maiorGanho) * 100}%`, background: `linear-gradient(90deg, ${TEMA.laranja}, ${TEMA.laranjaLuminoso})`,
                  height: 6, borderRadius: 4, boxShadow: `0 0 6px ${TEMA.laranja}`,
                }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const ICONE_DEPARTAMENTO = { 'Pneus': Disc, 'Pós-vendas': Wrench, 'Varejo': ShoppingCart }

function MetaPorDepartamento({ negocios, departamentos, consultores, metas }) {
  const agora = new Date()
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)

  const linhas = departamentos.map(dept => {
    const consultoresDept = consultores.filter(c => c.departamento_id === dept.id).map(c => c.id)
    const metaDept = metas
      .filter(m => consultoresDept.includes(m.consultor_id))
      .reduce((s, m) => s + (m.valor_meta || 0), 0)
    const ganhoDept = negocios
      .filter(n => n.etapa === 'ganha' && n.departamento?.nome === dept.nome && new Date(n.atualizado_em) >= inicioMes)
      .reduce((s, n) => s + (n.valor_final || n.valor_cotacao || 0), 0)
    const faltante = Math.max(metaDept - ganhoDept, 0)
    const percentual = metaDept > 0 ? Math.min(ganhoDept / metaDept * 100, 100) : 0
    return { nome: dept.nome, metaDept, ganhoDept, faltante, percentual }
  })

  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 12px', color: TEMA.textoPrincipal }}>Performance comercial por departamento (mês atual)</p>
      <div className="tp-grid-3">
        {linhas.map(l => {
          const Icone = ICONE_DEPARTAMENTO[l.nome] || Scale
          return (
            <div key={l.nome} className="tp-card" style={cardBase}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ background: 'rgba(255,137,0,0.10)', border: '1px solid rgba(255,137,0,0.25)', borderRadius: 8, padding: 6, display: 'flex' }}>
                  <Icone size={15} color={TEMA.laranjaLuminoso} />
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: TEMA.textoPrincipal }}>{l.nome}</p>
              </div>
              <div style={{ background: 'rgba(148,163,184,0.15)', borderRadius: 8, height: 8, marginBottom: 10, overflow: 'hidden' }}>
                <div style={{
                  width: `${l.percentual}%`, height: 8, borderRadius: 8, transition: 'width 400ms ease',
                  background: l.percentual >= 100 ? TEMA.verde : `linear-gradient(90deg, ${TEMA.laranja}, ${TEMA.laranjaLuminoso})`,
                  boxShadow: l.percentual > 0 ? `0 0 8px ${l.percentual >= 100 ? TEMA.verde : TEMA.laranja}` : 'none',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: TEMA.textoSecundario }}>
                <span>Ganho: <strong style={{ color: TEMA.textoPrincipal }}>{formatarMoeda(l.ganhoDept)}</strong></span>
                <span>Meta: {l.metaDept > 0 ? formatarMoeda(l.metaDept) : '—'}</span>
              </div>
              <p style={{ fontSize: 12, color: l.faltante > 0 && l.metaDept > 0 ? TEMA.vermelho : TEMA.verde, margin: '8px 0 0', fontWeight: 600 }}>
                {l.metaDept === 0 ? 'Nenhuma meta cadastrada' : l.faltante > 0 ? `Falta: ${formatarMoeda(l.faltante)}` : 'Meta batida ✓'}
              </p>
            </div>
          )
        })}
        {linhas.length === 0 && <p style={{ color: TEMA.textoDiscreto, fontSize: 13 }}>Nenhum departamento cadastrado.</p>}
      </div>
    </div>
  )
}

function GraficoCrescimentoDiario({ filtradosPeriodo, periodo }) {
  const hoje = new Date()
  const fimReal = periodo.fim > hoje ? hoje : periodo.fim

  const ganhos = filtradosPeriodo
    .filter(n => n.etapa === 'ganha')
    .map(n => ({ data: new Date(n.atualizado_em), valor: n.valor_final || n.valor_cotacao || 0 }))
    .sort((a, b) => a.data - b.data)

  const dados = []
  let acumulado = 0
  const cursor = new Date(periodo.inicio)
  while (cursor <= fimReal) {
    const doDia = ganhos.filter(g =>
      g.data.getFullYear() === cursor.getFullYear() &&
      g.data.getMonth() === cursor.getMonth() &&
      g.data.getDate() === cursor.getDate()
    )
    acumulado += doDia.reduce((s, g) => s + g.valor, 0)
    dados.push({ dia: cursor.getDate() + '/' + (cursor.getMonth() + 1), acumulado: Math.round(acumulado) })
    cursor.setDate(cursor.getDate() + 1)
  }

  return (
    <div className="tp-card" style={{ ...cardBase, marginBottom: 20 }}>
      <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 14px', color: TEMA.textoPrincipal }}>Crescimento diário (ganho acumulado no período)</p>
      {dados.length === 0 ? (
        <p style={{ fontSize: 12, color: TEMA.textoDiscreto }}>Sem dados nesse período.</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={dados}>
            <defs>
              <linearGradient id="gradCrescimento" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={TEMA.laranja} stopOpacity={0.45} />
                <stop offset="95%" stopColor={TEMA.laranja} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={TEMA.linhaInterna} />
            <XAxis dataKey="dia" fontSize={11} stroke={TEMA.textoDiscreto} tick={{ fill: TEMA.textoDiscreto }} />
            <YAxis fontSize={11} tickFormatter={v => formatarMoeda(v)} width={95} stroke={TEMA.textoDiscreto} tick={{ fill: TEMA.textoDiscreto }} />
            <Tooltip
              formatter={v => formatarMoeda(v)}
              contentStyle={{ background: TEMA.cardElevado, border: `1px solid ${TEMA.borda}`, borderRadius: 8, color: TEMA.textoPrincipal }}
              labelStyle={{ color: TEMA.textoSecundario }}
            />
            <Area
              type="monotone" dataKey="acumulado" name="Ganho acumulado"
              stroke={TEMA.laranjaLuminoso} strokeWidth={2.5} fill="url(#gradCrescimento)"
              dot={{ r: 3, fill: TEMA.laranjaLuminoso, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: TEMA.laranjaLuminoso, stroke: '#fff', strokeWidth: 1 }}
              animationDuration={600}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function VisaoGeral(props) {
  const { filtrados, metrics, onAbrir, onAtualizado, periodo, periodoChave, setPeriodoChave, periodoPersonalizado, setPeriodoPersonalizado, departamentos, consultores, metas } = props
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
      <div className="tp-grid-4" style={{ marginBottom: 20 }}>
        <KpiCard icone={CircleDollarSign} label="Ganho no mês" valor={formatarMoeda(metrics.valorGanhoMes)} variacao={metrics.variacaoGanho} />
        <KpiCard icone={TrendingUp} label="Conversão" valor={`${metrics.conversaoMes.toFixed(1)}%`} variacao={metrics.variacaoConversao} sufixoVariacao=" p.p." />
        <KpiCard icone={Scale} label="Ticket médio (TKM)" valor={formatarMoeda(metrics.ticketMedio)} />
        <KpiCard icone={Clock} label="Follow-ups atrasados" valor={metrics.followupsAtrasados} negativo />
      </div>

      <MetaPorDepartamento negocios={filtrados} departamentos={departamentos} consultores={consultores} metas={metas} />

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <PipelinePorEtapa filtrados={filtradosPeriodo} />
        <GraficoTemperatura filtrados={filtradosPeriodo} />
        <TopVendedores filtrados={filtradosPeriodo} />
      </div>
      <p style={{ fontSize: 11, color: TEMA.textoDiscreto, margin: '-14px 0 20px' }}>
        Funil, temperatura e ranking acima consideram a Data 1º contato dentro do período selecionado ({filtradosPeriodo.length} negócio{filtradosPeriodo.length !== 1 ? 's' : ''}). O quadro abaixo mostra tudo que está aberto agora, sem filtro de período.
      </p>

      <GraficoCrescimentoDiario filtradosPeriodo={filtrados} periodo={periodo} />

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
    : negocio.etapa === 'perdida'
    ? CORES_PERDIDA
    : negocio.etapa === 'faturamento_proximo_mes'
    ? CORES_FATURAMENTO_PROXIMO
    : CORES_TEMPERATURA[negocio.temperatura]
  const notaPci = negocio.avaliacoes_pci?.[0]?.nota_total
  const pci = notaPci !== undefined ? classificarPci(notaPci) : null
  const atrasado = negocio.etapa !== 'ganha' && negocio.etapa !== 'perdida' && negocio.etapa !== 'faturamento_proximo_mes'
    && negocio.proxima_acao_data && new Date(negocio.proxima_acao_data) < new Date()
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

function KpiCard({ icone: Icone, label, valor, variacao, negativo, sufixoVariacao = '%' }) {
  const corDestaque = negativo ? TEMA.vermelho : TEMA.laranjaLuminoso
  return (
    <div className="tp-card" style={{ ...cardBase, position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p style={{ fontSize: 12, color: TEMA.textoSecundario, margin: '0 0 8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</p>
        <div style={{
          background: `rgba(255,137,0,0.10)`, border: `1px solid rgba(255,137,0,0.25)`,
          borderRadius: 8, padding: 7, display: 'flex',
        }}>
          <Icone size={16} color={corDestaque} />
        </div>
      </div>
      <p style={{ fontSize: 28, fontWeight: 700, margin: 0, color: TEMA.textoPrincipal }}>{valor}</p>
      {variacao !== null && variacao !== undefined && (
        <p style={{ fontSize: 12, margin: '6px 0 0', color: variacao >= 0 ? TEMA.verde : TEMA.vermelho, fontWeight: 600 }}>
          {variacao >= 0 ? '▲' : '▼'} {Math.abs(variacao).toFixed(1)}{sufixoVariacao}
          <span style={{ color: TEMA.textoDiscreto, fontWeight: 400 }}> vs. mês anterior</span>
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
