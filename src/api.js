import { supabase } from './supabaseClient'

export async function getMeuConsultor() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('consultores')
    .select('*')
    .eq('usuario_id', user.id)
    .single()
  if (error) {
    console.error('Erro ao buscar consultor logado:', error)
    return null
  }
  return data
}

export async function listarDepartamentos() {
  const { data, error } = await supabase.from('departamentos').select('*').order('nome')
  if (error) {
    console.error('Erro ao listar departamentos:', error)
    return []
  }
  return data
}

export async function listarNegocios() {
  const { data, error } = await supabase
    .from('negocios')
    .select(`
      id, etapa, substatus, valor_cotacao, valor_final, temperatura, ultima_interacao_em, data_retorno,
      titulo, produto_servico, descricao_necessidade, origem, probabilidade_fechamento, previsao_fechamento,
      urgencia, numero_orcamento, data_orcamento, validade_proposta, observacoes,
      proxima_acao, proxima_acao_data, proxima_acao_canal,
      concorrente, data_perda, pode_reativar, data_sugerida_reativacao, motivo_perda_id,
      atualizado_em, criado_em,
      cliente:clientes ( id, razao_social, nome_fantasia, cnpj, cidade, telefone_whats ),
      departamento:departamentos ( id, nome ),
      consultor:consultores ( id, nome ),
      motivo_perda:motivos_perda ( descricao ),
      avaliacoes_pci ( nota_total )
    `)
    .order('atualizado_em', { ascending: false })

  if (error) {
    console.error('Erro ao listar negócios:', error)
    return []
  }
  return data
}

export async function criarCliente(dados) {
  const consultor = await getMeuConsultor()
  const { data, error } = await supabase
    .from('clientes')
    .insert({ ...dados, criado_por: consultor?.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function buscarClientesDuplicados({ cnpj, razao_social, telefone, email }) {
  const termos = []
  if (cnpj) termos.push(`cnpj.ilike.%${cnpj}%`)
  if (razao_social) termos.push(`razao_social.ilike.%${razao_social}%`, `nome_fantasia.ilike.%${razao_social}%`)
  if (telefone) termos.push(`telefone_whats.ilike.%${telefone}%`)
  if (termos.length === 0) return []

  const { data, error } = await supabase
    .from('clientes')
    .select('id, razao_social, nome_fantasia, cnpj, telefone_whats, cidade')
    .or(termos.join(','))
    .limit(5)

  if (error) {
    console.error('Erro ao buscar duplicidade:', error)
    return []
  }
  return data
}

export async function criarNegocio(dados) {
  const consultor = await getMeuConsultor()
  const { data, error } = await supabase
    .from('negocios')
    .insert({ ...dados, consultor_id: consultor?.id })
    .select()
    .single()
  if (error) throw error
  await registrarHistorico({ negocio_id: data.id, tipo_evento: 'criacao', descricao: 'Negócio criado' })
  return data
}

export async function atualizarNegocio(negocioId, dados) {
  const { data, error } = await supabase
    .from('negocios')
    .update(dados)
    .eq('id', negocioId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function moverEtapa(negocioId, novaEtapa, extra = {}) {
  const { data, error } = await supabase
    .from('negocios')
    .update({ etapa: novaEtapa, ...extra })
    .eq('id', negocioId)
    .select()
    .single()
  if (error) throw error
  await registrarHistorico({
    negocio_id: negocioId,
    tipo_evento: 'mudanca_etapa',
    descricao: `Movido para ${novaEtapa}`,
    dados_novos: { etapa: novaEtapa, ...extra },
  })
  return data
}

export async function registrarInteracao({ negocio_id, tipo, resultado, observacao }) {
  const consultor = await getMeuConsultor()
  const { data, error } = await supabase
    .from('interacoes')
    .insert({ negocio_id, tipo, resultado, observacao, criado_por: consultor?.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function gerarOrcamento(negocioId, { valor_cotacao, temperatura, numero_orcamento }) {
  return moverEtapa(negocioId, 'orcamento_enviado', {
    valor_cotacao, temperatura, numero_orcamento,
    data_orcamento: new Date().toISOString().slice(0, 10),
  })
}

export async function moverParaRetornoFuturo(negocioId, dataRetorno) {
  return moverEtapa(negocioId, 'retorno_futuro', { data_retorno: dataRetorno })
}

export async function descartarNegocio(negocioId) {
  return moverEtapa(negocioId, 'descartada', {})
}

export async function voltarParaProspeccao(negocioId) {
  return moverEtapa(negocioId, 'prospeccao', { data_retorno: null })
}

export async function listarMotivosPerda() {
  const { data, error } = await supabase.from('motivos_perda').select('*').order('descricao')
  if (error) { console.error(error); return [] }
  return data
}

export async function marcarPerdida(negocioId, { motivo_perda_id, observacoes, concorrente, pode_reativar, data_sugerida_reativacao }) {
  return moverEtapa(negocioId, 'perdida', {
    motivo_perda_id, observacoes, concorrente, pode_reativar, data_sugerida_reativacao,
    data_perda: new Date().toISOString().slice(0, 10),
  })
}

export async function marcarGanha(negocioId, { valor_final }) {
  return moverEtapa(negocioId, 'ganha', { valor_final })
}

// ---------- Contatos ----------
export async function listarContatos(clienteId) {
  const { data, error } = await supabase.from('contatos').select('*').eq('cliente_id', clienteId).order('principal', { ascending: false })
  if (error) { console.error(error); return [] }
  return data
}

export async function criarContato(dados) {
  const { data, error } = await supabase.from('contatos').insert(dados).select().single()
  if (error) throw error
  return data
}

export async function atualizarContato(id, dados) {
  const { data, error } = await supabase.from('contatos').update(dados).eq('id', id).select().single()
  if (error) throw error
  return data
}

// ---------- PCI ----------
export async function buscarPci(negocioId) {
  const { data, error } = await supabase.from('avaliacoes_pci').select('*').eq('negocio_id', negocioId).maybeSingle()
  if (error) { console.error(error); return null }
  return data
}

export async function salvarPci(negocioId, respostas) {
  const { data, error } = await supabase
    .from('avaliacoes_pci')
    .upsert({ negocio_id: negocioId, ...respostas, atualizado_em: new Date().toISOString() }, { onConflict: 'negocio_id' })
    .select()
    .single()
  if (error) throw error
  await registrarHistorico({ negocio_id: negocioId, tipo_evento: 'pci_atualizado', descricao: `Nota PCI: ${data.nota_total}` })
  return data
}

// ---------- Atividades ----------
export async function listarAtividades(negocioId) {
  const { data, error } = await supabase.from('atividades').select('*, responsavel:consultores(nome)').eq('negocio_id', negocioId).order('data_hora', { ascending: false })
  if (error) { console.error(error); return [] }
  return data
}

export async function criarAtividade(dados) {
  const consultor = await getMeuConsultor()
  const { data, error } = await supabase.from('atividades').insert({ ...dados, responsavel_id: consultor?.id }).select().single()
  if (error) throw error
  return data
}

// ---------- Histórico ----------
export async function registrarHistorico({ negocio_id, tipo_evento, descricao, dados_anteriores, dados_novos }) {
  const consultor = await getMeuConsultor()
  const { error } = await supabase.from('historico').insert({
    negocio_id, tipo_evento, descricao, dados_anteriores, dados_novos, usuario_id: consultor?.id,
  })
  if (error) console.error('Erro ao registrar histórico:', error)
}

export async function listarHistorico(negocioId) {
  const { data, error } = await supabase.from('historico').select('*, usuario:consultores(nome)').eq('negocio_id', negocioId).order('criado_em', { ascending: false })
  if (error) { console.error(error); return [] }
  return data
}

function daquiADias(dias) {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}
export { daquiADias }