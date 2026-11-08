import { PROXIMAS_ACOES } from './constants'

// Campos do orçamento: número, valor e próxima ação com data.
// Usado na criação direta em "Orçamento enviado" e ao mover um negócio para essa etapa,
// com a mesma validação (regrasEtapa.validarOrcamento) nas duas entradas.
export default function CamposOrcamento({ valores, onChange, erros = {} }) {
  const set = (campo, valor) => onChange({ ...valores, [campo]: valor })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <Campo label="Nº do orçamento *" erro={erros.numero_orcamento} style={{ flex: 1 }}>
          <input value={valores.numero_orcamento} onChange={e => set('numero_orcamento', e.target.value)} style={estiloInput(erros.numero_orcamento)} />
        </Campo>
        <Campo label="Valor (R$) *" erro={erros.valor_cotacao} style={{ flex: 1 }}>
          <input type="number" step="0.01" min="0" value={valores.valor_cotacao} onChange={e => set('valor_cotacao', e.target.value)} style={estiloInput(erros.valor_cotacao)} />
        </Campo>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Campo label="Próxima ação *" erro={erros.proxima_acao} style={{ flex: 1 }}>
          <select value={valores.proxima_acao} onChange={e => set('proxima_acao', e.target.value)} style={estiloInput(erros.proxima_acao)}>
            <option value="">Escolha...</option>
            {PROXIMAS_ACOES.map(p => <option key={p.key} value={p.key} style={{ color: '#222' }}>{p.label}</option>)}
          </select>
        </Campo>
        <Campo label="Data *" erro={erros.proxima_acao_data} style={{ flex: 1 }}>
          <input type="datetime-local" value={valores.proxima_acao_data} onChange={e => set('proxima_acao_data', e.target.value)} style={estiloInput(erros.proxima_acao_data)} />
        </Campo>
      </div>
    </div>
  )
}

function Campo({ label, erro, children, style }) {
  return (
    <div style={style}>
      <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
      {erro && <p style={{ fontSize: 11, color: '#a32d2d', margin: '3px 0 0' }}>{erro}</p>}
    </div>
  )
}

function estiloInput(erro) {
  return {
    width: '100%', padding: 7, borderRadius: 6, boxSizing: 'border-box', fontSize: 13,
    border: `1px solid ${erro ? '#a32d2d' : '#ddd'}`, color: '#222', background: '#fff',
  }
}
