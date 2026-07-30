import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { listarTodosClientes, listarNegocios, buscarCoordenadasCache, salvarCoordenada } from './api'
import { formatarMoeda } from './constants'

function AjustarZoom({ pontos }) {
  const map = useMap()
  useEffect(() => {
    if (pontos.length === 0) return
    if (pontos.length === 1) {
      map.setView([pontos[0].latitude, pontos[0].longitude], 11)
      return
    }
    const bounds = pontos.map(p => [p.latitude, p.longitude])
    map.fitBounds(bounds, { padding: [40, 40] })
  }, [pontos, map])
  return null
}

function normalizarChave(cidade, estado) {
  return `${(cidade || '').trim().toLowerCase()}-${(estado || '').trim().toLowerCase()}`
}

async function geocodificar(cidade, estado) {
  const query = encodeURIComponent(`${cidade}, ${estado || ''}, Brasil`)
  const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`)
  const dados = await resp.json()
  if (dados && dados[0]) {
    return { latitude: Number(dados[0].lat), longitude: Number(dados[0].lon) }
  }
  return null
}

export default function Mapa() {
  const [cidades, setCidades] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [progresso, setProgresso] = useState('')
  const [cidadeSelecionada, setCidadeSelecionada] = useState(null)

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    setCarregando(true)
    const [clientes, negocios] = await Promise.all([listarTodosClientes(), listarNegocios()])

    // soma o valor ganho de cada cliente
    const ganhoPorCliente = {}
    negocios.filter(n => n.etapa === 'ganha').forEach(n => {
      const id = n.cliente?.id
      if (!id) return
      ganhoPorCliente[id] = (ganhoPorCliente[id] || 0) + (n.valor_final || n.valor_cotacao || 0)
    })

    const contagem = {}
    clientes.forEach(c => {
      if (!c.cidade) return
      const chave = normalizarChave(c.cidade, c.estado)
      if (!contagem[chave]) contagem[chave] = { cidade: c.cidade, estado: c.estado, total: 0, ganho: 0, chave, clientes: [] }
      const ganhoCliente = ganhoPorCliente[c.id] || 0
      contagem[chave].total++
      contagem[chave].ganho += ganhoCliente
      contagem[chave].clientes.push({ nome: c.razao_social, ganho: ganhoCliente })
    })

    const cache = await buscarCoordenadasCache()
    const mapaCache = {}
    cache.forEach(c => { mapaCache[c.chave] = c })

    const listaFinal = []
    const pendentes = Object.values(contagem)

    for (const item of pendentes) {
      item.clientes.sort((a, b) => b.ganho - a.ganho)
      const existente = mapaCache[item.chave]
      if (existente && existente.latitude && existente.longitude) {
        listaFinal.push({ ...item, latitude: existente.latitude, longitude: existente.longitude })
        continue
      }
      setProgresso(`Buscando coordenadas de ${item.cidade}...`)
      try {
        const coords = await geocodificar(item.cidade, item.estado)
        if (coords) {
          listaFinal.push({ ...item, ...coords })
          await salvarCoordenada({ chave: item.chave, cidade: item.cidade, estado: item.estado, ...coords })
        }
      } catch (e) {
        console.error('Erro ao geocodificar', item.cidade, e)
      }
      // Respeita o limite de uso do serviço gratuito (1 requisição por segundo)
      await new Promise(r => setTimeout(r, 1100))
    }

    setCidades(listaFinal)
    setProgresso('')
    setCarregando(false)
  }

  const maiorGanho = Math.max(1, ...cidades.map(c => c.ganho))

  return (
    <div style={{ padding: 24 }}>
      <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>Clientes no mapa</p>
      <p style={{ fontSize: 13, color: '#777', margin: '0 0 16px' }}>
        {cidades.length} cidade(s) com cliente cadastrado. O tamanho do círculo representa o valor ganho naquela cidade — clique pra ver os clientes.
      </p>

      {carregando && <p style={{ color: '#999', fontSize: 13 }}>{progresso || 'Carregando...'}</p>}

      {!carregando && (
        <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #eee' }}>
          <MapContainer center={[-15, -50]} zoom={4} style={{ height: 560, width: '100%' }} scrollWheelZoom={true}>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <AjustarZoom pontos={cidades} />
            {cidades.map(c => (
              <CircleMarker
                key={c.chave}
                center={[c.latitude, c.longitude]}
                radius={6 + (c.ganho / maiorGanho) * 20}
                pathOptions={{ color: '#F77E01', fillColor: '#F77E01', fillOpacity: 0.55, weight: 2 }}
                eventHandlers={{ click: () => setCidadeSelecionada(c) }}
              >
                <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                  <strong>{c.cidade}</strong><br />
                  {c.total} cliente{c.total !== 1 ? 's' : ''} · {formatarMoeda(c.ganho)}
                </Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      )}

      {!carregando && cidades.length === 0 && (
        <p style={{ color: '#999', fontSize: 13 }}>Nenhum cliente com cidade preenchida ainda.</p>
      )}

      {cidadeSelecionada && (
        <ModalClientesCidade cidade={cidadeSelecionada} onFechar={() => setCidadeSelecionada(null)} />
      )}
    </div>
  )
}

function ModalClientesCidade({ cidade, onFechar }) {
  return (
    <>
      <div
        onClick={onFechar}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 60 }}
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 360, maxWidth: '90vw',
        background: '#fff', zIndex: 61, boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
        padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>
            {cidade.cidade}{cidade.estado ? ` - ${cidade.estado}` : ''}
          </p>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#999' }}>✕</button>
        </div>
        <p style={{ fontSize: 13, color: '#777', margin: '0 0 12px' }}>
          {cidade.total} cliente{cidade.total !== 1 ? 's' : ''} · Total ganho: <strong style={{ color: '#3b6d11' }}>{formatarMoeda(cidade.ganho)}</strong>
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {cidade.clientes.map((c, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid #f2f2f2' }}>
              <span>{c.nome}</span>
              <span style={{ fontWeight: 600, color: c.ganho > 0 ? '#3b6d11' : '#999' }}>{formatarMoeda(c.ganho)}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
