import { useEffect, useMemo, useState } from 'react'
import { listarDepartamentos, listarNegocios, voltarParaProspeccao } from './api'
import { ETAPAS, CORES_TEMPERATURA, CORES_MARCA, formatarMoeda } from './constants'
import NovoNegocio from './NovoNegocio.jsx'
import ProspeccaoCard from './ProspeccaoCard.jsx'

export default function Kanban() {
  const [departamentos, setDepartamentos] = useState([])
  const [negocios, setNegocios] = useState([])
  const [deptSelecionado, setDeptSelecionado] = useState('todos')
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)

  async function carregar() {
    setCarregando(true)
    const [deps, negs] = await Promise.all([listarDepartamentos(), listarNegocios()])
    setDepartamentos(deps)
    setNegocios(negs)
    setCarregando(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  const filtrados = useMemo(() => {
    if (deptSelecionado === 'todos') return negocios
    return negocios.filter(n => n.departamento?.nome === deptSelecionado)
  }, [negocios, deptSelecionado])

  const totais = useMemo(() => {
    const emNegociacao = filtrados.filter(n => n.etapa === 'negociacao').reduce((s, n) => s + (n.valor_cotacao || 0), 0)
    const aberto = filtrados.filter(n => ['prospeccao', 'proposta', 'negociacao'].includes(n.etapa)).reduce((s, n) => s + (n.valor_cotacao || 0), 0)
    const ganho = filtrados.filter(n => n.etapa === 'ganha').reduce((s, n) => s + (n.valor_final || n.valor_cotacao || 0), 0)
    const perdido = filtrados.filter(n => n.etapa === 'perdida').reduce((s, n) => s + (n.valor_cotacao || 0), 0)
    return { emNegociacao, aberto, ganho, perdido }
  }, [filtrados])

  if (carregando) return <p style={{ padding: 24 }}>Carregando...</p>

  return (
    <div>
      <div style={{ background: CORES_MARCA.laranja, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <strong style={{ color: '#fff' }}>CRM Transpotech</strong>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setModalAberto(true)}
            style={{
              background: '#fff', color: CORES_MARCA.laranja, border: 'none',
              borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            + Novo negócio
          </button>
          {['todos', 'Pós-vendas', 'Varejo', 'Pneus'].map(d => (
            <button
              key={d}
              onClick={() => setDeptSelecionado(d)}
              style={{
                background: deptSelecionado === d ? '#D85A30' : '#ffffffcc',
                color: deptSelecionado === d ? '#fff' : '#555',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {d === 'todos' ? 'Todos' : d}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12, marginBottom: 20 }}>
          <CardValor label="Em negociação" valor={totais.emNegociacao} />
          <CardValor label="Total em aberto" valor={totais.aberto} />
          <CardValor label="Ganho" valor={totais.ganho} cor="#3b6d11" fundo="#eaf3de" />
          <CardValor label="Perdido" valor={totais.perdido} cor="#a32d2d" fundo="#fcebeb" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 10 }}>
          {ETAPAS.map(col => {
            const itens = filtrados.filter(n => n.etapa === col.key)
            const totalCol = itens.reduce((s, n) => s + (n.valor_cotacao || 0), 0)
            return (
              <div key={col.key}>
                <div style={{ padding: '8px 10px', background: '#f1efe8', borderRadius: 8, marginBottom: 8 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{col.label}</p>
                  <p style={{ fontSize: 12, color: '#666', margin: '2px 0 0' }}>{itens.length} · {formatarMoeda(totalCol)}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {itens.map(n => {
                    if (col.key === 'prospeccao') {
                      return <ProspeccaoCard key={n.id} negocio={n} onAtualizado={carregar} />
                    }
                    const temp = CORES_TEMPERATURA[n.temperatura]
                    return (
                      <div key={n.id} style={{
                        background: temp ? temp.grad : '#fff',
                        border: temp ? 'none' : '1px solid #eee',
                        borderRadius: 12,
                        padding: '10px 12px',
                      }}>
                        <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: temp ? temp.titulo : '#222' }}>
                          {n.cliente?.razao_social}
                        </p>
                        <p style={{ fontSize: 13, margin: '4px 0 0', color: temp ? temp.titulo : '#222' }}>
                          {formatarMoeda(n.valor_cotacao)}
                        </p>
                        <p style={{ fontSize: 11, margin: '4px 0 0', color: temp ? temp.sub : '#777' }}>
                          {n.consultor?.nome}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <ListaRetorno negocios={filtrados} onAtualizado={carregar} />
      </div>

      {modalAberto && (
        <NovoNegocio
          departamentos={departamentos}
          onFechar={() => setModalAberto(false)}
          onCriado={() => {
            setModalAberto(false)
            carregar()
          }}
        />
      )}
    </div>
  )
}

function ListaRetorno({ negocios, onAtualizado }) {
  const itens = negocios
    .filter(n => n.etapa === 'retorno_futuro')
    .sort((a, b) => (a.data_retorno || '').localeCompare(b.data_retorno || ''))

  if (itens.length === 0) return null

  return (
    <div style={{ marginTop: 24 }}>
      <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>Lista de retorno ({itens.length})</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {itens.map(n => (
          <div key={n.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '8px 12px',
          }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{n.cliente?.razao_social}</p>
              <p style={{ fontSize: 11, color: '#777', margin: '2px 0 0' }}>
                Voltar em {n.data_retorno ? new Date(n.data_retorno + 'T00:00:00').toLocaleDateString('pt-BR') : '-'} · {n.consultor?.nome}
              </p>
            </div>
            <button
              onClick={async () => { await voltarParaProspeccao(n.id); onAtualizado() }}
              style={{
                background: '#F77E01', color: '#fff', border: 'none', borderRadius: 6,
                padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600,
              }}
            >
              Voltar pra prospecção
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function CardValor({ label, valor, cor, fundo }) {
  return (
    <div style={{ background: fundo || '#f1efe8', borderRadius: 8, padding: 16 }}>
      <p style={{ fontSize: 13, color: cor || '#666', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 600, margin: 0, color: cor || '#222' }}>{formatarMoeda(valor)}</p>
    </div>
  )
}