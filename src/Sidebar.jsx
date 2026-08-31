import { useState } from 'react'
import {
  LayoutDashboard, Filter, Users, CalendarClock, RefreshCw, BarChart3, FileSpreadsheet,
  MapPin, TrendingDown, CalendarDays, ChevronsLeft, ChevronsRight, UserPlus, ShieldCheck, ClipboardList,
} from 'lucide-react'
import { TEMA } from './theme'

const ITENS = [
  { key: 'visao_geral', label: 'Visão geral', icone: LayoutDashboard },
  { key: 'pipeline', label: 'Pipeline', icone: Filter },
  { key: 'funil', label: 'Funil', icone: TrendingDown },
  { key: 'agenda', label: 'Agenda', icone: CalendarDays },
  { key: 'leads', label: 'Leads', icone: UserPlus },
  { key: 'clientes', label: 'Clientes', icone: Users },
  { key: 'mapa', label: 'Mapa', icone: MapPin },
  { key: 'atividades', label: 'Atividades', icone: CalendarClock },
  { key: 'relatorio_visita', label: 'Relatórios de visita', icone: ClipboardList },
  { key: 'reativacao', label: 'Reativação', icone: RefreshCw },
  { key: 'provisionado', label: 'Provisionado', icone: FileSpreadsheet },
  { key: 'pm2p', label: 'PM2P', icone: ShieldCheck },
  { key: 'relatorios', label: 'Relatórios', icone: BarChart3 },
]

export default function Sidebar({ visao, onMudarVisao, euMesmo }) {
  const [recolhido, setRecolhido] = useState(false)
  const largura = recolhido ? 72 : 222
  const ehAdmin = euMesmo?.perfil === 'administrador' || euMesmo?.perfil === 'gestor'
  // SDR só enxerga a própria aba; PM2P é só pra admin/gestor
  const itens = euMesmo?.perfil === 'sdr'
    ? ITENS.filter(i => i.key === 'leads')
    : ITENS.filter(i => i.key !== 'pm2p' || ehAdmin || euMesmo?.eh_analista_pm2p)

  return (
    <div style={{
      width: largura, minWidth: largura, transition: 'width 200ms ease',
      background: `linear-gradient(180deg, ${TEMA.menuLateral} 0%, #050c15 100%)`,
      borderRight: `1px solid rgba(255,121,0,0.18)`,
      boxShadow: 'inset -1px 0 12px rgba(255,121,0,0.03)',
      color: TEMA.textoSecundario, minHeight: '100vh',
      padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 4,
      position: 'sticky', top: 0, alignSelf: 'flex-start',
    }}>
      <div style={{ padding: recolhido ? '0 0 20px' : '0 8px 20px', display: 'flex', justifyContent: recolhido ? 'center' : 'flex-start' }}>
        <img
          src="/logo-transpotech.png"
          alt="TranspoTech"
          style={{ width: recolhido ? 34 : 120, borderRadius: 6, transition: 'width 200ms ease' }}
        />
      </div>

      {itens.map(item => {
        const Icone = item.icone
        const ativo = visao === item.key
        return (
          <button
            key={item.key}
            className="tp-item-menu"
            title={recolhido ? item.label : undefined}
            onClick={() => onMudarVisao(item.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              justifyContent: recolhido ? 'center' : 'flex-start',
              background: ativo ? `linear-gradient(90deg, ${TEMA.laranja}, ${TEMA.laranjaLuminoso})` : 'transparent',
              boxShadow: ativo ? '0 0 14px rgba(255,137,0,0.35)' : 'none',
              border: ativo ? '1px solid rgba(255,180,100,0.5)' : '1px solid transparent',
              color: ativo ? '#fff' : TEMA.textoSecundario,
              borderRadius: 8, padding: '11px 12px', minHeight: 42,
              fontSize: 13, fontWeight: ativo ? 700 : 500, cursor: 'pointer', textAlign: 'left',
              transition: 'background 150ms ease, color 150ms ease',
            }}
          >
            <Icone size={16} color={ativo ? '#fff' : TEMA.textoSecundario} />
            {!recolhido && item.label}
          </button>
        )
      })}

      <div style={{ flex: 1 }} />

      <button
        className="tp-item-menu"
        onClick={() => setRecolhido(!recolhido)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, justifyContent: recolhido ? 'center' : 'flex-start',
          background: 'transparent', border: `1px solid ${TEMA.linhaInterna}`, borderRadius: 8,
          padding: '10px 12px', color: TEMA.textoDiscreto, fontSize: 12, cursor: 'pointer', marginTop: 8,
        }}
      >
        {recolhido ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
        {!recolhido && 'Recolher menu'}
      </button>
    </div>
  )
}
