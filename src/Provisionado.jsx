import { useEffect, useState } from 'react'
import { TEMA } from './theme'
import * as XLSX from 'xlsx'
import { listarNegocios, listarMetasMes, listarConsultores, getMeuConsultor } from './api'
import { formatarMoeda } from './constants'

export default function Provisionado() {
  const [negocios, setNegocios] = useState([])
  const [metas, setMetas] = useState([])
  const [consultores, setConsultores] = useState([])
  const [euMesmo, setEuMesmo] = useState(null)
  const [vendedorSelecionado, setVendedorSelecionado] = useState('todos')
  const [carregando, setCarregando] = useState(true)

  const agora = new Date()

  useEffect(() => {
    Promise.all([
      listarNegocios(), listarMetasMes(agora.getFullYear(), agora.getMonth() + 1),
      listarConsultores(), getMeuConsultor(),
    ]).then(([n, m, cons, eu]) => {
      setNegocios(n)
      setMetas(m)
      setConsultores(cons)
      setEuMesmo(eu)
      setCarregando(false)
    })
  }, [])

  if (carregando) return <p style={{ padding: 24, color: TEMA.textoPrincipal }}>Carregando...</p>

  const ehAdmin = euMesmo?.perfil === 'administrador' || euMesmo?.perfil === 'gestor'
  const negociosFiltrados = vendedorSelecionado === 'todos'
    ? negocios
    : negocios.filter(n => n.consultor?.id === vendedorSelecionado)
  const metasFiltradas = vendedorSelecionado === 'todos'
    ? metas
    : metas.filter(m => m.consultor_id === vendedorSelecionado)

  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
  const ganhosMes = negociosFiltrados.filter(n => n.etapa === 'ganha' && new Date(n.atualizado_em) >= inicioMes)

  const faturados = ganhosMes.filter(n => n.status_faturamento === 'faturado')
  const previstos = ganhosMes.filter(n => n.status_faturamento !== 'faturado')
  const aprovadosProximoMes = negociosFiltrados.filter(n => n.etapa === 'faturamento_proximo_mes')
  const negociacao = negociosFiltrados.filter(n => n.etapa === 'negociacao_decisao')

  const meta = metasFiltradas.reduce((s, m) => s + (m.valor_meta || 0), 0)
  const totalFaturado = faturados.reduce((s, n) => s + (n.valor_final || n.valor_cotacao || 0), 0)
  const totalPrevisto = previstos.reduce((s, n) => s + (n.valor_final || n.valor_cotacao || 0), 0)
  const totalProximoMes = aprovadosProximoMes.reduce((s, n) => s + (n.valor_final || n.valor_cotacao || 0), 0)
  const totalPrevistoMes = totalFaturado + totalPrevisto
  const totalNegociacao = negociacao.reduce((s, n) => s + (n.valor_cotacao || 0), 0)
  const saldoParaMeta = meta - totalPrevistoMes
  const percentualMeta = meta > 0 ? (totalPrevistoMes / meta * 100) : 0

  function exportarExcel() {
    const linhas = []
    linhas.push(['FATURAMENTO'])
    linhas.push([])
    linhas.push(['META', meta])
    linhas.push(['FATURADO', totalFaturado])
    linhas.push([])
    linhas.push(['Faturado no mês (detalhado)'])
    faturados.forEach(n => linhas.push([n.cliente?.razao_social, n.valor_final || n.valor_cotacao || 0]))
    linhas.push([])
    linhas.push(['Aprovado próximo mês'])
    aprovadosProximoMes.forEach(n => linhas.push([n.cliente?.razao_social, n.valor_final || n.valor_cotacao || 0]))
    linhas.push(['Total aprovado próximo mês', totalProximoMes])
    linhas.push([])
    linhas.push(['Orçamentos aprovados fatura no mês'])
    previstos.forEach(n => linhas.push([n.cliente?.razao_social, n.valor_final || n.valor_cotacao || 0]))
    linhas.push(['Total previsto (esta lista)', totalPrevisto])
    linhas.push(['TOTAL PREVISTO MÊS (previsto + faturado)', totalPrevistoMes])
    linhas.push([])
    linhas.push(['Orçamentos em Negociação'])
    negociacao.forEach(n => linhas.push([n.cliente?.razao_social, n.valor_cotacao || 0]))
    linhas.push(['TOTAL EM NEGOCIAÇÃO', totalNegociacao])
    linhas.push([])
    linhas.push(['SALDO PARA A META', saldoParaMeta])

    const ws = XLSX.utils.aoa_to_sheet(linhas)
    ws['!cols'] = [{ wch: 32 }, { wch: 16 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Provisionado')
    const dataStr = agora.toLocaleDateString('pt-BR').replace(/\//g, '-')
    XLSX.writeFile(wb, `provisionado-${dataStr}.xlsx`)
  }

  return (
    <div style={{ padding: 24, color: TEMA.textoPrincipal }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Provisionado — {agora.toLocaleDateString('pt-BR')}</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {ehAdmin && (
            <select value={vendedorSelecionado} onChange={e => setVendedorSelecionado(e.target.value)} style={selectVendedor}>
              <option value="todos">Todos os vendedores</option>
              {consultores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          )}
          <button onClick={exportarExcel} style={botaoExportar}>⬇ Baixar Excel</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0,1fr))', gap: 12, marginBottom: 20 }}>
        <Card label="Meta" valor={formatarMoeda(meta)} />
        <Card label="Faturado" valor={formatarMoeda(totalFaturado)} cor="#3b6d11" />
        <Card label="Previsto (aprovado, pendente de faturar)" valor={formatarMoeda(totalPrevisto)} cor="#8a6d1f" />
        <CardVerdeClaro label="Aprovado próximo mês" valor={formatarMoeda(totalProximoMes)} />
        <Card label="Previsto + Faturado no mês" valor={formatarMoeda(totalPrevistoMes)} sub={`${percentualMeta.toFixed(0)}% da meta`} />
        <Card label="Saldo para a meta" valor={formatarMoeda(saldoParaMeta)} cor={saldoParaMeta > 0 ? '#a32d2d' : '#3b6d11'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16 }}>
        <Tabela
          titulo="Faturado no mês"
          itens={faturados.map(n => ({ nome: n.cliente?.razao_social, valor: n.valor_final || n.valor_cotacao || 0 }))}
          total={totalFaturado}
          totalLabel="Total faturado"
        />
        <TabelaVerdeClaro
          titulo="Aprovado próximo mês"
          itens={aprovadosProximoMes.map(n => ({ nome: n.cliente?.razao_social, valor: n.valor_final || n.valor_cotacao || 0 }))}
          total={totalProximoMes}
          totalLabel="Total aprovado próximo mês"
        />
        <Tabela
          titulo="Orçamentos aprovados fatura no mês"
          itens={previstos.map(n => ({ nome: n.cliente?.razao_social, valor: n.valor_final || n.valor_cotacao || 0 }))}
          total={totalPrevisto}
          totalLabel="Total previsto (esta lista)"
        />
        <Tabela
          titulo="Orçamentos em Negociação"
          itens={negociacao.map(n => ({ nome: n.cliente?.razao_social, valor: n.valor_cotacao || 0 }))}
          total={totalNegociacao}
          totalLabel="TOTAL EM NEGOCIAÇÃO"
        />
      </div>

      <p style={{ fontSize: 11, color: '#999', marginTop: 16 }}>
        Negociação é só informativo aqui — não entra na conta do saldo pra meta. "Aprovado próximo mês" mostra os negócios que estão na etapa "Faturamento próximo mês" do pipeline — mova o card pra Ganha quando puder faturar de verdade.
      </p>
    </div>
  )
}

function Tabela({ titulo, itens, total, totalLabel }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 14, color: '#222' }}>
      <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 8px', background: '#F1E9DD', padding: '6px 8px', borderRadius: 6 }}>{titulo}</p>
      <div style={{ maxHeight: 260, overflowY: 'auto' }}>
        {itens.map((it, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid #f2f2f2' }}>
            <span>{it.nome}</span>
            <span style={{ fontWeight: 600 }}>{formatarMoeda(it.valor)}</span>
          </div>
        ))}
        {itens.length === 0 && <p style={{ fontSize: 12, color: '#999' }}>Nenhum negócio.</p>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginTop: 8, paddingTop: 8, borderTop: '1px solid #ddd' }}>
        <span>{totalLabel}</span>
        <span>{formatarMoeda(total)}</span>
      </div>
    </div>
  )
}

function CardVerdeClaro({ label, valor }) {
  return (
    <div style={{ background: '#DFF5D8', border: '1px solid #B9E3AC', borderRadius: 10, padding: 14 }}>
      <p style={{ fontSize: 12, color: '#3b6d11', margin: '0 0 6px' }}>{label}</p>
      <p style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#245209' }}>{valor}</p>
    </div>
  )
}

function TabelaVerdeClaro({ titulo, itens, total, totalLabel }) {
  return (
    <div style={{ background: '#DFF5D8', border: '1px solid #B9E3AC', borderRadius: 10, padding: 14, color: '#245209' }}>
      <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 8px', background: '#C7EABB', padding: '6px 8px', borderRadius: 6 }}>{titulo}</p>
      <div style={{ maxHeight: 260, overflowY: 'auto' }}>
        {itens.map((it, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid #C7EABB' }}>
            <span>{it.nome}</span>
            <span style={{ fontWeight: 600 }}>{formatarMoeda(it.valor)}</span>
          </div>
        ))}
        {itens.length === 0 && <p style={{ fontSize: 12, color: '#4C7A30' }}>Nenhum negócio.</p>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginTop: 8, paddingTop: 8, borderTop: '1px solid #B9E3AC' }}>
        <span>{totalLabel}</span>
        <span>{formatarMoeda(total)}</span>
      </div>
    </div>
  )
}

function Card({ label, valor, cor, sub }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 14 }}>
      <p style={{ fontSize: 12, color: '#777', margin: '0 0 6px' }}>{label}</p>
      <p style={{ fontSize: 20, fontWeight: 700, margin: 0, color: cor || '#222' }}>{valor}</p>
      {sub && <p style={{ fontSize: 11, color: '#999', margin: '4px 0 0' }}>{sub}</p>}
    </div>
  )
}

const botaoExportar = {
  background: '#3b6d11', color: '#fff', border: 'none', borderRadius: 8,
  padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
}

const selectVendedor = {
  padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, background: '#fff', color: '#222',
}
