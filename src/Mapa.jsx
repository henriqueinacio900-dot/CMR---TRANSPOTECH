import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { listarTodosClientes, buscarCoordenadasCache, salvarCoordenada } from './api'

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

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    setCarregando(true)
    const clientes = await listarTodosClientes()

    const contagem = {}
    clientes.forEach(c => {
      if (!c.cidade) return
      const chave = normalizarChave(c.cidade, c.estado)
      if (!contagem[chave]) contagem[chave] = { cidade: c.cidade, estado: c.estado, total: 0, chave }
      contagem[chave].total++
    })

    const cache = await buscarCoordenadasCache()
    const mapaCache = {}
    cache.forEach(c => { mapaCache[c.chave] = c })

    const listaFinal = []
    const pendentes = Object.values(contagem)

    for (const item of pendentes) {
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

  const maiorTotal = Math.max(1, ...cidades.map(c => c.total))

  return (
    <div style={{ padding: 24 }}>
      <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>Clientes no mapa</p>
      <p style={{ fontSize: 13, color: '#777', margin: '0 0 16px' }}>
        {cidades.length} cidade(s) com cliente cadastrado. O tamanho do círculo representa quantos clientes tem naquela cidade.
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
                radius={6 + (c.total / maiorTotal) * 14}
                pathOptions={{ color: '#F77E01', fillColor: '#F77E01', fillOpacity: 0.55, weight: 2 }}
              >
                <Tooltip permanent direction="top" offset={[0, -6]} opacity={0.9}>
                  {c.cidade} ({c.total})
                </Tooltip>
                <Popup>
                  <strong>{c.cidade}{c.estado ? ` - ${c.estado}` : ''}</strong><br />
                  {c.total} cliente{c.total !== 1 ? 's' : ''}
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      )}

      {!carregando && cidades.length === 0 && (
        <p style={{ color: '#999', fontSize: 13 }}>Nenhum cliente com cidade preenchida ainda.</p>
      )}
    </div>
  )
}
