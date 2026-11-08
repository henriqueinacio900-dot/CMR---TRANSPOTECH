// Cálculos do funil — funções puras, calculadas pelo HISTÓRICO de avanço dos mesmos negócios.
import { ORDEM_FUNIL } from './regrasEtapa'

export const PASSOS_FUNIL = [
  { de: 'prospeccao', para: 'contato_realizado', rotulo: 'Prospecção → Contato realizado' },
  { de: 'contato_realizado', para: 'orcamento_enviado', rotulo: 'Contato realizado → Orçamento enviado' },
  { de: 'orcamento_enviado', para: 'negociacao_decisao', rotulo: 'Orçamento enviado → Negociação/decisão' },
  { de: 'negociacao_decisao', para: 'ganha', rotulo: 'Negociação/decisão → Ganha' },
]

export const ROTULO_ETAPA = {
  prospeccao: 'Prospecção',
  contato_realizado: 'Contato realizado',
  orcamento_enviado: 'Orçamento enviado',
  negociacao_decisao: 'Negociação/decisão',
  faturamento_proximo_mes: 'Faturamento próximo mês',
  ganha: 'Ganha',
}

// Data local segura: datas "YYYY-MM-DD" viram meio-dia, pra nunca cruzar o dia por fuso.
export function paraData(valor) {
  if (!valor) return null
  const s = String(valor)
  return new Date(s.length === 10 ? `${s}T12:00:00` : s)
}

function dentro(data, inicio, fim) {
  const d = paraData(data)
  return !!d && d >= inicio && d <= fim
}

// ---------- Taxa de ganho (único critério para Visão geral e Relatórios) ----------
// Ganhos ÷ (Ganhos + Perdidos), encerrados dentro do período.
// Ganha fecha em atualizado_em; Perdida fecha em data_perda.
export function taxaGanho(negocios, inicio, fim) {
  const ganhos = negocios.filter(n => n.etapa === 'ganha' && dentro(n.atualizado_em, inicio, fim)).length
  const perdidos = negocios.filter(n => n.etapa === 'perdida' && dentro(n.data_perda, inicio, fim)).length
  const total = ganhos + perdidos
  return { ganhos, perdidos, total, taxa: total > 0 ? (ganhos / total) * 100 : null }
}

// ---------- Volume por etapa (carteira atual) ----------
export function volumePorEtapa(negocios, etapas) {
  return etapas.map(e => {
    const itens = negocios.filter(n => n.etapa === e.key)
    return {
      key: e.key,
      label: e.label,
      qtd: itens.length,
      valor: itens.reduce((s, n) => s + (n.valor_final || n.valor_cotacao || 0), 0),
    }
  })
}

// ---------- Conversão entre etapas pelo histórico ----------
// transicoes: [{ negocio_id, etapa_anterior, etapa_nova, ocorrido_em, eh_entrada }]
// Mapa negocio_id -> { etapa: Date da PRIMEIRA entrada nela } (cada negócio conta uma vez por etapa)
export function primeirasEntradas(transicoes) {
  const mapa = new Map()
  for (const t of transicoes) {
    const quando = paraData(t.ocorrido_em)
    if (!quando) continue
    if (!mapa.has(t.negocio_id)) mapa.set(t.negocio_id, {})
    const porEtapa = mapa.get(t.negocio_id)
    if (!porEtapa[t.etapa_nova] || quando < porEtapa[t.etapa_nova]) porEtapa[t.etapa_nova] = quando
  }
  return mapa
}

// Grupo de entrada: negócios cuja 1ª entrada na etapa "de" caiu em [inicio, fim].
// Avançou: chegou, depois dessa entrada, à etapa "para" ou a uma posterior do funil.
// O numerador sempre sai do mesmo grupo do denominador (nunca passa de 100%).
export function calcularConversaoFunil({ negocios, transicoes, inicio, fim, minimoAmostra = 5 }) {
  const ids = new Set(negocios.map(n => n.id))
  const trans = transicoes.filter(t => ids.has(t.negocio_id))
  const entradas = primeirasEntradas(trans)

  const passos = PASSOS_FUNIL.map(p => {
    const ordemPara = ORDEM_FUNIL[p.para]
    let entraram = 0
    let avancaram = 0
    let aguardando = 0 // só no último passo: aprovados esperando em "Faturamento próximo mês"
    for (const id of ids) {
      const porEtapa = entradas.get(id)
      const quandoEntrou = porEtapa?.[p.de]
      if (!quandoEntrou || quandoEntrou < inicio || quandoEntrou > fim) continue
      entraram++
      let chegou = false
      let esperando = false
      for (const [etapa, quando] of Object.entries(porEtapa)) {
        if (quando < quandoEntrou) continue
        const ordem = ORDEM_FUNIL[etapa]
        if (ordem && ordem >= ordemPara) chegou = true
        if (etapa === 'faturamento_proximo_mes') esperando = true
      }
      if (chegou) avancaram++
      else if (p.para === 'ganha' && esperando) aguardando++
    }
    return {
      ...p,
      entraram,
      avancaram,
      aguardando,
      taxa: entraram > 0 ? (avancaram / entraram) * 100 : null,
      amostraPequena: entraram > 0 && entraram < minimoAmostra,
    }
  })

  // Quem tem a entrada registrada (criação) tem histórico confiável desde a 1ª etapa.
  const comEntrada = new Set(trans.filter(t => t.eh_entrada).map(t => t.negocio_id))
  const semHistoricoConfiavel = [...ids].filter(id => !comEntrada.has(id)).length

  // Negócios que começaram direto numa etapa posterior à Prospecção (no período).
  const comecaramDireto = {}
  for (const t of trans) {
    if (!t.eh_entrada || t.etapa_nova === 'prospeccao') continue
    if (!(ORDEM_FUNIL[t.etapa_nova] > 1)) continue
    if (!dentro(t.ocorrido_em, inicio, fim)) continue
    comecaramDireto[t.etapa_nova] = (comecaramDireto[t.etapa_nova] || 0) + 1
  }

  return {
    passos,
    totalNegocios: ids.size,
    semHistoricoConfiavel,
    comecaramDireto,
    historicoInsuficiente: ids.size > 0 && semHistoricoConfiavel / ids.size > 0.5,
  }
}