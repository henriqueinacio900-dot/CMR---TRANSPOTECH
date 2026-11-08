import { useEffect, useState } from 'react'
import { listarTransicoesEtapa } from './api'
import { ETAPAS, formatarMoeda } from './constants'
import { calcularConversaoFunil, taxaGanho, volumePorEtapa, ROTULO_ETAPA } from './funilConversao'

const ETAPAS_VOLUME = ETAPAS.filter(e => e.key !== 'perdida')

// Três leituras separadas, cada uma com a sua definição:
//  1) Conversão entre etapas — pelo histórico dos MESMOS negócios (grupo que entrou na etapa no período)
//  2) Taxa de ganho — Ganhos ÷ (Ganhos + Perdidos) encerrados no período
//  3) Volume por etapa — carteira atual de cada coluna do pipeline
export default function PainelConversao({ negocios, inicio, fim, rotuloPeriodo }) {
  const [transicoes, setTransicoes] = useState(undefined) // undefined = carregando, null = indisponível

  useEffect(() => {
    let vivo = true
    listarTransicoesEtapa().then(t => { if (vivo) setTransicoes(t) })
    return () => { vivo = false }
  }, [])

  const ganho = taxaGanho(negocios, inicio, fim)
  const volume = volumePorEtapa(negocios, ETAPAS_VOLUME)
  const conv = transicoes
    ? calcularConversaoFunil({ negocios, transicoes, inicio, fim })
    : null

  return (
    <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 1) Conversão entre etapas */}
      <Bloco
        titulo="Conversão entre etapas"
        legenda={`Negócios que entraram na etapa entre ${inicio.toLocaleDateString('pt-BR')} e ${fim.toLocaleDateString('pt-BR')}, acompanhados até hoje. Cada negócio conta uma vez por etapa; quem avançou sai do mesmo grupo.`}
      >
        {transicoes === undefined && <p style={txtSuave}>Carregando histórico...</p>}
        {transicoes === null && (
          <p style={txtAviso}>
            O histórico de transições ainda não está disponível. Rode o SQL <strong>melhorias-fluxo-comercial.sql</strong> no Supabase — a partir daí as mudanças de etapa passam a ser registradas.
          </p>
        )}
        {conv && (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {conv.passos.map(p => (
                <div key={p.de} style={cartaoPasso}>
                  <p style={{ fontSize: 11, color: '#777', margin: '0 0 6px' }}>{p.rotulo}</p>
                  <p style={{ fontSize: 22, fontWeight: 800, margin: 0, color: p.taxa === null ? '#aaa' : '#3b6d11' }}>
                    {p.taxa === null ? '—' : `${p.taxa.toFixed(1)}%`}
                  </p>
                  <p style={{ fontSize: 12, color: '#555', margin: '4px 0 0' }}>
                    {p.entraram === 0 ? 'Nenhum negócio entrou no período' : `${p.avancaram} de ${p.entraram} avançaram`}
                  </p>
                  {p.aguardando > 0 && (
                    <p style={{ fontSize: 11, color: '#3b6d11', margin: '2px 0 0' }}>+ {p.aguardando} aguardando em Faturamento próximo mês</p>
                  )}
                  {p.amostraPequena && <p style={{ fontSize: 11, color: '#8a6d1f', margin: '2px 0 0' }}>Amostra pequena</p>}
                </div>
              ))}
            </div>

            {Object.keys(conv.comecaramDireto).length > 0 && (
              <p style={{ ...txtSuave, marginTop: 10 }}>
                Começaram direto em etapa posterior no período (contados a partir da etapa de entrada):{' '}
                {Object.entries(conv.comecaramDireto).map(([etapa, qtd]) => `${qtd} em ${ROTULO_ETAPA[etapa] || etapa}`).join(' · ')}.
              </p>
            )}
            {conv.semHistoricoConfiavel > 0 && (
              <p style={txtAviso}>
                {conv.historicoInsuficiente ? 'Histórico antigo insuficiente: ' : 'Atenção: '}
                {conv.semHistoricoConfiavel} de {conv.totalNegocios} negócios são anteriores ao registro de transições e não têm a etapa de entrada conhecida.
                Eles só entram na conta pelas etapas que passaram a ter registro; os percentuais ficam mais confiáveis conforme novas mudanças de etapa são registradas.
              </p>
            )}
          </>
        )}
      </Bloco>

      {/* 2) Taxa de ganho */}
      <Bloco
        titulo="Taxa de ganho"
        legenda={`Ganhos ÷ (Ganhos + Perdidos) encerrados em ${rotuloPeriodo || 'no período selecionado'}. Mesmo critério da Visão geral e dos Relatórios.`}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: ganho.taxa === null ? '#aaa' : '#3b6d11' }}>
            {ganho.taxa === null ? '—' : `${ganho.taxa.toFixed(1)}%`}
          </span>
          <span style={{ fontSize: 13, color: '#555' }}>
            {ganho.ganhos} ganho{ganho.ganhos !== 1 ? 's' : ''} · {ganho.perdidos} perdido{ganho.perdidos !== 1 ? 's' : ''}
          </span>
        </div>
      </Bloco>

      {/* 3) Volume por etapa */}
      <Bloco titulo="Volume por etapa" legenda="Carteira atual de cada coluna do pipeline (quantidade e valor). Não é taxa de conversão.">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {volume.map(v => (
            <div key={v.key} style={{ ...cartaoPasso, minWidth: 120 }}>
              <p style={{ fontSize: 11, color: '#777', margin: '0 0 4px' }}>{v.label}</p>
              <p style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{v.qtd}</p>
              <p style={{ fontSize: 11, color: '#777', margin: '2px 0 0' }}>{formatarMoeda(v.valor)}</p>
            </div>
          ))}
        </div>
      </Bloco>
    </div>
  )
}

function Bloco({ titulo, legenda, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 16, color: '#222' }}>
      <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 2px', color: '#333' }}>{titulo}</p>
      <p style={{ fontSize: 11, color: '#999', margin: '0 0 12px' }}>{legenda}</p>
      {children}
    </div>
  )
}

const cartaoPasso = { border: '1px solid #eee', borderRadius: 8, padding: '10px 14px', minWidth: 170, background: '#fafafa' }
const txtSuave = { fontSize: 12, color: '#777', margin: 0 }
const txtAviso = { fontSize: 12, color: '#8a6d1f', background: '#FFF8E1', border: '1px solid #F0DDA0', borderRadius: 6, padding: '8px 10px', margin: '10px 0 0' }
