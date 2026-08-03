import { useEffect, useRef, useState } from 'react'
import { criarCliente, criarContato, criarNegocio, buscarClientesDuplicados, listarContatos } from './api'
import { CORES_MARCA, ORIGENS, PROXIMAS_ACOES, PAPEIS_CONTATO, formatarTelefoneInput, paraISOLocal } from './constants'

const ETAPAS_INICIAIS = [
  { key: 'prospeccao', label: 'Prospecção (padrão)' },
  { key: 'orcamento_enviado', label: 'Orçamento enviado' },
  { key: 'negociacao_decisao', label: 'Negociação/decisão' },
]

export default function NovoNegocio({ departamentos, onFechar, onCriado }) {
  // Cliente
  const [razaoSocial, setRazaoSocial] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [departamentoId, setDepartamentoId] = useState(departamentos[0]?.id || '')
  const [clienteExistente, setClienteExistente] = useState(null)
  const [sugestoes, setSugestoes] = useState([])
  const [buscandoSugestao, setBuscandoSugestao] = useState(false)
  const timeoutBusca = useRef(null)

  // Contato principal
  const [contatoNome, setContatoNome] = useState('')
  const [contatoCargo, setContatoCargo] = useState('')
  const [contatoTelefone, setContatoTelefone] = useState('')
  const [contatoEmail, setContatoEmail] = useState('')
  const [contatoPapel, setContatoPapel] = useState('')
  const [contatoJaExistente, setContatoJaExistente] = useState(false)

  // Negócio
  const [emAndamento, setEmAndamento] = useState(false)
  const [etapaInicial, setEtapaInicial] = useState('prospeccao')
  const [valorCotacao, setValorCotacao] = useState('')
  const [temperatura, setTemperatura] = useState('morno')
  const [origem, setOrigem] = useState('')
  const [proximaAcao, setProximaAcao] = useState('')
  const [proximaAcaoData, setProximaAcaoData] = useState('')

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  function mudarNome(valor) {
    setRazaoSocial(valor)
    if (clienteExistente) { setClienteExistente(null); setContatoJaExistente(false) } // voltou a editar, solta o vínculo automático

    clearTimeout(timeoutBusca.current)
    if (valor.trim().length < 3) {
      setSugestoes([])
      return
    }
    setBuscandoSugestao(true)
    timeoutBusca.current = setTimeout(async () => {
      const encontrados = await buscarClientesDuplicados({ razao_social: valor })
      setSugestoes(encontrados)
      setBuscandoSugestao(false)
    }, 350)
  }

  async function escolherClienteExistente(cliente) {
    setClienteExistente(cliente)
    setRazaoSocial(cliente.razao_social)
    setCidade(cliente.cidade || '')
    setEstado(cliente.estado || '')
    if (cliente.departamento_id) setDepartamentoId(cliente.departamento_id)
    setSugestoes([])

    const contatos = await listarContatos(cliente.id)
    const principal = contatos.find(c => c.principal) || contatos[0]
    if (principal) {
      setContatoNome(principal.nome || '')
      setContatoCargo(principal.cargo || '')
      setContatoTelefone(principal.telefone || cliente.telefone_whats || '')
      setContatoEmail(principal.email || '')
      setContatoPapel(principal.papel || '')
      setContatoJaExistente(true)
    } else if (cliente.telefone_whats) {
      setContatoTelefone(cliente.telefone_whats)
      setContatoJaExistente(false)
    } else {
      setContatoJaExistente(false)
    }
  }

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)
    try {
      let clienteId
      if (clienteExistente) {
        clienteId = clienteExistente.id
      } else {
        const novoCliente = await criarCliente({
          razao_social: razaoSocial,
          cidade,
          estado: estado || null,
          departamento_id: departamentoId,
        })
        clienteId = novoCliente.id
      }

      if (contatoNome && !contatoJaExistente) {
        await criarContato({
          cliente_id: clienteId,
          nome: contatoNome,
          cargo: contatoCargo || null,
          telefone: contatoTelefone || null,
          email: contatoEmail || null,
          papel: contatoPapel || null,
          principal: true,
        })
      }

      await criarNegocio({
        cliente_id: clienteId,
        departamento_id: departamentoId,
        etapa: etapaInicial,
        titulo: razaoSocial,
        origem: origem || null,
        valor_cotacao: valorCotacao ? Number(valorCotacao) : null,
        temperatura: etapaInicial === 'negociacao_decisao' ? temperatura : null,
        data_orcamento: etapaInicial !== 'prospeccao' ? new Date().toISOString().slice(0, 10) : null,
        proxima_acao: proximaAcao || null,
        proxima_acao_data: paraISOLocal(proximaAcaoData),
      })

      onCriado()
    } catch (err) {
      console.error(err)
      setErro('Não deu pra salvar. Confere se todos os campos obrigatórios estão preenchidos.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20,
    }}>
      <form onSubmit={salvar} style={{
        background: '#fff', borderRadius: 12, padding: 24, width: 440, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      }}>
        <h2 style={{ fontSize: 16, margin: '0 0 16px' }}>Nova oportunidade</h2>

        <Secao titulo="Dados do cliente">
          <Campo label="Nome do cliente">
            <div style={{ position: 'relative' }}>
              <input
                required value={razaoSocial}
                onChange={e => mudarNome(e.target.value)}
                autoComplete="off"
                style={inputStyle}
              />
              {(buscandoSugestao || sugestoes.length > 0) && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                  background: '#fff', border: '1px solid #ddd', borderRadius: 8,
                  marginTop: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden',
                }}>
                  {buscandoSugestao && (
                    <p style={{ fontSize: 12, color: '#999', margin: 0, padding: '8px 10px' }}>Procurando...</p>
                  )}
                  {!buscandoSugestao && sugestoes.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => escolherClienteExistente(s)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left', background: '#fff', border: 'none',
                        borderBottom: '1px solid #f2f2f2', padding: '8px 10px', fontSize: 13, cursor: 'pointer', color: '#333',
                      }}
                      onMouseDown={ev => ev.preventDefault()}
                    >
                      <strong>{s.razao_social}</strong>
                      {s.cidade && <span style={{ color: '#999', fontSize: 12 }}> · {s.cidade}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Campo>

          {clienteExistente && (
            <p style={{ fontSize: 11, color: '#3b6d11', margin: '-6px 0 10px' }}>
              ✓ Usando o cadastro já existente — só essa oportunidade nova será criada.
            </p>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <Campo label="Cidade" style={{ flex: 2 }}>
              <input value={cidade} onChange={e => setCidade(e.target.value)} style={inputStyle} />
            </Campo>
            <Campo label="Estado" style={{ flex: 1 }}>
              <input maxLength={2} value={estado} onChange={e => setEstado(e.target.value.toUpperCase())} style={inputStyle} />
            </Campo>
          </div>
          <Campo label="Departamento">
            <select required value={departamentoId} onChange={e => setDepartamentoId(e.target.value)} style={inputStyle}>
              {departamentos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </Campo>
        </Secao>

        <Secao titulo="Contato principal">
          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <input type="checkbox" checked={emAndamento} onChange={e => { setEmAndamento(e.target.checked); if (!e.target.checked) setEtapaInicial('prospeccao') }} />
            Já é um negócio em andamento (pular etapas / importar negócio antigo)
          </label>

          {emAndamento && (
            <Campo label="Etapa inicial">
              <select value={etapaInicial} onChange={e => setEtapaInicial(e.target.value)} style={inputStyle}>
                {ETAPAS_INICIAIS.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
              </select>
            </Campo>
          )}

          {emAndamento && etapaInicial !== 'prospeccao' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <Campo label="Valor da cotação (R$)" style={{ flex: 1 }}>
                <input type="number" value={valorCotacao} onChange={e => setValorCotacao(e.target.value)} style={inputStyle} />
              </Campo>
              {etapaInicial === 'negociacao_decisao' && (
                <Campo label="Temperatura" style={{ flex: 1 }}>
                  <select value={temperatura} onChange={e => setTemperatura(e.target.value)} style={inputStyle}>
                    <option value="frio">Frio</option>
                    <option value="morno">Morno</option>
                    <option value="quente">Quente</option>
                  </select>
                </Campo>
              )}
            </div>
          )}

          <Campo label="Nome">
            <input value={contatoNome} onChange={e => setContatoNome(e.target.value)} style={inputStyle} />
          </Campo>
          <div style={{ display: 'flex', gap: 8 }}>
            <Campo label="Cargo" style={{ flex: 1 }}>
              <input value={contatoCargo} onChange={e => setContatoCargo(e.target.value)} style={inputStyle} />
            </Campo>
            <Campo label="Papel na compra" style={{ flex: 1 }}>
              <select value={contatoPapel} onChange={e => setContatoPapel(e.target.value)} style={inputStyle}>
                <option value="">-</option>
                {PAPEIS_CONTATO.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </Campo>
          </div>
          <Campo label="Telefone / WhatsApp">
            <input value={contatoTelefone} onChange={e => setContatoTelefone(formatarTelefoneInput(e.target.value))} style={inputStyle} />
          </Campo>
          <Campo label="E-mail">
            <input value={contatoEmail} onChange={e => setContatoEmail(e.target.value)} style={inputStyle} />
          </Campo>

          <Campo label="Origem da oportunidade">
            <select value={origem} onChange={e => setOrigem(e.target.value)} style={inputStyle}>
              <option value="">-</option>
              {ORIGENS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </Campo>
          <div style={{ display: 'flex', gap: 8 }}>
            <Campo label="Próxima ação" style={{ flex: 1 }}>
              <select value={proximaAcao} onChange={e => setProximaAcao(e.target.value)} style={inputStyle}>
                <option value="">-</option>
                {PROXIMAS_ACOES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </Campo>
            <Campo label="Data" style={{ flex: 1 }}>
              <input type="date" value={proximaAcaoData} onChange={e => setProximaAcaoData(e.target.value)} style={inputStyle} />
            </Campo>
          </div>
        </Secao>

        {erro && <p style={{ color: '#a32d2d', fontSize: 13, margin: '0 0 12px' }}>{erro}</p>}

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button type="button" onClick={onFechar} style={{ ...botaoStyle, background: '#eee', color: '#333' }}>
            Cancelar
          </button>
          <button type="submit" disabled={salvando} style={{ ...botaoStyle, background: CORES_MARCA.laranja, color: '#fff' }}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Secao({ titulo, children }) {
  return (
    <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #eee' }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#F77E01', textTransform: 'uppercase', margin: '0 0 10px' }}>{titulo}</p>
      {children}
    </div>
  )
}

function Campo({ label, children, style }) {
  return (
    <div style={{ marginBottom: 10, ...style }}>
      <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd', boxSizing: 'border-box', fontSize: 13,
}

const botaoStyle = {
  flex: 1, padding: 10, border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13,
}
