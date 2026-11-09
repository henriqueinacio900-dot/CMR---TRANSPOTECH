import { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  registrarInteracao, registrarLigacaoSemResposta, atualizarNegocio, moverEtapa,
  moverParaRetornoFuturo, descartarNegocio, agendarVisitaEAvancar, daquiADias,
} from './api'
import { paraISOLocal } from './constants'
import { sugestaoProximoRetorno } from './regrasEtapa'

const CANAIS = [
  { key: 'ligacao', label: 'Ligação' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'email', label: 'E-mail' },
  { key: 'presencial', label: 'Presencial' },
]

// Próximos passos depois de uma conversa. "tipoData": pede data/hora (datetime) ou só dia (date).
const PASSOS = [
  { key: 'ligar_depois', label: 'Ligar depois', tipoData: 'datetime', rotuloData: 'Quando ligar (follow-up)' },
  { key: 'gerar_orcamento', label: 'Gerar orçamento (proposta PM2P)' },
  { key: 'agendar_visita', label: 'Agendar uma visita', tipoData: 'datetime', rotuloData: 'Data e hora da visita' },
  { key: 'mandar_email', label: 'Mandar e-mail', tipoData: 'datetime', rotuloData: 'Quando enviar' },
  { key: 'mandar_whats', label: 'Mandar um WhatsApp', tipoData: 'datetime', rotuloData: 'Quando enviar' },
  { key: 'ligar_futuro', label: 'Ligar no futuro', tipoData: 'date', rotuloData: 'Ligar em' },
  { key: 'sem_interesse', label: 'Não tenho interesse' },
  { key: 'tem_fornecedor', label: 'Já tem fornecedor' },
  { key: 'sem_maquina', label: 'Não possui empilhadeiras' },
]

// Contato em uma oportunidade PM2P na Prospecção: canal → (atendeu?) → próximo passo.
export default function ContatoPm2p({ negocio, onFechar, onAtualizado, onGerarProposta }) {
  const [etapa, setEtapa] = useState('canal') // canal | atendeu | passo
  const [canal, setCanal] = useState('')
  const [passo, setPasso] = useState('')
  const [dataHora, setDataHora] = useState(sugestaoProximoRetorno())
  const [dia, setDia] = useState('')
  const [obs, setObs] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const passoAtual = PASSOS.find(p => p.key === passo)

  async function executar(fn) {
    setErro(''); setSalvando(true)
    try { await fn() } catch (e) {
      console.error(e); setErro('Não deu pra salvar: ' + (e.message || 'erro desconhecido'))
    } finally { setSalvando(false) }
  }

  function escolherCanal(c) {
    setCanal(c)
    setEtapa(c === 'ligacao' ? 'atendeu' : 'passo')
  }

  const naoAtendeu = () => executar(async () => {
    await registrarLigacaoSemResposta(negocio.id, obs.trim() || null)
    onAtualizado(); onFechar()
  })

  const confirmarPasso = () => executar(async () => {
    if (!passo) { setErro('Escolha o próximo passo.'); throw new Error('Escolha o próximo passo.') }
    if (passoAtual?.tipoData === 'datetime' && !dataHora) throw new Error('Informe a data e a hora.')
    if (passoAtual?.tipoData === 'date' && !dia) throw new Error('Informe a data.')

    const iso = passoAtual?.tipoData === 'datetime' ? paraISOLocal(dataHora) : null
    const resultadoPorPasso = {
      gerar_orcamento: 'gerar_orcamento', sem_interesse: 'sem_interesse', tem_fornecedor: 'tem_fornecedor',
      ligar_futuro: 'ligar_futuro', sem_maquina: 'sem_maquina', agendar_visita: 'contato_realizado',
    }
    await registrarInteracao({
      negocio_id: negocio.id, tipo: canal, atendeu: true,
      resultado: resultadoPorPasso[passo],
      observacao: [passoAtual?.label, obs.trim()].filter(Boolean).join(' — '),
    })

    if (passo === 'ligar_depois' || passo === 'mandar_email' || passo === 'mandar_whats') {
      const acao = passo === 'ligar_depois' ? 'ligacao' : (passo === 'mandar_email' ? 'email' : 'whatsapp')
      await atualizarNegocio(negocio.id, { proxima_acao: acao, proxima_acao_data: iso, proxima_acao_origem: 'manual' })
    } else if (passo === 'agendar_visita') {
      await agendarVisitaEAvancar(negocio.id, { dataISO: iso, observacao: obs.trim() || null })
    } else if (passo === 'gerar_orcamento') {
      await moverEtapa(negocio.id, 'contato_realizado', {
        proxima_acao: 'enviar_orcamento', proxima_acao_data: paraISOLocal(sugestaoProximoRetorno()), proxima_acao_origem: 'manual',
      })
    } else if (passo === 'ligar_futuro') {
      await moverParaRetornoFuturo(negocio.id, dia)
    } else if (passo === 'sem_interesse' || passo === 'tem_fornecedor') {
      await moverParaRetornoFuturo(negocio.id, daquiADias(45))
    } else if (passo === 'sem_maquina') {
      await descartarNegocio(negocio.id)
    }
    if (passo === 'gerar_orcamento') {
      // não recarrega agora: o card sairia da Prospecção e a proposta fecharia junto. Recarrega ao fechar a proposta.
      onFechar()
      onGerarProposta?.()
    } else {
      onAtualizado()
      onFechar()
    }
  })

  const modal = (
    <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: 22, width: 400, maxWidth: '100%', maxHeight: '92vh', overflowY: 'auto', color: '#222' }}>
        <h2 style={{ fontSize: 16, margin: '0 0 2px' }}>Registrar contato</h2>
        <p style={{ fontSize: 12, color: '#777', margin: '0 0 14px' }}>{negocio.cliente?.razao_social} · PM2P</p>

        {etapa === 'canal' && (
          <>
            <p style={titulo}>Como foi o contato?</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {CANAIS.map(c => <button key={c.key} onClick={() => escolherCanal(c.key)} style={botaoOpcao}>{c.label}</button>)}
            </div>
          </>
        )}

        {etapa === 'atendeu' && (
          <>
            <p style={titulo}>A ligação foi atendida?</p>
            <textarea rows={2} placeholder="Observação (opcional)" value={obs} onChange={e => setObs(e.target.value)} style={{ ...input, resize: 'vertical', marginBottom: 10 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={salvando} onClick={() => setEtapa('passo')} style={{ ...botaoOpcao, flex: 1, background: '#eaf3de', borderColor: '#b7d98f' }}>Sim, atendeu</button>
              <button disabled={salvando} onClick={naoAtendeu} style={{ ...botaoOpcao, flex: 1, background: '#fcebeb', borderColor: '#e8b4b4' }}>
                {salvando ? 'Salvando...' : 'Não atendeu'}
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#999', margin: '8px 0 0' }}>Se não atendeu, o negócio continua na Prospecção e a tentativa fica registrada com data e hora.</p>
          </>
        )}

        {etapa === 'passo' && (
          <>
            <p style={titulo}>Qual o próximo passo?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              {PASSOS.map(p => (
                <button key={p.key} onClick={() => { setPasso(p.key); setErro('') }}
                  style={{ ...botaoOpcao, textAlign: 'left', ...(passo === p.key ? { background: '#FFF1E0', borderColor: '#F77E01', fontWeight: 700 } : {}) }}>
                  {p.label}
                </button>
              ))}
            </div>

            {passoAtual?.tipoData === 'datetime' && (
              <Campo label={passoAtual.rotuloData + ' *'}>
                <input type="datetime-local" value={dataHora} onChange={e => setDataHora(e.target.value)} style={input} />
              </Campo>
            )}
            {passoAtual?.tipoData === 'date' && (
              <Campo label={passoAtual.rotuloData + ' *'}>
                <input type="date" value={dia} onChange={e => setDia(e.target.value)} style={input} />
              </Campo>
            )}
            {passo === 'agendar_visita' && (
              <p style={{ fontSize: 11, color: '#777', margin: '0 0 8px' }}>A visita entra no calendário e o negócio vai para Contato realizado.</p>
            )}
            {passo === 'gerar_orcamento' && (
              <p style={{ fontSize: 11, color: '#777', margin: '0 0 8px' }}>O negócio vai para Contato realizado e a proposta PM2P abre em seguida.</p>
            )}
            {passo && (
              <Campo label="Observação (opcional)">
                <textarea rows={2} value={obs} onChange={e => setObs(e.target.value)} style={{ ...input, resize: 'vertical' }} />
              </Campo>
            )}
          </>
        )}

        {erro && <p style={{ color: '#a32d2d', fontSize: 13, margin: '0 0 10px' }}>{erro}</p>}

        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <button type="button" onClick={onFechar} style={{ ...botao, background: '#eee', color: '#333' }}>Cancelar</button>
          {etapa === 'passo' && (
            <button type="button" disabled={salvando || !passo} onClick={confirmarPasso} style={{ ...botao, background: '#F77E01', color: '#fff', opacity: !passo ? 0.5 : 1 }}>
              {salvando ? 'Salvando...' : 'Confirmar'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
  return createPortal(modal, document.body)
}

function Campo({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

const titulo = { fontSize: 12, fontWeight: 700, color: '#F77E01', textTransform: 'uppercase', margin: '0 0 8px' }
const input = { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd', boxSizing: 'border-box', fontSize: 13, color: '#222', background: '#fff' }
const botaoOpcao = { padding: '9px 12px', fontSize: 13, borderRadius: 8, border: '1px solid #ddd', background: '#f7f7f7', color: '#222', cursor: 'pointer' }
const botao = { flex: 1, padding: 10, border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 }
