// Cálculos do Provisionado — funções puras.
import { paraData } from './funilConversao'

export const valorNegocio = n => n.valor_final || n.valor_cotacao || 0

function indiceMes(valor) {
  const d = paraData(valor)
  return d ? d.getFullYear() * 12 + d.getMonth() : null
}

// Ganha, ainda não faturada, com previsão de faturar em mês POSTERIOR ao fim do período.
// Continua Ganha no comercial; no Provisionado aparece como "Próximo mês".
export function ehGanhaParaProximoMes(n, fim) {
  if (n.etapa !== 'ganha' || n.status_faturamento === 'faturado' || !n.previsao_faturamento) return false
  return indiceMes(n.previsao_faturamento) > indiceMes(fim)
}

export function classificarProvisionado(negocios, inicio, fim) {
  const ganhosPeriodo = negocios.filter(n => {
    if (n.etapa !== 'ganha') return false
    const d = paraData(n.atualizado_em)
    return !!d && d >= inicio && d <= fim
  })
  const faturados = ganhosPeriodo.filter(n => n.status_faturamento === 'faturado')
  const naoFaturados = ganhosPeriodo.filter(n => n.status_faturamento !== 'faturado')
  const ganhasProximoMes = naoFaturados.filter(n => ehGanhaParaProximoMes(n, fim))
  const previstos = naoFaturados.filter(n => !ehGanhaParaProximoMes(n, fim))
  const aprovadosProximoMes = negocios.filter(n => n.etapa === 'faturamento_proximo_mes')
  const negociacao = negocios.filter(n => n.etapa === 'negociacao_decisao')
  const orcamentoNegociacao = negocios.filter(n => n.etapa === 'orcamento_enviado' || n.etapa === 'negociacao_decisao')
  return { ganhosPeriodo, faturados, previstos, ganhasProximoMes, aprovadosProximoMes, negociacao, orcamentoNegociacao }
}

// Uma linha por vendedor:
//  - Orçamento + Negociação: carteira aberta (valor da cotação)
//  - Próximo mês: etapa "Faturamento próximo mês" + Ganhas com previsão de faturar no mês seguinte
//  - Provisionado de fato: Previsto + Faturado no período (mesma regra do card "Previsto + Faturado no mês")
export function linhasPorVendedor(negocios, inicio, fim) {
  const c = classificarProvisionado(negocios, inicio, fim)
  const mapa = new Map()
  const linha = n => {
    const id = n.consultor?.id || 'sem'
    if (!mapa.has(id)) {
      mapa.set(id, {
        id, nome: n.consultor?.nome || 'Sem responsável',
        orcamentoNegociacao: 0, qtdOrcNeg: 0, proximoMes: 0, qtdProximoMes: 0,
        faturado: 0, previsto: 0, provisionado: 0,
      })
    }
    return mapa.get(id)
  }
  c.orcamentoNegociacao.forEach(n => { const l = linha(n); l.orcamentoNegociacao += n.valor_cotacao || 0; l.qtdOrcNeg++ })
  c.aprovadosProximoMes.forEach(n => { const l = linha(n); l.proximoMes += valorNegocio(n); l.qtdProximoMes++ })
  c.ganhasProximoMes.forEach(n => { const l = linha(n); l.proximoMes += valorNegocio(n); l.qtdProximoMes++ })
  c.faturados.forEach(n => { const l = linha(n); l.faturado += valorNegocio(n) })
  c.previstos.forEach(n => { const l = linha(n); l.previsto += valorNegocio(n) })
  const linhas = [...mapa.values()].map(l => ({ ...l, provisionado: l.faturado + l.previsto }))
  linhas.sort((a, b) => b.provisionado - a.provisionado || a.nome.localeCompare(b.nome))
  const total = linhas.reduce((t, l) => ({
    orcamentoNegociacao: t.orcamentoNegociacao + l.orcamentoNegociacao,
    qtdOrcNeg: t.qtdOrcNeg + l.qtdOrcNeg,
    proximoMes: t.proximoMes + l.proximoMes,
    qtdProximoMes: t.qtdProximoMes + l.qtdProximoMes,
    faturado: t.faturado + l.faturado,
    previsto: t.previsto + l.previsto,
    provisionado: t.provisionado + l.provisionado,
  }), { orcamentoNegociacao: 0, qtdOrcNeg: 0, proximoMes: 0, qtdProximoMes: 0, faturado: 0, previsto: 0, provisionado: 0 })
  return { linhas, total, classificado: c }
}