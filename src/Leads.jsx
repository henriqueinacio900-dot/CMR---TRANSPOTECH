import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import {
  listarLeads, importarLeads, criarLead, salvarQualificacaoLead, passarBastaoLead, descartarLead,
  listarDepartamentos, listarConsultores,
} from './api'
import { PORTE_OPCOES, ORIGEM_LEAD_OPCOES, STATUS_LEAD, PERGUNTAS_LEAD, classificarNotaLead } from './constants'
import { TEMA } from './theme'

export default function Leads() {
  const [leads, setLeads] = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [consultores, setConsultores] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroPorte, setFiltroPorte] = useState('todos')
  const [leadSelecionado, setLeadSelecionado] = useState(null)
  const [modalNovoAberto, setModalNovoAberto] = useState(false)
  const [importando, setImportando] = useState(false)
  const [mensagemImport, setMensagemImport] = useState('')

  async function carregar() {
    setCarregando(true)
    const [l, d, c] = await Promise.all([listarLeads(), listarDepartamentos(), listarConsultores()])
    setLeads(l)
    setDepartamentos(d)
    setConsultores(c)
    setCarregando(false)
  }

  useEffect(() => { carregar() }, [])

  function normalizarChave(s) {
    return String(s || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // tira acento
      .toLowerCase().trim()
  }

  function pegarColuna(linha, ...nomesPossiveis) {
    const linhaNormalizada = {}
    Object.keys(linha).forEach(k => { linhaNormalizada[normalizarChave(k)] = linha[k] })
    for (const nome of nomesPossiveis) {
      const valor = linhaNormalizada[normalizarChave(nome)]
      if (valor !== undefined && valor !== null && String(valor).trim() !== '') return String(valor).trim()
    }
    return ''
  }

  async function handleImportar(e) {
    const arquivo = e.target.files[0]
    if (!arquivo) return
    setImportando(true)
    setMensagemImport('')
    try {
      const buffer = await arquivo.arrayBuffer()
      const workbook = XLSX.read(buffer)
      const planilha = workbook.Sheets[workbook.SheetNames[0]]
      const linhas = XLSX.utils.sheet_to_json(planilha)

      const mapeadas = linhas.map(l => ({
        nome_cliente: pegarColuna(l, 'Nome do cliente', 'Nome', 'Razão social', 'Razao social', 'nome_cliente'),
        cnpj: pegarColuna(l, 'CNPJ') || null,
        contato_nome: pegarColuna(l, 'Contato', 'Contato Nome') || null,
        telefone: pegarColuna(l, 'Telefone', 'Telefone RFB 1', 'Telefone RFB') || null,
        cidade: pegarColuna(l, 'Cidade') || null,
        endereco: pegarColuna(l, 'Endereço', 'Endereco') || null,
        porte: normalizarPorte(pegarColuna(l, 'Porte', 'Faixa de número de funcionários', 'Faixa de numero de funcionarios')),
      })).filter(l => l.nome_cliente)

      if (mapeadas.length === 0) {
        setMensagemImport(`Não achei nenhuma linha com nome preenchido. Colunas encontradas na planilha: ${linhas[0] ? Object.keys(linhas[0]).join(', ') : 'nenhuma'}.`)
        return
      }

      await importarLeads(mapeadas)
      setMensagemImport(`${mapeadas.length} lead(s) importado(s) com sucesso.`)
      await carregar()
    } catch (err) {
      console.error(err)
      setMensagemImport('Não deu pra importar: ' + (err.message || 'erro desconhecido'))
    } finally {
      setImportando(false)
      e.target.value = ''
    }
  }

  function normalizarPorte(valor) {
    const v = String(valor || '').trim().toLowerCase()
    if (!v) return null
    if (v.startsWith('peq')) return 'pequeno'
    if (v.startsWith('med') || v.startsWith('méd')) return 'medio'
    if (v.startsWith('gran')) return 'grande'
    // faixas de número de funcionários (ex: "50 a 99 colaboradores", "acima de 500 colaboradores")
    if (v.includes('acima') || v.includes('1000') || v.includes('500 a') || v.includes('mais de')) return 'grande'
    const numeros = v.match(/\d+/g)
    if (numeros) {
      const maior = Math.max(...numeros.map(Number))
      if (maior >= 500) return 'grande'
      if (maior >= 50) return 'medio'
      return 'pequeno'
    }
    return null
  }

  if (carregando) return <p style={{ padding: 24, color: TEMA.textoPrincipal }}>Carregando...</p>

  const filtrados = leads.filter(l => {
    if (busca && !l.nome_cliente.toLowerCase().includes(busca.toLowerCase())) return false
    if (filtroStatus !== 'todos' && l.status !== filtroStatus) return false
    if (filtroPorte !== 'todos' && l.porte !== filtroPorte) return false
    return true
  })

  const contagemPorStatus = {}
  STATUS_LEAD.forEach(s => { contagemPorStatus[s.key] = leads.filter(l => l.status === s.key).length })

  return (
    <div style={{ padding: 24, color: TEMA.textoPrincipal }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Leads (SDR)</p>
          <p style={{ fontSize: 12, color: TEMA.textoSecundario, margin: '2px 0 0' }}>
            {leads.length} lead(s) na base · {contagemPorStatus.qualificado || 0} qualificado(s) · {contagemPorStatus.convertido || 0} já passado(s) de bastão
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={botaoSecundario}>
            {importando ? 'Importando...' : '⬆ Importar planilha'}
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportar} disabled={importando} style={{ display: 'none' }} />
          </label>
          <button onClick={() => setModalNovoAberto(true)} style={botaoPrimario}>+ Novo lead</button>
        </div>
      </div>
      {mensagemImport && <p style={{ fontSize: 12, color: TEMA.textoSecundario, margin: '6px 0 0' }}>{mensagemImport}</p>}

      <div style={{ display: 'flex', gap: 8, margin: '16px 0', flexWrap: 'wrap' }}>
        <input
          placeholder="Buscar por nome..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{ ...inputStyle, width: 220 }}
        />
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={inputStyle}>
          <option value="todos">Todos os status</option>
          {STATUS_LEAD.map(s => <option key={s.key} value={s.key}>{s.label} ({contagemPorStatus[s.key]})</option>)}
        </select>
        <select value={filtroPorte} onChange={e => setFiltroPorte(e.target.value)} style={inputStyle}>
          <option value="todos">Todos os portes</option>
          {PORTE_OPCOES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </div>

      <p style={{ fontSize: 11, color: TEMA.textoDiscreto, margin: '0 0 10px' }}>
        Ordenado do lead com nota mais alta pro mais baixo — os do topo são os melhores pra ligar hoje.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtrados.map(l => {
          const classif = classificarNotaLead(l.nota_qualificacao)
          return (
            <div
              key={l.id}
              onClick={() => setLeadSelecionado(l)}
              style={{
                background: TEMA.card, border: `1px solid ${TEMA.borda}`, borderRadius: 10, padding: 12,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>{l.nome_cliente}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: TEMA.textoSecundario }}>
                  {l.cidade || 'sem cidade'} {l.telefone ? `· ${l.telefone}` : ''} {l.porte ? `· ${PORTE_OPCOES.find(p => p.key === l.porte)?.label}` : ''}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: TEMA.textoSecundario }}>{STATUS_LEAD.find(s => s.key === l.status)?.label}</span>
                <span style={{
                  fontSize: 13, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                  background: classif.cor + '22', color: classif.cor, border: `1px solid ${classif.cor}55`, minWidth: 42, textAlign: 'center',
                }}>
                  {l.nota_qualificacao !== null && l.nota_qualificacao !== undefined ? l.nota_qualificacao.toFixed(1) : '—'}
                </span>
              </div>
            </div>
          )
        })}
        {filtrados.length === 0 && <p style={{ color: TEMA.textoDiscreto, fontSize: 13 }}>Nenhum lead encontrado.</p>}
      </div>

      {leadSelecionado && (
        <ModalLead
          lead={leadSelecionado}
          departamentos={departamentos}
          consultores={consultores}
          onFechar={() => setLeadSelecionado(null)}
          onAtualizado={() => { setLeadSelecionado(null); carregar() }}
        />
      )}

      {modalNovoAberto && (
        <ModalNovoLead onFechar={() => setModalNovoAberto(false)} onCriado={() => { setModalNovoAberto(false); carregar() }} />
      )}
    </div>
  )
}

function ModalNovoLead({ onFechar, onCriado }) {
  const [nomeCliente, setNomeCliente] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [contatoNome, setContatoNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cidade, setCidade] = useState('')
  const [endereco, setEndereco] = useState('')
  const [porte, setPorte] = useState('')
  const [segmento, setSegmento] = useState('')
  const [origem, setOrigem] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      await criarLead({
        nome_cliente: nomeCliente, cnpj: cnpj || null, contato_nome: contatoNome || null, telefone: telefone || null,
        cidade: cidade || null, endereco: endereco || null, porte: porte || null,
        segmento: segmento || null, origem: origem || null,
      })
      onCriado()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Overlay onFechar={onFechar}>
      <form onSubmit={salvar} style={caixaModal}>
        <h2 style={tituloModal}>Novo lead</h2>
        <Campo label="Nome do cliente"><input required value={nomeCliente} onChange={e => setNomeCliente(e.target.value)} style={inputStyle} /></Campo>
        <Campo label="CNPJ"><input value={cnpj} onChange={e => setCnpj(e.target.value)} style={inputStyle} /></Campo>
        <Campo label="Contato"><input value={contatoNome} onChange={e => setContatoNome(e.target.value)} style={inputStyle} /></Campo>
        <Campo label="Telefone"><input value={telefone} onChange={e => setTelefone(e.target.value)} style={inputStyle} /></Campo>
        <Campo label="Cidade"><input value={cidade} onChange={e => setCidade(e.target.value)} style={inputStyle} /></Campo>
        <Campo label="Endereço"><input value={endereco} onChange={e => setEndereco(e.target.value)} style={inputStyle} /></Campo>
        <Campo label="Porte">
          <select value={porte} onChange={e => setPorte(e.target.value)} style={inputStyle}>
            <option value="">-</option>
            {PORTE_OPCOES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </Campo>
        <Campo label="Segmento"><input value={segmento} onChange={e => setSegmento(e.target.value)} style={inputStyle} /></Campo>
        <Campo label="Origem">
          <select value={origem} onChange={e => setOrigem(e.target.value)} style={inputStyle}>
            <option value="">-</option>
            {ORIGEM_LEAD_OPCOES.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </Campo>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button type="button" onClick={onFechar} style={{ ...botaoModal, background: '#eee', color: '#333' }}>Cancelar</button>
          <button type="submit" disabled={salvando} style={{ ...botaoModal, background: '#F77E01', color: '#fff' }}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </Overlay>
  )
}

function ModalLead({ lead, departamentos, consultores, onFechar, onAtualizado }) {
  const [aba, setAba] = useState('dados')
  const [respostas, setRespostas] = useState({
    porte_pontos: lead.porte_pontos ?? null,
    segmento_pontos: lead.segmento_pontos ?? null,
    tempo_pontos: lead.tempo_pontos ?? null,
    interesse_pontos: lead.interesse_pontos ?? null,
  })
  const [departamentoId, setDepartamentoId] = useState('')
  const [consultorId, setConsultorId] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const notaAtual = Object.values(respostas).some(v => v === null)
    ? null
    : Object.values(respostas).reduce((s, v) => s + v, 0)

  async function salvarQualificacao() {
    setSalvando(true)
    setErro('')
    try {
      await salvarQualificacaoLead(lead.id, respostas)
      onAtualizado()
    } catch (e) {
      setErro('Não deu pra salvar: ' + (e.message || 'erro desconhecido'))
    } finally {
      setSalvando(false)
    }
  }

  async function passarBastao() {
    if (!departamentoId || !consultorId) return
    setSalvando(true)
    setErro('')
    try {
      await passarBastaoLead(lead, { departamento_id: departamentoId, consultor_id: consultorId })
      onAtualizado()
    } catch (e) {
      setErro('Não deu pra passar o bastão: ' + (e.message || 'erro desconhecido'))
    } finally {
      setSalvando(false)
    }
  }

  async function descartar() {
    setSalvando(true)
    try {
      await descartarLead(lead.id, 'Descartado pelo SDR')
      onAtualizado()
    } finally {
      setSalvando(false)
    }
  }

  const consultoresDoDepto = departamentoId ? consultores.filter(c => c.departamento_id === departamentoId && c.perfil === 'consultor') : []

  return (
    <Overlay onFechar={onFechar}>
      <div style={{ ...caixaModal, width: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div>
            <h2 style={{ ...tituloModal, marginBottom: 2 }}>{lead.nome_cliente}</h2>
            <p style={{ fontSize: 12, color: '#777', margin: 0 }}>{lead.cidade} {lead.telefone ? `· ${lead.telefone}` : ''}</p>
          </div>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#999' }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 14, borderBottom: '1px solid #eee' }}>
          {['dados', 'qualificar', 'bastao'].map(t => (
            <button
              key={t}
              onClick={() => setAba(t)}
              style={{
                background: 'none', border: 'none', padding: '8px 4px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                color: aba === t ? '#F77E01' : '#999', borderBottom: aba === t ? '2px solid #F77E01' : '2px solid transparent',
              }}
            >
              {t === 'dados' ? 'Dados' : t === 'qualificar' ? 'Qualificar' : 'Passar bastão'}
            </button>
          ))}
        </div>

        {aba === 'dados' && (
          <div style={{ fontSize: 13, color: '#333', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ margin: 0 }}><strong>Contato:</strong> {lead.contato_nome || '-'}</p>
            <p style={{ margin: 0 }}><strong>CNPJ:</strong> {lead.cnpj || '-'}</p>
            <p style={{ margin: 0 }}><strong>Endereço:</strong> {lead.endereco || '-'}</p>
            <p style={{ margin: 0 }}><strong>Porte:</strong> {PORTE_OPCOES.find(p => p.key === lead.porte)?.label || '-'}</p>
            <p style={{ margin: 0 }}><strong>Segmento:</strong> {lead.segmento || '-'}</p>
            <p style={{ margin: 0 }}><strong>Origem:</strong> {ORIGEM_LEAD_OPCOES.find(o => o.key === lead.origem)?.label || '-'}</p>
            <p style={{ margin: 0 }}><strong>Status:</strong> {STATUS_LEAD.find(s => s.key === lead.status)?.label}</p>
            {lead.status === 'convertido' && (
              <p style={{ margin: 0, color: '#3b6d11' }}>
                <strong>Bastão passado pra:</strong> {lead.consultor_destino?.nome} ({lead.departamento_destino?.nome})
              </p>
            )}
            {lead.status !== 'convertido' && lead.status !== 'descartado' && (
              <button onClick={descartar} disabled={salvando} style={{ ...botaoModal, background: '#f2f2f2', color: '#a32d2d', marginTop: 8, alignSelf: 'flex-start' }}>
                Descartar lead
              </button>
            )}
          </div>
        )}

        {aba === 'qualificar' && (
          <div>
            {PERGUNTAS_LEAD.map(p => (
              <div key={p.campo} style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 6px' }}>{p.pergunta}</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {p.opcoes.map(o => (
                    <button
                      key={o.label}
                      onClick={() => setRespostas({ ...respostas, [p.campo]: o.pontos })}
                      style={{
                        padding: '6px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                        border: respostas[p.campo] === o.pontos ? '2px solid #F77E01' : '1px solid #ddd',
                        background: respostas[p.campo] === o.pontos ? '#FFF3E8' : '#fff', color: '#333',
                      }}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <p style={{ fontSize: 13, fontWeight: 700, margin: '12px 0' }}>
              Nota final: {notaAtual !== null ? notaAtual.toFixed(1) : '—'} / 10
            </p>
            {erro && <p style={{ color: '#a32d2d', fontSize: 12 }}>{erro}</p>}
            <button onClick={salvarQualificacao} disabled={salvando || notaAtual === null} style={{ ...botaoModal, background: '#F77E01', color: '#fff' }}>
              {salvando ? 'Salvando...' : 'Salvar qualificação'}
            </button>
          </div>
        )}

        {aba === 'bastao' && (
          <div>
            {lead.status === 'convertido' ? (
              <p style={{ fontSize: 13, color: '#3b6d11' }}>Esse lead já teve o bastão passado — está no pipeline normal agora.</p>
            ) : (
              <>
                <Campo label="Departamento">
                  <select value={departamentoId} onChange={e => { setDepartamentoId(e.target.value); setConsultorId('') }} style={inputStyle}>
                    <option value="">-</option>
                    {departamentos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                  </select>
                </Campo>
                <Campo label="Consultor">
                  <select value={consultorId} onChange={e => setConsultorId(e.target.value)} style={inputStyle} disabled={!departamentoId}>
                    <option value="">-</option>
                    {consultoresDoDepto.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </Campo>
                {erro && <p style={{ color: '#a32d2d', fontSize: 12 }}>{erro}</p>}
                <button onClick={passarBastao} disabled={salvando || !departamentoId || !consultorId} style={{ ...botaoModal, background: '#3b6d11', color: '#fff' }}>
                  {salvando ? 'Enviando...' : 'Passar bastão pro consultor'}
                </button>
                <p style={{ fontSize: 11, color: '#999', marginTop: 8 }}>
                  Isso cria o cliente e o negócio já em "Contato realizado" no pipeline do consultor escolhido.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </Overlay>
  )
}

function Overlay({ children, onFechar }) {
  return (
    <div
      onClick={onFechar}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, padding: 16 }}
    >
      <div onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  )
}

function Campo({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = {
  padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, background: '#fff', color: '#222', width: '100%', boxSizing: 'border-box',
}

const botaoPrimario = {
  background: '#F77E01', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
}

const botaoSecundario = {
  background: 'rgba(255,255,255,0.06)', color: TEMA.textoPrincipal, border: `1px solid ${TEMA.linhaInterna}`,
  borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
}

const caixaModal = {
  background: '#fff', borderRadius: 12, padding: 24, width: 420, maxHeight: '90vh', overflowY: 'auto', color: '#222',
}

const tituloModal = { fontSize: 16, margin: '0 0 16px' }

const botaoModal = {
  flex: 1, padding: 10, border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13,
}
