import { useState } from 'react'
import { Phone } from 'lucide-react'
import { registrarInteracao, gerarOrcamento, moverParaRetornoFuturo, descartarNegocio, moverEtapa, daquiADias, listarLigacoesNaoAtendidas } from './api'
import ContatoPm2p from './ContatoPm2p.jsx'
import PropostaPm2p from './PropostaPm2p.jsx'
import { CORES_TEMPERATURA, formatarMoeda } from './constants'

const TIPOS = [
  { key: 'ligacao', label: 'Ligação' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'presencial', label: 'Presencial' },
  { key: 'email', label: 'E-mail' },
]

export default function ProspeccaoCard({ negocio, onAtualizado, onAbrirDetalhe }) {
  const [etapaLocal, setEtapaLocal] = useState('inicial') // inicial | escolher_tipo | escolher_resultado | orcamento | ligar_futuro
  const [tipoContato, setTipoContato] = useState(null)
  const [valor, setValor] = useState('')
  const [numeroOrcamento, setNumeroOrcamento] = useState('')
  const [temperatura, setTemperatura] = useState('morno')
  const [dataFutura, setDataFutura] = useState('')
  const [salvando, setSalvando] = useState(false)
  // Oportunidade PM2P: contato por canal (modal), proposta e histórico de ligações não atendidas
  const ehPm2p = !!negocio.eh_pm2p
  const [contatoAberto, setContatoAberto] = useState(false)
  const [propostaAberta, setPropostaAberta] = useState(false)
  const [ligacoes, setLigacoes] = useState(null) // null = fechado
  const tentativas = negocio.tentativas_ligacao || 0

  async function alternarLigacoes() {
    if (ligacoes) { setLigacoes(null); return }
    setLigacoes(await listarLigacoesNaoAtendidas(negocio.id))
  }

  async function confirmarContato(tipo) {
    setSalvando(true)
    try {
      await registrarInteracao({ negocio_id: negocio.id, tipo })
      setTipoContato(tipo)
      setEtapaLocal('escolher_resultado')
    } finally {
      setSalvando(false)
    }
  }

  async function avancarContatoRealizado() {
    setSalvando(true)
    try {
      await registrarInteracao({ negocio_id: negocio.id, tipo: tipoContato, resultado: 'contato_realizado' })
      await moverEtapa(negocio.id, 'contato_realizado')
      onAtualizado()
    } finally {
      setSalvando(false)
    }
  }

  async function confirmarOrcamento() {
    setSalvando(true)
    try {
      await registrarInteracao({ negocio_id: negocio.id, tipo: tipoContato, resultado: 'gerar_orcamento' })
      await gerarOrcamento(negocio.id, { valor_cotacao: Number(valor), temperatura, numero_orcamento: numeroOrcamento })
      onAtualizado()
    } finally {
      setSalvando(false)
    }
  }

  async function semInteresse() {
    setSalvando(true)
    try {
      await registrarInteracao({ negocio_id: negocio.id, tipo: tipoContato, resultado: 'sem_interesse' })
      await moverParaRetornoFuturo(negocio.id, daquiADias(45))
      onAtualizado()
    } finally {
      setSalvando(false)
    }
  }

  async function temFornecedor() {
    setSalvando(true)
    try {
      await registrarInteracao({ negocio_id: negocio.id, tipo: tipoContato, resultado: 'tem_fornecedor' })
      await moverParaRetornoFuturo(negocio.id, daquiADias(45))
      onAtualizado()
    } finally {
      setSalvando(false)
    }
  }

  async function confirmarLigarFuturo() {
    setSalvando(true)
    try {
      await registrarInteracao({ negocio_id: negocio.id, tipo: tipoContato, resultado: 'ligar_futuro' })
      await moverParaRetornoFuturo(negocio.id, dataFutura)
      onAtualizado()
    } finally {
      setSalvando(false)
    }
  }

  async function semMaquina() {
    setSalvando(true)
    try {
      await registrarInteracao({ negocio_id: negocio.id, tipo: tipoContato, resultado: 'sem_maquina' })
      await descartarNegocio(negocio.id)
      onAtualizado()
    } finally {
      setSalvando(false)
    }
  }

  const criadoEm = negocio.criado_em
    ? new Date(negocio.criado_em).toLocaleDateString('pt-BR')
    : null
  const diasAberto = negocio.criado_em
    ? Math.floor((Date.now() - new Date(negocio.criado_em)) / 86400000)
    : 0

  const ultimoContato = negocio.ultima_interacao_em
    ? new Date(negocio.ultima_interacao_em).toLocaleDateString('pt-BR')
    : null

  return (
    <div
      onClick={onAbrirDetalhe}
      style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '10px 12px', cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{negocio.cliente?.razao_social}</p>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, whiteSpace: 'nowrap',
          background: diasAberto === 0 ? '#eaf3de' : '#f1efe8',
          color: diasAberto === 0 ? '#3b6d11' : '#666',
        }}>
          {diasAberto === 0 ? 'Novo' : `${diasAberto}d`}
        </span>
      </div>
      {negocio.cliente?.cidade && (
        <p style={{ fontSize: 11, color: '#777', margin: '2px 0 0' }}>{negocio.cliente.cidade}</p>
      )}
      {negocio.cliente?.telefone_whats && (
        <p style={{ fontSize: 11, color: '#777', margin: '2px 0 0' }}>{negocio.cliente.telefone_whats}</p>
      )}
      {negocio.produto_servico && (
        <p style={{ fontSize: 11, color: '#777', margin: '2px 0 0' }}>{negocio.produto_servico}</p>
      )}
      <p style={{ fontSize: 11, color: '#777', margin: '4px 0 0' }}>{negocio.consultor?.nome}</p>
      <p style={{ fontSize: 11, color: '#999', margin: '2px 0 0' }}>Criado em: {criadoEm}</p>
      {ehPm2p && (
        <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: '#FFF1E0', color: '#B85C00' }}>PM2P</span>
          {tentativas > 0 && (
            <button onClick={alternarLigacoes} title="Ligações não atendidas — clique para ver dias e horários"
              style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#a32d2d', fontSize: 12, fontWeight: 700 }}>
              <Phone size={13} /> {tentativas}
            </button>
          )}
        </div>
      )}
      {ehPm2p && ligacoes && (
        <div onClick={e => e.stopPropagation()} style={{ marginTop: 4, padding: '6px 8px', background: '#fcebeb', borderRadius: 6, fontSize: 11, color: '#7a2020' }}>
          <p style={{ margin: '0 0 3px', fontWeight: 700 }}>Ligações não atendidas</p>
          {ligacoes.length === 0 && <p style={{ margin: 0 }}>Sem registro de data.</p>}
          {ligacoes.map(l => (
            <p key={l.id} style={{ margin: '1px 0' }}>
              {new Date(l.criado_em).toLocaleDateString('pt-BR')} às {new Date(l.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          ))}
        </div>
      )}
      <p style={{ fontSize: 11, color: ultimoContato ? '#999' : '#c0392b', margin: '2px 0 0' }}>
        {ultimoContato ? `Último contato: ${ultimoContato}` : 'Ainda sem contato'}
      </p>

      <div onClick={e => e.stopPropagation()}>
        {etapaLocal === 'inicial' && (
          <button style={btnPrincipal} onClick={() => (ehPm2p ? setContatoAberto(true) : setEtapaLocal('escolher_tipo'))}>
            Registrar contato
          </button>
        )}

        {etapaLocal === 'escolher_tipo' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
            {TIPOS.map(t => (
              <button key={t.key} disabled={salvando} style={btnPequeno} onClick={() => confirmarContato(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {etapaLocal === 'escolher_resultado' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
            <button disabled={salvando} style={btnPequeno} onClick={avancarContatoRealizado}>Contato realizado (seguir depois)</button>
            <button disabled={salvando} style={btnPequeno} onClick={() => setEtapaLocal('orcamento')}>Gerar orçamento agora</button>
            <button disabled={salvando} style={btnPequeno} onClick={semInteresse}>Não tenho interesse</button>
            <button disabled={salvando} style={btnPequeno} onClick={temFornecedor}>Já tem fornecedor</button>
            <button disabled={salvando} style={btnPequeno} onClick={() => setEtapaLocal('ligar_futuro')}>Ligar no futuro</button>
            <button disabled={salvando} style={btnPequeno} onClick={semMaquina}>Não possui empilhadeiras</button>
          </div>
        )}

        {etapaLocal === 'orcamento' && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input
              placeholder="Nº do orçamento *"
              value={numeroOrcamento}
              onChange={e => setNumeroOrcamento(e.target.value)}
              style={inputPequeno}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Valor da cotação (R$) *"
              value={valor}
              onChange={e => setValor(e.target.value)}
              style={inputPequeno}
            />
            <select value={temperatura} onChange={e => setTemperatura(e.target.value)} style={inputPequeno}>
              <option value="frio">Frio</option>
              <option value="morno">Morno</option>
              <option value="quente">Quente</option>
            </select>
            <button disabled={salvando || !valor || !numeroOrcamento.trim()} style={btnPrincipal} onClick={confirmarOrcamento}>
              Confirmar e mover pra negociação
            </button>
          </div>
        )}

        {etapaLocal === 'ligar_futuro' && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input type="date" value={dataFutura} onChange={e => setDataFutura(e.target.value)} style={inputPequeno} />
            <button disabled={salvando || !dataFutura} style={btnPrincipal} onClick={confirmarLigarFuturo}>
              Confirmar data
            </button>
          </div>
        )}
      </div>

      {contatoAberto && (
        <ContatoPm2p negocio={negocio} onFechar={() => setContatoAberto(false)} onAtualizado={onAtualizado}
          onGerarProposta={() => setPropostaAberta(true)} />
      )}
      {propostaAberta && (
        <PropostaPm2p negocio={negocio} onFechar={() => { setPropostaAberta(false); onAtualizado() }} onAtualizado={onAtualizado} />
      )}
    </div>
  )
}

const btnPrincipal = {
  width: '100%', marginTop: 8, padding: '6px 8px', fontSize: 12, borderRadius: 6,
  border: 'none', background: '#F77E01', color: '#fff', cursor: 'pointer', fontWeight: 600,
}

const btnPequeno = {
  padding: '5px 8px', fontSize: 11, borderRadius: 6, border: '1px solid #ddd',
  background: '#f7f7f7', color: '#333', cursor: 'pointer',
}

const inputPequeno = {
  width: '100%', padding: 6, fontSize: 12, borderRadius: 6, border: '1px solid #ddd', boxSizing: 'border-box',
}
