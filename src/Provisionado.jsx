import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import { listarNegocios, listarMetasMes } from './api'
import { formatarMoeda } from './constants'

export default function Provisionado() {
  const [negocios, setNegocios] = useState([])
  const [metas, setMetas] = useState([])
  const [carregando, setCarregando] = useState(true)

  const agora = new Date()

  useEffect(() => {
    Promise.all([listarNegocios(), listarMetasMes(agora.getFullYear(), agora.getMonth() + 1)]).then(([n, m]) => {
      setNegocios(n)
      setMetas(m)
      setCarregando(false)
    })
  }, [])

  if (carregando) return <p style={{ padding: 24 }}>Carregando...</p>

  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
  const ganhosMes = negocios.filter(n => n.etapa === 'ganha' && new Date(n.atualizado_em) >= inicioMes)

  const faturados = ganhosMes.filter(n => n.status_faturamento === 'faturado')
  const previstos = ganhosMes.filter(n => n.status_faturamento !== 'faturado') // previsto ou sem status ainda
  const negociacao = negocios.filter(n => n.etapa === 'negociacao_decisao')

  const meta = metas.reduce((s, m) => s + (m.valor_meta || 0), 0)
  const totalFaturado = faturados.reduce((s, n) => s + (n.valor_final || 0), 0)
  const totalPrevisto = previstos.reduce((s, n) => s + (n.valor_final || n.valor_cotacao || 0), 0)
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
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Provisionado — {agora.toLocaleDateString('pt-BR')}</p>
        <button onClick={exportarExcel} style={botaoExportar}>⬇ Baixar Excel</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 12, marginBottom: 20 }}>
        <Card label="Meta" valor={formatarMoeda(meta)} />
        <Card label="Faturado" valor={formatarMoeda(totalFaturado)} cor="#3b6d11" />
        <Card label="Previsto (aprovado, pendente de faturar)" valor={formatarMoeda(totalPrevisto)} cor="#8a6d1f" />
        <Card label="Previsto + Faturado no mês" valor={formatarMoeda(totalPrevistoMes)} sub={`${percentualMeta.toFixed(0)}% da meta`} />
        <Card label="Saldo para a meta" valor={formatarMoeda(saldoParaMeta)} cor={saldoParaMeta > 0 ? '#a32d2d' : '#3b6d11'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 16 }}>
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
        Negociação é só informativo aqui — não entra na conta do saldo pra meta.
      </p>
    </div>
  )
}

function Tabela({ titulo, itens, total, totalLabel }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 14 }}>
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
