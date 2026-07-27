import { useState } from 'react'
import { criarCliente, criarContato, criarNegocio, buscarClientesDuplicados } from './api'
import { CORES_MARCA, ORIGENS, URGENCIAS, PROXIMAS_ACOES, PAPEIS_CONTATO } from './constants'

export default function NovoNegocio({ departamentos, onFechar, onCriado }) {
  // Cliente
  const [razaoSocial, setRazaoSocial] = useState('')
  const [nomeFantasia, setNomeFantasia] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [departamentoId, setDepartamentoId] = useState(departamentos[0]?.id || '')
  const [qtdMaquinas, setQtdMaquinas] = useState('')

  // Contato principal
  const [contatoNome, setContatoNome] = useState('')
  const [contatoCargo, setContatoCargo] = useState('')
  const [contatoTelefone, setContatoTelefone] = useState('')
  const [contatoEmail, setContatoEmail] = useState('')
  const [contatoPapel, setContatoPapel] = useState('')

  // Negócio
  const [produtoServico, setProdutoServico] = useState('')
  const [origem, setOrigem] = useState('')
  const [urgencia, setUrgencia] = useState('media')
  const [proximaAcao, setProximaAcao] = useState('')
  const [proximaAcaoData, setProximaAcaoData] = useState('')

  const [duplicados, setDuplicados] = useState([])
  const [verificando, setVerificando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [confirmarMesmoAssim, setConfirmarMesmoAssim] = useState(false)

  async function verificarDuplicidade() {
    setVerificando(true)
    const encontrados = await buscarClientesDuplicados({ cnpj, razao_social: razaoSocial, telefone })
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
        nome_fantasia: nomeFantasia || null,
        cnpj: cnpj || null,
        telefone_whats: telefone,
        cidade,
        estado: estado || null,
        departamento_id: departamentoId,
        qtd_maquinas_estimada: qtdMaquinas ? Number(qtdMaquinas) : null,
      })

      if (contatoNome) {
        await criarContato({
          cliente_id: cliente.id,
          nome: contatoNome,
          cargo: contatoCargo || null,
          telefone: contatoTelefone || telefone,
          email: contatoEmail || null,
          papel: contatoPapel || null,
          principal: true,
        })
      }

      await criarNegocio({
        cliente_id: cliente.id,
        departamento_id: departamentoId,
        titulo: `${razaoSocial}${produtoServico ? ' - ' + produtoServico : ''}`,
        produto_servico: produtoServico || null,
        origem: origem || null,
        urgencia,
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
        background: '#fff', borderRadius: 12, padding: 24, width: 460, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      }}>
        <h2 style={{ fontSize: 16, margin: '0 0 16px' }}>Novo negócio</h2>

        <Secao titulo="Dados do cliente">
          <Campo label="Razão social / Nome do cliente">
            <input required value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} style={inputStyle} />
          </Campo>
          <Campo label="Nome fantasia">
            <input value={nomeFantasia} onChange={e => setNomeFantasia(e.target.value)} style={inputStyle} />
          </Campo>
          <Campo label="CNPJ">
            <input value={cnpj} onChange={e => setCnpj(e.target.value)} style={inputStyle} />
          </Campo>
          <Campo label="Telefone / WhatsApp">
            <input value={telefone} onChange={e => setTelefone(e.target.value)} style={inputStyle} />
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
          <Campo label="Quantidade estimada de máquinas">
            <input type="number" value={qtdMaquinas} onChange={e => setQtdMaquinas(e.target.value)} style={inputStyle} />
          </Campo>
        </Secao>

        {duplicados.length > 0 && (
          <div style={{ background: '#FFF3E8', border: '1px solid #F0C89A', borderRadius: 8, padding: 10, marginBottom: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 6px', color: '#8a4b00' }}>
              Encontrei cliente(s) parecido(s):
            </p>
            {duplicados.map(d => (
              <p key={d.id} style={{ fontSize: 12, margin: '2px 0', color: '#555' }}>
                {d.razao_social} {d.cnpj ? `· CNPJ ${d.cnpj}` : ''} {d.cidade ? `· ${d.cidade}` : ''}
              </p>
            ))}
            <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <input type="checkbox" checked={confirmarMesmoAssim} onChange={e => setConfirmarMesmoAssim(e.target.checked)} />
              Mesmo assim, é um cliente novo — continuar
            </label>
          </div>
        )}

        <Secao titulo="Contato principal">
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
          <Campo label="Telefone (se diferente do acima)">
            <input value={contatoTelefone} onChange={e => setContatoTelefone(e.target.value)} style={inputStyle} />
          </Campo>
          <Campo label="E-mail">
            <input value={contatoEmail} onChange={e => setContatoEmail(e.target.value)} style={inputStyle} />
          </Campo>
        </Secao>

        <Secao titulo="Dados do negócio">
          <Campo label="Produto ou serviço">
            <input value={produtoServico} onChange={e => setProdutoServico(e.target.value)} style={inputStyle} />
          </Campo>
          <Campo label="Origem da oportunidade">
            <select value={origem} onChange={e => setOrigem(e.target.value)} style={inputStyle}>
              <option value="">-</option>
              {ORIGENS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </Campo>
          <Campo label="Urgência">
            <select value={urgencia} onChange={e => setUrgencia(e.target.value)} style={inputStyle}>
              {URGENCIAS.map(u => <option key={u.key} value={u.key}>{u.label}</option>)}
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
