import { LayoutDashboard, Filter, Users, CalendarClock, RefreshCw, BarChart3, FileSpreadsheet } from 'lucide-react'

const ITENS = [
  { key: 'visao_geral', label: 'Visão geral', icone: LayoutDashboard },
  { key: 'pipeline', label: 'Pipeline', icone: Filter },
  { key: 'clientes', label: 'Clientes', icone: Users },
  { key: 'atividades', label: 'Atividades', icone: CalendarClock },
  { key: 'reativacao', label: 'Reativação', icone: RefreshCw },
  { key: 'provisionado', label: 'Provisionado', icone: FileSpreadsheet },
  { key: 'relatorios', label: 'Relatórios', icone: BarChart3 },
]

export default function Sidebar({ visao, onMudarVisao }) {
  return (
    <div style={{
      width: 220, background: '#1c1c1c', color: '#ddd', minHeight: '100vh',
      padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 4,
      position: 'sticky', top: 0, alignSelf: 'flex-start',
    }}>
      <div style={{ padding: '0 8px 20px' }}>
        <img src="/logo-transpotech.png" alt="TranspoTech" style={{ width: 120, borderRadius: 6 }} />
      </div>

      {ITENS.map(item => {
        const Icone = item.icone
        const ativo = visao === item.key
        return (
          <button
            key={item.key}
            onClick={() => onMudarVisao(item.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: ativo ? '#F77E01' : 'transparent',
              color: ativo ? '#fff' : '#bbb',
              border: 'none', borderRadius: 8, padding: '10px 12px',
              fontSize: 13, fontWeight: ativo ? 700 : 500, cursor: 'pointer', textAlign: 'left',
            }}
          >
            <Icone size={16} />
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
