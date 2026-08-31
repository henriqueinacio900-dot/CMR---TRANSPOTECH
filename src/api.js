import { supabase } from './supabaseClient'
import { SEQUENCIA_ORCAMENTO } from './constants'

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
      concorrente, data_perda, pode_reativar, data_sugerida_reativacao, motivo_perda_id, desconto_valor, status_faturamento,
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
    .select('id, razao_social, nome_fantasia, cnpj, telefone_whats, cidade, estado, departamento_id')
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
    .insert({ ...dados, consultor_id: dados.consultor_id || consultor?.id })
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
  const hoje = new Date().toISOString().slice(0, 10)
  const resultado = await moverEtapa(negocioId, 'orcamento_enviado', {
    valor_cotacao, temperatura, numero_orcamento,
    data_orcamento: hoje,
  })
  await recalcularProximoPassoOrcamento(negocioId, hoje)
  return resultado
}

export async function recalcularProximoPassoOrcamento(negocioId, dataOrcamento) {
  if (!dataOrcamento) return null
  const config = await listarConfiguracoesAutomacao()
  const base = new Date(dataOrcamento + 'T00:00:00')
  const agora = new Date()
  let passoEscolhido = null
  let dataEscolhida = null

  for (const passo of SEQUENCIA_ORCAMENTO) {
    const dias = Number(config[passo.chave] || 0)
    const dataPasso = new Date(base)
    dataPasso.setDate(dataPasso.getDate() + dias)
    if (dataPasso > agora) {
      passoEscolhido = passo
      dataEscolhida = dataPasso
      break
    }
  }

  if (!passoEscolhido) return null

  await atualizarNegocio(negocioId, {
    proxima_acao: passoEscolhido.proxima_acao,
    proxima_acao_data: dataEscolhida.toISOString(),
  })
  await registrarHistorico({
    negocio_id: negocioId,
    tipo_evento: 'sequencia_orcamento',
    descricao: `Sequência de orçamento: próximo passo agendado — ${passoEscolhido.label}`,
  })
  return { ...passoEscolhido, data: dataEscolhida.toISOString() }
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

export async function listarConfiguracoesAutomacao() {
  const { data, error } = await supabase.from('configuracoes_automacao').select('*')
  if (error) { console.error(error); return {} }
  const mapa = {}
  data.forEach(c => { mapa[c.chave] = c.valor })
  return mapa
}

export async function adiarProximaAcao(negocioId, novaData) {
  return atualizarNegocio(negocioId, { proxima_acao_data: novaData })
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

export async function marcarGanha(negocioId, { valor_final, desconto_valor, status_faturamento }) {
  return moverEtapa(negocioId, 'ganha', { valor_final, desconto_valor, status_faturamento })
}

export async function criarPassagemBastao(dados) {
  const consultor = await getMeuConsultor()
  const { data, error } = await supabase
    .from('passagens_bastao')
    .insert({ ...dados, responsavel_operacional_id: dados.responsavel_operacional_id || null })
    .select()
    .single()
  if (error) throw error
  await registrarHistorico({
    negocio_id: dados.negocio_id,
    tipo_evento: 'passagem_bastao',
    descricao: `Passagem de bastão criada — pedido ${dados.numero_pedido || 's/n'}`,
  })
  return data
}

export async function buscarPassagemBastao(negocioId) {
  const { data, error } = await supabase.from('passagens_bastao').select('*').eq('negocio_id', negocioId).maybeSingle()
  if (error) { console.error(error); return null }
  return data
}

export async function atualizarPassagemBastao(id, dados) {
  const { data, error } = await supabase.from('passagens_bastao').update(dados).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function listarPassagensBastao() {
  const { data, error } = await supabase
    .from('passagens_bastao')
    .select(`
      id, status, produto_servico, valor_final, numero_pedido, prazo_prometido, criado_em,
      negocio:negocios ( id, cliente:clientes ( razao_social ) ),
      departamento_destino:departamentos ( nome ),
      responsavel_operacional:consultores ( nome )
    `)
    .order('criado_em', { ascending: false })
  if (error) { console.error(error); return [] }
  return data
}

export async function listarCandidatosReativacao() {
  const hoje = new Date().toISOString().slice(0, 10)
  const seissentaDiasAtras = new Date()
  seissentaDiasAtras.setDate(seissentaDiasAtras.getDate() - 60)

  const { data: perdidos, error: erroPerdidos } = await supabase
    .from('negocios')
    .select(`
      id, produto_servico, valor_cotacao, data_perda, motivo_perda_id,
      cliente:clientes ( id, razao_social, telefone_whats ),
      departamento:departamentos ( id, nome ),
      motivo_perda:motivos_perda ( descricao )
    `)
    .eq('etapa', 'perdida')
    .eq('pode_reativar', true)
    .or(`data_sugerida_reativacao.is.null,data_sugerida_reativacao.lte.${hoje}`)

  const { data: ganhos, error: erroGanhos } = await supabase
    .from('negocios')
    .select(`
      id, produto_servico, valor_final, atualizado_em,
      cliente:clientes ( id, razao_social, telefone_whats ),
      departamento:departamentos ( id, nome )
    `)
    .eq('etapa', 'ganha')
    .lt('atualizado_em', seissentaDiasAtras.toISOString())

  if (erroPerdidos) console.error(erroPerdidos)
  if (erroGanhos) console.error(erroGanhos)

  const listaPerdidos = (perdidos || []).map(n => ({
    ...n,
    motivo: `Perdido${n.motivo_perda?.descricao ? ' (' + n.motivo_perda.descricao + ')' : ''} — reativação sugerida`,
  }))
  const listaGanhos = (ganhos || []).map(n => ({
    ...n,
    motivo: `${Math.floor((Date.now() - new Date(n.atualizado_em)) / 86400000)} dias sem compra`,
  }))

  return [...listaPerdidos, ...listaGanhos]
}

export async function criarNegocioReativacao({ cliente_id, departamento_id, produto_servico }) {
  return criarNegocio({
    cliente_id,
    departamento_id,
    titulo: produto_servico ? `Reativação - ${produto_servico}` : 'Reativação',
    produto_servico: produto_servico || null,
    origem: 'recompra',
  })
}

export async function listarConsultores() {
  const { data, error } = await supabase.from('consultores').select('id, nome, perfil, departamento_id').order('nome')
  if (error) { console.error(error); return [] }
  return data
}

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

export async function listarTodosClientes() {
  const { data, error } = await supabase
    .from('clientes')
    .select('id, razao_social, nome_fantasia, cnpj, cidade, estado, telefone_whats, status_cliente, departamento_id, qtd_maquinas_estimada, observacoes_gerais, pci_nota, pci_classificacao, departamento:departamentos(id, nome)')
    .order('razao_social')
  if (error) { console.error(error); return [] }
  return data
}

export async function listarAtividadesRecentes(limite = 30) {
  const { data, error } = await supabase
    .from('atividades')
    .select('id, tipo, descricao, data_hora, negocio_id, responsavel:consultores(nome), negocio:negocios(id, cliente:clientes(razao_social, cidade))')
    .order('data_hora', { ascending: false })
    .limit(limite)
  if (error) { console.error(error); return [] }
  return data
}

export async function atualizarStatusPassagem(id, status) {
  const { data, error } = await supabase.from('passagens_bastao').update({ status }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function listarMetasMes(ano, mes) {
  const { data, error } = await supabase.from('metas_mensais').select('*, consultor:consultores(nome)').eq('ano', ano).eq('mes', mes)
  if (error) { console.error(error); return [] }
  return data
}

export async function salvarMetaMensal(consultorId, ano, mes, valorMeta) {
  const { data, error } = await supabase
    .from('metas_mensais')
    .upsert({ consultor_id: consultorId, ano, mes, valor_meta: valorMeta }, { onConflict: 'consultor_id,ano,mes' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function atualizarCliente(id, dados) {
  const { data, error } = await supabase.from('clientes').update(dados).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function buscarCoordenadasCache() {
  const { data, error } = await supabase.from('cidade_coordenadas').select('*')
  if (error) { console.error(error); return [] }
  return data
}

export async function salvarCoordenada({ chave, cidade, estado, latitude, longitude }) {
  const { error } = await supabase
    .from('cidade_coordenadas')
    .upsert({ chave, cidade, estado, latitude, longitude }, { onConflict: 'chave' })
  if (error) console.error('Erro ao salvar coordenada:', error)
}

export async function excluirNegocio(id) {
  const { error } = await supabase.from('negocios').delete().eq('id', id)
  if (error) throw error
}

export async function sair() {
  return supabase.auth.signOut()
}

export async function contarInteracoesMes() {
  const inicioMes = new Date()
  inicioMes.setDate(1)
  inicioMes.setHours(0, 0, 0, 0)
  const { count, error } = await supabase
    .from('interacoes')
    .select('*', { count: 'exact', head: true })
    .gte('criado_em', inicioMes.toISOString())
  if (error) { console.error(error); return 0 }
  return count || 0
}

function daquiADias(dias) {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}
export { daquiADias }

// ---------- Leads (SDR) ----------
export async function listarLeads() {
  const { data, error } = await supabase
    .from('leads')
    .select(`
      id, nome_cliente, cnpj, contato_nome, decisor_nome, decisor_cargo, telefone, email, cidade, estado, endereco,
      porte, segmento, origem, numero_funcionarios, qtd_maquinas_estimada, marca_atual, distancia_km,
      status, funcionarios_pontos, maquinas_pontos, distancia_pontos, marca_pontos, nota_qualificacao, observacoes,
      criado_em, atualizado_em,
      sdr_responsavel:consultores!leads_sdr_responsavel_id_fkey ( nome ),
      departamento_destino:departamentos ( nome ),
      consultor_destino:consultores!leads_consultor_destino_id_fkey ( nome )
    `)
    .order('nota_qualificacao', { ascending: false, nullsFirst: false })
  if (error) { console.error('Erro ao listar leads:', error); return [] }
  return data
}

export async function importarLeads(lista) {
  const consultor = await getMeuConsultor()
  const linhas = lista.map(l => ({ ...l, sdr_responsavel_id: consultor?.id, status: 'novo' }))
  const { data, error } = await supabase.from('leads').insert(linhas).select()
  if (error) throw error
  return data
}

export async function criarLead(dados) {
  const consultor = await getMeuConsultor()
  const { data, error } = await supabase
    .from('leads')
    .insert({ ...dados, sdr_responsavel_id: consultor?.id, status: 'novo' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function atualizarLead(id, dados) {
  const { data, error } = await supabase
    .from('leads')
    .update({ ...dados, atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function salvarQualificacaoLead(id, { numero_funcionarios, qtd_maquinas_estimada, marca_atual, distancia_km, funcionarios_pontos, maquinas_pontos, distancia_pontos, marca_pontos }) {
  const nota = (funcionarios_pontos || 0) + (maquinas_pontos || 0) + (distancia_pontos || 0) + (marca_pontos || 0)
  return atualizarLead(id, {
    numero_funcionarios, qtd_maquinas_estimada, marca_atual, distancia_km,
    funcionarios_pontos, maquinas_pontos, distancia_pontos, marca_pontos,
    nota_qualificacao: nota, status: 'qualificado',
  })
}

// Geocodifica uma cidade via Nominatim (OpenStreetMap), reaproveitando o mesmo
// cache de coordenadas já usado no Mapa.
async function geocodificarCidade(cidade, estado) {
  if (!cidade) return null
  const chave = `${cidade}-${estado || ''}`.toLowerCase().trim()
  const cache = await buscarCoordenadasCache()
  const existente = cache.find(c => c.chave === chave)
  if (existente) return { lat: existente.latitude, lon: existente.longitude }

  const query = encodeURIComponent(`${cidade}, ${estado || ''}, Brasil`)
  const resp = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`, {
    headers: { 'Accept-Language': 'pt-BR' },
  })
  const resultado = await resp.json()
  if (!resultado[0]) return null
  const lat = parseFloat(resultado[0].lat)
  const lon = parseFloat(resultado[0].lon)
  await salvarCoordenada({ chave, cidade, estado, latitude: lat, longitude: lon })
  return { lat, lon }
}

function distanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Cidade base da Transpotech pra calcular a distância dos leads
const CIDADE_BASE = { nome: 'Novo Santa Rita', estado: 'RS' }

export async function calcularDistanciaLead(lead) {
  if (!lead.cidade) throw new Error('Esse lead não tem cidade preenchida.')
  const [coordLead, coordBase] = await Promise.all([
    geocodificarCidade(lead.cidade, lead.estado),
    geocodificarCidade(CIDADE_BASE.nome, CIDADE_BASE.estado),
  ])
  if (!coordLead) throw new Error(`Não consegui localizar "${lead.cidade}" no mapa.`)
  if (!coordBase) throw new Error('Não consegui localizar a cidade base (Novo Santa Rita).')
  const km = distanciaKm(coordLead.lat, coordLead.lon, coordBase.lat, coordBase.lon)
  return Math.round(km * 10) / 10
}

export async function passarBastaoLead(lead, { departamento_id, consultor_id }) {
  const cliente = await criarCliente({
    razao_social: lead.nome_cliente,
    cidade: lead.cidade,
    estado: lead.estado || null,
    departamento_id,
    telefone_whats: lead.telefone || null,
    observacoes_gerais: lead.endereco ? `Endereço: ${lead.endereco}` : null,
  })

  if (lead.contato_nome) {
    await criarContato({
      cliente_id: cliente.id,
      nome: lead.contato_nome,
      telefone: lead.telefone || null,
      principal: true,
    })
  }

  const negocio = await criarNegocio({
    cliente_id: cliente.id,
    departamento_id,
    consultor_id,
    etapa: 'contato_realizado',
    titulo: lead.nome_cliente,
    origem: lead.origem === 'instagram' || lead.origem === 'facebook' ? 'campanha' : 'prospeccao_ativa',
    observacoes: lead.observacoes || null,
  })

  await atualizarLead(lead.id, {
    status: 'convertido',
    departamento_destino_id: departamento_id,
    consultor_destino_id: consultor_id,
    negocio_criado_id: negocio.id,
  })

  return negocio
}

export async function descartarLead(id, motivo) {
  return atualizarLead(id, { status: 'descartado', observacoes: motivo || null })
}

// ---------- PM2P (contratos de manutenção) ----------
export async function listarContratosManutencao() {
  const { data, error } = await supabase
    .from('contratos_manutencao')
    .select('*')
    .order('data_vencimento', { ascending: true, nullsFirst: false })
  if (error) { console.error('Erro ao listar contratos:', error); return [] }
  return data
}

export async function importarContratosManutencao(lista) {
  const consultor = await getMeuConsultor()
  const linhas = lista.map(c => ({ ...c, criado_por: consultor?.id }))
  const { data, error } = await supabase.from('contratos_manutencao').insert(linhas).select()
  if (error) throw error
  return data
}

export async function criarContratoManutencao(dados) {
  const consultor = await getMeuConsultor()
  const { data, error } = await supabase
    .from('contratos_manutencao')
    .insert({ ...dados, criado_por: consultor?.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function atualizarContratoManutencao(id, dados) {
  const { data, error } = await supabase
    .from('contratos_manutencao')
    .update({ ...dados, atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function registrarContatoContrato(id) {
  return atualizarContratoManutencao(id, { ultimo_contato_em: new Date().toISOString().slice(0, 10) })
}

export async function excluirContratoManutencao(id) {
  const { error } = await supabase.from('contratos_manutencao').delete().eq('id', id)
  if (error) throw error
}

// Busca a data da última visita registrada no pipeline (atividades) pra cada
// cliente, pra usar como "último contato" automático no PM2P.
export async function buscarUltimosContatosPipeline() {
  const { data, error } = await supabase
    .from('atividades')
    .select('data_hora, negocio:negocios(cliente:clientes(razao_social))')
    .ilike('tipo', '%visita%')
    .order('data_hora', { ascending: false })
  if (error) { console.error('Erro ao buscar contatos do pipeline:', error); return {} }

  const mapa = {}
  data.forEach(a => {
    const nome = a.negocio?.cliente?.razao_social
    if (!nome) return
    const chave = nome.trim().toLowerCase()
    if (!mapa[chave]) mapa[chave] = a.data_hora // já vem ordenado do mais recente pro mais antigo
  })
  return mapa
}

// ---------- Relatório de visita ----------
const BUCKET_FOTOS_RELATORIO = 'relatorio-fotos'

function listaFotos(valor) {
  if (!valor) return []
  if (Array.isArray(valor)) return valor
  if (typeof valor === 'string') {
    try {
      const convertido = JSON.parse(valor)
      return Array.isArray(convertido) ? convertido : [convertido]
    } catch {
      return [valor]
    }
  }
  return [valor]
}

function caminhoFotoNoBucket(foto) {
  const valor = typeof foto === 'string'
    ? foto
    : foto?.path || foto?.url || foto?.publicUrl || foto?.signedUrl || ''
  if (!valor) return null

  // Fotos novas podem ser armazenadas somente pelo caminho.
  if (!/^https?:\/\//i.test(valor)) return valor.replace(/^\/+/, '')

  // Recupera o caminho de URLs públicas ou assinadas já salvas no banco.
  const marcador = `/${BUCKET_FOTOS_RELATORIO}/`
  const indice = valor.indexOf(marcador)
  if (indice === -1) return null
  return decodeURIComponent(valor.slice(indice + marcador.length).split('?')[0])
}

async function carregarUrlsFotos(fotos) {
  const originais = listaFotos(fotos)
  if (originais.length === 0) return []

  return Promise.all(originais.map(async foto => {
    const caminho = caminhoFotoNoBucket(foto)
    if (!caminho) return typeof foto === 'string' ? foto : (foto?.url || foto?.publicUrl || foto?.signedUrl || '')

    const { data, error } = await supabase.storage
      .from(BUCKET_FOTOS_RELATORIO)
      .createSignedUrl(caminho, 60 * 60 * 24 * 7)

    if (error) {
      console.error('Erro ao criar URL da foto do relatório:', error)
      return ''
    }
    return data.signedUrl
  })).then(urls => urls.filter(Boolean))
}

async function carregarFotosDosRelatorios(relatorios) {
  return Promise.all((relatorios || []).map(async relatorio => ({
    ...relatorio,
    fotos: await carregarUrlsFotos(relatorio.fotos),
  })))
}

export async function listarRelatoriosVisita() {
  const { data, error } = await supabase
    .from('relatorios_visita')
    .select('*, negocio:negocios(id, cliente:clientes(razao_social)), consultor:consultores(nome)')
    .order('data_visita', { ascending: false })
  if (error) { console.error('Erro ao listar relatórios de visita:', error); return [] }
  return carregarFotosDosRelatorios(data)
}

export async function buscarRelatorioPorAtividade(atividadeId) {
  const { data, error } = await supabase
    .from('relatorios_visita')
    .select('*')
    .eq('atividade_id', atividadeId)
    .maybeSingle()
  if (error) { console.error(error); return null }
  if (!data) return null
  return { ...data, fotos: await carregarUrlsFotos(data.fotos) }
}

export async function salvarRelatorioVisita(dados, id) {
  const consultor = await getMeuConsultor()
  let resultado
  if (id) {
    const { data, error } = await supabase
      .from('relatorios_visita')
      .update({ ...dados, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    resultado = data
  } else {
    const { data, error } = await supabase
      .from('relatorios_visita')
      .insert({ ...dados, consultor_id: consultor?.id })
      .select()
      .single()
    if (error) throw error
    resultado = data
  }

  // Propaga a nota PCI calculada pro cadastro do cliente, pra ficar em destaque lá
  if (resultado.negocio_id && dados.nota_pci !== undefined && dados.nota_pci !== null) {
    await atualizarPciDoClientePorNegocio(resultado.negocio_id, dados.nota_pci, dados.pci_classificacao)
  }

  return resultado
}

async function atualizarPciDoClientePorNegocio(negocioId, nota, classificacao) {
  const { data: negocio, error: erroNegocio } = await supabase
    .from('negocios')
    .select('cliente_id')
    .eq('id', negocioId)
    .single()
  if (erroNegocio || !negocio) { console.error('Erro ao achar cliente do negócio:', erroNegocio); return }

  const { error } = await supabase
    .from('clientes')
    .update({ pci_nota: nota, pci_classificacao: classificacao, pci_atualizado_em: new Date().toISOString() })
    .eq('id', negocio.cliente_id)
  if (error) console.error('Erro ao atualizar PCI do cliente:', error)
}

export async function uploadFotoRelatorio(arquivo) {
  const nomeArquivo = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${arquivo.name.replace(/[^a-zA-Z0-9._-]/g, '')}`
  const { error } = await supabase.storage.from(BUCKET_FOTOS_RELATORIO).upload(nomeArquivo, arquivo, {
    cacheControl: '3600',
    contentType: arquivo.type || undefined,
    upsert: false,
  })
  if (error) throw error
  const { data, error: erroUrl } = await supabase.storage
    .from(BUCKET_FOTOS_RELATORIO)
    .createSignedUrl(nomeArquivo, 60 * 60 * 24 * 7)
  if (erroUrl) throw erroUrl
  return data.signedUrl
}

// ---------- Visitas programadas (uso mobile) ----------
// Visitas programadas = negócios com "Próxima ação" = Visita e uma data marcada.
// Pega da segunda desta semana pra frente, mais qualquer atrasada (não perde nada).
export async function listarVisitasProgramadasPendentes() {
  const hoje = new Date()
  const diaSemana = hoje.getDay() // 0=domingo
  const segundaDestaSemanaOffset = diaSemana === 0 ? -6 : 1 - diaSemana
  const inicioSemana = new Date(hoje)
  inicioSemana.setDate(hoje.getDate() + segundaDestaSemanaOffset)
  const fimSemana = new Date(inicioSemana)
  fimSemana.setDate(inicioSemana.getDate() + 6)
  fimSemana.setHours(23, 59, 59, 999)

  const { data, error } = await supabase
    .from('negocios')
    .select('id, proxima_acao_data, cliente:clientes(razao_social, cidade, estado)')
    .eq('proxima_acao', 'visita')
    .not('proxima_acao_data', 'is', null)
    .lte('proxima_acao_data', fimSemana.toISOString())
    .order('proxima_acao_data', { ascending: true })

  if (error) { console.error('Erro ao listar visitas programadas:', error); return [] }
  return data
}

// Marca a visita como feita (limpa a próxima ação, some da lista de pendentes)
export async function concluirVisitaProgramada(negocioId) {
  return atualizarNegocio(negocioId, { proxima_acao: null, proxima_acao_data: null })
}
