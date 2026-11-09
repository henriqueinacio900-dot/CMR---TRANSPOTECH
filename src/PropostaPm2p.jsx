import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  buscarPropostaPm2p, salvarPropostaPm2p, criarContratoDaProposta,
  moverParaOrcamento, moverEtapa, atualizarNegocio, marcarGanha,
} from './api'
import { PROXIMAS_ACOES, formatarMoeda, paraISOLocal } from './constants'
import { hojeISO, sugestaoProximoRetorno, temErros, validarGanha, validarOrcamento } from './regrasEtapa'
import {
  DIARIAS_OPCOES, DIAS_SEMANA, VALIDADES_MESES, DESPESAS_CAMPOS, ALIQUOTAS_PADRAO,
  calcularPrecificacao, precificacaoVazia, validarProposta, numeroProposta, addMeses,
} from './pm2pCalc'
import { gerarPdfProposta, gerarWordProposta } from './pm2pDocs'

const FORM_VAZIO = {
  maquinas: '', diariasSemana: '', dias: [], tecnicos: '1',
  horaComercial: '', horaExtra: '', horaEspecial: '', kmExcedente: '', validadeMeses: '12',
  precificacao: precificacaoVazia(),
}

// Proposta técnica e comercial do PM2P: campos do atendimento, tarifas, precificação (planilha),
// geração de PDF + Word e definição da próxima etapa (Orçamento, Negociação ou Ganha).
export default function PropostaPm2p({ negocio, onFechar, onAtualizado }) {
  const [f, setF] = useState(FORM_VAZIO)
  const [numero, setNumero] = useState(() => numeroProposta())
  const [salva, setSalva] = useState(null) // linha de propostas_pm2p
  const [erros, setErros] = useState({})
  const [carregando, setCarregando] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [erroGeral, setErroGeral] = useState('')

  // próxima etapa
  const [destino, setDestino] = useState('orcamento_enviado')
  const [acao, setAcao] = useState('enviar_orcamento')
  const [acaoData, setAcaoData] = useState(sugestaoProximoRetorno())
  const [temperatura, setTemperatura] = useState('morno')
  const [inicioContrato, setInicioContrato] = useState(hojeISO())
  const [statusFat, setStatusFat] = useState('previsto')
  const [previsaoFat, setPrevisaoFat] = useState('')
  const [errosEtapa, setErrosEtapa] = useState({})
  const [confirmando, setConfirmando] = useState(false)

  useEffect(() => {
    buscarPropostaPm2p(negocio.id).then(p => {
      if (p?.dados) {
        const d = p.dados
        setF({
          maquinas: d.maquinas ?? '', diariasSemana: d.diariasSemana ?? '', dias: d.dias || [], tecnicos: d.tecnicos ?? '1',
          horaComercial: d.horaComercial ?? '', horaExtra: d.horaExtra ?? '', horaEspecial: d.horaEspecial ?? '',
          kmExcedente: d.kmExcedente ?? '', validadeMeses: String(d.validadeMeses ?? '12'),
          precificacao: { ...precificacaoVazia(), ...d.precificacao, aliquotas: { ...ALIQUOTAS_PADRAO, ...(d.precificacao?.aliquotas || {}) } },
        })
        if (p.numero) setNumero(p.numero)
        setSalva(p)
      }
      setCarregando(false)
    })
  }, [negocio.id])

  const set = (campo, valor) => setF(x => ({ ...x, [campo]: valor }))
  const setPrec = (campo, valor) => setF(x => ({ ...x, precificacao: { ...x.precificacao, [campo]: valor } }))
  const calc = useMemo(() => calcularPrecificacao(f.precificacao), [f.precificacao])
  const mensal = Number(f.precificacao.valorReceita) || 0

  function alternarDia(k) {
    set('dias', f.dias.includes(k) ? f.dias.filter(x => x !== k) : [...f.dias, k])
  }
  const todosMarcados = f.dias.length === DIAS_SEMANA.length
  function atualizarMaoDeObra(i, campo, valor) {
    setPrec('maoDeObra', f.precificacao.maoDeObra.map((l, j) => (j === i ? { ...l, [campo]: valor } : l)))
  }
  function sugerirQtdeMaoDeObra() {
    const q = Number(f.diariasSemana) * 4 * Number(f.tecnicos || 1)
    if (!q) return
    const linhas = f.precificacao.maoDeObra.map((l, i) => (i === 0 ? { ...l, funcao: l.funcao || 'Mão de obra', qtde: q } : l))
    setPrec('maoDeObra', linhas)
  }

  async function gerar() {
    setErroGeral('')
    const e = validarProposta(f)
    setErros(e)
    if (temErros(e)) { setErroGeral('Complete os campos destacados.'); return }
    setGerando(true)
    try {
      const dados = {
        ...f,
        cliente: negocio.cliente?.razao_social || '',
        cidade: negocio.cliente?.cidade || '',
        vendedor: negocio.consultor?.nome || '',
        numero,
        data: new Date().toISOString(),
        investimentoMensal: mensal,
        resultado: calc,
      }
      const linha = await salvarPropostaPm2p(negocio.id, dados, {
        valorMensal: mensal, validadeMeses: Number(f.validadeMeses), resultadoValor: calc.totalResultado,
      })
      setSalva(linha)
      gerarPdfProposta(dados)
      gerarWordProposta(dados)
    } catch (err) {
      console.error(err)
      setErroGeral('Não deu pra gerar: ' + (err.message || 'erro desconhecido') + '. Confira se o SQL proposta-pm2p.sql foi rodado.')
    } finally {
      setGerando(false)
    }
  }

  async function confirmarEtapa() {
    if (!salva) return
    const ev = {}
    let valorOrc = null
    if (destino === 'ganha') {
      if (!inicioContrato) ev.inicio = 'Informe o início do contrato.'
      Object.assign(ev, validarGanha({ status_faturamento: statusFat, previsao_faturamento: previsaoFat }))
    } else {
      valorOrc = validarOrcamento({ numero_orcamento: numero, valor_cotacao: mensal, proxima_acao: acao, proxima_acao_data: acaoData })
      Object.assign(ev, valorOrc)
    }
    setErrosEtapa(ev)
    if (temErros(ev)) return
    setConfirmando(true); setErroGeral('')
    try {
      const numeroOrc = negocio.numero_orcamento || numero
      if (destino === 'orcamento_enviado') {
        await moverParaOrcamento(negocio.id, {
          numero_orcamento: numeroOrc, valor_cotacao: mensal, proxima_acao: acao,
          proxima_acao_data: paraISOLocal(acaoData), temperatura,
        })
      } else if (destino === 'negociacao_decisao') {
        await moverEtapa(negocio.id, 'negociacao_decisao', {
          numero_orcamento: numeroOrc, valor_cotacao: mensal, temperatura, data_orcamento: negocio.data_orcamento || hojeISO(),
          proxima_acao: acao, proxima_acao_data: paraISOLocal(acaoData), proxima_acao_origem: 'manual',
        })
      } else {
        await atualizarNegocio(negocio.id, { valor_cotacao: mensal, numero_orcamento: numeroOrc })
        await marcarGanha(negocio.id, {
          valor_cotacao: mensal, valor_final: mensal, desconto_valor: 0,
          status_faturamento: statusFat, previsao_faturamento: previsaoFat,
        })
        await criarContratoDaProposta({ negocio, proposta: salva, inicioISO: inicioContrato })
      }
      onAtualizado()
      onFechar()
    } catch (err) {
      console.error(err)
      setErroGeral('Não deu pra salvar a etapa: ' + (err.message || 'erro desconhecido'))
    } finally {
      setConfirmando(false)
    }
  }

  const vencimento = destino === 'ganha' && inicioContrato ? addMeses(inicioContrato, f.validadeMeses) : null

  const modal = (
    <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 900, padding: 16, overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: 24, width: 860, maxWidth: '100%', color: '#222', margin: '16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: 18, margin: 0 }}>Proposta PM2P</h2>
            <p style={{ fontSize: 12, color: '#777', margin: '2px 0 0' }}>
              {negocio.cliente?.razao_social}{negocio.cliente?.cidade ? ` · ${negocio.cliente.cidade}` : ''} · Vendedor: {negocio.consultor?.nome} · Nº {numero}
            </p>
          </div>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#999' }}>✕</button>
        </div>

        {carregando ? <p style={{ fontSize: 13 }}>Carregando...</p> : (
          <>
            <Secao titulo="Atendimento">
              <div style={grade}>
                <Campo label="Número de máquinas *" erro={erros.maquinas}>
                  <input type="number" min="1" value={f.maquinas} onChange={e => set('maquinas', e.target.value)} style={estilo(erros.maquinas)} />
                </Campo>
                <Campo label="Diárias por semana *" erro={erros.diariasSemana}>
                  <select value={f.diariasSemana} onChange={e => set('diariasSemana', e.target.value)} style={estilo(erros.diariasSemana)}>
                    <option value="">Escolha...</option>
                    {DIARIAS_OPCOES.map(o => <option key={o.valor} value={o.valor} style={{ color: '#222' }}>{o.label}</option>)}
                  </select>
                </Campo>
                <Campo label="Quantos técnicos *" erro={erros.tecnicos}>
                  <input type="number" min="1" value={f.tecnicos} onChange={e => set('tecnicos', e.target.value)} style={estilo(erros.tecnicos)} />
                </Campo>
                <Campo label="Validade do contrato *" erro={erros.validadeMeses}>
                  <select value={f.validadeMeses} onChange={e => set('validadeMeses', e.target.value)} style={estilo(erros.validadeMeses)}>
                    {VALIDADES_MESES.map(m => <option key={m} value={m} style={{ color: '#222' }}>{m} meses</option>)}
                  </select>
                </Campo>
              </div>
              <Campo label="Quais dias da semana *" erro={erros.dias}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                  <label style={chk}><input type="checkbox" checked={todosMarcados} onChange={() => set('dias', todosMarcados ? [] : DIAS_SEMANA.map(d => d.key))} /> <b>Todos</b></label>
                  {DIAS_SEMANA.map(d => (
                    <label key={d.key} style={chk}><input type="checkbox" checked={f.dias.includes(d.key)} onChange={() => alternarDia(d.key)} /> {d.label}</label>
                  ))}
                </div>
              </Campo>
            </Secao>

            <Secao titulo="Tarifas (valor por hora e por km)">
              <div style={grade}>
                <Campo label="Hora comercial, seg a sex (R$/h) *" erro={erros.horaComercial}>
                  <input type="number" step="0.01" min="0" value={f.horaComercial} onChange={e => set('horaComercial', e.target.value)} style={estilo(erros.horaComercial)} />
                </Campo>
                <Campo label="Hora extra após as 18h e sábado 8h–12h (R$/h) *" erro={erros.horaExtra}>
                  <input type="number" step="0.01" min="0" value={f.horaExtra} onChange={e => set('horaExtra', e.target.value)} style={estilo(erros.horaExtra)} />
                </Campo>
                <Campo label="Domingos, feriados e demais horários (R$/h) *" erro={erros.horaEspecial}>
                  <input type="number" step="0.01" min="0" value={f.horaEspecial} onChange={e => set('horaEspecial', e.target.value)} style={estilo(erros.horaEspecial)} />
                </Campo>
                <Campo label="Deslocamento excedente (R$/km) *" erro={erros.kmExcedente}>
                  <input type="number" step="0.01" min="0" value={f.kmExcedente} onChange={e => set('kmExcedente', e.target.value)} style={estilo(erros.kmExcedente)} />
                </Campo>
              </div>
            </Secao>

            <Secao titulo="Precificação (campos amarelos são editáveis)">
              <table style={tabela}>
                <thead>
                  <tr>{['Função', 'Qtde', 'Valor unitário', 'Total', 'Imposto', 'Total c/ impostos'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {f.precificacao.maoDeObra.map((l, i) => (
                    <tr key={i}>
                      <td style={td}><input value={l.funcao} onChange={e => atualizarMaoDeObra(i, 'funcao', e.target.value)} style={amarelo} /></td>
                      <td style={td}><input type="number" value={l.qtde} onChange={e => atualizarMaoDeObra(i, 'qtde', e.target.value)} style={{ ...amarelo, textAlign: 'right' }} /></td>
                      <td style={td}><input type="number" step="0.01" value={l.valorUnit} onChange={e => atualizarMaoDeObra(i, 'valorUnit', e.target.value)} style={{ ...amarelo, textAlign: 'right' }} /></td>
                      <td style={tdNum}>{formatarMoeda(calc.linhas[i].total)}</td>
                      <td style={tdNum}>{formatarMoeda(calc.linhas[i].imposto)}</td>
                      <td style={tdNum}>{formatarMoeda(calc.linhas[i].totalComImpostos)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#fafafa', fontWeight: 700 }}>
                    <td style={td}>Total</td><td style={tdNum}>{calc.qtdeTotal}</td><td style={td} />
                    <td style={tdNum}>{formatarMoeda(calc.totalMaoObra)}</td><td style={tdNum}>{formatarMoeda(calc.impostoMaoObra)}</td><td style={tdNum}>{formatarMoeda(calc.custoMecanico)}</td>
                  </tr>
                </tbody>
              </table>
              <button type="button" onClick={sugerirQtdeMaoDeObra} style={{ ...botaoMini, marginTop: 6 }}>Sugerir quantidade (diárias × 4 semanas × técnicos)</button>
              <Campo label="Encargos sobre a mão de obra (%)" style={{ maxWidth: 220, marginTop: 8 }}>
                <input type="number" step="0.01" value={f.precificacao.aliquotas.encargosMaoObra}
                  onChange={e => setPrec('aliquotas', { ...f.precificacao.aliquotas, encargosMaoObra: e.target.value })} style={amarelo} />
              </Campo>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 18, marginTop: 14 }}>
                <div>
                  <p style={subtitulo}>Custos diretos da emissão de NF</p>
                  <Campo label="Valor receita / Investimento mensal (R$) *" erro={erros.valorReceita}>
                    <input type="number" step="0.01" min="0" value={f.precificacao.valorReceita} onChange={e => setPrec('valorReceita', e.target.value)}
                      style={{ ...amarelo, fontWeight: 700, ...(erros.valorReceita ? { borderColor: '#a32d2d' } : {}) }} />
                  </Campo>
                  <Linha rotulo="PIS / COFINS" valor={calc.pisCofins} />
                  <Linha rotulo="ISS" valor={calc.iss} />
                  <Linha rotulo="INSS / serviço retido" valor={calc.inss} />
                  <Linha rotulo="Custo mecânico" valor={calc.custoMecanico} />
                  {DESPESAS_CAMPOS.map(d => (
                    <div key={d.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '2px 0' }}>
                      <span style={{ fontSize: 12 }}>{d.label}</span>
                      <input type="number" step="0.01" value={f.precificacao.despesas[d.key]} style={{ ...amarelo, width: 120, textAlign: 'right' }}
                        onChange={e => setPrec('despesas', { ...f.precificacao.despesas, [d.key]: e.target.value })} />
                    </div>
                  ))}
                  <Linha rotulo="Despesa ADM." valor={calc.despesaAdm} />
                  <Linha rotulo="TOTAL CUSTOS / DESPESAS" valor={calc.totalCustos} forte />
                  <Linha rotulo="RESULTADO ANTES IR" valor={calc.resultadoAntesIR} forte />
                  <Linha rotulo="IR normal" valor={calc.irNormal} />
                  <Linha rotulo="IR adicional" valor={calc.irAdicional} />
                  <Linha rotulo="CSLL" valor={calc.csll} />
                  <div style={{ background: '#FFF59D', padding: '8px 10px', borderRadius: 6, marginTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                    <span>TOTAL RESULTADO</span>
                    <span>{formatarMoeda(calc.totalResultado)} · {String(calc.percentual).replace('.', ',')}%</span>
                  </div>
                </div>

                <div>
                  <p style={subtitulo}>Alíquotas (%)</p>
                  {[
                    ['pisCofins', 'PIS / COFINS'], ['iss', 'ISS'], ['irNormal', 'IR normal'], ['irAdicional', 'IR adicional'],
                    ['csll', 'CSLL'], ['inss', 'INSS s/ serviços'], ['despesaAdm', 'Despesa ADM'],
                  ].map(([k, rot]) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '2px 0' }}>
                      <span style={{ fontSize: 12 }}>{rot}</span>
                      <input type="number" step="0.01" value={f.precificacao.aliquotas[k]} style={{ ...amarelo, width: 90, textAlign: 'right' }}
                        onChange={e => setPrec('aliquotas', { ...f.precificacao.aliquotas, [k]: e.target.value })} />
                    </div>
                  ))}
                  <p style={subtitulo2}>Custo por hora</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '2px 0' }}>
                    <span style={{ fontSize: 12 }}>Horas disponíveis</span>
                    <input type="number" value={f.precificacao.horasDisponiveis} style={{ ...amarelo, width: 90, textAlign: 'right' }} onChange={e => setPrec('horasDisponiveis', e.target.value)} />
                  </div>
                  <Linha rotulo="Custo hora 100% aproveitamento" valor={calc.custoHora100} />
                  <Linha rotulo="Custo hora 67% aproveitamento" valor={calc.custoHora67} />
                </div>
              </div>
            </Secao>

            {erroGeral && <p style={{ color: '#a32d2d', fontSize: 13, margin: '8px 0' }}>{erroGeral}</p>}

            <button onClick={gerar} disabled={gerando} style={{ ...botao, background: '#F77E01', color: '#fff', width: '100%', marginTop: 8 }}>
              {gerando ? 'Gerando...' : salva ? '📄 Gerar proposta novamente (PDF + Word)' : '📄 Gerar proposta (PDF + Word)'}
            </button>
            <p style={{ fontSize: 11, color: '#999', margin: '6px 0 0' }}>
              O PDF sai com a assinatura do vendedor e do cliente. O Word abre para edição. As informações ficam salvas na proposta.
            </p>

            {salva && (
              <Secao titulo="Próxima etapa" style={{ marginTop: 20 }}>
                <p style={{ fontSize: 12, color: '#3b6d11', margin: '0 0 10px' }}>✓ Proposta {salva.numero} salva — investimento mensal de {formatarMoeda(salva.valor_mensal)} por {salva.validade_meses} meses.</p>
                <Campo label="Depois de gerar, o negócio fica em:">
                  <select value={destino} onChange={e => { setDestino(e.target.value); setErrosEtapa({}) }} style={estilo()}>
                    <option value="orcamento_enviado">Orçamento enviado</option>
                    <option value="negociacao_decisao">Negociação/decisão</option>
                    <option value="ganha">Ganha (vira contrato na aba PM2P)</option>
                  </select>
                </Campo>

                {destino !== 'ganha' && (
                  <div style={grade}>
                    <Campo label="Próxima ação *" erro={errosEtapa.proxima_acao}>
                      <select value={acao} onChange={e => setAcao(e.target.value)} style={estilo(errosEtapa.proxima_acao)}>
                        <option value="">Escolha...</option>
                        {PROXIMAS_ACOES.map(p => <option key={p.key} value={p.key} style={{ color: '#222' }}>{p.label}</option>)}
                      </select>
                    </Campo>
                    <Campo label="Data e hora *" erro={errosEtapa.proxima_acao_data}>
                      <input type="datetime-local" value={acaoData} onChange={e => setAcaoData(e.target.value)} style={estilo(errosEtapa.proxima_acao_data)} />
                    </Campo>
                    <Campo label="Temperatura">
                      <select value={temperatura} onChange={e => setTemperatura(e.target.value)} style={estilo()}>
                        <option value="frio">Frio</option><option value="morno">Morno</option><option value="quente">Quente</option>
                      </select>
                    </Campo>
                  </div>
                )}

                {destino === 'ganha' && (
                  <div style={grade}>
                    <Campo label="Início do contrato *" erro={errosEtapa.inicio}>
                      <input type="date" value={inicioContrato} onChange={e => setInicioContrato(e.target.value)} style={estilo(errosEtapa.inicio)} />
                    </Campo>
                    <Campo label="Faturamento *">
                      <select value={statusFat} onChange={e => setStatusFat(e.target.value)} style={estilo()}>
                        <option value="previsto">Ainda vai faturar</option><option value="faturado">Já faturado</option>
                      </select>
                    </Campo>
                    {statusFat !== 'faturado' && (
                      <Campo label="Previsão de faturamento *" erro={errosEtapa.previsao_faturamento}>
                        <input type="date" value={previsaoFat} onChange={e => setPrevisaoFat(e.target.value)} style={estilo(errosEtapa.previsao_faturamento)} />
                      </Campo>
                    )}
                  </div>
                )}
                {destino === 'ganha' && vencimento && (
                  <p style={{ fontSize: 13, margin: '0 0 8px', fontWeight: 600, color: '#3b6d11' }}>
                    O contrato vence em {new Date(vencimento + 'T00:00:00').toLocaleDateString('pt-BR')} ({f.validadeMeses} meses a partir do início).
                  </p>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button onClick={onFechar} style={{ ...botao, background: '#eee', color: '#333' }}>Fechar sem mudar de etapa</button>
                  <button onClick={confirmarEtapa} disabled={confirmando} style={{ ...botao, background: '#3b6d11', color: '#fff' }}>
                    {confirmando ? 'Salvando...' : destino === 'ganha' ? 'Confirmar venda e criar contrato' : 'Confirmar etapa'}
                  </button>
                </div>
              </Secao>
            )}
          </>
        )}
      </div>
    </div>
  )
  return createPortal(modal, document.body)
}

function Secao({ titulo, children, style }) {
  return (
    <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #eee', ...style }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#F77E01', textTransform: 'uppercase', margin: '0 0 10px' }}>{titulo}</p>
      {children}
    </div>
  )
}
function Campo({ label, erro, children, style }) {
  return (
    <div style={{ marginBottom: 10, ...style }}>
      <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
      {erro && <p style={{ fontSize: 11, color: '#a32d2d', margin: '3px 0 0' }}>{erro}</p>}
    </div>
  )
}
function Linha({ rotulo, valor, forte }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 12, fontWeight: forte ? 700 : 400, borderTop: forte ? '1px solid #ddd' : 'none' }}>
      <span>{rotulo}</span><span>{formatarMoeda(valor)}</span>
    </div>
  )
}

const estilo = erro => ({ width: '100%', padding: 8, borderRadius: 6, boxSizing: 'border-box', fontSize: 13, border: `1px solid ${erro ? '#a32d2d' : '#ddd'}`, color: '#222', background: '#fff' })
const amarelo = { width: '100%', padding: 6, borderRadius: 4, boxSizing: 'border-box', fontSize: 12, border: '1px solid #e6d96a', background: '#FFF9C4', color: '#222' }
const grade = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }
const chk = { fontSize: 13, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }
const tabela = { width: '100%', borderCollapse: 'collapse' }
const th = { textAlign: 'left', fontSize: 11, color: '#666', padding: '4px 6px', borderBottom: '1px solid #ddd' }
const td = { padding: '3px 4px' }
const tdNum = { padding: '3px 6px', fontSize: 12, textAlign: 'right', whiteSpace: 'nowrap' }
const subtitulo = { fontSize: 12, fontWeight: 700, margin: '0 0 8px', background: '#E3EAF5', padding: '5px 8px', borderRadius: 4 }
const subtitulo2 = { ...subtitulo, marginTop: 14 }
const botao = { flex: 1, padding: 11, border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer', fontSize: 13 }
const botaoMini = { padding: '4px 8px', fontSize: 11, borderRadius: 6, border: '1px solid #ddd', background: '#f7f7f7', color: '#333', cursor: 'pointer' }
