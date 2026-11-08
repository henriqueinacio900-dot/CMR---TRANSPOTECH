import { useEffect, useState } from 'react'
import {
  atualizarCliente, listarContatos, criarContato, listarUnidadesCliente, criarUnidadeCliente, excluirUnidadeCliente,
  listarEquipamentosCliente, criarEquipamentoCliente, excluirEquipamentoCliente, listarNegociosDoCliente,
  listarAtividadesDoCliente, listarContratosDoCliente,
} from './api'
import { ETAPAS, formatarMoeda, formatarTelefoneInput, classificarPciNovo } from './constants'
import NovoNegocio from './NovoNegocio.jsx'

const ABAS = ['Dados', 'Contatos', 'Unidades', 'Equipamentos', 'Contratos PM2P', 'Oportunidades', 'Atividades']
const LABEL_TIPO = { ligacao: 'Ligação', whatsapp: 'WhatsApp', email: 'E-mail', visita: 'Visita', reuniao: 'Reunião', outro: 'Outro' }

// Ficha consolidada do cliente: dados, contatos, unidades, equipamentos, contratos PM2P (consultivo),
// oportunidades e atividades — e criação de oportunidade a partir do próprio cliente.
export default function FichaCliente({ cliente, departamentos, euMesmo, onFechar, onSalvo, onNegocioCriado }) {
  const [aba, setAba] = useState('Dados')
  const [criandoOportunidade, setCriandoOportunidade] = useState(false)
  const [versaoOportunidades, setVersaoOportunidades] = useState(0)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 12, width: 620, maxWidth: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', color: '#222' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>{cliente.razao_social}</p>
            <p style={{ fontSize: 12, color: '#777', margin: '2px 0 0' }}>
              {cliente.cidade || 'sem cidade'}{cliente.estado ? `/${cliente.estado}` : ''} · {cliente.departamento?.nome || 'sem departamento'}
              {cliente.pci_nota !== null && cliente.pci_nota !== undefined && ` · PCI ${cliente.pci_nota}`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setCriandoOportunidade(true)} style={{ ...botao, whiteSpace: 'nowrap' }}>＋ Nova oportunidade</button>
            <button onClick={onFechar} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#999' }}>✕</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, padding: '8px 20px 0', borderBottom: '1px solid #eee', overflowX: 'auto' }}>
          {ABAS.map(a => (
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
          {aba === 'Dados' && <AbaDados cliente={cliente} departamentos={departamentos} onFechar={onFechar} onSalvo={onSalvo} />}
          {aba === 'Contatos' && <AbaContatos cliente={cliente} />}
          {aba === 'Unidades' && <AbaUnidades cliente={cliente} />}
          {aba === 'Equipamentos' && <AbaEquipamentos cliente={cliente} />}
          {aba === 'Contratos PM2P' && <AbaContratos cliente={cliente} />}
          {aba === 'Oportunidades' && <AbaOportunidades cliente={cliente} versao={versaoOportunidades} />}
          {aba === 'Atividades' && <AbaAtividades cliente={cliente} />}
        </div>
      </div>

      {criandoOportunidade && (
        <NovoNegocio
          departamentos={departamentos}
          euMesmo={euMesmo}
          clientePreenchido={cliente}
          onFechar={() => setCriandoOportunidade(false)}
          onCriado={() => { setCriandoOportunidade(false); setVersaoOportunidades(v => v + 1); setAba('Oportunidades'); onNegocioCriado && onNegocioCriado() }}
        />
      )}
    </div>
  )
}

// ---------- Dados (o antigo "Editar cliente") ----------
function AbaDados({ cliente, departamentos, onFechar, onSalvo }) {
  const [campos, setCampos] = useState({
    razao_social: cliente.razao_social || '',
    nome_fantasia: cliente.nome_fantasia || '',
    cnpj: cliente.cnpj || '',
    cidade: cliente.cidade || '',
    estado: cliente.estado || '',
    telefone_whats: cliente.telefone_whats || '',
    departamento_id: cliente.departamento_id || cliente.departamento?.id || '',
    qtd_maquinas_estimada: cliente.qtd_maquinas_estimada || '',
    status_cliente: cliente.status_cliente || 'prospect',
    observacoes_gerais: cliente.observacoes_gerais || '',
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function salvar() {
    setSalvando(true)
    setErro('')
    try {
      await atualizarCliente(cliente.id, {
        ...campos,
        qtd_maquinas_estimada: campos.qtd_maquinas_estimada ? Number(campos.qtd_maquinas_estimada) : null,
        departamento_id: campos.departamento_id || null,
      })
      onSalvo()
    } catch (e) {
      setErro('Não deu pra salvar: ' + (e.message || 'erro desconhecido'))
    } finally {
      setSalvando(false)
    }
  }

  const pci = cliente.pci_nota !== null && cliente.pci_nota !== undefined ? classificarPciNovo(cliente.pci_nota) : null

  return (
    <div>
      {pci && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, background: pci.cor + '15', border: `1px solid ${pci.cor}55`, borderRadius: 8, padding: '8px 12px' }}>
          <span style={{ fontSize: 12, color: '#555' }}>Nota PCI (última visita)</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: pci.cor }}>{cliente.pci_nota} / 100 — {cliente.pci_classificacao || pci.label}</span>
        </div>
      )}
      <Campo label="Razão social / Nome do cliente"><input value={campos.razao_social} onChange={e => setCampos({ ...campos, razao_social: e.target.value })} style={inputStyle} /></Campo>
      <Campo label="Nome fantasia"><input value={campos.nome_fantasia} onChange={e => setCampos({ ...campos, nome_fantasia: e.target.value })} style={inputStyle} /></Campo>
      <Campo label="CNPJ"><input value={campos.cnpj} onChange={e => setCampos({ ...campos, cnpj: e.target.value })} style={inputStyle} /></Campo>
      <div style={{ display: 'flex', gap: 8 }}>
        <Campo label="Cidade" style={{ flex: 2 }}><input value={campos.cidade} onChange={e => setCampos({ ...campos, cidade: e.target.value })} style={inputStyle} /></Campo>
        <Campo label="Estado" style={{ flex: 1 }}><input maxLength={2} value={campos.estado} onChange={e => setCampos({ ...campos, estado: e.target.value.toUpperCase() })} style={inputStyle} /></Campo>
      </div>
      <Campo label="Telefone / WhatsApp"><input value={campos.telefone_whats} onChange={e => setCampos({ ...campos, telefone_whats: formatarTelefoneInput(e.target.value) })} style={inputStyle} /></Campo>
      <Campo label="Departamento">
        <select value={campos.departamento_id} onChange={e => setCampos({ ...campos, departamento_id: e.target.value })} style={inputStyle}>
          <option value="">-</option>
          {departamentos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
        </select>
      </Campo>
      <Campo label="Quantidade estimada de máquinas"><input type="number" value={campos.qtd_maquinas_estimada} onChange={e => setCampos({ ...campos, qtd_maquinas_estimada: e.target.value })} style={inputStyle} /></Campo>
      <Campo label="Status">
        <select value={campos.status_cliente} onChange={e => setCampos({ ...campos, status_cliente: e.target.value })} style={inputStyle}>
          <option value="prospect">Prospect</option>
          <option value="ativo">Ativo</option>
        </select>
      </Campo>
      <Campo label="Observações gerais"><textarea rows={3} value={campos.observacoes_gerais} onChange={e => setCampos({ ...campos, observacoes_gerais: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} /></Campo>
      {erro && <p style={{ color: '#a32d2d', fontSize: 12 }}>{erro}</p>}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={onFechar} style={{ ...botao, flex: 1, background: '#eee', color: '#333' }}>Cancelar</button>
        <button onClick={salvar} disabled={salvando} style={{ ...botao, flex: 1 }}>{salvando ? 'Salvando...' : 'Salvar'}</button>
      </div>
    </div>
  )
}

// ---------- Contatos ----------
function AbaContatos({ cliente }) {
  const [contatos, setContatos] = useState(null)
  const [nome, setNome] = useState('')
  const [cargo, setCargo] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => { listarContatos(cliente.id).then(setContatos) }, [cliente.id])

  async function adicionar() {
    if (!nome.trim()) return
    const novo = await criarContato({
      cliente_id: cliente.id, nome: nome.trim(), cargo: cargo || null, telefone: telefone || null, email: email || null,
      principal: (contatos || []).length === 0,
    })
    setContatos([...(contatos || []), novo])
    setNome(''); setCargo(''); setTelefone(''); setEmail('')
  }

  if (contatos === null) return <p style={suave}>Carregando...</p>
  return (
    <div>
      <Lista vazio="Nenhum contato cadastrado.">
        {contatos.map(c => (
          <Item key={c.id} titulo={`${c.nome}${c.principal ? ' · principal' : ''}`} sub={[c.cargo, c.telefone, c.email].filter(Boolean).join(' · ')} />
        ))}
      </Lista>
      <p style={subtitulo}>Adicionar contato</p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <input placeholder="Nome *" value={nome} onChange={e => setNome(e.target.value)} style={{ ...inputStyle, flex: '1 1 140px' }} />
        <input placeholder="Cargo" value={cargo} onChange={e => setCargo(e.target.value)} style={{ ...inputStyle, flex: '1 1 110px' }} />
        <input placeholder="Telefone" value={telefone} onChange={e => setTelefone(formatarTelefoneInput(e.target.value))} style={{ ...inputStyle, flex: '1 1 130px' }} />
        <input placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} style={{ ...inputStyle, flex: '1 1 170px' }} />
        <button onClick={adicionar} disabled={!nome.trim()} style={botao}>+ Adicionar</button>
      </div>
    </div>
  )
}

// ---------- Unidades ----------
function AbaUnidades({ cliente }) {
  const [unidades, setUnidades] = useState(undefined)
  const [nome, setNome] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [endereco, setEndereco] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => { listarUnidadesCliente(cliente.id).then(setUnidades) }, [cliente.id])

  async function adicionar() {
    if (!nome.trim()) return
    setErro('')
    try {
      const nova = await criarUnidadeCliente({ cliente_id: cliente.id, nome: nome.trim(), cidade: cidade || null, estado: estado || null, endereco: endereco || null })
      setUnidades([...(unidades || []), nova])
      setNome(''); setCidade(''); setEstado(''); setEndereco('')
    } catch (e) { setErro('Não deu pra salvar: ' + (e.message || 'erro')) }
  }

  async function remover(id) {
    await excluirUnidadeCliente(id)
    setUnidades(unidades.filter(u => u.id !== id))
  }

  if (unidades === undefined) return <p style={suave}>Carregando...</p>
  if (unidades === null) return <AvisoSql />
  return (
    <div>
      <Lista vazio="Nenhuma unidade cadastrada. Opcional — a oportunidade pode seguir sem.">
        {unidades.map(u => (
          <Item key={u.id} titulo={u.nome} sub={[u.cidade && `${u.cidade}${u.estado ? '/' + u.estado : ''}`, u.endereco].filter(Boolean).join(' · ')} onRemover={() => remover(u.id)} />
        ))}
      </Lista>
      <p style={subtitulo}>Adicionar unidade</p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <input placeholder="Nome da unidade *" value={nome} onChange={e => setNome(e.target.value)} style={{ ...inputStyle, flex: '2 1 160px' }} />
        <input placeholder="Cidade" value={cidade} onChange={e => setCidade(e.target.value)} style={{ ...inputStyle, flex: '1 1 110px' }} />
        <input placeholder="UF" maxLength={2} value={estado} onChange={e => setEstado(e.target.value.toUpperCase())} style={{ ...inputStyle, flex: '0 0 56px' }} />
        <input placeholder="Endereço" value={endereco} onChange={e => setEndereco(e.target.value)} style={{ ...inputStyle, flex: '2 1 200px' }} />
        <button onClick={adicionar} disabled={!nome.trim()} style={botao}>+ Adicionar</button>
      </div>
      {erro && <p style={{ color: '#a32d2d', fontSize: 12 }}>{erro}</p>}
    </div>
  )
}

// ---------- Equipamentos ----------
function AbaEquipamentos({ cliente }) {
  const [equipamentos, setEquipamentos] = useState(undefined)
  const [unidades, setUnidades] = useState([])
  const [campos, setCampos] = useState({ marca: '', modelo: '', numero_serie: '', capacidade: '', ano: '', unidade_id: '' })
  const [erro, setErro] = useState('')

  useEffect(() => {
    listarEquipamentosCliente(cliente.id).then(setEquipamentos)
    listarUnidadesCliente(cliente.id).then(u => setUnidades(u || []))
  }, [cliente.id])

  async function adicionar() {
    if (!campos.modelo.trim()) return
    setErro('')
    try {
      const novo = await criarEquipamentoCliente({
        cliente_id: cliente.id,
        marca: campos.marca || null,
        modelo: campos.modelo.trim(),
        numero_serie: campos.numero_serie || null,
        capacidade: campos.capacidade || null,
        ano: campos.ano ? Number(campos.ano) : null,
        unidade_id: campos.unidade_id || null,
      })
      setEquipamentos([...(equipamentos || []), novo])
      setCampos({ marca: '', modelo: '', numero_serie: '', capacidade: '', ano: '', unidade_id: '' })
    } catch (e) { setErro('Não deu pra salvar: ' + (e.message || 'erro')) }
  }

  async function remover(id) {
    await excluirEquipamentoCliente(id)
    setEquipamentos(equipamentos.filter(e => e.id !== id))
  }

  if (equipamentos === undefined) return <p style={suave}>Carregando...</p>
  if (equipamentos === null) return <AvisoSql />
  return (
    <div>
      <Lista vazio="Nenhum equipamento cadastrado. Opcional — a oportunidade pode seguir sem.">
        {equipamentos.map(e => (
          <Item
            key={e.id}
            titulo={[e.marca, e.modelo].filter(Boolean).join(' ')}
            sub={[e.numero_serie && `Série ${e.numero_serie}`, e.capacidade, e.ano, unidades.find(u => u.id === e.unidade_id)?.nome].filter(Boolean).join(' · ')}
            onRemover={() => remover(e.id)}
          />
        ))}
      </Lista>
      <p style={subtitulo}>Adicionar equipamento</p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <input placeholder="Marca" value={campos.marca} onChange={e => setCampos({ ...campos, marca: e.target.value })} style={{ ...inputStyle, flex: '1 1 110px' }} />
        <input placeholder="Modelo *" value={campos.modelo} onChange={e => setCampos({ ...campos, modelo: e.target.value })} style={{ ...inputStyle, flex: '1 1 130px' }} />
        <input placeholder="Nº de série" value={campos.numero_serie} onChange={e => setCampos({ ...campos, numero_serie: e.target.value })} style={{ ...inputStyle, flex: '1 1 120px' }} />
        <input placeholder="Capacidade" value={campos.capacidade} onChange={e => setCampos({ ...campos, capacidade: e.target.value })} style={{ ...inputStyle, flex: '1 1 100px' }} />
        <input placeholder="Ano" type="number" value={campos.ano} onChange={e => setCampos({ ...campos, ano: e.target.value })} style={{ ...inputStyle, flex: '0 0 80px' }} />
        {unidades.length > 0 && (
          <select value={campos.unidade_id} onChange={e => setCampos({ ...campos, unidade_id: e.target.value })} style={{ ...inputStyle, flex: '1 1 150px' }}>
            <option value="">Sem unidade</option>
            {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        )}
        <button onClick={adicionar} disabled={!campos.modelo.trim()} style={botao}>+ Adicionar</button>
      </div>
      {erro && <p style={{ color: '#a32d2d', fontSize: 12 }}>{erro}</p>}
    </div>
  )
}

// ---------- Contratos PM2P (consultivo) ----------
function AbaContratos({ cliente }) {
  const [contratos, setContratos] = useState(null)
  useEffect(() => { listarContratosDoCliente(cliente.razao_social).then(setContratos) }, [cliente.razao_social])

  if (contratos === null) return <p style={suave}>Carregando...</p>
  return (
    <div>
      <p style={{ ...suave, marginBottom: 10 }}>
        Consulta informativa, ligada pelo nome do cliente. Não altera o contrato nem a divisão comercial (Pós-vendas, Varejo, Pneus).
      </p>
      <Lista vazio="Nenhum contrato PM2P encontrado para este cliente (ou você não tem acesso aos contratos).">
        {contratos.map(c => (
          <Item
            key={c.id}
            titulo={`${formatarMoeda(c.valor_mensalidade)} / mês${c.modelo ? ' · ' + c.modelo : ''}`}
            sub={`Vence em ${c.data_vencimento ? new Date(c.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '—'} · ${c.status}`}
          />
        ))}
      </Lista>
    </div>
  )
}

// ---------- Oportunidades ----------
function AbaOportunidades({ cliente, versao }) {
  const [lista, setLista] = useState(null)
  useEffect(() => { setLista(null); listarNegociosDoCliente(cliente.id).then(setLista) }, [cliente.id, versao])

  if (lista === null) return <p style={suave}>Carregando...</p>
  return (
    <Lista vazio="Nenhuma oportunidade para este cliente ainda. Use “＋ Nova oportunidade”.">
      {lista.map(n => (
        <Item
          key={n.id}
          titulo={`${ETAPAS.find(e => e.key === n.etapa)?.label || n.etapa} · ${formatarMoeda(n.valor_final || n.valor_cotacao)}${n.numero_orcamento ? ' · orç. ' + n.numero_orcamento : ''}`}
          sub={[n.produto_servico || n.titulo, n.consultor?.nome, n.departamento?.nome, 'criada em ' + new Date(n.criado_em).toLocaleDateString('pt-BR')].filter(Boolean).join(' · ')}
        />
      ))}
    </Lista>
  )
}

// ---------- Atividades ----------
function AbaAtividades({ cliente }) {
  const [lista, setLista] = useState(null)
  useEffect(() => { listarAtividadesDoCliente(cliente.id).then(setLista) }, [cliente.id])

  if (lista === null) return <p style={suave}>Carregando...</p>
  return (
    <Lista vazio="Nenhuma atividade registrada para este cliente.">
      {lista.map(a => (
        <Item
          key={a.id}
          titulo={`${LABEL_TIPO[a.tipo] || a.tipo} — ${new Date(a.data_hora).toLocaleString('pt-BR')}`}
          sub={[a.descricao, a.responsavel?.nome].filter(Boolean).join(' · ')}
        />
      ))}
    </Lista>
  )
}

// ---------- Peças visuais ----------
function Lista({ children, vazio }) {
  const itens = Array.isArray(children) ? children : [children]
  const temItens = itens.flat().filter(Boolean).length > 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
      {temItens ? children : <p style={suave}>{vazio}</p>}
    </div>
  )
}

function Item({ titulo, sub, onRemover }) {
  return (
    <div style={{ background: '#f7f5f0', borderRadius: 6, padding: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <div>
        <p style={{ margin: 0, fontWeight: 500, fontSize: 13 }}>{titulo}</p>
        {sub && <p style={{ margin: '2px 0 0', color: '#777', fontSize: 12 }}>{sub}</p>}
      </div>
      {onRemover && <button onClick={onRemover} style={{ background: 'none', border: 'none', color: '#a32d2d', cursor: 'pointer', fontSize: 12 }}>remover</button>}
    </div>
  )
}

function AvisoSql() {
  return <p style={{ fontSize: 12, color: '#8a6d1f', background: '#FFF8E1', border: '1px solid #F0DDA0', borderRadius: 6, padding: '8px 10px' }}>
    Esta aba precisa do SQL <strong>melhorias-fluxo-comercial.sql</strong> rodado no Supabase.
  </p>
}

function Campo({ label, children, style }) {
  return (
    <div style={{ marginBottom: 10, ...style }}>
      <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd', boxSizing: 'border-box', fontSize: 13, color: '#222', background: '#fff' }
const botao = { padding: '8px 14px', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, background: '#F77E01', color: '#fff', cursor: 'pointer' }
const suave = { fontSize: 13, color: '#999', margin: 0 }
const subtitulo = { fontSize: 12, fontWeight: 700, color: '#F77E01', textTransform: 'uppercase', margin: '4px 0 8px' }
