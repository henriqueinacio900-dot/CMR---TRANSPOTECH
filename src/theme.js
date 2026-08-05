// Tema "central executiva" — tokens centralizados de cor, usados em todo o app.
export const TEMA = {
  fundoPrincipal: '#07111F',
  fundoSecundario: '#0B1726',
  menuLateral: '#071321',
  card: 'rgba(16, 32, 51, 0.85)',
  cardElevado: '#14263A',
  borda: 'rgba(125, 180, 220, 0.28)',
  linhaInterna: 'rgba(148, 163, 184, 0.18)',
  laranja: '#FF7900',
  laranjaLuminoso: '#FF8A00',
  ambar: '#FFB020',
  azulAnalitico: '#38BDF8',
  verde: '#22C55E',
  vermelho: '#FF4545',
  textoPrincipal: '#F8FAFC',
  textoSecundario: '#94A3B8',
  textoDiscreto: '#64748B',
}

// Estilo base reutilizável de "card de vidro" (glassmorphism discreto)
export const cardBase = {
  background: TEMA.card,
  border: `1px solid ${TEMA.borda}`,
  borderRadius: 12,
  padding: 20,
  boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
}

export const cardElevadoBase = {
  ...cardBase,
  background: TEMA.cardElevado,
}