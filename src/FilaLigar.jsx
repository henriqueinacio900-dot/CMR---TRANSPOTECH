import { useState } from 'react'
import { adiarProximaAcao } from './api'
import { classificarPci, formatarMoeda } from './constants'

const ETAPAS_ABERTAS = ['prospeccao', 'contato_realizado', 'oportunidade_identificada', 'orcamento_enviado', 'negociacao_decisao']

function calcularMotivosEPrioridade(n) {
  const agora = new Date()
  const hojeStr = agora.toISOString().slice(0, 10)
  const motivos = []
  let score = 0

  const vencido = n.proxima_acao_data && new Date(n.proxima_acao_data) < agora
  if (vencido) { motivos.push('follow-up vencido'); score += 1000 }

  const retornoHoje = n.etapa === 'retorno_futuro' && n.data_retorno === hojeStr
  if (retornoHoje) { motivos.push('retorno agendado pra hoje'); score += 900 }

  if (n.urgencia === 'alta') { motivos.push('urgência alta'); score += 500 }

  const nota = n.avaliacoes_pci?.[0]?.nota_total || 0
  const pci = classificarPci(nota)
  if (pci.sigla === 'A') { motivos.push('PCI A'); score += 400 }
  score += nota * 5

  if (n.etapa === 'orcamento_enviado' && !n.proxima_acao) { motivos.push('orçamento sem acompanhamento'); score += 200 }

  const diasParado = n.atualizado_em ? Math.floor((agora - new Date(n.atualizado_em)) / 86400000) : 0
  if (diasParado > 0) motivos.push(`${diasParado} dia(s) sem movimentação`)
  score += diasParado * 2

  score += (n.valor_cotacao || 0) / 1000

  return { motivos, score }
}

export default function FilaLigar({ negocios, onAbrir, onAtualizado }) {
  const [adiandoId, setAdiandoId] = useState(null)
  const [novaData, setNovaData] = useState('')

  const candidatos = negocios.filter(n =>
    ETAPAS_ABERTAS.includes(n.etapa) ||
    (n.etapa === 'retorno_futuro' && n.data_retorno && n.data_retorno <= new Date().toISOString().slice(0, 10))
  )

  const priorizados = candidatos
    .map(n => ({ negocio: n, ...calcularMotivosEPrioridade(n) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)

  if (priorizados.length === 0) return null

  async function confirmarAdiar(negocioId) {
    if (!novaData) return
    await adiarProximaAcao(negocioId, novaData)
    setAdiandoId(null)
    setNovaData('')
    onAtualizado()
  }

  return (
    <div style={{ marginBottom: 20, background: '#FFF8F0', border: '1px solid #F0C89A', borderRadius: 10, padding: 14 }}>
      <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px', color: '#8a4b00' }}>
        📞 Quem devo ligar agora?
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {priorizados.map((p, i) => {
          const n = p.negocio
          const telefone = (n.cliente?.telefone_whats || '').replace(/\D/g, '')
          return (
            <div key={n.id} style={{ background: '#fff', borderRadius: 8, padding: 10, border: '1px solid #f0e4d0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>
                    Prioridade {i + 1} — {n.cliente?.razao_social}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#777' }}>
                    Motivo: {p.motivos.join(' + ') || 'na fila'}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#999' }}>
                    {formatarMoeda(n.valor_cotacao)} · {n.consultor?.nome}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {telefone && (
                  <a href={`tel:${telefone}`} style={botaoLink} onClick={e => e.stopPropagation()}>Ligar</a>
                )}
                {telefone && (
                  <a href={`https://wa.me/55${telefone}`} target="_blank" rel="noreferrer" style={botaoLink} onClick={e => e.stopPropagation()}>WhatsApp</a>
                )}
                <button onClick={() => onAbrir(n.id)} style={botaoLink}>Abrir negócio</button>
                <button onClick={() => setAdiandoId(adiandoId === n.id ? null : n.id)} style={botaoLink}>Adiar</button>
              </div>

              {adiandoId === n.id && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <input type="datetime-local" value={novaData} onChange={e => setNovaData(e.target.value)} style={inputStyle} />
                  <button onClick={() => confirmarAdiar(n.id)} disabled={!novaData} style={{ ...botaoLink, background: '#F77E01', color: '#fff' }}>
                    Confirmar nova data
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const botaoLink = {
  fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '1px solid #ddd',
  background: '#f7f7f7', color: '#333', cursor: 'pointer', textDecoration: 'none', display: 'inline-block',
}

const inputStyle = {
  padding: 6, borderRadius: 6, border: '1px solid #ddd', fontSize: 12,
}