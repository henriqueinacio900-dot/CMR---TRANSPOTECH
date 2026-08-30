import { useEffect, useState } from 'react'
import { TEMA } from './theme'
import { listarAtividadesRecentes } from './api'

const LABEL_TIPO = {
  ligacao: 'Ligação', whatsapp: 'WhatsApp', email: 'E-mail', visita: 'Visita', reuniao: 'Reunião', outro: 'Outro',
}

export default function Atividades({ onAbrirRelatorioVisita }) {
  const [atividades, setAtividades] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    listarAtividadesRecentes(50).then(a => { setAtividades(a); setCarregando(false) })
  }, [])

  if (carregando) return <p style={{ padding: 24, color: TEMA.textoPrincipal }}>Carregando...</p>

  return (
    <div style={{ padding: 24, color: TEMA.textoPrincipal }}>
      <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>Atividades recentes</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {atividades.map(a => (
          <div key={a.id} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: 12, color: '#222', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontSize: 13 }}>
                <strong>{LABEL_TIPO[a.tipo] || a.tipo}</strong> com <strong>{a.negocio?.cliente?.razao_social}</strong>
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#555' }}>{a.descricao}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#999' }}>
                {a.responsavel?.nome} · {new Date(a.data_hora).toLocaleString('pt-BR')}
              </p>
            </div>
            {a.tipo === 'visita' && onAbrirRelatorioVisita && (
              <button
                onClick={() => onAbrirRelatorioVisita({
                  id: a.id,
                  negocio_id: a.negocio?.id || a.negocio_id,
                  clienteNome: a.negocio?.cliente?.razao_social,
                  cidade: a.negocio?.cliente?.cidade,
                })}
                style={{ background: '#F77E01', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                📋 Preencher relatório
              </button>
            )}
          </div>
        ))}
        {atividades.length === 0 && <p style={{ color: '#999' }}>Nenhuma atividade registrada ainda.</p>}
      </div>
    </div>
  )
}
