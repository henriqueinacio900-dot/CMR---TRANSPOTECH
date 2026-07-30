import { useEffect, useState } from 'react'
import { listarConfiguracoesAutomacao } from './api'
import { classificarPci } from './constants'

const ETAPA_PARA_CONFIG = {
  prospeccao: 'dias_prospeccao_sem_contato',
  contato_realizado: 'dias_contato_sem_atualizacao',
  orcamento_enviado: 'dias_orcamento_sem_followup',
  negociacao_decisao: 'dias_negociacao_sem_atualizacao',
}

const CORES = {
  informativo: '#666',
  atencao: '#8a6d1f',
  urgente: '#993C1D',
  critico: '#a32d2d',
}

function calcularAlertas(negocios, config) {
  const agora = new Date()
  const alertas = []

  negocios.forEach(n => {
    const aberto = ['prospeccao', 'contato_realizado', 'orcamento_enviado', 'negociacao_decisao'].includes(n.etapa)
    if (!aberto) return

    if (n.proxima_acao_data && new Date(n.proxima_acao_data) < agora) {
      alertas.push({ negocioId: n.id, tipo: 'critico', mensagem: `Follow-up vencido — ${n.cliente?.razao_social}` })
    }

    if (!n.proxima_acao) {
      alertas.push({ negocioId: n.id, tipo: 'atencao', mensagem: `Sem próxima ação definida — ${n.cliente?.razao_social}` })
    }

    const diasParado = n.atualizado_em ? Math.floor((agora - new Date(n.atualizado_em)) / 86400000) : 0
    const limite = Number(config[ETAPA_PARA_CONFIG[n.etapa]] || 0)
    if (limite && diasParado > limite) {
      alertas.push({
        negocioId: n.id,
        tipo: diasParado > limite * 2 ? 'critico' : 'urgente',
        mensagem: `Parado há ${diasParado} dia(s) — ${n.cliente?.razao_social}`,
      })
    }

    const nota = n.avaliacoes_pci?.[0]?.nota_total
    if (nota !== undefined && classificarPci(nota).sigla === 'A' && !n.ultima_interacao_em) {
      alertas.push({ negocioId: n.id, tipo: 'urgente', mensagem: `Cliente PCI A sem nenhum contato — ${n.cliente?.razao_social}` })
    }
  })

  return alertas
}

export default function AlertasCentral({ negocios, onAbrir }) {
  const [config, setConfig] = useState({})
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    listarConfiguracoesAutomacao().then(setConfig)
  }, [])

  const alertas = calcularAlertas(negocios, config)
  const criticos = alertas.filter(a => a.tipo === 'critico' || a.tipo === 'urgente').length

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setAberto(!aberto)}
        style={{
          position: 'relative', background: '#ffffffcc', border: 'none', borderRadius: 8,
          padding: '8px 12px', fontSize: 13, cursor: 'pointer',
        }}
      >
        🔔
        {criticos > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4, background: '#a32d2d', color: '#fff',
            borderRadius: '50%', fontSize: 10, width: 16, height: 16, display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontWeight: 700,
          }}>
            {criticos}
          </span>
        )}
      </button>

      {aberto && (
        <div style={{
          position: 'absolute', top: '110%', right: 0, background: '#fff', borderRadius: 10,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)', width: 320, maxHeight: 400, overflowY: 'auto',
          padding: 10, zIndex: 40,
        }}>
          <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 8px', color: '#333' }}>Notificações</p>
          {alertas.length === 0 && <p style={{ fontSize: 12, color: '#999' }}>Nada pendente agora.</p>}
          {alertas.map((a, i) => (
            <div
              key={i}
              onClick={() => { onAbrir(a.negocioId); setAberto(false) }}
              style={{
                padding: '8px 6px', borderBottom: '1px solid #f2f2f2', cursor: 'pointer', fontSize: 12,
                borderLeft: `3px solid ${CORES[a.tipo]}`, paddingLeft: 8, marginBottom: 4,
              }}
            >
              <span style={{ color: CORES[a.tipo], fontWeight: 600, textTransform: 'uppercase', fontSize: 10 }}>{a.tipo}</span>
              <p style={{ margin: '2px 0 0' }}>{a.mensagem}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
