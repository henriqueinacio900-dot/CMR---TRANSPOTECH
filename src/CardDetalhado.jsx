import { useEffect, useState } from 'react'
import {
  listarContatos, criarContato, listarAtividades, criarAtividade, listarHistorico,
  listarMotivosPerda, atualizarNegocio, moverEtapa, marcarPerdida, marcarGanha,
  recalcularProximoPassoOrcamento, criarPassagemBastao, buscarPassagemBastao,
  listarDepartamentos, listarConsultores,
} from './api'
import {
  ETAPAS, SUBSTATUS_NEGOCIACAO, ORIGENS, URGENCIAS, PROXIMAS_ACOES,
  formatarMoeda, formatarData, formatarTelefoneInput,
} from './constants'
import PciForm from './PciForm.jsx'

const ABAS_BASE = ['Resumo', 'Cliente e contatos', 'Oportunidade', 'PCI', 'Atividades', 'Histórico']

export default function CardDetalhado({ negocio, onFechar, onAtualizado }) {
  const [aba, setAba] = useState('Resumo')
  const abas = negocio.etapa === 'ganha' ? [...ABAS_BASE, 'Passagem de bastão'] : ABAS_BASE

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, width: 640, maxWidth: '100%', maxHeight: '92vh',
        display: 'flex', flexDirection: 'column', boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>{negocio.cliente?.razao_social}</p>
            <p style={{ fontSize: 12, color: '#777', margin: '2px 0 0' }}>
              {negocio.departamento?.nome} · {negocio.consultor?.nome}
            </p>
          </div>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#999' }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 4, padding: '10px 20px 0', borderBottom: '1px solid #eee', overflowX: 'auto' }}>
          {abas.map(a => (
            <button
              key={a}
              onClick={() => setAba(a)}
              style={{
                background: 'none', border: 'none', borderBottom: aba === a ? '2px solid #F77E01' : '2px solid transparent',
                padding: '6px 10px', fontSize: 12, fontWeight: aba === a ? 700 : 400,
                color: aba === a ? '#F77E01' : '#666', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {a}
            </button>
          ))}
        </div>

        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          {aba === 'Resumo' && <AbaResumo negocio={negocio} />}
          {aba === 'Cliente e contatos' && <AbaCliente negocio={negocio} />}
          {aba === 'Oportunidade' && <AbaOportunidade negocio={negocio} onAtualizado={onAtualizado} />}
          {aba === 'PCI' && <PciForm negocioId={negocio.id} />}
          {aba === 'Atividades' && <AbaAtividades negocio={negocio} onAtualizado={onAtualizado} />}
          {aba === 'Histórico' && <AbaHistorico negocio={negocio} />}
          {aba === 'Passagem de bastão' && <AbaPassagemBastao negocio={negocio} />}
        </div>

        <RodapeEtapa negocio={negocio} onAtualizado={onAtualizado} onFechar={onFechar} />
      </div>
    </div>
  )
}

function AbaResumo({ negocio }) {
  const diasSemMovimentacao = negocio.atualizado_em
    ? Math.floor((Date.now() - new Date(negocio.atualizado_em)) / 86400000)
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
      <Linha label="Produto/serviço" valor={negocio.produto_servico} />
      <Linha label="Valor estimado" valor={formatarMoeda(negocio.valor_cotacao)} />
      <Linha label="Etapa" valor={ETAPAS.find(e => e.key === negocio.etapa)?.label || negocio.etapa} />
      <Linha label="Urgência" valor={URGENCIAS.find(u => u.key === negocio.urgencia)?.label} />
      <Linha label="Próxima ação" valor={
        negocio.proxima_acao
          ? `${PROXIMAS_ACOES.find(p => p.key === negocio.proxima_acao)?.label || negocio.proxima_acao}${negocio.proxima_acao_data ? ' — ' + new Date(negocio.proxima_acao_data).toLocaleString('pt-BR') : ''}`
          : 'Nenhuma definida'
      } />
      <Linha label="Dias sem movimentação" valor={diasSemMovimentacao !== null ? `${diasSemMovimentacao} dia(s)` : '-'} />
      {negocio.etapa === 'orcamento_enviado' && (
        <p style={{ fontSize: 11, color: '#999', margin: 0 }}>
          ↑ Agendado automaticamente pela sequência de acompanhamento pós-orçamento
        </p>
      )}
      {negocio.etapa === 'perdida' && (
        <>
          <Linha label="Motivo da perda" valor={negocio.motivo_perda?.descricao} />
          <Linha label="Concorrente" valor={negocio.concorrente} />
        </>
      )}
    </div>
  )
}

function Linha({ label, valor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f2f2f2', paddingBottom: 6 }}>
      <span style={{ color: '#777' }}>{label}</span>
      <span style={{ fontWeight: 500, textAlign: 'right' }}>{valor || '-'}</span>
    </div>
  )
}

function AbaCliente({ negocio }) {
  const [contatos, setContatos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [novoNome, setNovoNome] = useState('')
  const [novoTelefone, setNovoTelefone] = useState('')

  useEffect(() => {
    listarContatos(negocio.cliente.id).then(c => { setContatos(c); setCarregando(false) })
  }, [negocio.cliente.id])

  async function adicionar() {
    if (!novoNome) return
    const c = await criarContato({ cliente_id: negocio.cliente.id, nome: novoNome, telefone: novoTelefone, principal: contatos.length === 0 })
    setContatos([...contatos, c])
    setNovoNome('')
    setNovoTelefone('')
  }

  return (
    <div style={{ fontSize: 13 }}>
      <p style={{ fontWeight: 600, margin: '0 0 8px' }}>{negocio.cliente?.razao_social}</p>
      <p style={{ color: '#777', margin: '0 0 4px' }}>{negocio.cliente?.cnpj ? `CNPJ ${negocio.cliente.cnpj}` : ''}</p>
      <p style={{ color: '#777', margin: '0 0 16px' }}>{negocio.cliente?.telefone_whats} · {negocio.cliente?.cidade}</p>

      <p style={{ fontWeight: 600, margin: '0 0 8px' }}>Contatos</p>
      {carregando ? <p>Carregando...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          {contatos.map(c => (
            <div key={c.id} style={{ background: '#f7f5f0', borderRadius: 6, padding: 8 }}>
              <p style={{ margin: 0, fontWeight: 500 }}>{c.nome} {c.principal ? '· principal' : ''}</p>
              <p style={{ margin: 0, color: '#777', fontSize: 12 }}>{c.cargo} {c.telefone}</p>
            </div>
          ))}
          {contatos.length === 0 && <p style={{ color: '#999' }}>Nenhum contato cadastrado.</p>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <input placeholder="Nome" value={novoNome} onChange={e => setNovoNome(e.target.value)} style={inputStyle} />
        <input placeholder="Telefone" value={novoTelefone} onChange={e => setNovoTelefone(formatarTelefoneInput(e.target.value))} style={inputStyle} />
        <button onClick={adicionar} style={botaoPequeno}>+ Adicionar</button>
      </div>
    </div>
  )
}

function AbaOportunidade({ negocio, onAtualizado }) {
  const [campos, setCampos] = useState({
    valor_cotacao: negocio.valor_cotacao || '',
    produto_servico: negocio.produto_servico || '',
    origem: negocio.origem || '',
    urgencia: negocio.urgencia || 'media',
    probabilidade_fechamento: negocio.probabilidade_fechamento || '',
    previsao_fechamento: negocio.previsao_fechamento || '',
    numero_orcamento: negocio.numero_orcamento || '',
    proxima_acao: negocio.proxima_acao || '',
    proxima_acao_data: negocio.proxima_acao_data ? negocio.proxima_acao_data.slice(0, 16) : '',
    observacoes: negocio.observacoes || '',
  })
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    setSalvando(true)
    try {
      await atualizarNegocio(negocio.id, {
        ...campos,
        probabilidade_fechamento: campos.probabilidade_fechamento ? Number(campos.probabilidade_fechamento) : null,
        valor_cotacao: campos.valor_cotacao ? Number(campos.valor_cotacao) : null,
        proxima_acao_data: campos.proxima_acao_data || null,
      })
      onAtualizado()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
      <Campo label="Valor da cotação (R$)">
        <input type="number" value={campos.valor_cotacao} onChange={e => setCampos({ ...campos, valor_cotacao: e.target.value })} style={inputStyle} />
      </Campo>
      <Campo label="Produto ou serviço">
        <input value={campos.produto_servico} onChange={e => setCampos({ ...campos, produto_servico: e.target.value })} style={inputStyle} />
      </Campo>
      <Campo label="Origem">
        <select value={campos.origem} onChange={e => setCampos({ ...campos, origem: e.target.value })} style={inputStyle}>
          <option value="">-</option>
          {ORIGENS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </Campo>
      <Campo label="Urgência">
        <select value={campos.urgencia} onChange={e => setCampos({ ...campos, urgencia: e.target.value })} style={inputStyle}>
          {URGENCIAS.map(u => <option key={u.key} value={u.key}>{u.label}</option>)}
        </select>
      </Campo>
      <Campo label="Probabilidade de fechamento (%)">
        <input type="number" min="0" max="100" value={campos.probabilidade_fechamento} onChange={e => setCampos({ ...campos, probabilidade_fechamento: e.target.value })} style={inputStyle} />
      </Campo>
      <Campo label="Previsão de fechamento">
        <input type="date" value={campos.previsao_fechamento || ''} onChange={e => setCampos({ ...campos, previsao_fechamento: e.target.value })} style={inputStyle} />
      </Campo>
      <Campo label="Número do orçamento">
        <input value={campos.numero_orcamento} onChange={e => setCampos({ ...campos, numero_orcamento: e.target.value })} style={inputStyle} />
      </Campo>
      <Campo label="Próxima ação">
        <select value={campos.proxima_acao} onChange={e => setCampos({ ...campos, proxima_acao: e.target.value })} style={inputStyle}>
          <option value="">-</option>
          {PROXIMAS_ACOES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </Campo>
      <Campo label="Data/horário da próxima ação">
        <input type="datetime-local" value={campos.proxima_acao_data} onChange={e => setCampos({ ...campos, proxima_acao_data: e.target.value })} style={inputStyle} />
      </Campo>
      <Campo label="Observações">
        <textarea rows={3} value={campos.observacoes} onChange={e => setCampos({ ...campos, observacoes: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} />
      </Campo>
      <button onClick={salvar} disabled={salvando} style={botaoPequeno}>{salvando ? 'Salvando...' : 'Salvar alterações'}</button>
    </div>
  )
}

function AbaAtividades({ negocio, onAtualizado }) {
  const [atividades, setAtividades] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [tipo, setTipo] = useState('ligacao')
  const [descricao, setDescricao] = useState('')

  useEffect(() => {
    listarAtividades(negocio.id).then(a => { setAtividades(a); setCarregando(false) })
  }, [negocio.id])

  async function adicionar() {
    if (!descricao) return
    const nova = await criarAtividade({ negocio_id: negocio.id, tipo, descricao })
    setAtividades([nova, ...atividades])
    setDescricao('')

    // Se o negócio está em Orçamento enviado, recalcula o próximo passo do acompanhamento
    if (negocio.etapa === 'orcamento_enviado' && negocio.data_orcamento) {
      await recalcularProximoPassoOrcamento(negocio.id, negocio.data_orcamento)
      onAtualizado()
    }
  }

  return (
    <div style={{ fontSize: 13 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ ...inputStyle, maxWidth: 130 }}>
          <option value="ligacao">Ligação</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">E-mail</option>
          <option value="visita">Visita</option>
          <option value="reuniao">Reunião</option>
          <option value="outro">Outro</option>
        </select>
        <input placeholder="O que foi feito/dito" value={descricao} onChange={e => setDescricao(e.target.value)} style={inputStyle} />
        <button onClick={adicionar} style={botaoPequeno}>+ Registrar</button>
      </div>

      {carregando ? <p>Carregando...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {atividades.map(a => (
            <div key={a.id} style={{ background: '#f7f5f0', borderRadius: 6, padding: 8 }}>
              <p style={{ margin: 0, fontWeight: 500 }}>{a.tipo} — {new Date(a.data_hora).toLocaleString('pt-BR')}</p>
              <p style={{ margin: 0, color: '#555' }}>{a.descricao}</p>
              {a.responsavel?.nome && <p style={{ margin: 0, color: '#999', fontSize: 11 }}>{a.responsavel.nome}</p>}
            </div>
          ))}
          {atividades.length === 0 && <p style={{ color: '#999' }}>Nenhuma atividade registrada.</p>}
        </div>
      )}
    </div>
  )
}

function AbaPassagemBastao({ negocio }) {
  const [passagem, setPassagem] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    buscarPassagemBastao(negocio.id).then(p => { setPassagem(p); setCarregando(false) })
  }, [negocio.id])

  if (carregando) return <p>Carregando...</p>
  if (!passagem) return <p style={{ color: '#999', fontSize: 13 }}>Nenhuma passagem de bastão registrada.</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
      <Linha label="Status" valor={passagem.status} />
      <Linha label="Produto/serviço" valor={passagem.produto_servico} />
      <Linha label="Escopo vendido" valor={passagem.escopo_vendido} />
      <Linha label="Valor final" valor={formatarMoeda(passagem.valor_final)} />
      <Linha label="Número do pedido" valor={passagem.numero_pedido} />
      <Linha label="Data da aprovação" valor={passagem.data_aprovacao} />
      <Linha label="Local de atendimento" valor={passagem.local_atendimento} />
      <Linha label="Prazo prometido" valor={passagem.prazo_prometido} />
      <Linha label="Condições comerciais" valor={passagem.condicoes_comerciais} />
      <Linha label="Condições especiais" valor={passagem.condicoes_especiais} />
      <Linha label="Observações do vendedor" valor={passagem.observacoes_vendedor} />
      <Linha label="Riscos / pontos de atenção" valor={passagem.riscos} />
    </div>
  )
}

function AbaHistorico({ negocio }) {
  const [historico, setHistorico] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    listarHistorico(negocio.id).then(h => { setHistorico(h); setCarregando(false) })
  }, [negocio.id])

  if (carregando) return <p>Carregando...</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
      {historico.map(h => (
        <div key={h.id} style={{ borderBottom: '1px solid #f2f2f2', paddingBottom: 6 }}>
          <p style={{ margin: 0 }}>{h.descricao}</p>
          <p style={{ margin: 0, color: '#999', fontSize: 11 }}>
            {h.usuario?.nome || 'Sistema'} · {new Date(h.criado_em).toLocaleString('pt-BR')}
          </p>
        </div>
      ))}
      {historico.length === 0 && <p style={{ color: '#999' }}>Sem histórico ainda.</p>}
    </div>
  )
}

function RodapeEtapa({ negocio, onAtualizado, onFechar }) {
  const [novaEtapa, setNovaEtapa] = useState(negocio.etapa)
  const [mostrarPerdida, setMostrarPerdida] = useState(false)
  const [mostrarGanha, setMostrarGanha] = useState(false)
  const [mostrarExigirAcao, setMostrarExigirAcao] = useState(false)
  const [motivos, setMotivos] = useState([])
  const [motivoId, setMotivoId] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [concorrente, setConcorrente] = useState('')
  const [valorFinal, setValorFinal] = useState(negocio.valor_cotacao || '')
  const [proximaAcaoNova, setProximaAcaoNova] = useState('')
  const [proximaAcaoDataNova, setProximaAcaoDataNova] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Passagem de bastão (obrigatória ao marcar Ganha)
  const [contatoNome, setContatoNome] = useState('')
  const [escopoVendido, setEscopoVendido] = useState('')
  const [numeroPedido, setNumeroPedido] = useState('')
  const [dataAprovacao, setDataAprovacao] = useState(new Date().toISOString().slice(0, 10))
  const [localAtendimento, setLocalAtendimento] = useState('')
  const [prazoPrometido, setPrazoPrometido] = useState('')
  const [condicoesComerciais, setCondicoesComerciais] = useState('')
  const [condicoesEspeciais, setCondicoesEspeciais] = useState('')
  const [departamentoDestinoId, setDepartamentoDestinoId] = useState('')
  const [responsavelOperacionalId, setResponsavelOperacionalId] = useState('')
  const [observacoesVendedor, setObservacoesVendedor] = useState('')
  const [riscos, setRiscos] = useState('')
  const [departamentos, setDepartamentos] = useState([])
  const [consultoresOperacionais, setConsultoresOperacionais] = useState([])

  useEffect(() => {
    if (mostrarPerdida) listarMotivosPerda().then(setMotivos)
  }, [mostrarPerdida])

  useEffect(() => {
    if (mostrarGanha) {
      listarDepartamentos().then(setDepartamentos)
      listarConsultores().then(setConsultoresOperacionais)
    }
  }, [mostrarGanha])

  async function aplicarMudanca() {
    if (novaEtapa === negocio.etapa) return
    if (novaEtapa === 'perdida') { setMostrarPerdida(true); return }
    if (novaEtapa === 'ganha') { setMostrarGanha(true); return }

    // Toda oportunidade aberta precisa de próxima ação — se não tem, exige antes de mover
    if (!negocio.proxima_acao || !negocio.proxima_acao_data) {
      setMostrarExigirAcao(true)
      return
    }

    setSalvando(true)
    try {
      await moverEtapa(negocio.id, novaEtapa)
      onAtualizado()
      onFechar()
    } finally {
      setSalvando(false)
    }
  }

  async function confirmarComProximaAcao() {
    if (!proximaAcaoNova || !proximaAcaoDataNova) return
    setSalvando(true)
    try {
      await moverEtapa(negocio.id, novaEtapa, {
        proxima_acao: proximaAcaoNova,
        proxima_acao_data: proximaAcaoDataNova,
      })
      onAtualizado()
      onFechar()
    } finally {
      setSalvando(false)
    }
  }

  async function confirmarPerdida() {
    if (!motivoId) return
    setSalvando(true)
    try {
      await marcarPerdida(negocio.id, { motivo_perda_id: motivoId, observacoes, concorrente: concorrente || null, pode_reativar: true })
      onAtualizado()
      onFechar()
    } finally {
      setSalvando(false)
    }
  }

  async function confirmarGanha() {
    if (!valorFinal || !departamentoDestinoId || !responsavelOperacionalId) return
    setSalvando(true)
    try {
      await marcarGanha(negocio.id, { valor_final: Number(valorFinal) })
      await criarPassagemBastao({
        negocio_id: negocio.id,
        cliente_id: negocio.cliente?.id,
        produto_servico: negocio.produto_servico || null,
        escopo_vendido: escopoVendido || null,
        valor_final: Number(valorFinal),
        numero_pedido: numeroPedido || null,
        data_aprovacao: dataAprovacao,
        local_atendimento: localAtendimento || null,
        prazo_prometido: prazoPrometido || null,
        condicoes_comerciais: condicoesComerciais || null,
        condicoes_especiais: condicoesEspeciais || null,
        departamento_destino_id: departamentoDestinoId,
        responsavel_operacional_id: responsavelOperacionalId,
        observacoes_vendedor: observacoesVendedor || null,
        riscos: riscos || null,
      })
      onAtualizado()
      onFechar()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div style={{ borderTop: '1px solid #eee', padding: '12px 20px' }}>
      {!mostrarPerdida && !mostrarGanha && !mostrarExigirAcao && (
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={novaEtapa} onChange={e => setNovaEtapa(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
            {ETAPAS.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
          </select>
          <button onClick={aplicarMudanca} disabled={salvando || novaEtapa === negocio.etapa} style={botaoPequeno}>
            {salvando ? 'Movendo...' : 'Mover'}
          </button>
        </div>
      )}

      {mostrarExigirAcao && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ fontWeight: 600, fontSize: 13, margin: 0, color: '#a32d2d' }}>
            Toda oportunidade aberta precisa de uma próxima ação antes de mudar de etapa
          </p>
          <select value={proximaAcaoNova} onChange={e => setProximaAcaoNova(e.target.value)} style={inputStyle}>
            <option value="">Próxima ação...</option>
            {PROXIMAS_ACOES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <input type="datetime-local" value={proximaAcaoDataNova} onChange={e => setProximaAcaoDataNova(e.target.value)} style={inputStyle} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setMostrarExigirAcao(false)} style={{ ...botaoPequeno, background: '#eee', color: '#333' }}>Cancelar</button>
            <button onClick={confirmarComProximaAcao} disabled={salvando || !proximaAcaoNova || !proximaAcaoDataNova} style={botaoPequeno}>
              Confirmar e mover
            </button>
          </div>
        </div>
      )}

      {mostrarPerdida && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>Marcar como perdida</p>
          <select value={motivoId} onChange={e => setMotivoId(e.target.value)} style={inputStyle}>
            <option value="">Motivo da perda...</option>
            {motivos.map(m => <option key={m.id} value={m.id}>{m.descricao}</option>)}
          </select>
          <input placeholder="Concorrente (se souber)" value={concorrente} onChange={e => setConcorrente(e.target.value)} style={inputStyle} />
          <textarea placeholder="Observação" rows={2} value={observacoes} onChange={e => setObservacoes(e.target.value)} style={inputStyle} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setMostrarPerdida(false)} style={{ ...botaoPequeno, background: '#eee', color: '#333' }}>Cancelar</button>
            <button onClick={confirmarPerdida} disabled={salvando || !motivoId} style={{ ...botaoPequeno, background: '#a32d2d' }}>Confirmar perda</button>
          </div>
        </div>
      )}

      {mostrarGanha && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
          <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>Marcar como ganha + passagem de bastão</p>
          <input type="number" placeholder="Valor final (R$) *" value={valorFinal} onChange={e => setValorFinal(e.target.value)} style={inputStyle} />
          <input placeholder="Escopo vendido" value={escopoVendido} onChange={e => setEscopoVendido(e.target.value)} style={inputStyle} />
          <input placeholder="Número do pedido" value={numeroPedido} onChange={e => setNumeroPedido(e.target.value)} style={inputStyle} />
          <input type="date" placeholder="Data da aprovação" value={dataAprovacao} onChange={e => setDataAprovacao(e.target.value)} style={inputStyle} />
          <input placeholder="Local de atendimento/entrega" value={localAtendimento} onChange={e => setLocalAtendimento(e.target.value)} style={inputStyle} />
          <input placeholder="Prazo prometido (ex: 10 dias, 15/08)" value={prazoPrometido} onChange={e => setPrazoPrometido(e.target.value)} style={inputStyle} />
          <input placeholder="Condições comerciais" value={condicoesComerciais} onChange={e => setCondicoesComerciais(e.target.value)} style={inputStyle} />
          <input placeholder="Condições especiais" value={condicoesEspeciais} onChange={e => setCondicoesEspeciais(e.target.value)} style={inputStyle} />
          <select value={departamentoDestinoId} onChange={e => setDepartamentoDestinoId(e.target.value)} style={inputStyle}>
            <option value="">Departamento de destino *</option>
            {departamentos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </select>
          <select value={responsavelOperacionalId} onChange={e => setResponsavelOperacionalId(e.target.value)} style={inputStyle}>
            <option value="">Responsável operacional *</option>
            {consultoresOperacionais.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <textarea placeholder="Observações do vendedor" rows={2} value={observacoesVendedor} onChange={e => setObservacoesVendedor(e.target.value)} style={inputStyle} />
          <textarea placeholder="Riscos / pontos de atenção" rows={2} value={riscos} onChange={e => setRiscos(e.target.value)} style={inputStyle} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setMostrarGanha(false)} style={{ ...botaoPequeno, background: '#eee', color: '#333' }}>Cancelar</button>
            <button
              onClick={confirmarGanha}
              disabled={salvando || !valorFinal || !departamentoDestinoId || !responsavelOperacionalId}
              style={{ ...botaoPequeno, background: '#3b6d11' }}
            >
              Confirmar venda e enviar pra operação
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Campo({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: 7, borderRadius: 6, border: '1px solid #ddd', boxSizing: 'border-box', fontSize: 13,
}

const botaoPequeno = {
  padding: '7px 12px', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600,
  background: '#F77E01', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap',
}
