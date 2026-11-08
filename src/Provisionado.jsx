import { useEffect, useState } from 'react'
import { TEMA } from './theme'
import * as XLSX from 'xlsx'
import { listarNegocios, listarMetasMes, listarConsultores, getMeuConsultor } from './api'
import { formatarMoeda } from './constants'
import { classificarProvisionado, linhasPorVendedor, valorNegocio } from './provisionadoCalc'

export default function Provisionado() {
  const [negocios, setNegocios] = useState([])
  const [metas, setMetas] = useState([])
  const [consultores, setConsultores] = useState([])
  const [euMesmo, setEuMesmo] = useState(null)
  const [vendedorSelecionado, setVendedorSelecionado] = useState('todos')
  const [carregando, setCarregando] = useState(true)

  const agora = new Date()
  const primeiroDiaMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString().slice(0, 10)
  const hojeStr = agora.toISOString().slice(0, 10)
  const [dataInicio, setDataInicio] = useState(primeiroDiaMes)
  const [dataFim, setDataFim] = useState(hojeStr)

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

  const inicioPeriodo = new Date(dataInicio + 'T00:00:00')
  const fimPeriodo = new Date(dataFim + 'T23:59:59')
  const classif = classificarProvisionado(negociosFiltrados, inicioPeriodo, fimPeriodo)
  const { faturados, previstos, aprovadosProximoMes, ganhasProximoMes, negociacao } = classif
  const porVendedor = linhasPorVendedor(negociosFiltrados, inicioPeriodo, fimPeriodo)

  // "Próximo mês" = etapa Faturamento próximo mês (lembrete) + vendas Ganhas com previsão de faturar no mês seguinte
  const itensProximoMes = [
    ...aprovadosProximoMes.map(n => ({ nome: n.cliente?.razao_social, valor: valorNegocio(n) })),
    ...ganhasProximoMes.map(n => ({
      nome: `${n.cliente?.razao_social} (Ganha · prev. ${new Date(n.previsao_faturamento + 'T12:00:00').toLocaleDateString('pt-BR')})`,
      valor: valorNegocio(n),
    })),
  ]

  const meta = metasFiltradas.reduce((s, m) => s + (m.valor_meta || 0), 0)
  const totalFaturado = faturados.reduce((s, n) => s + valorNegocio(n), 0)
  const totalPrevisto = previstos.reduce((s, n) => s + valorNegocio(n), 0)
  const totalProximoMes = itensProximoMes.reduce((s, it) => s + it.valor, 0)
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
    linhas.push(['Faturado no período (detalhado)'])
    faturados.forEach(n => linhas.push([n.cliente?.razao_social, n.valor_final || n.valor_cotacao || 0]))
    linhas.push([])
    linhas.push(['Aprovado próximo mês'])
    itensProximoMes.forEach(it => linhas.push([it.nome, it.valor]))
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

    const linhasVend = [['Vendedor', 'Orçamento + Negociação', 'Próximo mês', 'Faturado', 'Previsto a faturar', 'Provisionado de fato']]
    porVendedor.linhas.forEach(l => linhasVend.push([l.nome, l.orcamentoNegociacao, l.proximoMes, l.faturado, l.previsto, l.provisionado]))
    linhasVend.push(['TOTAL', porVendedor.total.orcamentoNegociacao, porVendedor.total.proximoMes, porVendedor.total.faturado, porVendedor.total.previsto, porVendedor.total.provisionado])
    const wsV = XLSX.utils.aoa_to_sheet(linhasVend)
    wsV['!cols'] = [{ wch: 28 }, { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(wb, wsV, 'Por vendedor')
    const dataStr = `${dataInicio}_a_${dataFim}`
    XLSX.writeFile(wb, `provisionado-${dataStr}.xlsx`)
  }

  return (
    <div style={{ padding: 24, color: TEMA.textoPrincipal }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
          Provisionado — {new Date(dataInicio + 'T00:00:00').toLocaleDateString('pt-BR')} até {new Date(dataFim + 'T00:00:00').toLocaleDateString('pt-BR')}
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={selectVendedor} />
          <span style={{ fontSize: 12, color: '#999' }}>até</span>
          <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={selectVendedor} />
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

      <TabelaPorVendedor dados={porVendedor} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16 }}>
        <Tabela
          titulo="Faturado no período"
          itens={faturados.map(n => ({ nome: n.cliente?.razao_social, valor: valorNegocio(n) }))}
          total={totalFaturado}
          totalLabel="Total faturado"
        />
        <TabelaVerdeClaro
          titulo="Aprovado próximo mês"
          itens={itensProximoMes}
          total={totalProximoMes}
          totalLabel="Total aprovado próximo mês"
        />
        <Tabela
          titulo="Orçamentos aprovados fatura no mês"
          itens={previstos.map(n => ({ nome: n.cliente?.razao_social, valor: valorNegocio(n) }))}
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
        Negociação é só informativo aqui — não entra na conta do saldo pra meta. "Aprovado próximo mês" reúne os negócios da etapa "Faturamento próximo mês" do pipeline e as vendas já Ganhas com previsão de faturar no mês seguinte — essas continuam Ganhas no comercial e só mudam de mês aqui no Provisionado. A Meta exibida é sempre a do mês corrente, mesmo se você escolher um período diferente acima.
      </p>
    </div>
  )
}

function TabelaPorVendedor({ dados }) {
  const { linhas, total } = dados
  const th = { padding: '8px 10px', textAlign: 'right', fontSize: 12, color: '#555', fontWeight: 700, background: '#F1E9DD' }
  const td = { padding: '8px 10px', textAlign: 'right', fontSize: 13, borderBottom: '1px solid #f2f2f2' }
  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 14, color: '#222', marginBottom: 20, overflowX: 'auto' }}>
      <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 8px' }}>Por vendedor</p>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
        <thead>
          <tr>
            <th style={{ ...th, textAlign: 'left', borderRadius: '6px 0 0 6px' }}>Vendedor</th>
            <th style={th}>Orçamento + Negociação</th>
            <th style={{ ...th, background: '#C7EABB', color: '#245209' }}>Próximo mês</th>
            <th style={{ ...th, borderRadius: '0 6px 6px 0' }}>Provisionado de fato</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map(l => (
            <tr key={l.id}>
              <td style={{ ...td, textAlign: 'left', fontWeight: 600 }}>{l.nome}</td>
              <td style={td}>{formatarMoeda(l.orcamentoNegociacao)}<span style={subQtd}> · {l.qtdOrcNeg}</span></td>
              <td style={{ ...td, background: '#F3FBF0', color: '#245209' }}>{formatarMoeda(l.proximoMes)}<span style={subQtd}> · {l.qtdProximoMes}</span></td>
              <td style={td}>
                <strong>{formatarMoeda(l.provisionado)}</strong>
                <span style={subQtd}> faturado {formatarMoeda(l.faturado)} · a faturar {formatarMoeda(l.previsto)}</span>
              </td>
            </tr>
          ))}
          {linhas.length === 0 && (
            <tr><td colSpan={4} style={{ ...td, textAlign: 'left', color: '#999' }}>Nenhum valor no período.</td></tr>
          )}
        </tbody>
        {linhas.length > 0 && (
          <tfoot>
            <tr style={{ fontWeight: 700 }}>
              <td style={{ ...td, textAlign: 'left', borderTop: '2px solid #ddd' }}>Total</td>
              <td style={{ ...td, borderTop: '2px solid #ddd' }}>{formatarMoeda(total.orcamentoNegociacao)}</td>
              <td style={{ ...td, borderTop: '2px solid #ddd', background: '#F3FBF0', color: '#245209' }}>{formatarMoeda(total.proximoMes)}</td>
              <td style={{ ...td, borderTop: '2px solid #ddd' }}>{formatarMoeda(total.provisionado)}</td>
            </tr>
          </tfoot>
        )}
      </table>
      <p style={{ fontSize: 11, color: '#999', margin: '8px 0 0' }}>
        Orçamento + Negociação: carteira aberta agora (valor da cotação). Próximo mês: etapa Faturamento próximo mês + Ganhas com previsão no mês seguinte. Provisionado de fato: faturado + previsto no período (mesma regra do card "Previsto + Faturado no mês").
      </p>
    </div>
  )
}

const subQtd = { fontSize: 11, color: '#999', fontWeight: 400 }

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
