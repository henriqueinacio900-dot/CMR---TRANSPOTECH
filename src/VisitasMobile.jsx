import { useEffect, useState } from 'react'
import { listarVisitasProgramadasPendentes, concluirVisitaProgramada, sair, getMeuConsultor } from './api'
import { FormularioRelatorio } from './RelatorioVisita.jsx'
import { TEMA } from './theme'

export default function VisitasMobile() {
  const [visitas, setVisitas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [visitaAberta, setVisitaAberta] = useState(null)
  const [euMesmo, setEuMesmo] = useState(null)

  async function carregar() {
    setCarregando(true)
    const [v, eu] = await Promise.all([listarVisitasProgramadasPendentes(), getMeuConsultor()])
    setVisitas(v)
    setEuMesmo(eu)
    setCarregando(false)
  }

  useEffect(() => { carregar() }, [])

  async function aoSalvarRelatorio() {
    // Marca a próxima ação como concluída — some da lista automaticamente
    await concluirVisitaProgramada(visitaAberta.id)
    setVisitaAberta(null)
    carregar()
  }

  if (carregando) {
    return (
      <div style={estiloTela}>
        <p style={{ color: TEMA.textoSecundario }}>Carregando...</p>
      </div>
    )
  }

  if (visitaAberta) {
    return (
      <div style={estiloTela}>
        <FormularioRelatorio
          relatorio={{
            negocio_id: visitaAberta.id,
            empresa: visitaAberta.cliente?.razao_social || '',
            cidade: visitaAberta.cliente?.cidade || '',
            estado: visitaAberta.cliente?.estado || '',
            data_visita: new Date().toISOString().slice(0, 10),
          }}
          onSalvo={aoSalvarRelatorio}
          onCancelar={() => setVisitaAberta(null)}
        />
      </div>
    )
  }

  return (
    <div style={estiloTela}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <p style={{ fontSize: 18, fontWeight: 700, margin: 0, color: TEMA.textoPrincipal }}>Minhas visitas</p>
        <button onClick={() => sair()} style={{ background: 'none', border: 'none', color: TEMA.textoSecundario, fontSize: 12, cursor: 'pointer' }}>Sair</button>
      </div>
      {euMesmo?.nome && <p style={{ fontSize: 12, color: TEMA.textoSecundario, margin: '0 0 16px' }}>{euMesmo.nome}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visitas.map(v => {
          const data = v.proxima_acao_data ? new Date(v.proxima_acao_data) : null
          const atrasada = data && data < new Date()
          return (
            <button
              key={v.id}
              onClick={() => setVisitaAberta(v)}
              style={{
                textAlign: 'left', background: TEMA.card, border: `1px solid ${atrasada ? TEMA.vermelho + '77' : TEMA.borda}`,
                borderRadius: 12, padding: 16, cursor: 'pointer',
              }}
            >
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEMA.textoPrincipal }}>
                Relatório visita — {v.cliente?.razao_social}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: TEMA.textoSecundario }}>
                {v.cliente?.cidade}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 600, color: atrasada ? TEMA.vermelho : TEMA.laranjaLuminoso }}>
                {atrasada ? '⚠ Atrasada — ' : '📅 '}
                {data ? data.toLocaleDateString('pt-BR') : ''}
              </p>
            </button>
          )
        })}
        {visitas.length === 0 && (
          <p style={{ color: TEMA.textoDiscreto, fontSize: 14, textAlign: 'center', marginTop: 40 }}>
            Nenhuma visita programada pra essa semana. 🎉
          </p>
        )}
      </div>
    </div>
  )
}

const estiloTela = {
  minHeight: '100vh',
  background: TEMA.fundoPrincipal,
  padding: '20px 16px 60px',
  color: TEMA.textoPrincipal,
}
