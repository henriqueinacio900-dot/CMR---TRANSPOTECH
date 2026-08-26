export const CORES_MARCA = {
  laranja: '#F77E01',
}

export const CORES_TEMPERATURA = {
  frio:   { grad: 'linear-gradient(135deg, #E6F1FB, #B5D4F4)', titulo: '#042C53', sub: '#185FA5' },
  morno:  { grad: 'linear-gradient(135deg, #FDF3D8, #E8B93A)', titulo: '#5A4508', sub: '#8A6D0F' },
  quente: { grad: 'linear-gradient(135deg, #FBDDB8, #E8820C)', titulo: '#5A2E00', sub: '#8A4700' },
}

export const CORES_PERDIDA = { grad: 'linear-gradient(135deg, #F6C6C6, #D9534F)', titulo: '#4A0A0A', sub: '#7A1F1F' }
export const CORES_FATURAMENTO_PROXIMO = { grad: 'linear-gradient(135deg, #DFF5D8, #A8DDA0)', titulo: '#1B3D0A', sub: '#2E5C17' }

export const CORES_GANHA = {
  faturado: { grad: 'linear-gradient(135deg, #B9E6A0, #5CAF3B)', titulo: '#1B3D0A', sub: '#2E5C17' },
  previsto: { grad: 'linear-gradient(135deg, #EAF6E0, #C4E8B0)', titulo: '#2E5C17', sub: '#4C7A30' },
}

// Funil (Oportunidade identificada removida a pedido)
export const ETAPAS = [
  { key: 'prospeccao', label: 'Prospecção' },
  { key: 'contato_realizado', label: 'Contato realizado' },
  { key: 'orcamento_enviado', label: 'Orçamento enviado' },
  { key: 'negociacao_decisao', label: 'Negociação/decisão' },
  { key: 'faturamento_proximo_mes', label: 'Faturamento próximo mês' },
  { key: 'ganha', label: 'Ganha' },
  { key: 'perdida', label: 'Perdida' },
]

export const SUBSTATUS_NEGOCIACAO = [
  { key: 'em_negociacao', label: 'Em negociação' },
  { key: 'aguardando_aprovacao', label: 'Aguardando aprovação' },
  { key: 'aguardando_pedido', label: 'Aguardando pedido' },
  { key: 'aguardando_retorno', label: 'Aguardando retorno do cliente' },
]

export const TIPOS_CONTATO = ['ligacao', 'whatsapp', 'presencial', 'email']

export const PAPEIS_CONTATO = [
  { key: 'decisor', label: 'Decisor' },
  { key: 'influenciador', label: 'Influenciador' },
  { key: 'comprador', label: 'Comprador' },
  { key: 'usuario', label: 'Usuário' },
  { key: 'contato_operacional', label: 'Contato operacional' },
]

export const ORIGENS = [
  { key: 'carteira', label: 'Carteira' },
  { key: 'recompra', label: 'Recompra' },
  { key: 'prospeccao_ativa', label: 'Prospecção ativa' },
  { key: 'indicacao', label: 'Indicação' },
  { key: 'site', label: 'Site' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'campanha', label: 'Campanha' },
  { key: 'visita', label: 'Visita' },
  { key: 'evento', label: 'Evento' },
  { key: 'outro', label: 'Outro' },
]

export const PROXIMAS_ACOES = [
  { key: 'ligacao', label: 'Ligação' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'email', label: 'E-mail' },
  { key: 'visita', label: 'Visita' },
  { key: 'reuniao', label: 'Reunião' },
  { key: 'enviar_orcamento', label: 'Enviar orçamento' },
  { key: 'revisar_proposta', label: 'Revisar proposta' },
  { key: 'cobrar_decisao', label: 'Cobrar decisão' },
  { key: 'pos_venda', label: 'Pós-venda' },
  { key: 'outro', label: 'Outro' },
]

export const URGENCIAS = [
  { key: 'baixa', label: 'Baixa' },
  { key: 'media', label: 'Média' },
  { key: 'alta', label: 'Alta' },
]

// PCI — perguntas e pontuação
export const PERGUNTAS_PCI = [
  {
    campo: 'qtd_maquinas_pontos',
    pergunta: 'Quantas máquinas o cliente possui?',
    opcoes: [
      { label: '1 a 3 máquinas', pontos: 1 },
      { label: '4 a 10 máquinas', pontos: 2 },
      { label: '11 a 30 máquinas', pontos: 3 },
      { label: 'Acima de 30 máquinas', pontos: 4 },
    ],
  },
  {
    campo: 'potencial_servicos_pontos',
    pergunta: 'Qual é o potencial de serviços?',
    opcoes: [
      { label: 'Compra pontual', pontos: 1 },
      { label: 'Corretiva frequente', pontos: 2 },
      { label: 'Preventiva ou rota de inspeção', pontos: 3 },
      { label: 'Contrato ou solução completa', pontos: 4 },
    ],
  },
  {
    campo: 'necessidade_pontos',
    pergunta: 'Existe uma necessidade atual?',
    opcoes: [
      { label: 'Nenhuma identificada', pontos: 0 },
      { label: 'Possível necessidade', pontos: 1 },
      { label: 'Necessidade confirmada', pontos: 3 },
      { label: 'Máquina parada ou necessidade urgente', pontos: 4 },
    ],
  },
  {
    campo: 'decisor_pontos',
    pergunta: 'O contato participa da decisão?',
    opcoes: [
      { label: 'Não sabemos', pontos: 0 },
      { label: 'Influenciador', pontos: 1 },
      { label: 'Decisor identificado', pontos: 2 },
      { label: 'Contato direto com o decisor', pontos: 3 },
    ],
  },
  {
    campo: 'previsao_compra_pontos',
    pergunta: 'Existe previsão de compra?',
    opcoes: [
      { label: 'Sem previsão', pontos: 0 },
      { label: 'Mais de 90 dias', pontos: 1 },
      { label: 'Entre 31 e 90 dias', pontos: 2 },
      { label: 'Até 30 dias', pontos: 3 },
      { label: 'Compra imediata', pontos: 4 },
    ],
  },
  {
    campo: 'relacionamento_pontos',
    pergunta: 'Como está o relacionamento?',
    opcoes: [
      { label: 'Ainda sem contato', pontos: 0 },
      { label: 'Não respondeu', pontos: 1 },
      { label: 'Respondeu', pontos: 2 },
      { label: 'Pediu visita ou orçamento', pontos: 3 },
    ],
  },
  {
    campo: 'aderencia_pontos',
    pergunta: 'A Transpotech consegue atender bem?',
    opcoes: [
      { label: 'Baixa aderência', pontos: 0 },
      { label: 'Atendimento possível', pontos: 1 },
      { label: 'Boa aderência', pontos: 2 },
      { label: 'Solução estratégica para a Transpotech', pontos: 3 },
    ],
  },
  {
    campo: 'valor_estimado_pontos',
    pergunta: 'Qual é o valor estimado?',
    opcoes: [
      { label: 'Até R$ 2.000', pontos: 1 },
      { label: 'De R$ 2.000,01 a R$ 10.000', pontos: 2 },
      { label: 'De R$ 10.000,01 a R$ 30.000', pontos: 3 },
      { label: 'Acima de R$ 30.000', pontos: 4 },
    ],
  },
]

export const CORES_AGENDA = {
  visita: { cor: '#2F6FB0', label: 'Visita presencial' },
  whatsapp: { cor: '#3b6d11', label: 'WhatsApp' },
  email: { cor: '#E08E00', label: 'E-mail' },
  ligacao: { cor: '#7B3FA0', label: 'Ligação' },
  reuniao: { cor: '#C0392B', label: 'Reunião' },
  enviar_orcamento: { cor: '#16A085', label: 'Enviar orçamento' },
  revisar_proposta: { cor: '#B7950B', label: 'Revisar proposta' },
  cobrar_decisao: { cor: '#7F8C8D', label: 'Cobrar decisão' },
  pos_venda: { cor: '#2C3E50', label: 'Pós-venda' },
  outro: { cor: '#95A5A6', label: 'Outro' },
}

export function classificarValorCliente(valor) {
  const v = valor || 0
  if (v >= 100000) return { medalha: '🥇', label: 'Ouro' }
  if (v >= 70000) return { medalha: '🥈', label: 'Prata' }
  if (v >= 30000) return { medalha: '🥉', label: 'Bronze' }
  return null
}

export function classificarPci(notaTotal) {
  if (notaTotal >= 23) return { sigla: 'A', label: 'Muito quente', cor: '#a32d2d' }
  if (notaTotal >= 17) return { sigla: 'B', label: 'Alto potencial', cor: '#993C1D' }
  if (notaTotal >= 10) return { sigla: 'C', label: 'Potencial médio', cor: '#8a6d1f' }
  return { sigla: 'D', label: 'Baixa prioridade', cor: '#666' }
}

export const SEQUENCIA_ORCAMENTO = [
  { chave: 'dias_orcamento_confirmar', label: 'Confirmar recebimento', proxima_acao: 'ligacao' },
  { chave: 'dias_orcamento_duvidas', label: 'Verificar percepção e dúvidas', proxima_acao: 'ligacao' },
  { chave: 'dias_orcamento_andamento', label: 'Verificar andamento da decisão', proxima_acao: 'cobrar_decisao' },
  { chave: 'dias_orcamento_objecoes', label: 'Trabalhar objeções', proxima_acao: 'reuniao' },
  { chave: 'dias_orcamento_definicao', label: 'Solicitar definição ou reagendar', proxima_acao: 'cobrar_decisao' },
]

export function formatarTelefoneInput(valor) {
  const digitos = valor.replace(/\D/g, '').slice(0, 11)
  if (digitos.length <= 2) return `(${digitos}`
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`
  if (digitos.length <= 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`
}

// Converte o valor de um input date/datetime-local (horário local do navegador)
// pro timestamp UTC correto que o banco espera. Quando só a data é escolhida
// (sem hora), usa meio-dia em vez de meia-noite — meia-noite fica bem na borda
// do dia e qualquer conversão de fuso podia empurrar pro dia anterior errado.
export function paraISOLocal(valor) {
  if (!valor) return null
  const comHora = valor.length > 10 ? valor : `${valor}T12:00`
  return new Date(comHora).toISOString()
}

// Converte um timestamp do banco (UTC) de volta pro formato que um input
// datetime-local entende, já no horário local do navegador.
export function paraDatetimeLocalInput(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatarMoeda(valor) {
  return (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatarData(data) {
  if (!data) return '-'
  return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR')
}