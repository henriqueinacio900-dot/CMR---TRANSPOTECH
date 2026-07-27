export const CORES_MARCA = {
  laranja: '#F77E01',
}

export const CORES_TEMPERATURA = {
  frio:   { grad: 'linear-gradient(135deg, #E6F1FB, #B5D4F4)', titulo: '#042C53', sub: '#185FA5' },
  morno:  { grad: 'linear-gradient(135deg, #FAECE7, #F0997B)', titulo: '#4A1B0C', sub: '#993C1D' },
  quente: { grad: 'linear-gradient(135deg, #FCEBEB, #F09595)', titulo: '#501313', sub: '#A32D2D' },
}

export const ETAPAS = [
  { key: 'prospeccao', label: 'Prospecção' },
  { key: 'proposta', label: 'Proposta enviada' },
  { key: 'negociacao', label: 'Negociação' },
  { key: 'ganha', label: 'Ganha' },
  { key: 'perdida', label: 'Perdida' },
]

export const TIPOS_CONTATO = ['ligacao', 'whatsapp', 'presencial', 'email']

export function formatarMoeda(valor) {
  return (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}
