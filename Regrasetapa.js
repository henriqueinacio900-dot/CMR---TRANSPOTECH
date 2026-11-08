// Regras de negócio por etapa — funções puras (sem React, sem banco), fáceis de testar.

export const ORDEM_FUNIL = {
  prospeccao: 1,
  contato_realizado: 2,
  orcamento_enviado: 3,
  negociacao_decisao: 4,
  faturamento_proximo_mes: 5,
  ganha: 6,
}

export const RESULTADOS_CONTATO = [
  { key: 'atendeu_conversa', label: 'Atendeu — conversa realizada' },
  { key: 'pediu_retorno', label: 'Cliente pediu retorno' },
  { key: 'aguardando_cliente', label: 'Aguardando resposta do cliente' },
  { key: 'nao_atendeu', label: 'Não atendeu' },
  { key: 'sem_interesse_momento', label: 'Sem interesse no momento' },
]

export const CANAIS_CONTATO = [
  { key: 'ligacao', label: 'Ligação' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'email', label: 'E-mail' },
  { key: 'visita', label: 'Visita' },
  { key: 'reuniao', label: 'Reunião' },
  { key: 'outro', label: 'Outro' },
]

// Orçamento enviado: mesma validação na criação direta e na mudança de etapa.
export function validarOrcamento({ numero_orcamento, valor_cotacao, proxima_acao, proxima_acao_data }) {
  const erros = {}
  if (!String(numero_orcamento || '').trim()) erros.numero_orcamento = 'Informe o número do orçamento.'
  const valor = Number(valor_cotacao)
  if (!valor_cotacao || !(valor > 0)) erros.valor_cotacao = 'Informe o valor do orçamento.'
  if (!proxima_acao) erros.proxima_acao = 'Escolha a próxima ação.'
  if (!proxima_acao_data) erros.proxima_acao_data = 'Informe a data da próxima ação.'
  return erros
}

// Registrar contato: canal, resultado, próxima ação e data são obrigatórios.
export function validarContato({ canal, resultado, proxima_acao, proxima_acao_data }) {
  const erros = {}
  if (!canal) erros.canal = 'Escolha o canal.'
  if (!resultado) erros.resultado = 'Escolha o resultado da conversa.'
  if (!proxima_acao) erros.proxima_acao = 'Escolha a próxima ação.'
  if (!proxima_acao_data) erros.proxima_acao_data = 'Informe a data da próxima ação.'
  return erros
}

function semAcento(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// "Compra adiada" é identificada pelo texto do motivo (a lista de motivos é editável).
export function ehMotivoCompraAdiada(descricao) {
  return semAcento(descricao).includes('adiad')
}

// Perdida: motivo obrigatório; se for compra adiada, data de retomada obrigatória e futura.
export function validarPerdida({ motivo_perda_id, motivo_descricao, data_retomada }, hojeStr = new Date().toISOString().slice(0, 10)) {
  const erros = {}
  if (!motivo_perda_id) erros.motivo_perda_id = 'Escolha o motivo da perda.'
  if (ehMotivoCompraAdiada(motivo_descricao)) {
    if (!data_retomada) erros.data_retomada = 'Informe quando retomar a negociação.'
    else if (data_retomada <= hojeStr) erros.data_retomada = 'A data de retomada precisa ser futura.'
  }
  return erros
}

// Ganha: se ainda não faturou, precisa de previsão de faturamento.
export function validarGanha({ status_faturamento, previsao_faturamento }) {
  const erros = {}
  if (status_faturamento !== 'faturado' && !previsao_faturamento) {
    erros.previsao_faturamento = 'Informe a previsão de faturamento.'
  }
  return erros
}

// Departamento padrão do vendedor: só quando há uma associação única e válida no perfil.
export function departamentoPadrao(euMesmo, departamentos) {
  const id = euMesmo?.departamento_id
  if (!id) return ''
  return (departamentos || []).some(d => d.id === id) ? id : ''
}

export function temErros(erros) {
  return Object.keys(erros).length > 0
}

export function hojeISO() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function primeiroDiaProximoMesISO(base = new Date()) {
  const d = new Date(base.getFullYear(), base.getMonth() + 1, 1)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Sugestão de data/hora para o retorno combinado: próximo dia útil às 09:00 (formato datetime-local).
export function sugestaoProximoRetorno(base = new Date()) {
  const d = new Date(base)
  d.setDate(d.getDate() + 1)
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1)
  d.setHours(9, 0, 0, 0)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// O retorno combinado com o cliente (origem 'manual') vale mais que o lembrete automático
// da cadência pós-orçamento enquanto não vencer.
export function cadenciaDevePular(negocio, agora = new Date()) {
  return negocio?.proxima_acao_origem === 'manual'
    && !!negocio?.proxima_acao_data
    && new Date(negocio.proxima_acao_data) >= agora
}