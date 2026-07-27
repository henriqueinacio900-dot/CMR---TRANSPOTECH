import { useEffect, useState } from 'react'
import { listarPassagensBastao, atualizarStatusPassagem } from './api'
import { formatarMoeda } from './constants'

const STATUS_LABEL = {
  aguardando_validacao: 'Aguardando validação',
  aguardando_programacao: 'Aguardando programação',
  em_execucao: 'Em execução',
  proximo_prazo: 'Próximo do prazo',
  atrasado: 'Atrasado',
  concluido: 'Concluído',
  aguardando_pos_venda: 'Aguardando pós-venda',
}

export default function PassagemBastao() {
  const [passagens, setPassagens] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    setCarregando(true)
    setPassagens(await listarPassagensBastao())
    setCarregando(false)
  }

  async function mudarStatus(id, status) {
    await atualizarStatusPassagem(id, status)
    carregar()
  }

  if (carregando) return <p style={{ padding: 24 }}>Carregando...</p>

  return (
    <div style={{ padding: 24 }}>
      <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>Passagem de bastão</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {passagens.map(p => (
          <div key={p.id} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{p.negocio?.cliente?.razao_social}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#777' }}>
                  {p.produto_servico} · {formatarMoeda(p.valor_final)} · Pedido {p.numero_pedido || 's/n'}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#999' }}>
                  Destino: {p.departamento_destino?.nome} · Responsável: {p.responsavel_operacional?.nome}
                </p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10, background: '#f1efe8', color: '#555', whiteSpace: 'nowrap' }}>
                {STATUS_LABEL[p.status] || p.status}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <select value={p.status} onChange={e => mudarStatus(p.id, e.target.value)} style={{ fontSize: 12, padding: 6, borderRadius: 6, border: '1px solid #ddd' }}>
                {Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
          </div>
        ))}
        {passagens.length === 0 && <p style={{ color: '#999' }}>Nenhuma passagem de bastão ainda.</p>}
      </div>
    </div>
  )
}
