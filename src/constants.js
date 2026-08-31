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
export const PORTE_OPCOES = [
  { key: 'pequeno', label: 'Pequeno' },
  { key: 'medio', label: 'Médio' },
  { key: 'grande', label: 'Grande' },
]

export const ORIGEM_LEAD_OPCOES = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'site_leads', label: 'Site de leads' },
  { key: 'outro', label: 'Outro' },
]

export const STATUS_LEAD = [
  { key: 'novo', label: 'Novo' },
  { key: 'em_qualificacao', label: 'Em qualificação' },
  { key: 'qualificado', label: 'Qualificado' },
  { key: 'descartado', label: 'Descartado' },
  { key: 'convertido', label: 'Convertido' },
]

export const MARCA_ATUAL_OPCOES = [
  { key: 'multimarcas', label: 'Multimarcas (compra de vários fornecedores)' },
  { key: 'concorrente', label: 'Marca única de um concorrente' },
  { key: 'marca_propria', label: 'Já usa a nossa marca' },
  { key: 'nao_sabe', label: 'Não sabe / sem informação' },
]

// Critérios automáticos de pontuação — cada um calcula sozinho a partir do dado
// digitado. Some tudo e dá no máximo 10. Ajuste as faixas aqui se precisar.
export function pontosFuncionarios(qtd) {
  const n = Number(qtd)
  if (!n || n <= 0) return 0
  if (n <= 20) return 0.5
  if (n <= 50) return 1
  if (n <= 100) return 2
  return 3
}

export function pontosMaquinas(qtd) {
  const n = Number(qtd)
  if (!n || n <= 0) return 0
  if (n <= 5) return 0.5
  if (n <= 15) return 1
  if (n <= 30) return 2
  return 3
}

// Mais perto da base = mais fácil/barato atender = nota maior
export function pontosDistancia(km) {
  const n = Number(km)
  if (n === null || n === undefined || isNaN(n)) return null
  if (n > 100) return 0
  if (n > 50) return 1
  return 2
}

export function pontosMarca(marca) {
  if (marca === 'multimarcas') return 2
  if (marca === 'concorrente') return 1.5
  if (marca === 'marca_propria') return 0.5
  return 0 // não sabe / vazio
}

export function classificarNotaLead(nota) {
  if (nota === null || nota === undefined) return { label: 'Não qualificado', cor: '#999' }
  if (nota >= 8) return { label: 'Alta prioridade', cor: '#3b6d11' }
  if (nota >= 5) return { label: 'Média prioridade', cor: '#8a6d1f' }
  return { label: 'Baixa prioridade', cor: '#a32d2d' }
}

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

// ============================================================
// PCI NOVO — o relatório de visita inteiro É o PCI. Cada resposta
// tem um peso; a soma máxima de tudo dá exatamente 100 pontos.
// ============================================================

export const SEGMENTOS = [
  'Centros de distribuição e operadores logísticos',
  'Supermercados, atacarejos e distribuidores de alimentos',
  'Indústrias de alimentos e bebidas',
  'Indústrias metalúrgicas e siderúrgicas',
  'Indústrias de máquinas e equipamentos',
  'Indústrias automotivas e de autopeças',
  'Indústrias químicas e petroquímicas',
  'Indústrias farmacêuticas e de cosméticos',
  'Indústrias de plástico e borracha',
  'Indústrias de papel, celulose e embalagens',
  'Madeireiras, serrarias e indústrias de móveis',
  'Construção civil e distribuidores de materiais de construção',
  'Agronegócio, cooperativas e armazenagem de grãos',
  'Portos, terminais de carga e recintos aduaneiros',
  'Empresas de reciclagem, sucata e gestão de resíduos',
  'Outros',
]

export const PRODUTOS_MOVIMENTADOS = [
  'Paletes e cargas paletizadas',
  'Bobinas e amarrados de aço',
  'Produtos químicos',
  'Alimentos e bebidas',
  'Madeira, papel e celulose',
  'Materiais de construção',
  'Máquinas, peças e equipamentos',
  'Outros',
]

export const TIPOS_PROJETO = [
  'Expansão de frota',
  'Renovação de frota',
  'Troca de baterias',
  'Reformas',
  'Projeto segurança',
  'PM2P',
  'Homologação de novo fornecedor',
  'Outros',
]

export const OPORTUNIDADES_OPCOES = [
  { key: 'pecas', label: 'Fornecimento de peças' },
  { key: 'spot', label: 'SPOT' },
  { key: 'rodas', label: 'Fornecimento de rodas (poliuretano)' },
  { key: 'pneus', label: 'Fornecimento de pneus' },
  { key: 'baterias', label: 'Fornecimento de baterias' },
  { key: 'pm2p', label: 'Contrato PM2P' },
  { key: 'tecnologias', label: 'Fornecimento de novas tecnologias' },
]

// Cada campo: { chave, label, opcoes: [{key,label,pontos}], max }
export const CAMPOS_PCI = [
  {
    chave: 'tipo_operacao', label: 'Tipo de operação', max: 5,
    opcoes: [
      { key: 'leve', label: 'Leve', pontos: 1 },
      { key: 'media', label: 'Média', pontos: 3 },
      { key: 'severa', label: 'Severa', pontos: 5 },
    ],
  },
  {
    chave: 'tipo_piso', label: 'Tipo de piso', max: 5,
    opcoes: [
      { key: 'excelente', label: 'Excelente (piso epóxi)', pontos: 1 },
      { key: 'bom', label: 'Bom (piso plano, sem buracos e emendas)', pontos: 2 },
      { key: 'medio', label: 'Médio (piso plano, com alguns buracos e emendas)', pontos: 3 },
      { key: 'ruim', label: 'Ruim (piso irregular ou com muitos buracos)', pontos: 4 },
      { key: 'agressivo', label: 'Agressivo (abrasivo, irregular, lama, buraco e poças)', pontos: 5 },
    ],
  },
  {
    chave: 'turnos', label: 'Turnos', max: 5,
    opcoes: [
      { key: '1', label: '1 turno', pontos: 1 },
      { key: '2', label: '2 turnos', pontos: 3 },
      { key: '3', label: '3 turnos', pontos: 5 },
    ],
  },
  {
    chave: 'dias_semana', label: 'Dias da semana de operação', max: 3,
    opcoes: [
      { key: 'seg_sex', label: 'Seg a Sex', pontos: 1 },
      { key: 'seg_sab', label: 'Seg a Sáb', pontos: 2 },
      { key: 'seg_dom', label: 'Seg a Dom', pontos: 3 },
    ],
  },
  {
    chave: 'qtd_maquinas_faixa', label: 'Total de máquinas', max: 10,
    opcoes: [
      { key: '1a3', label: '1 a 3', pontos: 2 },
      { key: '4a10', label: '4 a 10', pontos: 5 },
      { key: '11a30', label: '11 a 30', pontos: 8 },
      { key: 'acima30', label: 'Acima de 30', pontos: 10 },
    ],
  },
  {
    chave: 'manutencao_interna', label: 'Possui manutenção interna?', max: 4,
    opcoes: [
      { key: 'sim', label: 'Sim', pontos: 1 },
      { key: 'nao', label: 'Não', pontos: 4 },
    ],
  },
  {
    chave: 'tecnico_interno', label: 'Possui técnico interno?', max: 4,
    opcoes: [
      { key: 'sim', label: 'Sim', pontos: 1 },
      { key: 'nao', label: 'Não', pontos: 4 },
    ],
  },
  {
    chave: 'consumo_pecas', label: 'Consumo de peças', max: 5,
    opcoes: [
      { key: 'baixo', label: 'Baixo', pontos: 1 },
      { key: 'medio', label: 'Médio', pontos: 3 },
      { key: 'alto', label: 'Alto', pontos: 5 },
    ],
  },
  {
    chave: 'consumo_pneus', label: 'Consumo de pneus', max: 4,
    opcoes: [
      { key: 'baixo', label: 'Baixo', pontos: 1 },
      { key: 'medio', label: 'Médio', pontos: 2 },
      { key: 'alto', label: 'Alto', pontos: 4 },
    ],
  },
  {
    chave: 'consumo_rodas', label: 'Consumo de rodas (poliuretano)', max: 4,
    opcoes: [
      { key: 'baixo', label: 'Baixo', pontos: 1 },
      { key: 'medio', label: 'Médio', pontos: 2 },
      { key: 'alto', label: 'Alto', pontos: 4 },
    ],
  },
  {
    chave: 'projeto_futuro', label: 'Existe projeto futuro?', max: 4,
    opcoes: [
      { key: 'nao', label: 'Não', pontos: 0 },
      { key: 'sim', label: 'Sim', pontos: 4 },
    ],
  },
  {
    chave: 'tipo_projeto', label: 'Tipo de projeto', max: 6,
    opcoes: [
      { key: 'Expansão de frota', label: 'Expansão de frota', pontos: 3 },
      { key: 'Renovação de frota', label: 'Renovação de frota', pontos: 3 },
      { key: 'Troca de baterias', label: 'Troca de baterias', pontos: 6 },
      { key: 'Reformas', label: 'Reformas', pontos: 6 },
      { key: 'Projeto segurança', label: 'Projeto segurança', pontos: 6 },
      { key: 'PM2P', label: 'PM2P', pontos: 6 },
      { key: 'Homologação de novo fornecedor', label: 'Homologação de novo fornecedor', pontos: 3 },
      { key: 'Outros', label: 'Outros', pontos: 3 },
    ],
  },
  {
    chave: 'prazo_projeto', label: 'Prazo', max: 6,
    opcoes: [
      { key: 'imediato', label: 'Imediato', pontos: 6 },
      { key: 'trimestre', label: 'Próximo trimestre', pontos: 4 },
      { key: 'semestre', label: 'Próximo semestre', pontos: 3 },
      { key: 'ano', label: 'Próximo ano', pontos: 1 },
      { key: 'sem_prazo', label: 'Sem prazo definido', pontos: 0 },
    ],
  },
  {
    chave: 'contato_perfil', label: 'Contato', max: 8,
    opcoes: [
      { key: 'nao_sabemos', label: 'Não sabemos', pontos: 1 },
      { key: 'influenciador', label: 'Influenciador', pontos: 4 },
      { key: 'decisor', label: 'Decisor identificado', pontos: 8 },
    ],
  },
  {
    chave: 'aderencia', label: 'Aderência', max: 10,
    opcoes: [
      { key: 'baixa', label: 'Baixa aderência', pontos: 1 },
      { key: 'possivel', label: 'Atendimento possível', pontos: 4 },
      { key: 'boa', label: 'Boa aderência', pontos: 7 },
      { key: 'alto_potencial', label: 'Cliente com alto potencial', pontos: 10 },
    ],
  },
  {
    chave: 'custo_mensal_estimado', label: 'Estimativa de custo mensal (cliente)', max: 10,
    opcoes: [
      { key: 'ate2k', label: 'Até R$ 2.000', pontos: 1 },
      { key: '2ka10k', label: 'De R$ 2.000,01 até R$ 10.000,00', pontos: 4 },
      { key: '10ka30k', label: 'De R$ 10.000,01 até R$ 30.000,00', pontos: 7 },
      { key: 'acima30k', label: 'Acima de R$ 30.000', pontos: 10 },
    ],
  },
]

// Oportunidades: multi-seleção, 1 ponto cada, até 7 pontos no total
export const MAX_PONTOS_OPORTUNIDADES = 7
export const MAX_PCI = 100 // soma de todos os "max" acima + oportunidades = 100

export function calcularNotaPCI(respostas, oportunidadesSelecionadas) {
  let total = 0
  CAMPOS_PCI.forEach(campo => {
    const valorEscolhido = respostas[campo.chave]
    const opcao = campo.opcoes.find(o => o.key === valorEscolhido)
    if (opcao) total += opcao.pontos
  })
  total += (oportunidadesSelecionadas || []).length * 1 // 1 ponto cada, máx 7
  return Math.round(total * 10) / 10
}

export function classificarPciNovo(nota) {
  if (nota === null || nota === undefined) return { label: 'Não avaliado', cor: '#999' }
  if (nota <= 30) return { label: 'Cliente Frio', cor: '#2F6FB0' }
  if (nota <= 60) return { label: 'Cliente Médio', cor: '#B7950B' }
  if (nota <= 80) return { label: 'Cliente Quente', cor: '#E08E00' }
  return { label: 'Cliente Estratégico', cor: '#3b6d11' }
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