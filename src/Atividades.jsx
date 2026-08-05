import { useEffect, useState } from 'react'
import { TEMA } from './theme'
import { listarAtividadesRecentes } from './api'

const LABEL_TIPO = {
  ligacao: 'Ligação', whatsapp: 'WhatsApp', email: 'E-mail', visita: 'Visita', reuniao: 'Reunião', outro: 'Outro',
}

export default function Atividades() {
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
          <div key={a.id} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: 12, color: '#222' }}>
            <p style={{ margin: 0, fontSize: 13 }}>
              <strong>{LABEL_TIPO[a.tipo] || a.tipo}</strong> com <strong>{a.negocio?.cliente?.razao_social}</strong>
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#555' }}>{a.descricao}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#999' }}>
              {a.responsavel?.nome} · {new Date(a.data_hora).toLocaleString('pt-BR')}
            </p>
          </div>
        ))}
        {atividades.length === 0 && <p style={{ color: '#999' }}>Nenhuma atividade registrada ainda.</p>}
      </div>
    </div>
  )
}
