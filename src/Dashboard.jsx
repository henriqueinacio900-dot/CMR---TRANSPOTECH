import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer as RRC, Legend as RLegend } from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { listarNegocios, contarInteracoesMes, listarConfiguracoesAutomacao, listarConsultores, listarMetasMes, salvarMetaMensal, listarDepartamentos } from './api'
import { ETAPAS, classificarPci, formatarMoeda } from './constants'
import { TEMA } from './theme'

const ETAPAS_ABERTAS = ['prospeccao', 'contato_realizado', 'orcamento_enviado', 'negociacao_decisao']
const ETAPA_PARA_CONFIG = {
  prospeccao: 'dias_prospeccao_sem_contato',
  contato_realizado: 'dias_contato_sem_atualizacao',
  orcamento_enviado: 'dias_orcamento_sem_followup',
  negociacao_decisao: 'dias_negociacao_sem_atualizacao',
}

export default function Dashboard() {
  const [negocios, setNegocios] = useState([])
  const [contatosMes, setContatosMes] = useState(0)
  const [config, setConfig] = useState({})
  const [consultores, setConsultores] = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [metas, setMetas] = useState([])
  const [carregando, setCarregando] = useState(true)

  const agora = new Date()

  useEffect(() => {
    carregarTudo()
  }, [])

  async function carregarTudo() {
    setCarregando(true)
    const [n, c, cfg, cons, deps, m] = await Promise.all([
      listarNegocios(), contarInteracoesMes(), listarConfiguracoesAutomacao(),
      listarConsultores(), listarDepartamentos(), listarMetasMes(agora.getFullYear(), agora.getMonth() + 1),
    ])
    setNegocios(n)
    setContatosMes(c)
    setConfig(cfg)
    setConsultores(cons)
    setDepartamentos(deps)
    setMetas(m)
    setCarregando(false)
  }

  if (carregando) return <p style={{ padding: 24 }}>Carregando...</p>

  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)

  const abertos = negocios.filter(n => ETAPAS_ABERTAS.includes(n.etapa))
  const ganhos = negocios.filter(n => n.etapa === 'ganha')
  const perdidos = negocios.filter(n => n.etapa === 'perdida')
  const ganhosMes = ganhos.filter(n => new Date(n.atualizado_em) >= inicioMes)
  const perdidosMes = perdidos.filter(n => n.data_perda && new Date(n.data_perda) >= inicioMes)

  const pipelineTotal = abertos.reduce((s, n) => s + (n.valor_cotacao || 0), 0)
  const pipelinePonderado = abertos.reduce((s, n) => {
    const prob = n.probabilidade_fechamento != null ? n.probabilidade_fechamento / 100 : 0.3
    return s + (n.valor_cotacao || 0) * prob
  }, 0)
  const valorGanhoMes = ganhosMes.reduce((s, n) => s + (n.valor_final || n.valor_cotacao || 0), 0)
  const valorPerdidoMes = perdidosMes.reduce((s, n) => s + (n.valor_cotacao || 0), 0)
  const taxaConversao = (ganhos.length + perdidos.length) > 0
    ? (ganhos.length / (ganhos.length + perdidos.length) * 100)
    : 0
  const ticketMedio = ganhos.length > 0
    ? ganhos.reduce((s, n) => s + (n.valor_final || n.valor_cotacao || 0), 0) / ganhos.length
    : 0

  const prospeccoesMes = negocios.filter(n => new Date(n.criado_em) >= inicioMes).length
  const orcamentosMes = negocios.filter(n => n.data_orcamento && new Date(n.data_orcamento) >= inicioMes).length
  const followupsProgramados = abertos.filter(n => n.proxima_acao_data).length
  const followupsAtrasados = abertos.filter(n => n.proxima_acao_data && new Date(n.proxima_acao_data) < agora).length
  const semProximaAcao = abertos.filter(n => !n.proxima_acao).length

  const oportunidadesParadas = abertos.filter(n => {
    const diasParado = n.atualizado_em ? Math.floor((agora - new Date(n.atualizado_em)) / 86400000) : 0
    const limite = Number(config[ETAPA_PARA_CONFIG[n.etapa]] || 0)
    return limite && diasParado > limite
  }).length

  const pciASemContato = negocios.filter(n => {
    const nota = n.avaliacoes_pci?.[0]?.nota_total
    return nota !== undefined && classificarPci(nota).sigla === 'A' && !n.ultima_interacao_em
  }).length

  const porVendedor = agrupar(negocios, n => n.consultor?.nome || 'Sem consultor')
  const porDepartamento = agrupar(negocios, n => n.departamento?.nome || 'Sem departamento')

  function gerarRelatorioPDF() {
    const doc = new jsPDF()
    const hoje = new Date().toLocaleDateString('pt-BR')

    doc.setFillColor(247, 126, 1)
    doc.rect(0, 0, 210, 22, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.text('TranspoTech — Relatório Comercial', 14, 14)
    doc.setFontSize(10)
    doc.text(hoje, 180, 14)

    doc.setTextColor(30, 30, 30)
    let y = 32
    doc.setFontSize(13)
    doc.text('Indicadores gerais', 14, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [['Indicador', 'Valor']],
      body: [
        ['Pipeline total', formatarMoeda(pipelineTotal)],
        ['Pipeline ponderado', formatarMoeda(pipelinePonderado)],
        ['Ganho no mês', formatarMoeda(valorGanhoMes)],
        ['Perdido no mês', formatarMoeda(valorPerdidoMes)],
        ['Taxa de conversão', `${taxaConversao.toFixed(0)}%`],
        ['Ticket médio', formatarMoeda(ticketMedio)],
        ['Prospecções no mês', String(prospeccoesMes)],
        ['Orçamentos enviados no mês', String(orcamentosMes)],
        ['Follow-ups atrasados', String(followupsAtrasados)],
        ['Negócios sem próxima ação', String(semProximaAcao)],
        ['Oportunidades paradas', String(oportunidadesParadas)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [247, 126, 1] },
      margin: { left: 14, right: 14 },
    })

    y = doc.lastAutoTable.finalY + 10
    doc.setFontSize(13)
    doc.text('Funil por etapa', 14, y)
    y += 4
    const funilLinhas = ETAPAS.map(e => {
      const itens = negocios.filter(n => n.etapa === e.key)
      return [e.label, String(itens.length), formatarMoeda(itens.reduce((s, n) => s + (n.valor_final || n.valor_cotacao || 0), 0))]
    })
    autoTable(doc, {
      startY: y,
      head: [['Etapa', 'Negócios', 'Valor']],
      body: funilLinhas,
      theme: 'striped',
      headStyles: { fillColor: [247, 126, 1] },
      margin: { left: 14, right: 14 },
    })

    y = doc.lastAutoTable.finalY + 10
    if (y > 250) { doc.addPage(); y = 20 }
    doc.setFontSize(13)
    doc.text('Conversão por vendedor', 14, y)
    y += 4
    autoTable(doc, {
      startY: y,
      head: [['Vendedor', 'Ganhos', 'Perdidos', 'Conversão', 'Valor ganho']],
      body: porVendedor.map(v => [v.nome, String(v.ganhos), String(v.perdidos), `${v.conversao.toFixed(0)}%`, formatarMoeda(v.valorGanho)]),
      theme: 'striped',
      headStyles: { fillColor: [247, 126, 1] },
      margin: { left: 14, right: 14 },
    })

    y = doc.lastAutoTable.finalY + 10
    if (y > 250) { doc.addPage(); y = 20 }
    doc.setFontSize(13)
    doc.text('Conversão por departamento', 14, y)
    y += 4
    autoTable(doc, {
      startY: y,
      head: [['Departamento', 'Ganhos', 'Perdidos', 'Conversão', 'Valor ganho']],
      body: porDepartamento.map(v => [v.nome, String(v.ganhos), String(v.perdidos), `${v.conversao.toFixed(0)}%`, formatarMoeda(v.valorGanho)]),
      theme: 'striped',
      headStyles: { fillColor: [247, 126, 1] },
      margin: { left: 14, right: 14 },
    })

    doc.save(`relatorio-transpotech-${hoje.replace(/\//g, '-')}.pdf`)
  }

  return (
    <div style={{ padding: 24, color: TEMA.textoPrincipal }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 16, fontWeight: 700, margin: 0, color: TEMA.textoPrincipal }}>Indicadores</p>
        <button onClick={gerarRelatorioPDF} style={botaoPdf}>⬇ Baixar relatório PDF</button>
      </div>

      <Secao titulo="Visão geral">
        <div style={grid4}>
          <Card label="Pipeline total" valor={formatarMoeda(pipelineTotal)} />
          <Card label="Pipeline ponderado" valor={formatarMoeda(pipelinePonderado)} />
          <Card label="Ganho no mês" valor={formatarMoeda(valorGanhoMes)} cor="#3b6d11" />
          <Card label="Perdido no mês" valor={formatarMoeda(valorPerdidoMes)} cor="#a32d2d" />
        </div>
        <div style={grid4}>
          <Card label="Taxa de conversão" valor={`${taxaConversao.toFixed(0)}%`} />
          <Card label="Ticket médio" valor={formatarMoeda(ticketMedio)} />
          <Card label="Negócios ganhos no mês" valor={ganhosMes.length} />
          <Card label="Contatos realizados no mês" valor={contatosMes} />
        </div>
      </Secao>

      <Secao titulo="Atividade">
        <div style={grid4}>
          <Card label="Prospecções no mês" valor={prospeccoesMes} />
          <Card label="Orçamentos enviados no mês" valor={orcamentosMes} />
          <Card label="Follow-ups programados" valor={followupsProgramados} />
          <Card label="Follow-ups atrasados" valor={followupsAtrasados} cor="#a32d2d" />
        </div>
        <div style={grid4}>
          <Card label="Negócios sem próxima ação" valor={semProximaAcao} cor="#8a6d1f" />
          <Card label="Oportunidades paradas" valor={oportunidadesParadas} cor="#8a6d1f" />
          <Card label="Clientes PCI A sem contato" valor={pciASemContato} cor="#a32d2d" />
        </div>
      </Secao>

      <Secao titulo="Conversão por vendedor">
        <TabelaConversao dados={porVendedor} />
      </Secao>

      <Secao titulo="Conversão por departamento">
        <TabelaConversao dados={porDepartamento} />
      </Secao>

      <Secao titulo="Desconto concedido no mês (por vendedor e departamento)">
        <PainelDesconto negocios={negocios} />
      </Secao>

      <Secao titulo="Metas do mês (por consultor)">
        <PainelMetasAdmin consultores={consultores} metas={metas} ano={agora.getFullYear()} mes={agora.getMonth() + 1} onSalvo={carregarTudo} />
      </Secao>

      <Secao titulo="Produtividade (faturamento x meta acumulados no mês)">
        <GraficoProdutividade negocios={negocios} metas={metas} />
      </Secao>

      <Secao titulo="Meta por departamento (mês atual)">
        <MetaPorDepartamentoTabela negocios={negocios} departamentos={departamentos} consultores={consultores} metas={metas} />
      </Secao>

      <Secao titulo="Projeção de metas por vendedor">
        <QuadroProjecao negocios={negocios} consultores={consultores} metas={metas} />
      </Secao>

      <Secao titulo="Rankings Top 5">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 16 }}>
          <RankingTop5 titulo="Prospecção" negocios={negocios} etapa="prospeccao" />
          <RankingTop5 titulo="Orçamento enviado" negocios={negocios} etapa="orcamento_enviado" />
          <RankingTop5 titulo="Em negociação" negocios={negocios} etapa="negociacao_decisao" />
          <RankingTop5 titulo="Negócios ganhos" negocios={negocios} etapa="ganha" mostrarValor />
        </div>
      </Secao>
    </div>
  )
}

function PainelDesconto({ negocios }) {
  const agora = new Date()
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
  const ganhosMes = negocios.filter(n => n.etapa === 'ganha' && new Date(n.atualizado_em) >= inicioMes)

  const totalDesconto = ganhosMes.reduce((s, n) => s + (n.desconto_valor || 0), 0)

  function agruparDesconto(chaveFn) {
    const mapa = {}
    ganhosMes.forEach(n => {
      const chave = chaveFn(n)
      if (!mapa[chave]) mapa[chave] = { desconto: 0, vendas: 0, valorBruto: 0 }
      mapa[chave].desconto += (n.desconto_valor || 0)
      mapa[chave].vendas++
      mapa[chave].valorBruto += (n.valor_cotacao || 0)
    })
    return Object.entries(mapa)
      .map(([nome, v]) => ({ nome, ...v, percentual: v.valorBruto > 0 ? (v.desconto / v.valorBruto * 100) : 0 }))
      .sort((a, b) => b.desconto - a.desconto)
  }

  const porVendedor = agruparDesconto(n => n.consultor?.nome || 'Sem consultor')
  const porDepartamento = agruparDesconto(n => n.departamento?.nome || 'Sem departamento')

  return (
    <div>
      <p style={{ fontSize: 13, margin: '0 0 12px' }}>
        Total de desconto dado esse mês: <strong style={{ color: '#a32d2d' }}>{formatarMoeda(totalDesconto)}</strong>
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 16 }}>
        <TabelaDesconto titulo="Por vendedor" dados={porVendedor} />
        <TabelaDesconto titulo="Por departamento" dados={porDepartamento} />
      </div>
    </div>
  )
}

function TabelaDesconto({ titulo, dados }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 14, color: '#222' }}>
      <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 8px' }}>{titulo}</p>
      {dados.length === 0 && <p style={{ fontSize: 12, color: '#999' }}>Sem vendas ganhas esse mês ainda.</p>}
      {dados.map(d => (
        <div key={d.nome} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid #f2f2f2' }}>
          <span>{d.nome} ({d.vendas} venda{d.vendas !== 1 ? 's' : ''})</span>
          <span style={{ fontWeight: 600, color: '#a32d2d' }}>{formatarMoeda(d.desconto)} ({d.percentual.toFixed(1)}%)</span>
        </div>
      ))}
    </div>
  )
}

function PainelMetasAdmin({ consultores, metas, ano, mes, onSalvo }) {
  const [valores, setValores] = useState(() => {
    const mapa = {}
    consultores.forEach(c => {
      const m = metas.find(x => x.consultor_id === c.id)
      mapa[c.id] = m ? m.valor_meta : ''
    })
    return mapa
  })
  const [salvandoId, setSalvandoId] = useState(null)

  async function salvar(consultorId) {
    setSalvandoId(consultorId)
    try {
      await salvarMetaMensal(consultorId, ano, mes, Number(valores[consultorId] || 0))
      onSalvo()
    } finally {
      setSalvandoId(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {consultores.map(c => (
        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <span style={{ width: 140, fontWeight: 600 }}>{c.nome}</span>
          <input
            type="number"
            placeholder="Meta (R$)"
            value={valores[c.id] ?? ''}
            onChange={e => setValores({ ...valores, [c.id]: e.target.value })}
            style={{ padding: 6, borderRadius: 6, border: '1px solid #ddd', width: 160, fontSize: 13 }}
          />
          <button
            onClick={() => salvar(c.id)}
            disabled={salvandoId === c.id}
            style={{ background: '#F77E01', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            {salvandoId === c.id ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      ))}
      {consultores.length === 0 && <p style={{ color: '#999', fontSize: 13 }}>Nenhum consultor cadastrado.</p>}
    </div>
  )
}

function GraficoProdutividade({ negocios, metas }) {
  const agora = new Date()
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0)
  const metaTotalMes = metas.reduce((s, m) => s + (m.valor_meta || 0), 0)

  const ganhosMes = negocios
    .filter(n => n.etapa === 'ganha' && new Date(n.atualizado_em) >= inicioMes)
    .sort((a, b) => new Date(a.atualizado_em) - new Date(b.atualizado_em))

  const dados = []
  let acumuladoFaturamento = 0
  const totalDias = fimMes.getDate()
  for (let dia = 1; dia <= totalDias; dia++) {
    const dataDia = new Date(agora.getFullYear(), agora.getMonth(), dia)
    if (dataDia > agora) break
    const ganhosDoDia = ganhosMes.filter(n => new Date(n.atualizado_em).getDate() === dia)
    acumuladoFaturamento += ganhosDoDia.reduce((s, n) => s + (n.valor_final || n.valor_cotacao || 0), 0)
    const metaAcumulada = metaTotalMes * (dia / totalDias)
    dados.push({ dia: `${dia}`, faturamento: Math.round(acumuladoFaturamento), meta: Math.round(metaAcumulada) })
  }

  if (metaTotalMes === 0) {
    return <p style={{ color: '#999', fontSize: 13 }}>Cadastre pelo menos uma meta acima pra ver o gráfico.</p>
  }

  return (
    <RRC width="100%" height={260}>
      <LineChart data={dados}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="dia" fontSize={11} />
        <YAxis fontSize={11} tickFormatter={v => formatarMoeda(v)} width={90} />
        <RTooltip formatter={v => formatarMoeda(v)} />
        <RLegend />
        <Line type="monotone" dataKey="meta" name="Meta" stroke="#2F6FB0" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="faturamento" name="Faturamento" stroke="#F77E01" strokeWidth={2} dot={false} />
      </LineChart>
    </RRC>
  )
}

function MetaPorDepartamentoTabela({ negocios, departamentos, consultores, metas }) {
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
    return { nome: dept.nome, metaDept, ganhoDept, faltante }
  })

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ textAlign: 'left', color: '#777', borderBottom: '1px solid #eee' }}>
          <th style={{ padding: '6px 8px' }}>Departamento</th>
          <th style={{ padding: '6px 8px' }}>Meta</th>
          <th style={{ padding: '6px 8px' }}>Ganho no mês</th>
          <th style={{ padding: '6px 8px' }}>Falta pra bater</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map(l => (
          <tr key={l.nome} style={{ borderBottom: '1px solid #f2f2f2' }}>
            <td style={{ padding: '6px 8px', fontWeight: 600 }}>{l.nome}</td>
            <td style={{ padding: '6px 8px' }}>{l.metaDept > 0 ? formatarMoeda(l.metaDept) : '—'}</td>
            <td style={{ padding: '6px 8px', color: '#3b6d11', fontWeight: 600 }}>{formatarMoeda(l.ganhoDept)}</td>
            <td style={{ padding: '6px 8px', color: l.faltante > 0 ? '#a32d2d' : '#3b6d11', fontWeight: 700 }}>
              {l.metaDept === 0 ? '—' : l.faltante > 0 ? formatarMoeda(l.faltante) : 'Meta batida ✓'}
            </td>
          </tr>
        ))}
        {linhas.length === 0 && (
          <tr><td colSpan={4} style={{ padding: 8, color: '#999' }}>Nenhum departamento cadastrado.</td></tr>
        )}
      </tbody>
    </table>
  )
}

function contarDiasUteis(ano, mes, ateDia) {
  let dias = 0
  for (let d = 1; d <= ateDia; d++) {
    const diaSemana = new Date(ano, mes, d).getDay()
    if (diaSemana !== 0 && diaSemana !== 6) dias++
  }
  return dias
}

function QuadroProjecao({ negocios, consultores, metas }) {
  const agora = new Date()
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
  const ultimoDiaMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).getDate()
  const diasUteisPassados = contarDiasUteis(agora.getFullYear(), agora.getMonth(), agora.getDate())
  const diasUteisTotais = contarDiasUteis(agora.getFullYear(), agora.getMonth(), ultimoDiaMes)

  const linhas = consultores.map(c => {
    const meusNegocios = negocios.filter(n => n.consultor?.id === c.id)
    const prospeccoes = meusNegocios.length
    const orcamentosGerados = meusNegocios.filter(n => n.data_orcamento).length
    const ganhos = meusNegocios.filter(n => n.etapa === 'ganha')
    const perdidos = meusNegocios.filter(n => n.etapa === 'perdida')
    const tkm = ganhos.length > 0 ? ganhos.reduce((s, n) => s + (n.valor_final || n.valor_cotacao || 0), 0) / ganhos.length : 0
    const conversao = (ganhos.length + perdidos.length) > 0 ? ganhos.length / (ganhos.length + perdidos.length) * 100 : 0

    const meta = metas.find(m => m.consultor_id === c.id)?.valor_meta || 0
    const ganhosMes = ganhos.filter(n => new Date(n.atualizado_em) >= inicioMes)
    const ganhoAtual = ganhosMes.reduce((s, n) => s + (n.valor_final || n.valor_cotacao || 0), 0)
    const faltante = Math.max(meta - ganhoAtual, 0)
    const negociosAFechar = tkm > 0 ? faltante / tkm : 0

    const ritmoDiario = diasUteisPassados > 0 ? ganhoAtual / diasUteisPassados : 0
    const projecaoFimMes = ritmoDiario * diasUteisTotais
    const vaiBater = meta > 0 ? projecaoFimMes >= meta : null

    return { nome: c.nome, prospeccoes, orcamentosGerados, tkm, conversao, meta, ganhoAtual, faltante, negociosAFechar, projecaoFimMes, vaiBater }
  })

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 800 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: '#777', borderBottom: '1px solid #eee' }}>
            <th style={{ padding: '6px 8px' }}>Vendedor</th>
            <th style={{ padding: '6px 8px' }}>Prospecções</th>
            <th style={{ padding: '6px 8px' }}>Orçamentos</th>
            <th style={{ padding: '6px 8px' }}>TKM</th>
            <th style={{ padding: '6px 8px' }}>Conversão</th>
            <th style={{ padding: '6px 8px' }}>Meta</th>
            <th style={{ padding: '6px 8px' }}>Ganho no mês</th>
            <th style={{ padding: '6px 8px' }}>Negócios a fechar</th>
            <th style={{ padding: '6px 8px' }}>Projeção fim do mês</th>
            <th style={{ padding: '6px 8px' }}>Vai bater?</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map(l => (
            <tr key={l.nome} style={{ borderBottom: '1px solid #f2f2f2' }}>
              <td style={{ padding: '6px 8px', fontWeight: 600 }}>{l.nome}</td>
              <td style={{ padding: '6px 8px' }}>{l.prospeccoes}</td>
              <td style={{ padding: '6px 8px' }}>{l.orcamentosGerados}</td>
              <td style={{ padding: '6px 8px' }}>{formatarMoeda(l.tkm)}</td>
              <td style={{ padding: '6px 8px' }}>{l.conversao.toFixed(0)}%</td>
              <td style={{ padding: '6px 8px' }}>{l.meta ? formatarMoeda(l.meta) : '-'}</td>
              <td style={{ padding: '6px 8px' }}>{formatarMoeda(l.ganhoAtual)}</td>
              <td style={{ padding: '6px 8px' }}>{l.meta ? l.negociosAFechar.toFixed(1) : '-'}</td>
              <td style={{ padding: '6px 8px' }}>{l.meta ? formatarMoeda(l.projecaoFimMes) : '-'}</td>
              <td style={{ padding: '6px 8px' }}>
                {l.vaiBater === null ? '-' : (
                  <span style={{ fontWeight: 700, color: l.vaiBater ? '#3b6d11' : '#a32d2d' }}>
                    {l.vaiBater ? '✓ Sim' : '✗ Não'}
                  </span>
                )}
              </td>
            </tr>
          ))}
          {linhas.length === 0 && (
            <tr><td colSpan={10} style={{ padding: 8, color: '#999' }}>Nenhum consultor cadastrado.</td></tr>
          )}
        </tbody>
      </table>
      <p style={{ fontSize: 11, color: '#999', marginTop: 8 }}>
        Projeção calculada pelo ritmo médio de faturamento por dia útil ({diasUteisPassados} de {diasUteisTotais} dias úteis do mês, seg-sex), projetado pro mês inteiro. Cadastre a meta de cada um acima pra habilitar.
      </p>
    </div>
  )
}

function RankingTop5({ titulo, negocios, etapa, mostrarValor }) {
  const mapa = {}
  negocios.filter(n => n.etapa === etapa).forEach(n => {
    const nome = n.consultor?.nome || 'Sem consultor'
    if (!mapa[nome]) mapa[nome] = { qtd: 0, valor: 0 }
    mapa[nome].qtd++
    mapa[nome].valor += (n.valor_final || n.valor_cotacao || 0)
  })
  const lista = Object.entries(mapa)
    .map(([nome, v]) => ({ nome, ...v }))
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, 5)

  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 14, color: '#222' }}>
      <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 8px' }}>{titulo}</p>
      {lista.length === 0 && <p style={{ fontSize: 12, color: '#999' }}>Sem dados ainda.</p>}
      {lista.map((l, i) => (
        <div key={l.nome} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid #f2f2f2' }}>
          <span>{i + 1}. {l.nome}</span>
          <span style={{ fontWeight: 600 }}>{l.qtd}{mostrarValor ? ` · ${formatarMoeda(l.valor)}` : ''}</span>
        </div>
      ))}
    </div>
  )
}

function agrupar(negocios, chaveFn) {
  const mapa = {}
  negocios.forEach(n => {
    const chave = chaveFn(n)
    if (!mapa[chave]) mapa[chave] = { ganhos: 0, perdidos: 0, valorGanho: 0 }
    if (n.etapa === 'ganha') { mapa[chave].ganhos++; mapa[chave].valorGanho += (n.valor_final || n.valor_cotacao || 0) }
    if (n.etapa === 'perdida') mapa[chave].perdidos++
  })
  return Object.entries(mapa).map(([nome, v]) => ({
    nome,
    ...v,
    conversao: (v.ganhos + v.perdidos) > 0 ? (v.ganhos / (v.ganhos + v.perdidos) * 100) : 0,
  })).sort((a, b) => b.valorGanho - a.valorGanho)
}

function TabelaConversao({ dados }) {
  if (dados.length === 0) return <p style={{ color: '#999', fontSize: 13 }}>Sem dados ainda.</p>
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ textAlign: 'left', color: '#777', borderBottom: '1px solid #eee' }}>
          <th style={{ padding: '6px 4px' }}>Nome</th>
          <th style={{ padding: '6px 4px' }}>Ganhos</th>
          <th style={{ padding: '6px 4px' }}>Perdidos</th>
          <th style={{ padding: '6px 4px' }}>Conversão</th>
          <th style={{ padding: '6px 4px' }}>Valor ganho</th>
        </tr>
      </thead>
      <tbody>
        {dados.map(d => (
          <tr key={d.nome} style={{ borderBottom: '1px solid #f2f2f2' }}>
            <td style={{ padding: '6px 4px', fontWeight: 600 }}>{d.nome}</td>
            <td style={{ padding: '6px 4px' }}>{d.ganhos}</td>
            <td style={{ padding: '6px 4px' }}>{d.perdidos}</td>
            <td style={{ padding: '6px 4px' }}>{d.conversao.toFixed(0)}%</td>
            <td style={{ padding: '6px 4px' }}>{formatarMoeda(d.valorGanho)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Secao({ titulo, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#F77E01', textTransform: 'uppercase', margin: '0 0 10px' }}>{titulo}</p>
      {children}
    </div>
  )
}

function Card({ label, valor, cor }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: 14, marginBottom: 10 }}>
      <p style={{ fontSize: 12, color: '#777', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 20, fontWeight: 700, margin: 0, color: cor || '#222' }}>{valor}</p>
    </div>
  )
}

const grid4 = { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10 }

const botaoPdf = {
  background: '#a32d2d', color: '#fff', border: 'none', borderRadius: 8,
  padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
}
