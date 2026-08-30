import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import {
  listarContratosManutencao, importarContratosManutencao, criarContratoManutencao,
  atualizarContratoManutencao, registrarContatoContrato, excluirContratoManutencao,
} from './api'
import { formatarMoeda } from './constants'
import { TEMA } from './theme'

const DIAS_ALERTA_VENCIMENTO = 60
const DIAS_ALERTA_CONTATO = 45

export default function PM2P({ euMesmo }) {
  const [contratos, setContratos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [modalNovoAberto, setModalNovoAberto] = useState(false)
  const [contratoSelecionado, setContratoSelecionado] = useState(null)
  const [importando, setImportando] = useState(false)
  const [mensagemImport, setMensagemImport] = useState('')

  async function carregar() {
    setCarregando(true)
    setContratos(await listarContratosManutencao())
    setCarregando(false)
  }

  useEffect(() => { carregar() }, [])

  const ehAdmin = euMesmo?.perfil === 'administrador' || euMesmo?.perfil === 'gestor'
  if (euMesmo && !ehAdmin) {
    return <p style={{ padding: 24, color: TEMA.textoPrincipal }}>Você não tem acesso a essa área.</p>
  }

  function normalizarChave(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  }

  function pegarColuna(linha, ...nomesPossiveis) {
    const linhaNormalizada = {}
    Object.keys(linha).forEach(k => { linhaNormalizada[normalizarChave(k)] = linha[k] })
    for (const nome of nomesPossiveis) {
      const valor = linhaNormalizada[normalizarChave(nome)]
      if (valor !== undefined && valor !== null && String(valor).trim() !== '') return valor
    }
    return ''
  }

  function paraNumero(valor) {
    if (valor === '' || valor === null || valor === undefined) return null
    if (typeof valor === 'number') return valor
    const limpo = String(valor).replace('%', '').replace(/\./g, '').replace(',', '.').trim()
    const n = Number(limpo)
    return isNaN(n) ? null : n
  }

  function paraData(valor) {
    if (!valor) return null
    if (typeof valor === 'number') {
      // data serial do Excel
      const data = XLSX.SSF.parse_date_code(valor)
      if (!data) return null
      return `${data.y}-${String(data.m).padStart(2, '0')}-${String(data.d).padStart(2, '0')}`
    }
    const texto = String(valor).trim()
    const partesBr = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
    if (partesBr) {
      const [, d, m, a] = partesBr
      const ano = a.length === 2 ? `20${a}` : a
      return `${ano}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
    const comoData = new Date(texto)
    if (!isNaN(comoData)) return comoData.toISOString().slice(0, 10)
    return null
  }

  async function handleImportar(e) {
    const arquivo = e.target.files[0]
    if (!arquivo) return
    setImportando(true)
    setMensagemImport('')
    try {
      const buffer = await arquivo.arrayBuffer()
      const workbook = XLSX.read(buffer, { cellDates: false })
      const planilha = workbook.Sheets[workbook.SheetNames[0]]
      const linhas = XLSX.utils.sheet_to_json(planilha)

      const mapeados = linhas.map(l => ({
        cliente_nome: String(pegarColuna(l, 'Cliente', 'Nome do cliente', 'Razão social') || '').trim(),
        modelo: String(pegarColuna(l, 'Modelo') || '').trim() || null,
        analista: String(pegarColuna(l, 'Analista') || '').trim() || null,
        valor_mensalidade: paraNumero(pegarColuna(l, 'Valor mensalidade', 'Mensalidade', 'Valor')) || 0,
        data_vencimento: paraData(pegarColuna(l, 'Vencimento', 'Quando vence', 'Data de vencimento', 'Data vencimento')),
        rentabilidade_percentual: paraNumero(pegarColuna(l, 'Rentabilidade', 'Rentabilidade %', 'Rentabilidade (%)')),
        rentabilidade_valor: paraNumero(pegarColuna(l, 'Valor rentabilidade', 'Rentabilidade R$', 'Rentabilidade valor')),
      })).filter(c => c.cliente_nome)

      if (mapeados.length === 0) {
        setMensagemImport(`Não achei nenhuma linha com cliente preenchido. Colunas encontradas: ${linhas[0] ? Object.keys(linhas[0]).join(', ') : 'nenhuma'}.`)
        return
      }

      await importarContratosManutencao(mapeados)
      setMensagemImport(`${mapeados.length} contrato(s) importado(s) com sucesso.`)
      await carregar()
    } catch (err) {
      console.error(err)
      setMensagemImport('Não deu pra importar: ' + (err.message || 'erro desconhecido'))
    } finally {
      setImportando(false)
      e.target.value = ''
    }
  }

  if (carregando) return <p style={{ padding: 24, color: TEMA.textoPrincipal }}>Carregando...</p>

  const hoje = new Date()
  function diasAte(dataStr) {
    if (!dataStr) return null
    const d = new Date(dataStr + 'T00:00:00')
    return Math.round((d - hoje) / 86400000)
  }
  function diasDesde(dataStr) {
    if (!dataStr) return null
    const d = new Date(dataStr + 'T00:00:00')
    return Math.round((hoje - d) / 86400000)
  }

  const filtrados = contratos.filter(c => !busca || c.cliente_nome.toLowerCase().includes(busca.toLowerCase()))
  const ativos = contratos.filter(c => c.status === 'ativo')
  const totalMensalidade = ativos.reduce((s, c) => s + (c.valor_mensalidade || 0), 0)
  const somaPonderada = ativos.reduce((s, c) => s + (c.valor_mensalidade || 0) * (c.rentabilidade_percentual || 0), 0)
  const totalRentabilidadeValor = ativos.reduce((s, c) => s + (c.rentabilidade_valor || 0), 0)
  const rentabilidadeMedia = totalMensalidade > 0 ? somaPonderada / totalMensalidade : 0
  const vencendoLogo = ativos.filter(c => { const d = diasAte(c.data_vencimento); return d !== null && d <= DIAS_ALERTA_VENCIMENTO && d >= 0 })
  const contatoPendente = ativos.filter(c => { const d = diasDesde(c.ultimo_contato_em); return d === null || d >= DIAS_ALERTA_CONTATO })

  return (
    <div style={{ padding: 24, color: TEMA.textoPrincipal }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
        <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>PM2P — Contratos de manutenção</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={botaoSecundario}>
            {importando ? 'Importando...' : '⬆ Importar planilha'}
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportar} disabled={importando} style={{ display: 'none' }} />
          </label>
          <button onClick={() => setModalNovoAberto(true)} style={botaoPrimario}>+ Novo contrato</button>
        </div>
      </div>
      {mensagemImport && <p style={{ fontSize: 12, color: TEMA.textoSecundario, margin: '6px 0 0' }}>{mensagemImport}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 12, margin: '16px 0' }}>
        <CardResumo label="Contratos ativos" valor={ativos.length} />
        <CardResumo label="Total mensalidade" valor={formatarMoeda(totalMensalidade)} />
        <CardResumo label="Rentabilidade média (%)" valor={`${rentabilidadeMedia.toFixed(1)}%`} />
        <CardResumo label="Rentabilidade total (R$)" valor={formatarMoeda(totalRentabilidadeValor)} />
        <CardResumo label="Vencendo em 60 dias" valor={vencendoLogo.length} destaque={vencendoLogo.length > 0 ? TEMA.vermelho : null} />
      </div>

      {contatoPendente.length > 0 && (
        <div style={{ background: 'rgba(255,69,69,0.08)', border: `1px solid ${TEMA.vermelho}55`, borderRadius: 10, padding: 12, marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: TEMA.vermelho, margin: 0 }}>
            ⚠ {contatoPendente.length} contrato(s) sem contato há {DIAS_ALERTA_CONTATO}+ dias — vale ligar pra esses clientes.
          </p>
        </div>
      )}

      <input
        placeholder="Buscar por cliente..."
        value={busca}
        onChange={e => setBusca(e.target.value)}
        style={{ ...inputStyle, width: 260, marginBottom: 12 }}
      />

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: TEMA.textoSecundario, borderBottom: `1px solid ${TEMA.linhaInterna}` }}>
              <th style={thStyle}>Cliente</th>
              <th style={thStyle}>Modelo</th>
              <th style={thStyle}>Analista</th>
              <th style={thStyle}>Mensalidade</th>
              <th style={thStyle}>Rentabilidade</th>
              <th style={thStyle}>Rentab. (R$)</th>
              <th style={thStyle}>Vencimento</th>
              <th style={thStyle}>Último contato</th>
              <th style={thStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(c => {
              const diasVenc = diasAte(c.data_vencimento)
              const diasContato = diasDesde(c.ultimo_contato_em)
              const vencendoLogoLinha = diasVenc !== null && diasVenc <= DIAS_ALERTA_VENCIMENTO
              const contatoAtrasado = diasContato === null || diasContato >= DIAS_ALERTA_CONTATO
              return (
                <tr
                  key={c.id}
                  onClick={() => setContratoSelecionado(c)}
                  style={{ borderBottom: `1px solid ${TEMA.linhaInterna}`, cursor: 'pointer' }}
                >
                  <td style={tdStyle}>{c.cliente_nome}</td>
                  <td style={tdStyle}>{c.modelo || '-'}</td>
                  <td style={tdStyle}>{c.analista || '-'}</td>
                  <td style={tdStyle}>{formatarMoeda(c.valor_mensalidade)}</td>
                  <td style={tdStyle}>{c.rentabilidade_percentual !== null ? `${c.rentabilidade_percentual}%` : '-'}</td>
                  <td style={tdStyle}>{c.rentabilidade_valor ? formatarMoeda(c.rentabilidade_valor) : '-'}</td>
                  <td style={{ ...tdStyle, color: vencendoLogoLinha ? TEMA.vermelho : TEMA.textoPrincipal, fontWeight: vencendoLogoLinha ? 700 : 400 }}>
                    {c.data_vencimento ? new Date(c.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                    {vencendoLogoLinha && ` (${diasVenc}d)`}
                  </td>
                  <td style={{ ...tdStyle, color: contatoAtrasado ? TEMA.vermelho : TEMA.textoPrincipal, fontWeight: contatoAtrasado ? 700 : 400 }}>
                    {c.ultimo_contato_em ? new Date(c.ultimo_contato_em + 'T00:00:00').toLocaleDateString('pt-BR') : 'Nunca'}
                  </td>
                  <td style={tdStyle}>{c.status}</td>
                </tr>
              )
            })}
            {filtrados.length === 0 && (
              <tr><td colSpan={9} style={{ ...tdStyle, color: TEMA.textoDiscreto }}>Nenhum contrato encontrado.</td></tr>
            )}
          </tbody>
          {filtrados.length > 0 && (
            <tfoot>
              <tr style={{ borderTop: `2px solid ${TEMA.linhaInterna}`, fontWeight: 700 }}>
                <td style={tdStyle} colSpan={3}>Total ({ativos.length} ativos)</td>
                <td style={tdStyle}>{formatarMoeda(totalMensalidade)}</td>
                <td style={tdStyle}>{rentabilidadeMedia.toFixed(1)}% (média)</td>
                <td style={tdStyle}>{formatarMoeda(totalRentabilidadeValor)}</td>
                <td style={tdStyle} colSpan={3}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {modalNovoAberto && (
        <ModalContrato onFechar={() => setModalNovoAberto(false)} onSalvo={() => { setModalNovoAberto(false); carregar() }} />
      )}

      {contratoSelecionado && (
        <ModalContrato
          contrato={contratoSelecionado}
          onFechar={() => setContratoSelecionado(null)}
          onSalvo={() => { setContratoSelecionado(null); carregar() }}
        />
      )}
    </div>
  )
}

function ModalContrato({ contrato, onFechar, onSalvo }) {
  const [clienteNome, setClienteNome] = useState(contrato?.cliente_nome || '')
  const [modelo, setModelo] = useState(contrato?.modelo || '')
  const [analista, setAnalista] = useState(contrato?.analista || '')
  const [valorMensalidade, setValorMensalidade] = useState(contrato?.valor_mensalidade ?? '')
  const [rentabilidade, setRentabilidade] = useState(contrato?.rentabilidade_percentual ?? '')
  const [rentabilidadeValor, setRentabilidadeValor] = useState(contrato?.rentabilidade_valor ?? '')
  const [dataVencimento, setDataVencimento] = useState(contrato?.data_vencimento || '')
  const [status, setStatus] = useState(contrato?.status || 'ativo')
  const [observacoes, setObservacoes] = useState(contrato?.observacoes || '')
  const [salvando, setSalvando] = useState(false)

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      const dados = {
        cliente_nome: clienteNome,
        modelo: modelo || null,
        analista: analista || null,
        valor_mensalidade: valorMensalidade ? Number(valorMensalidade) : 0,
        rentabilidade_percentual: rentabilidade !== '' ? Number(rentabilidade) : null,
        rentabilidade_valor: rentabilidadeValor !== '' ? Number(rentabilidadeValor) : null,
        data_vencimento: dataVencimento || null,
        status,
        observacoes: observacoes || null,
      }
      if (contrato) await atualizarContratoManutencao(contrato.id, dados)
      else await criarContratoManutencao(dados)
      onSalvo()
    } finally {
      setSalvando(false)
    }
  }

  async function marcarContatoAgora() {
    setSalvando(true)
    try {
      await registrarContatoContrato(contrato.id)
      onSalvo()
    } finally {
      setSalvando(false)
    }
  }

  async function excluir() {
    setSalvando(true)
    try {
      await excluirContratoManutencao(contrato.id)
      onSalvo()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, padding: 16 }}>
      <form onSubmit={salvar} style={{ background: '#fff', borderRadius: 12, padding: 24, width: 420, maxHeight: '90vh', overflowY: 'auto', color: '#222' }}>
        <h2 style={{ fontSize: 16, margin: '0 0 16px' }}>{contrato ? 'Editar contrato' : 'Novo contrato'}</h2>
        <Campo label="Cliente"><input required value={clienteNome} onChange={e => setClienteNome(e.target.value)} style={inputStyleModal} /></Campo>
        <div style={{ display: 'flex', gap: 8 }}>
          <Campo label="Modelo" style={{ flex: 1 }}><input value={modelo} onChange={e => setModelo(e.target.value)} style={inputStyleModal} /></Campo>
          <Campo label="Analista" style={{ flex: 1 }}><input value={analista} onChange={e => setAnalista(e.target.value)} style={inputStyleModal} /></Campo>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Campo label="Valor mensalidade (R$)" style={{ flex: 1 }}><input type="number" step="0.01" value={valorMensalidade} onChange={e => setValorMensalidade(e.target.value)} style={inputStyleModal} /></Campo>
          <Campo label="Rentabilidade (%)" style={{ flex: 1 }}><input type="number" step="0.1" value={rentabilidade} onChange={e => setRentabilidade(e.target.value)} style={inputStyleModal} /></Campo>
          <Campo label="Rentabilidade (R$)" style={{ flex: 1 }}><input type="number" step="0.01" value={rentabilidadeValor} onChange={e => setRentabilidadeValor(e.target.value)} style={inputStyleModal} /></Campo>
        </div>
        <Campo label="Vencimento"><input type="date" value={dataVencimento} onChange={e => setDataVencimento(e.target.value)} style={inputStyleModal} /></Campo>
        <Campo label="Status">
          <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyleModal}>
            <option value="ativo">Ativo</option>
            <option value="renovado">Renovado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </Campo>
        <Campo label="Observações"><textarea rows={2} value={observacoes} onChange={e => setObservacoes(e.target.value)} style={{ ...inputStyleModal, resize: 'vertical' }} /></Campo>

        {contrato && (
          <p style={{ fontSize: 11, color: '#777', margin: '0 0 10px' }}>
            Último contato: {contrato.ultimo_contato_em ? new Date(contrato.ultimo_contato_em + 'T00:00:00').toLocaleDateString('pt-BR') : 'Nunca'}
          </p>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {contrato && (
            <button type="button" onClick={marcarContatoAgora} disabled={salvando} style={{ ...botaoModal, background: '#3b6d11', color: '#fff' }}>
              Registrar contato hoje
            </button>
          )}
          <button type="button" onClick={onFechar} style={{ ...botaoModal, background: '#eee', color: '#333' }}>Cancelar</button>
          <button type="submit" disabled={salvando} style={{ ...botaoModal, background: '#F77E01', color: '#fff' }}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
          {contrato && (
            <button type="button" onClick={excluir} disabled={salvando} style={{ ...botaoModal, background: 'none', color: '#a32d2d', border: '1px solid #eee' }}>
              Excluir
            </button>
          )}
        </div>
      </form>
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

function CardResumo({ label, valor, destaque }) {
  return (
    <div style={{ background: TEMA.card, border: `1px solid ${TEMA.borda}`, borderRadius: 10, padding: 14 }}>
      <p style={{ fontSize: 11, color: TEMA.textoSecundario, margin: '0 0 6px', textTransform: 'uppercase', fontWeight: 600 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 700, margin: 0, color: destaque || TEMA.textoPrincipal }}>{valor}</p>
    </div>
  )
}

const thStyle = { padding: '8px 10px' }
const tdStyle = { padding: '8px 10px' }

const inputStyle = {
  padding: '8px 10px', borderRadius: 8, border: `1px solid ${TEMA.linhaInterna}`, fontSize: 13,
  background: 'rgba(255,255,255,0.03)', color: TEMA.textoPrincipal,
}

const inputStyleModal = {
  width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd', boxSizing: 'border-box', fontSize: 13,
}

const botaoPrimario = {
  background: '#F77E01', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
}

const botaoSecundario = {
  background: 'rgba(255,255,255,0.06)', color: TEMA.textoPrincipal, border: `1px solid ${TEMA.linhaInterna}`,
  borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
}

const botaoModal = {
  flex: 1, padding: 10, border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13,
}
