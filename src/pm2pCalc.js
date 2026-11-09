// Regras de cálculo e validação da Proposta PM2P (sem tela, para poder testar).

export const DIARIAS_OPCOES = [
  { valor: 0.5, label: '1/2 diária' },
  { valor: 1, label: '1 diária' },
  { valor: 2, label: '2 diárias' },
  { valor: 3, label: '3 diárias' },
  { valor: 4, label: '4 diárias' },
  { valor: 5, label: '5 diárias' },
]
export const DIAS_SEMANA = [
  { key: 'seg', label: 'Segunda' },
  { key: 'ter', label: 'Terça' },
  { key: 'qua', label: 'Quarta' },
  { key: 'qui', label: 'Quinta' },
  { key: 'sex', label: 'Sexta' },
]
export const VALIDADES_MESES = [3, 6, 9, 12]

// Alíquotas e parâmetros da planilha (todos editáveis na tela).
// Despesa ADM começa em 0%: no modelo enviado ela aparece como 2% mas o resultado é calculado sem ela.
export const ALIQUOTAS_PADRAO = {
  encargosMaoObra: 70, pisCofins: 9.25, iss: 4, inss: 0,
  irNormal: 15, irAdicional: 10, csll: 9, despesaAdm: 0,
}
export const HORAS_DISPONIVEIS_PADRAO = 1068
export const LINHAS_MAO_DE_OBRA = 5

export const DESPESAS_CAMPOS = [
  { key: 'epiUniforme', label: 'Despesa EPI/Uniforme' },
  { key: 'art', label: 'ART' },
  { key: 'valeTransporte', label: 'Vale transporte' },
  { key: 'planoSaude', label: 'Plano saúde' },
  { key: 'maquinasReserva', label: 'Máquinas reserva' },
  { key: 'carroOficina', label: 'Carro oficina' },
  { key: 'alimentacao', label: 'Alimentação' },
  { key: 'cesta', label: 'Cesta' },
]

const n = v => {
  const x = Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(x) ? x : 0
}
const r2 = v => Math.round((v + Number.EPSILON) * 100) / 100

export function precificacaoVazia() {
  return {
    maoDeObra: Array.from({ length: LINHAS_MAO_DE_OBRA }, () => ({ funcao: '', qtde: '', valorUnit: '' })),
    valorReceita: '',
    despesas: Object.fromEntries(DESPESAS_CAMPOS.map(d => [d.key, ''])),
    aliquotas: { ...ALIQUOTAS_PADRAO },
    horasDisponiveis: HORAS_DISPONIVEIS_PADRAO,
  }
}

// Reproduz a planilha "Custos diretos da emissão de NF".
export function calcularPrecificacao(p) {
  const enc = n(p.aliquotas?.encargosMaoObra)
  const linhas = (p.maoDeObra || []).map(l => {
    const total = r2(n(l.qtde) * n(l.valorUnit))
    const imposto = r2(total * enc / 100)
    return { ...l, total, imposto, totalComImpostos: r2(total + imposto) }
  })
  const custoMecanico = r2(linhas.reduce((s, l) => s + l.totalComImpostos, 0))
  const qtdeTotal = linhas.reduce((s, l) => s + n(l.qtde), 0)
  const totalMaoObra = r2(linhas.reduce((s, l) => s + l.total, 0))
  const impostoMaoObra = r2(linhas.reduce((s, l) => s + l.imposto, 0))

  const receita = n(p.valorReceita)
  const a = p.aliquotas || {}
  const pisCofins = r2(receita * n(a.pisCofins) / 100)
  const iss = r2(receita * n(a.iss) / 100)
  const inss = r2(receita * n(a.inss) / 100)
  const despesaAdm = r2(receita * n(a.despesaAdm) / 100)
  const d = p.despesas || {}
  const despesasDiretas = DESPESAS_CAMPOS.reduce((s, c) => s + n(d[c.key]), 0)

  const totalCustos = r2(pisCofins + iss + inss + custoMecanico + despesasDiretas + despesaAdm)
  const resultadoAntesIR = r2(receita - totalCustos)
  const base = Math.max(0, resultadoAntesIR) // sem lucro, sem imposto de renda
  const irNormal = r2(base * n(a.irNormal) / 100)
  const irAdicional = r2(base * n(a.irAdicional) / 100)
  const csll = r2(base * n(a.csll) / 100)
  const totalResultado = r2(resultadoAntesIR - irNormal - irAdicional - csll)
  const percentual = receita > 0 ? r2(totalResultado / receita * 100) : 0

  const horas = n(p.horasDisponiveis)
  const custoHora100 = horas > 0 ? r2(totalCustos / horas) : 0
  const custoHora67 = horas > 0 ? r2(totalCustos / (horas * 0.67)) : 0

  return {
    linhas, qtdeTotal, totalMaoObra, impostoMaoObra, custoMecanico,
    receita, pisCofins, iss, inss, despesaAdm, despesasDiretas,
    totalCustos, resultadoAntesIR, irNormal, irAdicional, csll,
    totalResultado, percentual, custoHora100, custoHora67,
  }
}

// ---- validação do formulário da proposta ----
export function validarProposta(f) {
  const e = {}
  if (!(n(f.maquinas) > 0)) e.maquinas = 'Informe o número de máquinas.'
  if (!(n(f.diariasSemana) > 0)) e.diariasSemana = 'Escolha as diárias por semana.'
  const dias = f.dias || []
  if (dias.length === 0) e.dias = 'Marque os dias da semana.'
  else if (n(f.diariasSemana) > 0 && dias.length !== Math.ceil(n(f.diariasSemana))) {
    e.dias = `Marque ${Math.ceil(n(f.diariasSemana))} dia(s), conforme as diárias por semana.`
  }
  if (!(n(f.tecnicos) > 0)) e.tecnicos = 'Informe quantos técnicos.'
  if (!(n(f.horaComercial) > 0)) e.horaComercial = 'Informe o valor da hora comercial.'
  if (!(n(f.horaExtra) > 0)) e.horaExtra = 'Informe o valor da hora extra.'
  if (!(n(f.horaEspecial) > 0)) e.horaEspecial = 'Informe o valor de domingos/feriados.'
  if (f.kmExcedente === '' || f.kmExcedente == null || n(f.kmExcedente) < 0) e.kmExcedente = 'Informe o valor por km.'
  if (!VALIDADES_MESES.includes(Number(f.validadeMeses))) e.validadeMeses = 'Escolha a validade do contrato.'
  if (!(n(f.precificacao?.valorReceita) > 0)) e.valorReceita = 'Informe o investimento mensal (valor receita).'
  return e
}

// ---- datas ----
// Soma meses mantendo o dia (31/08 + 6 meses = 28/02 ou 29/02, nunca pula de mês).
export function addMeses(dataISO, meses) {
  const [y, m, d] = dataISO.slice(0, 10).split('-').map(Number)
  const alvo = new Date(y, m - 1 + Number(meses), 1)
  const ultimo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate()
  alvo.setDate(Math.min(d, ultimo))
  const p = x => String(x).padStart(2, '0')
  return `${alvo.getFullYear()}-${p(alvo.getMonth() + 1)}-${p(alvo.getDate())}`
}

export function dataExtensa(date = new Date()) {
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
  return `${date.getDate()} de ${meses[date.getMonth()]} de ${date.getFullYear()}`
}

export function numeroProposta(date = new Date()) {
  const p = x => String(x).padStart(2, '0')
  const sufixo = Math.floor(1000 + Math.random() * 9000)
  return `PM2P-${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${sufixo}`
}

export function textoDiarias(v) {
  const x = Number(v)
  if (x === 0.5) return '1/2 diária'
  return `${x} diária${x === 1 ? '' : 's'}`
}
export function textoDias(dias) {
  const mapa = Object.fromEntries(DIAS_SEMANA.map(d => [d.key, d.label]))
  return (dias || []).map(k => mapa[k] || k).join(', ')
}