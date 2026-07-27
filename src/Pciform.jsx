import { useEffect, useState } from 'react'
import { buscarPci, salvarPci } from './api'
import { PERGUNTAS_PCI, classificarPci } from './constants'

export default function PciForm({ negocioId }) {
  const [respostas, setRespostas] = useState({})
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    buscarPci(negocioId).then(pci => {
      if (pci) setRespostas(pci)
      setCarregando(false)
    })
  }, [negocioId])

  const notaTotal = PERGUNTAS_PCI.reduce((soma, p) => soma + (respostas[p.campo] || 0), 0)
  const classificacao = classificarPci(notaTotal)

  function escolher(campo, pontos) {
    setRespostas(r => ({ ...r, [campo]: pontos }))
  }

  async function salvar() {
    setSalvando(true)
    try {
      await salvarPci(negocioId, respostas)
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) return <p style={{ fontSize: 13, color: '#777' }}>Carregando...</p>

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
        background: '#f7f5f0', borderRadius: 8, padding: 12,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', background: classificacao.cor,
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 16,
        }}>
          {classificacao.sigla}
        </div>
        <div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{classificacao.label}</p>
          <p style={{ margin: 0, fontSize: 12, color: '#666' }}>{notaTotal} / 29 pontos</p>
        </div>
      </div>

      {PERGUNTAS_PCI.map(p => (
        <div key={p.campo} style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 6px' }}>{p.pergunta}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {p.opcoes.map(o => (
              <button
                key={o.label}
                onClick={() => escolher(p.campo, o.pontos)}
                style={{
                  padding: '6px 10px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
                  border: respostas[p.campo] === o.pontos ? '2px solid #F77E01' : '1px solid #ddd',
                  background: respostas[p.campo] === o.pontos ? '#FFF3E8' : '#fff',
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={salvar}
        disabled={salvando}
        style={{
          marginTop: 8, padding: '8px 16px', background: '#F77E01', color: '#fff',
          border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13,
        }}
      >
        {salvando ? 'Salvando...' : 'Salvar avaliação PCI'}
      </button>
    </div>
  )
}
