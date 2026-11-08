import { useState } from 'react'
import { createPortal } from 'react-dom'
import { registrarContatoEAgendar } from './api'
import { PROXIMAS_ACOES, paraISOLocal } from './constants'
import {
  CANAIS_CONTATO, RESULTADOS_CONTATO, validarContato, temErros, sugestaoProximoRetorno,
} from './regrasEtapa'

// Formulário curto: canal, resultado, próxima ação e data.
// Salva a atividade e a próxima ação numa única operação (função do banco, transação única).
export default function RegistrarContato({ negocio, onFechar, onSalvo }) {
  const [canal, setCanal] = useState('ligacao')
  const [resultado, setResultado] = useState('')
  const [anotacao, setAnotacao] = useState('')
  const [proximaAcao, setProximaAcao] = useState('ligacao')
  const [proximaData, setProximaData] = useState(sugestaoProximoRetorno())
  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function salvar(e) {
    e.preventDefault()
    const v = validarContato({ canal, resultado, proxima_acao: proximaAcao, proxima_acao_data: proximaData })
    setErros(v)
    if (temErros(v)) return
    setErroGeral('')
    setSalvando(true)
    try {
      const rotulo = RESULTADOS_CONTATO.find(r => r.key === resultado)?.label || resultado
      await registrarContatoEAgendar({
        negocio_id: negocio.id,
        canal,
        resultado,
        descricao: anotacao.trim() ? `${rotulo} — ${anotacao.trim()}` : rotulo,
        proxima_acao: proximaAcao,
        proxima_acao_data: paraISOLocal(proximaData),
      })
      onSalvo()
    } catch (err) {
      console.error(err)
      setErroGeral('Não deu pra salvar: ' + (err.message || 'erro desconhecido'))
    } finally {
      setSalvando(false)
    }
  }

  const modal = (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900, padding: 16 }}>
      <form onSubmit={salvar} style={{ background: '#fff', borderRadius: 12, padding: 22, width: 400, maxWidth: '100%', maxHeight: '92vh', overflowY: 'auto', color: '#222' }}>
        <h2 style={{ fontSize: 16, margin: '0 0 2px' }}>Registrar contato</h2>
        <p style={{ fontSize: 12, color: '#777', margin: '0 0 14px' }}>{negocio.cliente?.razao_social}</p>

        <Campo label="Canal *" erro={erros.canal}>
          <select value={canal} onChange={e => setCanal(e.target.value)} style={estiloInput(erros.canal)}>
            {CANAIS_CONTATO.map(c => <option key={c.key} value={c.key} style={{ color: '#222' }}>{c.label}</option>)}
          </select>
        </Campo>
        <Campo label="Resultado da conversa *" erro={erros.resultado}>
          <select value={resultado} onChange={e => setResultado(e.target.value)} style={estiloInput(erros.resultado)}>
            <option value="">Escolha...</option>
            {RESULTADOS_CONTATO.map(r => <option key={r.key} value={r.key} style={{ color: '#222' }}>{r.label}</option>)}
          </select>
        </Campo>
        <Campo label="Anotação (ex.: cliente pediu retorno na quinta)">
          <textarea rows={2} value={anotacao} onChange={e => setAnotacao(e.target.value)} style={{ ...estiloInput(), resize: 'vertical' }} />
        </Campo>

        <p style={{ fontSize: 12, fontWeight: 700, color: '#F77E01', textTransform: 'uppercase', margin: '14px 0 8px' }}>Próximo passo</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Campo label="Ação *" erro={erros.proxima_acao} style={{ flex: 1 }}>
            <select value={proximaAcao} onChange={e => setProximaAcao(e.target.value)} style={estiloInput(erros.proxima_acao)}>
              {PROXIMAS_ACOES.map(p => <option key={p.key} value={p.key} style={{ color: '#222' }}>{p.label}</option>)}
            </select>
          </Campo>
          <Campo label="Data e hora *" erro={erros.proxima_acao_data} style={{ flex: 1 }}>
            <input type="datetime-local" value={proximaData} onChange={e => setProximaData(e.target.value)} style={estiloInput(erros.proxima_acao_data)} />
          </Campo>
        </div>
        <p style={{ fontSize: 11, color: '#999', margin: '0 0 10px' }}>
          O retorno combinado aqui substitui o lembrete automático da cadência pós-orçamento enquanto não vencer.
        </p>

        {erroGeral && <p style={{ color: '#a32d2d', fontSize: 13, margin: '0 0 10px' }}>{erroGeral}</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={onFechar} style={{ ...botao, background: '#eee', color: '#333' }}>Cancelar</button>
          <button type="submit" disabled={salvando} style={{ ...botao, background: '#F77E01', color: '#fff' }}>
            {salvando ? 'Salvando...' : 'Salvar contato e agendar'}
          </button>
        </div>
      </form>
    </div>
  )

  return createPortal(modal, document.body)
}

function Campo({ label, erro, children, style }) {
  return (
    <div style={{ marginBottom: 10, ...style }}>
      <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
      {erro && <p style={{ fontSize: 11, color: '#a32d2d', margin: '3px 0 0' }}>{erro}</p>}
    </div>
  )
}

function estiloInput(erro) {
  return {
    width: '100%', padding: 8, borderRadius: 6, boxSizing: 'border-box', fontSize: 13,
    border: `1px solid ${erro ? '#a32d2d' : '#ddd'}`, color: '#222', background: '#fff',
  }
}

const botao = { flex: 1, padding: 10, border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 }
