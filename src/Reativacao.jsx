import { useEffect, useState } from 'react'
import { TEMA } from './theme'
import { listarCandidatosReativacao, criarNegocioReativacao } from './api'
import { formatarMoeda } from './constants'

export default function Reativacao({ onAtualizado }) {
  const [candidatos, setCandidatos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [criandoId, setCriandoId] = useState(null)

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    setCarregando(true)
    setCandidatos(await listarCandidatosReativacao())
    setCarregando(false)
  }

  async function reativar(c) {
    setCriandoId(c.id)
    try {
      await criarNegocioReativacao({
        cliente_id: c.cliente.id,
        departamento_id: c.departamento.id,
        produto_servico: c.produto_servico,
      })
      onAtualizado?.()
      await carregar()
    } finally {
      setCriandoId(null)
    }
  }

  if (carregando) return <p style={{ padding: 24, color: TEMA.textoPrincipal }}>Carregando...</p>

  return (
    <div style={{ padding: 24, color: TEMA.textoPrincipal }}>
      <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>Reativação de clientes</p>
      <p style={{ fontSize: 13, color: '#777', margin: '0 0 16px' }}>
        Negócios perdidos elegíveis pra reativar + clientes ganhos há mais de 60 dias sem compra nova.
      </p>

      {candidatos.length === 0 && <p style={{ color: '#999' }}>Nenhum candidato agora.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {candidatos.map(c => (
          <div key={c.id} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: 12, color: '#222' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{c.cliente?.razao_social}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#777' }}>{c.motivo}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#999' }}>
                  {c.produto_servico || 'Sem produto/serviço registrado'} · {formatarMoeda(c.valor_cotacao || c.valor_final)} · {c.departamento?.nome}
                </p>
              </div>
              <button
                onClick={() => reativar(c)}
                disabled={criandoId === c.id}
                style={{
                  background: '#F77E01', color: '#fff', border: 'none', borderRadius: 6,
                  padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {criandoId === c.id ? 'Criando...' : 'Criar negócio de reativação'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
