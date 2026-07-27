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
      id, etapa, valor_cotacao, valor_final, temperatura, ultima_interacao_em, data_retorno,
      cliente:clientes ( id, razao_social ),
      departamento:departamentos ( id, nome ),
      consultor:consultores ( id, nome )
    `)
    .order('atualizado_em', { ascending: false })

  if (error) {
    console.error('Erro ao listar negócios:', error)
    return []
  }
  return data
}

export async function criarCliente({ razao_social, telefone_whats, cidade, estado, departamento_id }) {
  const consultor = await getMeuConsultor()
  const { data, error } = await supabase
    .from('clientes')
    .insert({ razao_social, telefone_whats, cidade, estado, departamento_id, criado_por: consultor?.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function criarNegocio({ cliente_id, departamento_id, valor_cotacao }) {
  const consultor = await getMeuConsultor()
  const { data, error } = await supabase
    .from('negocios')
    .insert({ cliente_id, departamento_id, valor_cotacao, consultor_id: consultor?.id })
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

export async function gerarOrcamento(negocioId, { valor_cotacao, temperatura }) {
  return moverEtapa(negocioId, 'negociacao', { valor_cotacao, temperatura })
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

function daquiADias(dias) {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}
export { daquiADias }