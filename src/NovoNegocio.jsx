import { useState } from 'react'
import { criarCliente, criarContato, criarNegocio, buscarClientesDuplicados } from './api'
import { CORES_MARCA, ORIGENS, PROXIMAS_ACOES, PAPEIS_CONTATO, formatarTelefoneInput } from './constants'

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

  // Contato principal
  const [contatoNome, setContatoNome] = useState('')
  const [contatoCargo, setContatoCargo] = useState('')
  const [contatoTelefone, setContatoTelefone] = useState('')
  const [contatoEmail, setContatoEmail] = useState('')
  const [contatoPapel, setContatoPapel] = useState('')

  // Negócio
  const [emAndamento, setEmAndamento] = useState(false)
  const [etapaInicial, setEtapaInicial] = useState('prospeccao')
  const [valorCotacao, setValorCotacao] = useState('')
  const [temperatura, setTemperatura] = useState('morno')
  const [origem, setOrigem] = useState('')
  const [proximaAcao, setProximaAcao] = useState('')
  const [proximaAcaoData, setProximaAcaoData] = useState('')

  const [duplicados, setDuplicados] = useState([])
  const [verificando, setVerificando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [confirmarMesmoAssim, setConfirmarMesmoAssim] = useState(false)

  async function verificarDuplicidade() {
    setVerificando(true)
    const encontrados = await buscarClientesDuplicados({ razao_social: razaoSocial, telefone: contatoTelefone })
    setDuplicados(encontrados)
    setVerificando(false)
    return encontrados
  }

  async function salvar(e) {
    e.preventDefault()
    setErro('')

    if (!confirmarMesmoAssim) {
      const encontrados = await verificarDuplicidade()
      if (encontrados.length > 0) return // mostra aviso, espera confirmação
    }

    setSalvando(true)
    try {
      const cliente = await criarCliente({
        razao_social: razaoSocial,
        cidade,
        estado: estado || null,
        departamento_id: departamentoId,
      })

      if (contatoNome) {
        await criarContato({
          cliente_id: cliente.id,
          nome: contatoNome,
          cargo: contatoCargo || null,
          telefone: contatoTelefone || null,
          email: contatoEmail || null,
          papel: contatoPapel || null,
          principal: true,
        })
      }

      await criarNegocio({
        cliente_id: cliente.id,
        departamento_id: departamentoId,
        etapa: etapaInicial,
        titulo: razaoSocial,
        origem: origem || null,
        valor_cotacao: valorCotacao ? Number(valorCotacao) : null,
        temperatura: etapaInicial === 'negociacao_decisao' ? temperatura : null,
        data_orcamento: etapaInicial !== 'prospeccao' ? new Date().toISOString().slice(0, 10) : null,
        proxima_acao: proximaAcao || null,
        proxima_acao_data: proximaAcaoData || null,
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
            <input required value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} style={inputStyle} />
          </Campo>
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

        {duplicados.length > 0 && (
          <div style={{ background: '#FFF3E8', border: '1px solid #F0C89A', borderRadius: 8, padding: 10, marginBottom: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 6px', color: '#8a4b00' }}>
              Encontrei cliente(s) parecido(s):
            </p>
            {duplicados.map(d => (
              <p key={d.id} style={{ fontSize: 12, margin: '2px 0', color: '#555' }}>
                {d.razao_social} {d.cidade ? `· ${d.cidade}` : ''}
              </p>
            ))}
            <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <input type="checkbox" checked={confirmarMesmoAssim} onChange={e => setConfirmarMesmoAssim(e.target.checked)} />
              Mesmo assim, é um cliente novo — continuar
            </label>
          </div>
        )}

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
          <button type="submit" disabled={salvando || verificando} style={{ ...botaoStyle, background: CORES_MARCA.laranja, color: '#fff' }}>
            {salvando ? 'Salvando...' : verificando ? 'Verificando...' : 'Salvar'}
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
