import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Scale, Trophy, TrendingUp, Clock, Bell, Phone, MessageCircle, LogOut } from 'lucide-react'
import { listarDepartamentos, listarNegocios, listarConsultores, voltarParaProspeccao, getMeuConsultor, sair } from './api'
import { ETAPAS, CORES_TEMPERATURA, CORES_MARCA, formatarMoeda, classificarPci } from './constants'
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
import PassagemBastao from './PassagemBastao.jsx'

const ETAPAS_ABERTAS = ['prospeccao', 'contato_realizado', 'oportunidade_identificada', 'orcamento_enviado', 'negociacao_decisao']

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

  async function carregar() {
    setCarregando(true)
    const [deps, negs, cons, eu] = await Promise.all([
      listarDepartamentos(), listarNegocios(), listarConsultores(), getMeuConsultor(),
    ])
    setDepartamentos(deps)
    setNegocios(negs)
    setConsultores(cons)
    setEuMesmo(eu)
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

  const metrics = useMemo(() => calcularMetricas(filtrados), [filtrados])

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
              + Novo negócio
            </button>
          </div>
        </div>

        {visao === 'visao_geral' && (
          <VisaoGeral
            negocios={negocios}
            filtrados={filtrados}
            metrics={metrics}
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

        {visao === 'pipeline' && (
          <PipelineBoard
            filtrados={filtrados}
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
        {visao === 'passagem_bastao' && <PassagemBastao />}
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

function calcularMetricas(negocios) {
  const agora = new Date()
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
  const inicioMesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1)

  const abertos = negocios.filter(n => ETAPAS_ABERTAS.includes(n.etapa))
  const pipelineTotal = abertos.reduce((s, n) => s + (n.valor_cotacao || 0), 0)
  const pipelinePonderado = abertos.reduce((s, n) => {
    const prob = n.probabilidade_fechamento != null ? n.probabilidade_fechamento / 100 : 0.3
    return s + (n.valor_cotacao || 0) * prob
  }, 0)

  const ganhosMes = negocios.filter(n => n.etapa === 'ganha' && new Date(n.atualizado_em) >= inicioMes)
  const ganhosMesAnterior = negocios.filter(n => n.etapa === 'ganha' && new Date(n.atualizado_em) >= inicioMesAnterior && new Date(n.atualizado_em) < inicioMes)
  const valorGanhoMes = ganhosMes.reduce((s, n) => s + (n.valor_final || n.valor_cotacao || 0), 0)
  const valorGanhoMesAnterior = ganhosMesAnterior.reduce((s, n) => s + (n.valor_final || n.valor_cotacao || 0), 0)

  const perdidosMes = negocios.filter(n => n.etapa === 'perdida' && n.data_perda && new Date(n.data_perda) >= inicioMes)
  const perdidosMesAnterior = negocios.filter(n => n.etapa === 'perdida' && n.data_perda && new Date(n.data_perda) >= inicioMesAnterior && new Date(n.data_perda) < inicioMes)
  const conversaoMes = (ganhosMes.length + perdidosMes.length) > 0 ? ganhosMes.length / (ganhosMes.length + perdidosMes.length) * 100 : 0
  const conversaoMesAnterior = (ganhosMesAnterior.length + perdidosMesAnterior.length) > 0 ? ganhosMesAnterior.length / (ganhosMesAnterior.length + perdidosMesAnterior.length) * 100 : 0

  const followupsAtrasados = abertos.filter(n => n.proxima_acao_data && new Date(n.proxima_acao_data) < agora).length

  return {
    pipelineTotal, pipelinePonderado, valorGanhoMes,
    variacaoGanho: valorGanhoMesAnterior > 0 ? ((valorGanhoMes - valorGanhoMesAnterior) / valorGanhoMesAnterior * 100) : null,
    conversaoMes,
    variacaoConversao: perdidosMesAnterior.length + ganhosMesAnterior.length > 0 ? (conversaoMes - conversaoMesAnterior) : null,
    followupsAtrasados,
  }
}

function VisaoGeral(props) {
  const { filtrados, metrics, onAbrir, onAtualizado } = props
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 12, marginBottom: 20 }}>
        <KpiCard icone={BarChart3} label="Pipeline total" valor={formatarMoeda(metrics.pipelineTotal)} />
        <KpiCard icone={Scale} label="Pipeline ponderado" valor={formatarMoeda(metrics.pipelinePonderado)} />
        <KpiCard icone={Trophy} label="Ganho no mês" valor={formatarMoeda(metrics.valorGanhoMes)} variacao={metrics.variacaoGanho} corIcone="#3b6d11" />
        <KpiCard icone={TrendingUp} label="Conversão" valor={`${metrics.conversaoMes.toFixed(1)}%`} variacao={metrics.variacaoConversao} sufixoVariacao=" p.p." />
        <KpiCard icone={Clock} label="Follow-ups atrasados" valor={metrics.followupsAtrasados} corIcone="#a32d2d" />
      </div>

      <FiltrosLinha {...props} />

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <QuadroKanban filtrados={filtrados} onAbrir={onAbrir} onAtualizado={onAtualizado} colunasVisiveis={5} />
        </div>
        <div style={{ width: 300, flexShrink: 0 }}>
          <FilaLigar negocios={filtrados} onAbrir={onAbrir} onAtualizado={onAtualizado} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12, marginTop: 20 }}>
        <ResumoCard titulo="Follow-ups de hoje" valor={followupsHoje} />
        <ResumoCard titulo="Negócios parados" valor={negociosParados.length} sub={formatarMoeda(valorParados)} />
        <ResumoCard titulo="Passagens pendentes" valor="Ver aba" sub="Passagem de bastão" />
      </div>
    </div>
  )
}

function PipelineBoard(props) {
  return (
    <div style={{ padding: 24 }}>
      <FiltrosLinha {...props} />
      <QuadroKanban filtrados={props.filtrados} onAbrir={props.onAbrir} onAtualizado={props.onAtualizado} colunasVisiveis={7} />
    </div>
  )
}

function FiltrosLinha({ departamentos, consultores, deptSelecionado, setDeptSelecionado, vendedorSelecionado, setVendedorSelecionado }) {
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
  { key: 'oportunidade_identificada', label: 'Oportunidade identificada' },
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
  const temp = CORES_TEMPERATURA[negocio.temperatura]
  const notaPci = negocio.avaliacoes_pci?.[0]?.nota_total
  const pci = notaPci !== undefined ? classificarPci(notaPci) : null
  const atrasado = negocio.proxima_acao_data && new Date(negocio.proxima_acao_data) < new Date()
  const corBorda = negocio.urgencia === 'alta' ? '#F77E01' : (pci ? pci.cor : '#ddd')

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
          {negocio.cliente?.razao_social}
        </p>
        {pci && (
          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: pci.cor, borderRadius: 4, padding: '1px 5px' }}>
            PCI {pci.sigla}
          </span>
        )}
      </div>
      {negocio.produto_servico && (
        <p style={{ fontSize: 11, margin: '3px 0 0', color: temp ? temp.sub : '#999' }}>{negocio.produto_servico}</p>
      )}
      <p style={{ fontSize: 13, margin: '4px 0 0', fontWeight: 600, color: temp ? temp.titulo : '#222' }}>
        {formatarMoeda(negocio.valor_cotacao)}
      </p>
      <p style={{ fontSize: 11, margin: '4px 0 0', color: temp ? temp.sub : '#777' }}>{negocio.consultor?.nome}</p>
      {negocio.proxima_acao_data && (
        <p style={{ fontSize: 11, margin: '4px 0 0', color: atrasado ? '#c0392b' : (temp ? temp.sub : '#777'), fontWeight: atrasado ? 700 : 400 }}>
          {atrasado ? '⚠ ' : ''}Próx: {new Date(negocio.proxima_acao_data).toLocaleDateString('pt-BR')}
        </p>
      )}
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
