import { useEffect, useState } from 'react'
import jsPDF from 'jspdf'
import { listarRelatoriosVisita, buscarRelatorioPorAtividade, salvarRelatorioVisita, uploadFotoRelatorio } from './api'
import {
  SEGMENTOS, PRODUTOS_MOVIMENTADOS, CAMPOS_PCI, OPORTUNIDADES_OPCOES,
  calcularNotaPCI, classificarPciNovo,
} from './constants'
import { TEMA } from './theme'

function campo(chave) { return CAMPOS_PCI.find(c => c.chave === chave) }

function obterUrlFoto(foto) {
  if (!foto) return ''
  if (typeof foto === 'string') return foto
  return foto.publicUrl || foto.publicURL || foto.url || foto.signedUrl || foto.path || ''
}

function normalizarFotos(fotos) {
  if (!fotos) return []
  let lista = fotos
  if (typeof lista === 'string') {
    try { lista = JSON.parse(lista) } catch { lista = [lista] }
  }
  if (!Array.isArray(lista)) lista = [lista]
  return lista.map(obterUrlFoto).filter(Boolean)
}

export default function RelatorioVisita({ abrirParaAtividade, aoFecharAbertura, onAbrirNegocio }) {
  const [modo, setModo] = useState('lista') // lista | form | ver
  const [relatorios, setRelatorios] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [relatorioAtual, setRelatorioAtual] = useState(null)

  async function carregar() {
    setCarregando(true)
    setRelatorios(await listarRelatoriosVisita())
    setCarregando(false)
  }

  useEffect(() => { carregar() }, [])

  useEffect(() => {
    if (abrirParaAtividade) abrirFormulario(abrirParaAtividade)
  }, [abrirParaAtividade])

  async function abrirFormulario(atividade) {
    const existente = await buscarRelatorioPorAtividade(atividade.id)
    setRelatorioAtual(existente || {
      negocio_id: atividade.negocio_id,
      atividade_id: atividade.id,
      empresa: atividade.clienteNome || '',
      cidade: atividade.cidade || '',
      data_visita: new Date().toISOString().slice(0, 10),
    })
    setModo('form')
  }

  function fecharFormulario() {
    setModo('lista')
    setRelatorioAtual(null)
    if (aoFecharAbertura) aoFecharAbertura()
    carregar()
  }

  if (carregando) return <p style={{ padding: 24, color: TEMA.textoPrincipal }}>Carregando...</p>

  if (modo === 'form') {
    return <FormularioRelatorio relatorio={relatorioAtual} onSalvo={fecharFormulario} onCancelar={fecharFormulario} />
  }

  if (modo === 'ver' && relatorioAtual) {
    return <VisualizarRelatorio relatorio={relatorioAtual} onFechar={() => { setModo('lista'); setRelatorioAtual(null) }} onAbrirNegocio={onAbrirNegocio} />
  }

  return (
    <div style={{ padding: 24, color: TEMA.textoPrincipal }}>
      <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>Relatórios de visita — PCI</p>
      <p style={{ fontSize: 12, color: TEMA.textoSecundario, margin: '0 0 16px' }}>
        Preenchidos a partir das visitas agendadas na aba Atividades.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {relatorios.map(r => {
          const classif = classificarPciNovo(r.nota_pci)
          const opcaoLabel = (chave, valor) => campo(chave)?.opcoes.find(o => o.key === valor)?.label || valor || '-'
          return (
            <div
              key={r.id}
              onClick={() => { setRelatorioAtual(r); setModo('ver') }}
              style={{ background: TEMA.card, border: `1px solid ${TEMA.borda}`, borderRadius: 10, padding: 12, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}
            >
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: TEMA.textoPrincipal }}>
                  {r.empresa || r.negocio?.cliente?.razao_social}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: TEMA.textoSecundario }}>
                  {r.cidade} · {r.consultor?.nome} · {r.data_visita ? new Date(r.data_visita + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{
                  fontSize: 13, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                  background: classif.cor + '22', color: classif.cor, border: `1px solid ${classif.cor}55`,
                }}>
                  {r.nota_pci ?? '—'} / 100
                </span>
                <button
                  type="button"
                  title="Gerar PDF deste relatório"
                  onClick={async e => {
                    e.stopPropagation()
                    try { await gerarPdfRelatorio(r, opcaoLabel) }
                    catch (erro) { alert('Não deu pra gerar o PDF: ' + (erro.message || 'erro desconhecido')) }
                  }}
                  style={{ background: '#F77E01', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  ⬇ Gerar PDF
                </button>
              </div>
            </div>
          )
        })}
        {relatorios.length === 0 && <p style={{ color: TEMA.textoDiscreto, fontSize: 13 }}>Nenhum relatório preenchido ainda.</p>}
      </div>
    </div>
  )
}

export function FormularioRelatorio({ relatorio, onSalvo, onCancelar }) {
  const [campos, setCampos] = useState({
    empresa: relatorio.empresa || '', cidade: relatorio.cidade || '', estado: relatorio.estado || '',
    data_visita: relatorio.data_visita || new Date().toISOString().slice(0, 10),
    contato_nome: relatorio.contato_nome || '', contato_cargo: relatorio.contato_cargo || '',
    segmento: relatorio.segmento || '', segmento_outro: relatorio.segmento_outro || '',
    produto_movimentado: relatorio.produto_movimentado || '', produto_outro: relatorio.produto_outro || '',
    tipo_operacao: relatorio.tipo_operacao || '', tipo_piso: relatorio.tipo_piso || '',
    turnos: relatorio.turnos || '', dias_semana: relatorio.dias_semana || '',
    qtd_maquinas_faixa: relatorio.qtd_maquinas_faixa || '',
    qtd_eletricas: relatorio.qtd_eletricas ?? '', qtd_glp: relatorio.qtd_glp ?? '', qtd_diesel: relatorio.qtd_diesel ?? '',
    qtd_classe_i: relatorio.qtd_classe_i ?? '', qtd_classe_ii: relatorio.qtd_classe_ii ?? '',
    qtd_classe_iii: relatorio.qtd_classe_iii ?? '', qtd_classe_iv: relatorio.qtd_classe_iv ?? '', qtd_classe_v: relatorio.qtd_classe_v ?? '',
    manutencao_interna: relatorio.manutencao_interna || '', tecnico_interno: relatorio.tecnico_interno || '',
    consumo_pecas: relatorio.consumo_pecas || '', consumo_pneus: relatorio.consumo_pneus || '', consumo_rodas: relatorio.consumo_rodas || '',
    projeto_futuro: relatorio.projeto_futuro || '', tipo_projeto: relatorio.tipo_projeto || '', tipo_projeto_outro: relatorio.tipo_projeto_outro || '',
    prazo_projeto: relatorio.prazo_projeto || '',
    contato_perfil: relatorio.contato_perfil || '', aderencia: relatorio.aderencia || '',
    custo_mensal_estimado: relatorio.custo_mensal_estimado || '',
    comentarios: relatorio.comentarios || relatorio.descricao_geral || '',
  })
  const [oportunidades, setOportunidades] = useState(relatorio.oportunidades || [])
  const [fotos, setFotos] = useState(() => normalizarFotos(relatorio.fotos))
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const [erroFoto, setErroFoto] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [salvo, setSalvo] = useState(false)

  function set(campoChave, valor) { setCampos(c => ({ ...c, [campoChave]: valor })) }

  function alternarOportunidade(key) {
    setOportunidades(o => o.includes(key) ? o.filter(x => x !== key) : [...o, key])
  }

  const notaAtual = calcularNotaPCI(campos, oportunidades)
  const classificacaoAtual = classificarPciNovo(notaAtual)

  async function adicionarFotos(e) {
    const arquivos = Array.from(e.target.files || [])
    if (arquivos.length === 0) return
    setErroFoto('')
    if (fotos.length + arquivos.length > 10) {
      setErroFoto(`Máximo de 10 fotos — você já tem ${fotos.length} e tentou adicionar mais ${arquivos.length}.`)
      e.target.value = ''
      return
    }
    setEnviandoFoto(true)
    try {
      const urls = []
      for (const arquivo of arquivos) {
        const resultado = await uploadFotoRelatorio(arquivo)
        const url = obterUrlFoto(resultado)
        if (!url) throw new Error('o upload terminou, mas não retornou a URL da imagem')
        urls.push(url)
      }
      setFotos(f => [...f, ...urls])
    } catch (err) {
      setErroFoto('Não deu pra enviar a foto: ' + (err.message || 'erro desconhecido'))
    } finally {
      setEnviandoFoto(false)
      e.target.value = ''
    }
  }

  function removerFoto(url) { setFotos(f => f.filter(x => x !== url)) }

  async function salvar() {
    setSalvando(true)
    setErro('')
    try {
      const dados = {
        ...campos,
        oportunidades, fotos,
        negocio_id: relatorio.negocio_id || null,
        atividade_id: relatorio.atividade_id || null,
        nota_pci: notaAtual,
        pci_classificacao: classificacaoAtual.label,
        qtd_eletricas: campos.qtd_eletricas !== '' ? Number(campos.qtd_eletricas) : null,
        qtd_glp: campos.qtd_glp !== '' ? Number(campos.qtd_glp) : null,
        qtd_diesel: campos.qtd_diesel !== '' ? Number(campos.qtd_diesel) : null,
        qtd_classe_i: campos.qtd_classe_i !== '' ? Number(campos.qtd_classe_i) : null,
        qtd_classe_ii: campos.qtd_classe_ii !== '' ? Number(campos.qtd_classe_ii) : null,
        qtd_classe_iii: campos.qtd_classe_iii !== '' ? Number(campos.qtd_classe_iii) : null,
        qtd_classe_iv: campos.qtd_classe_iv !== '' ? Number(campos.qtd_classe_iv) : null,
        qtd_classe_v: campos.qtd_classe_v !== '' ? Number(campos.qtd_classe_v) : null,
      }
      await salvarRelatorioVisita(dados, relatorio.id)
      setSalvo(true)
      if (onSalvo) onSalvo()
    } catch (e) {
      setErro('Não deu pra salvar: ' + (e.message || 'erro desconhecido'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div style={{ padding: 24, color: TEMA.textoPrincipal, maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Relatório de visita — PCI</p>
        <button onClick={onCancelar} style={{ background: 'none', border: 'none', color: TEMA.textoSecundario, fontSize: 13, cursor: 'pointer' }}>Fechar</button>
      </div>

      {salvo && (
        <div style={{ background: 'rgba(34,197,94,0.1)', border: `1px solid ${TEMA.verde}55`, borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <p style={{ color: TEMA.verde, fontSize: 13, margin: 0, fontWeight: 600 }}>✓ Relatório salvo com sucesso.</p>
        </div>
      )}

      <div style={{
        position: 'sticky', top: 0, zIndex: 5, background: TEMA.fundoPrincipal, padding: '10px 0', marginBottom: 6,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, color: TEMA.textoSecundario }}>Nota PCI (calculada sozinha)</span>
        <span style={{
          fontSize: 18, fontWeight: 800, padding: '4px 14px', borderRadius: 20,
          background: classificacaoAtual.cor + '22', color: classificacaoAtual.cor, border: `1px solid ${classificacaoAtual.cor}55`,
        }}>
          {notaAtual} / 100 — {classificacaoAtual.label}
        </span>
      </div>

      <Secao titulo="1. Dados da visita">
        <LinhaCampos>
          <Campo label="Empresa" style={{ flex: 2 }}><input value={campos.empresa} onChange={e => set('empresa', e.target.value)} style={inputStyle} /></Campo>
          <Campo label="Data da visita" style={{ flex: 1 }}><input type="date" value={campos.data_visita} onChange={e => set('data_visita', e.target.value)} style={inputStyle} /></Campo>
        </LinhaCampos>
        <LinhaCampos>
          <Campo label="Cidade" style={{ flex: 2 }}><input value={campos.cidade} onChange={e => set('cidade', e.target.value)} style={inputStyle} /></Campo>
          <Campo label="UF" style={{ flex: 1 }}><input maxLength={2} value={campos.estado} onChange={e => set('estado', e.target.value.toUpperCase())} style={inputStyle} /></Campo>
        </LinhaCampos>
      </Secao>

      <Secao titulo="2. Contato principal">
        <LinhaCampos>
          <Campo label="Nome" style={{ flex: 1 }}><input value={campos.contato_nome} onChange={e => set('contato_nome', e.target.value)} style={inputStyle} /></Campo>
          <Campo label="Cargo" style={{ flex: 1 }}><input value={campos.contato_cargo} onChange={e => set('contato_cargo', e.target.value)} style={inputStyle} /></Campo>
        </LinhaCampos>
        <SelectPontuado def={campo('contato_perfil')} valor={campos.contato_perfil} onChange={v => set('contato_perfil', v)} />
      </Secao>

      <Secao titulo="3. Perfil da operação">
        <Campo label="Segmento">
          <select value={campos.segmento} onChange={e => set('segmento', e.target.value)} style={inputStyle}>
            <option value="">-</option>
            {SEGMENTOS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Campo>
        {campos.segmento === 'Outros' && (
          <Campo label="Qual segmento?"><input value={campos.segmento_outro} onChange={e => set('segmento_outro', e.target.value)} style={inputStyle} /></Campo>
        )}

        <Campo label="Produto movimentado">
          <select value={campos.produto_movimentado} onChange={e => set('produto_movimentado', e.target.value)} style={inputStyle}>
            <option value="">-</option>
            {PRODUTOS_MOVIMENTADOS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </Campo>
        {campos.produto_movimentado === 'Outros' && (
          <Campo label="Qual produto?"><input value={campos.produto_outro} onChange={e => set('produto_outro', e.target.value)} style={inputStyle} /></Campo>
        )}

        <SelectPontuado def={campo('tipo_operacao')} valor={campos.tipo_operacao} onChange={v => set('tipo_operacao', v)} />
        <SelectPontuado def={campo('tipo_piso')} valor={campos.tipo_piso} onChange={v => set('tipo_piso', v)} />
        <LinhaCampos>
          <div style={{ flex: 1 }}><SelectPontuado def={campo('turnos')} valor={campos.turnos} onChange={v => set('turnos', v)} /></div>
          <div style={{ flex: 1 }}><SelectPontuado def={campo('dias_semana')} valor={campos.dias_semana} onChange={v => set('dias_semana', v)} /></div>
        </LinhaCampos>
      </Secao>

      <Secao titulo="4. Frota de empilhadeiras">
        <SelectPontuado def={campo('qtd_maquinas_faixa')} valor={campos.qtd_maquinas_faixa} onChange={v => set('qtd_maquinas_faixa', v)} />
        <LinhaCampos>
          <Campo label="Elétricas (qtd.)" style={{ flex: 1 }}><input type="number" value={campos.qtd_eletricas} onChange={e => set('qtd_eletricas', e.target.value)} style={inputStyle} /></Campo>
          <Campo label="GLP (qtd.)" style={{ flex: 1 }}><input type="number" value={campos.qtd_glp} onChange={e => set('qtd_glp', e.target.value)} style={inputStyle} /></Campo>
          <Campo label="Diesel (qtd.)" style={{ flex: 1 }}><input type="number" value={campos.qtd_diesel} onChange={e => set('qtd_diesel', e.target.value)} style={inputStyle} /></Campo>
        </LinhaCampos>
        <LinhaCampos>
          <Campo label="Classe I" style={{ flex: 1 }}><input type="number" value={campos.qtd_classe_i} onChange={e => set('qtd_classe_i', e.target.value)} style={inputStyle} /></Campo>
          <Campo label="Classe II" style={{ flex: 1 }}><input type="number" value={campos.qtd_classe_ii} onChange={e => set('qtd_classe_ii', e.target.value)} style={inputStyle} /></Campo>
          <Campo label="Classe III" style={{ flex: 1 }}><input type="number" value={campos.qtd_classe_iii} onChange={e => set('qtd_classe_iii', e.target.value)} style={inputStyle} /></Campo>
        </LinhaCampos>
        <LinhaCampos>
          <Campo label="Classe IV" style={{ flex: 1 }}><input type="number" value={campos.qtd_classe_iv} onChange={e => set('qtd_classe_iv', e.target.value)} style={inputStyle} /></Campo>
          <Campo label="Classe V" style={{ flex: 1 }}><input type="number" value={campos.qtd_classe_v} onChange={e => set('qtd_classe_v', e.target.value)} style={inputStyle} /></Campo>
        </LinhaCampos>
      </Secao>

      <Secao titulo="5. Manutenção e consumo">
        <LinhaCampos>
          <div style={{ flex: 1 }}><SelectPontuado def={campo('manutencao_interna')} valor={campos.manutencao_interna} onChange={v => set('manutencao_interna', v)} /></div>
          <div style={{ flex: 1 }}><SelectPontuado def={campo('tecnico_interno')} valor={campos.tecnico_interno} onChange={v => set('tecnico_interno', v)} /></div>
        </LinhaCampos>
        <LinhaCampos>
          <div style={{ flex: 1 }}><SelectPontuado def={campo('consumo_pecas')} valor={campos.consumo_pecas} onChange={v => set('consumo_pecas', v)} /></div>
          <div style={{ flex: 1 }}><SelectPontuado def={campo('consumo_pneus')} valor={campos.consumo_pneus} onChange={v => set('consumo_pneus', v)} /></div>
          <div style={{ flex: 1 }}><SelectPontuado def={campo('consumo_rodas')} valor={campos.consumo_rodas} onChange={v => set('consumo_rodas', v)} /></div>
        </LinhaCampos>
      </Secao>

      <Secao titulo="6. Projetos futuros">
        <SelectPontuado def={campo('projeto_futuro')} valor={campos.projeto_futuro} onChange={v => set('projeto_futuro', v)} />
        {campos.projeto_futuro === 'sim' && (
          <>
            <SelectPontuado def={campo('tipo_projeto')} valor={campos.tipo_projeto} onChange={v => set('tipo_projeto', v)} />
            {campos.tipo_projeto === 'Outros' && (
              <Campo label="Qual projeto?"><input value={campos.tipo_projeto_outro} onChange={e => set('tipo_projeto_outro', e.target.value)} style={inputStyle} /></Campo>
            )}
            <SelectPontuado def={campo('prazo_projeto')} valor={campos.prazo_projeto} onChange={v => set('prazo_projeto', v)} />
          </>
        )}
      </Secao>

      <Secao titulo={`7. Oportunidades identificadas (${oportunidades.length}/7)`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {OPORTUNIDADES_OPCOES.map(o => (
            <label key={o.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={oportunidades.includes(o.key)} onChange={() => alternarOportunidade(o.key)} />
              {o.label}
            </label>
          ))}
        </div>
      </Secao>

      <Secao titulo="8. Aderência e potencial">
        <SelectPontuado def={campo('aderencia')} valor={campos.aderencia} onChange={v => set('aderencia', v)} />
        <SelectPontuado def={campo('custo_mensal_estimado')} valor={campos.custo_mensal_estimado} onChange={v => set('custo_mensal_estimado', v)} />
      </Secao>

      <Secao titulo="9. Comentários">
        <textarea rows={4} value={campos.comentarios} onChange={e => set('comentarios', e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
      </Secao>

      <Secao titulo={`Fotos da visita (${fotos.length}/10)`}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8, marginBottom: 10 }}>
          {fotos.map(url => (
            <div key={url} style={{ position: 'relative' }}>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <img src={url} alt="Foto da visita" style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 6, border: `1px solid ${TEMA.linhaInterna}`, display: 'block', cursor: 'zoom-in' }} />
              </a>
              <button
                type="button" onClick={() => removerFoto(url)}
                style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 11, cursor: 'pointer', lineHeight: '20px', padding: 0 }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        {fotos.length < 10 && (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', border: `1px solid ${TEMA.linhaInterna}`, borderRadius: 8, padding: '9px 14px', fontSize: 13, cursor: 'pointer' }}>
            {enviandoFoto ? 'Enviando...' : '📷 Adicionar foto(s)'}
            <input type="file" accept="image/*" multiple capture="environment" onChange={adicionarFotos} disabled={enviandoFoto} style={{ display: 'none' }} />
          </label>
        )}
        {erroFoto && <p style={{ color: TEMA.vermelho, fontSize: 12, marginTop: 6 }}>{erroFoto}</p>}
      </Secao>

      {erro && <p style={{ color: TEMA.vermelho, fontSize: 13 }}>{erro}</p>}
      <div style={{ display: 'flex', gap: 8, marginTop: 8, marginBottom: 40 }}>
        <button onClick={onCancelar} style={{ ...botao, background: 'rgba(255,255,255,0.06)', color: TEMA.textoPrincipal, border: `1px solid ${TEMA.linhaInterna}` }}>Voltar</button>
        <button onClick={salvar} disabled={salvando} style={{ ...botao, background: '#F77E01', color: '#fff' }}>
          {salvando ? 'Salvando...' : 'Salvar relatório'}
        </button>
      </div>
    </div>
  )
}

function VisualizarRelatorio({ relatorio, onFechar }) {
  const classif = classificarPciNovo(relatorio.nota_pci)
  const opcaoLabel = (chave, valor) => campo(chave)?.opcoes.find(o => o.key === valor)?.label || valor || '-'
  const [gerandoPdf, setGerandoPdf] = useState(false)
  const fotos = normalizarFotos(relatorio.fotos)

  async function gerarPdf() {
    setGerandoPdf(true)
    try {
      await gerarPdfRelatorio(relatorio, opcaoLabel)
    } catch (e) {
      alert('Não deu pra gerar o PDF: ' + (e.message || 'erro desconhecido'))
    } finally {
      setGerandoPdf(false)
    }
  }

  return (
    <div style={{ padding: 24, color: TEMA.textoPrincipal, maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{relatorio.empresa}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 15, fontWeight: 800, padding: '4px 12px', borderRadius: 20,
            background: classif.cor + '22', color: classif.cor, border: `1px solid ${classif.cor}55`,
          }}>
            {relatorio.nota_pci ?? '—'} / 100 — {classif.label}
          </span>
          <button
            onClick={gerarPdf} disabled={gerandoPdf}
            style={{ background: '#F77E01', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            {gerandoPdf ? 'Gerando...' : '⬇ Gerar PDF'}
          </button>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', color: TEMA.textoSecundario, fontSize: 13, cursor: 'pointer' }}>Voltar</button>
        </div>
      </div>

      <Bloco titulo="Dados da visita" itens={[
        ['Cidade/UF', `${relatorio.cidade || '-'} ${relatorio.estado ? '/' + relatorio.estado : ''}`],
        ['Data da visita', relatorio.data_visita ? new Date(relatorio.data_visita + 'T00:00:00').toLocaleDateString('pt-BR') : '-'],
        ['Consultor', relatorio.consultor?.nome || '-'],
      ]} />

      <Bloco titulo="Contato principal" itens={[
        ['Nome', relatorio.contato_nome || '-'],
        ['Cargo', relatorio.contato_cargo || '-'],
        ['Perfil', opcaoLabel('contato_perfil', relatorio.contato_perfil)],
      ]} />

      <Bloco titulo="Perfil da operação" itens={[
        ['Segmento', relatorio.segmento === 'Outros' ? relatorio.segmento_outro : (relatorio.segmento || '-')],
        ['Produto movimentado', relatorio.produto_movimentado === 'Outros' ? relatorio.produto_outro : (relatorio.produto_movimentado || '-')],
        ['Tipo de operação', opcaoLabel('tipo_operacao', relatorio.tipo_operacao)],
        ['Tipo de piso', opcaoLabel('tipo_piso', relatorio.tipo_piso)],
        ['Turnos', opcaoLabel('turnos', relatorio.turnos)],
        ['Dias de operação', opcaoLabel('dias_semana', relatorio.dias_semana)],
      ]} />

      <Bloco titulo="Frota de empilhadeiras" itens={[
        ['Total de máquinas', opcaoLabel('qtd_maquinas_faixa', relatorio.qtd_maquinas_faixa)],
        ['Elétricas / GLP / Diesel', `${relatorio.qtd_eletricas ?? 0} / ${relatorio.qtd_glp ?? 0} / ${relatorio.qtd_diesel ?? 0}`],
        ['Classes I-V', `${relatorio.qtd_classe_i ?? 0} / ${relatorio.qtd_classe_ii ?? 0} / ${relatorio.qtd_classe_iii ?? 0} / ${relatorio.qtd_classe_iv ?? 0} / ${relatorio.qtd_classe_v ?? 0}`],
      ]} />

      <Bloco titulo="Manutenção e consumo" itens={[
        ['Manutenção interna', opcaoLabel('manutencao_interna', relatorio.manutencao_interna)],
        ['Técnico interno', opcaoLabel('tecnico_interno', relatorio.tecnico_interno)],
        ['Consumo de peças', opcaoLabel('consumo_pecas', relatorio.consumo_pecas)],
        ['Consumo de pneus', opcaoLabel('consumo_pneus', relatorio.consumo_pneus)],
        ['Consumo de rodas', opcaoLabel('consumo_rodas', relatorio.consumo_rodas)],
      ]} />

      <Bloco titulo="Projetos futuros" itens={[
        ['Existe projeto futuro?', opcaoLabel('projeto_futuro', relatorio.projeto_futuro)],
        ['Tipo de projeto', relatorio.tipo_projeto === 'Outros' ? relatorio.tipo_projeto_outro : opcaoLabel('tipo_projeto', relatorio.tipo_projeto)],
        ['Prazo', opcaoLabel('prazo_projeto', relatorio.prazo_projeto)],
      ]} />

      <Bloco titulo="Oportunidades identificadas" itens={[
        [null, (relatorio.oportunidades || []).length > 0
          ? relatorio.oportunidades.map(k => OPORTUNIDADES_OPCOES.find(o => o.key === k)?.label || k).join(', ')
          : 'Nenhuma'],
      ]} />

      <Bloco titulo="Aderência e potencial" itens={[
        ['Aderência', opcaoLabel('aderencia', relatorio.aderencia)],
        ['Estimativa de custo mensal', opcaoLabel('custo_mensal_estimado', relatorio.custo_mensal_estimado)],
      ]} />

      <Bloco titulo="Comentários" itens={[[null, relatorio.comentarios || relatorio.descricao_geral || '-']]} />

      {fotos.length > 0 && (
        <div style={{ background: TEMA.card, border: `1px solid ${TEMA.borda}`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: TEMA.laranjaLuminoso, textTransform: 'uppercase', margin: '0 0 8px' }}>
            Fotos da visita ({fotos.length})
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
            {fotos.map(url => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                <img src={url} alt="Foto da visita" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 6 }} />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

async function imagemParaBase64(url) {
  const resp = await fetch(url, { mode: 'cors' })
  if (!resp.ok) throw new Error(`Falha ao baixar imagem (${resp.status})`)
  const blob = await resp.blob()
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onload = () => resolve(leitor.result)
    leitor.onerror = reject
    leitor.readAsDataURL(blob)
  })
}

async function gerarPdfRelatorio(relatorio, opcaoLabel) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const COR = { laranja: [247, 126, 1], preto: [20, 20, 20], cinza: [104, 112, 120], claro: [245, 246, 247], linha: [222, 225, 228], branco: [255, 255, 255], verde: [30, 142, 82] }
  const classif = classificarPciNovo(relatorio.nota_pci)
  const oportunidades = relatorio.oportunidades || []
  const dataVisita = relatorio.data_visita ? new Date(relatorio.data_visita + 'T00:00:00').toLocaleDateString('pt-BR') : '-'
  const cidadeUf = `${relatorio.cidade || '-'}${relatorio.estado ? ' / ' + relatorio.estado : ''}`
  const frotaInformada = [relatorio.qtd_eletricas, relatorio.qtd_glp, relatorio.qtd_diesel].reduce((s, n) => s + (Number(n) || 0), 0)
  let y = 0

  const texto = (valor, fallback = '-') => valor === null || valor === undefined || valor === '' ? fallback : String(valor)
  const valorCampo = (chave) => opcaoLabel(chave, relatorio[chave])
  const pontosCampo = (chave) => {
    const def = campo(chave)
    const op = def?.opcoes?.find(o => o.key === relatorio[chave])
    return { pontos: op?.pontos ?? 0, max: def?.max ?? 0 }
  }

  function marca() {
    doc.setFillColor(...COR.laranja)
    doc.triangle(14, 9, 22, 9, 18, 16, 'F')
    doc.setFillColor(...COR.preto)
    doc.triangle(15.5, 10.5, 20.5, 10.5, 18, 14.5, 'F')
    doc.setFont('helvetica', 'bolditalic')
    doc.setFontSize(15)
    doc.setTextColor(...COR.preto)
    doc.text('TranspoTech', 26, 15)
  }

  function cabecalho(titulo, subtitulo) {
    doc.setFillColor(...COR.branco)
    doc.rect(0, 0, 210, 25, 'F')
    marca()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...COR.preto)
    doc.text(titulo.toUpperCase(), 196, 11, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...COR.cinza)
    doc.text(subtitulo, 196, 16, { align: 'right' })
    doc.setFillColor(...COR.laranja)
    doc.rect(0, 23, 210, 2, 'F')
    y = 34
  }

  function tituloSecao(titulo, detalhe = '') {
    if (y > 265) { doc.addPage(); cabecalho('Relatório de visita comercial', relatorio.empresa || '-') }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...COR.preto)
    doc.text(titulo.toUpperCase(), 14, y)
    if (detalhe) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...COR.cinza)
      doc.text(detalhe, 196, y, { align: 'right' })
    }
    doc.setDrawColor(...COR.laranja)
    doc.setLineWidth(0.6)
    doc.line(14, y + 3, 196, y + 3)
    y += 9
  }

  function card(x, topo, largura, altura, rotulo, valor, corValor = COR.preto) {
    doc.setFillColor(...COR.claro)
    doc.roundedRect(x, topo, largura, altura, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...COR.cinza)
    doc.text(rotulo.toUpperCase(), x + 4, topo + 6)
    doc.setFontSize(13)
    doc.setTextColor(...corValor)
    const linhas = doc.splitTextToSize(texto(valor), largura - 8)
    doc.text(linhas.slice(0, 2), x + 4, topo + 14)
  }

  function parLinha(rotulo, valor, x = 14, largura = 182) {
    const linhas = doc.splitTextToSize(texto(valor), largura - 51)
    const altura = Math.max(7, linhas.length * 4.2 + 2)
    if (y + altura > 277) { doc.addPage(); cabecalho('Relatório de visita comercial', relatorio.empresa || '-') }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.2)
    doc.setTextColor(...COR.cinza)
    doc.text(rotulo, x, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COR.preto)
    doc.text(linhas, x + 49, y)
    doc.setDrawColor(...COR.linha)
    doc.line(x, y + altura - 2, x + largura, y + altura - 2)
    y += altura
  }

  // Página 1 - visão executiva
  cabecalho('Relatório de visita comercial', `PCI | ${dataVisita}`)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...COR.preto)
  doc.text(texto(relatorio.empresa).toUpperCase(), 14, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...COR.cinza)
  doc.text(`${cidadeUf}  |  Consultor: ${texto(relatorio.consultor?.nome)}`, 14, y + 11)
  y += 20

  doc.setFillColor(...COR.preto)
  doc.roundedRect(14, y, 182, 36, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...COR.branco)
  doc.text('POTENCIAL COMERCIAL IDENTIFICADO', 20, y + 9)
  doc.setFontSize(25)
  doc.setTextColor(...COR.laranja)
  doc.text(`${relatorio.nota_pci ?? '-'} / 100`, 20, y + 25)
  doc.setFontSize(14)
  doc.setTextColor(...COR.branco)
  doc.text(classif.label, 188, y + 23, { align: 'right' })
  y += 43

  card(14, y, 57, 27, 'Frota informada', frotaInformada > 0 ? `${frotaInformada} máquinas` : valorCampo('qtd_maquinas_faixa'))
  card(76.5, y, 57, 27, 'Oportunidades', `${oportunidades.length} identificadas`, COR.laranja)
  card(139, y, 57, 27, 'Custo mensal', valorCampo('custo_mensal_estimado'))
  y += 36

  tituloSecao('Leitura executiva')
  parLinha('Contato-chave', `${texto(relatorio.contato_nome)} - ${texto(relatorio.contato_cargo)} (${valorCampo('contato_perfil')})`)
  parLinha('Operação', `${valorCampo('tipo_operacao')} | ${valorCampo('turnos')} | ${valorCampo('dias_semana')}`)
  parLinha('Cenário técnico', `Manutenção interna: ${valorCampo('manutencao_interna')} | Técnico interno: ${valorCampo('tecnico_interno')}`)
  parLinha('Projeto futuro', `${valorCampo('projeto_futuro')} | ${relatorio.tipo_projeto === 'Outros' ? texto(relatorio.tipo_projeto_outro) : valorCampo('tipo_projeto')} | ${valorCampo('prazo_projeto')}`)
  parLinha('Aderência', valorCampo('aderencia'))
  y += 4

  tituloSecao('Oportunidades prioritárias', `${oportunidades.length} frente(s)`)
  if (oportunidades.length) {
    oportunidades.forEach((chave, i) => {
      const label = OPORTUNIDADES_OPCOES.find(o => o.key === chave)?.label || chave
      doc.setFillColor(...COR.claro)
      doc.circle(18, y - 1, 3, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...COR.laranja)
      doc.text(String(i + 1), 18, y, { align: 'center' })
      doc.setTextColor(...COR.preto)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text(label, 25, y)
      y += 8
    })
  } else {
    parLinha('Status', 'Nenhuma oportunidade registrada na visita.')
  }

  // Página 2 - diagnóstico e pontuação
  doc.addPage()
  cabecalho('Diagnóstico PCI', `${texto(relatorio.empresa)} | Nota ${relatorio.nota_pci ?? '-'} / 100`)
  tituloSecao('Composição da pontuação', 'Critério | resposta | pontos')
  const criterios = [
    ['contato_perfil', 'Perfil do contato'], ['tipo_operacao', 'Tipo de operação'], ['tipo_piso', 'Condição do piso'],
    ['turnos', 'Turnos'], ['dias_semana', 'Dias de operação'], ['qtd_maquinas_faixa', 'Tamanho da frota'],
    ['manutencao_interna', 'Manutenção interna'], ['tecnico_interno', 'Técnico interno'], ['consumo_pecas', 'Consumo de peças'],
    ['consumo_pneus', 'Consumo de pneus'], ['consumo_rodas', 'Consumo de rodas'], ['projeto_futuro', 'Projeto futuro'],
    ['tipo_projeto', 'Tipo de projeto'], ['prazo_projeto', 'Prazo do projeto'], ['aderencia', 'Aderência'], ['custo_mensal_estimado', 'Custo mensal estimado'],
  ].filter(([chave]) => campo(chave))

  criterios.forEach(([chave, label], indice) => {
    const p = pontosCampo(chave)
    const altura = 10
    if (y + altura > 276) { doc.addPage(); cabecalho('Diagnóstico PCI', texto(relatorio.empresa)); tituloSecao('Composição da pontuação - continuação') }
    if (indice % 2 === 0) { doc.setFillColor(...COR.claro); doc.rect(14, y - 5, 182, altura, 'F') }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...COR.preto); doc.text(label, 18, y)
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...COR.cinza)
    doc.text(doc.splitTextToSize(valorCampo(chave), 83)[0], 80, y)
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...COR.laranja)
    doc.text(`${p.pontos} / ${p.max}`, 190, y, { align: 'right' })
    y += altura
  })

  y += 3
  tituloSecao('Dados complementares da operação')
  parLinha('Segmento', relatorio.segmento === 'Outros' ? relatorio.segmento_outro : relatorio.segmento)
  parLinha('Produto movimentado', relatorio.produto_movimentado === 'Outros' ? relatorio.produto_outro : relatorio.produto_movimentado)
  parLinha('Matriz energética', `Elétricas: ${relatorio.qtd_eletricas ?? 0} | GLP: ${relatorio.qtd_glp ?? 0} | Diesel: ${relatorio.qtd_diesel ?? 0}`)
  parLinha('Classes I a V', `${relatorio.qtd_classe_i ?? 0} | ${relatorio.qtd_classe_ii ?? 0} | ${relatorio.qtd_classe_iii ?? 0} | ${relatorio.qtd_classe_iv ?? 0} | ${relatorio.qtd_classe_v ?? 0}`)
  parLinha('Comentários', relatorio.comentarios || relatorio.descricao_geral || '-')

  // Páginas finais - evidências fotográficas sem distorção
  const fotos = normalizarFotos(relatorio.fotos)
  if (fotos.length > 0) {
    doc.addPage()
    cabecalho('Evidências da visita', `${texto(relatorio.empresa)} | ${fotos.length} foto(s)`)
    tituloSecao('Registro fotográfico')
    let coluna = 0
    const caixaW = 87
    const caixaH = 72
    for (let i = 0; i < fotos.length; i++) {
      try {
        const base64 = await imagemParaBase64(fotos[i])
        if (y + caixaH > 273) { doc.addPage(); cabecalho('Evidências da visita', texto(relatorio.empresa)); tituloSecao('Registro fotográfico - continuação'); coluna = 0 }
        const x = coluna === 0 ? 14 : 109
        doc.setFillColor(...COR.claro)
        doc.roundedRect(x, y, caixaW, caixaH, 2, 2, 'F')
        const props = doc.getImageProperties(base64)
        const escala = Math.min((caixaW - 4) / props.width, (caixaH - 10) / props.height)
        const w = props.width * escala
        const h = props.height * escala
        doc.addImage(base64, undefined, x + (caixaW - w) / 2, y + 3, w, h, undefined, 'FAST')
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...COR.cinza)
        doc.text(`Foto ${i + 1}`, x + 4, y + caixaH - 3)
        if (coluna === 0) coluna = 1
        else { coluna = 0; y += caixaH + 7 }
      } catch (e) {
        console.error('Não deu pra incluir uma foto no PDF:', e)
      }
    }
  }

  // Rodapé corporativo e paginação
  const totalPaginas = doc.getNumberOfPages()
  for (let pagina = 1; pagina <= totalPaginas; pagina++) {
    doc.setPage(pagina)
    doc.setDrawColor(...COR.linha)
    doc.line(14, 287, 196, 287)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...COR.cinza)
    doc.text('TranspoTech | Soluções em Equipamentos de Movimentação', 14, 292)
    doc.text(`Página ${pagina} de ${totalPaginas}`, 196, 292, { align: 'right' })
  }

  const nomeArquivo = `relatorio-visita-${(relatorio.empresa || 'cliente').replace(/[^a-zA-Z0-9]/g, '-')}.pdf`
  doc.save(nomeArquivo)
}

function SelectPontuado({ def, valor, onChange }) {
  if (!def) return null
  return (
    <Campo label={`${def.label} (máx. ${def.max} pts)`}>
      <select value={valor} onChange={e => onChange(e.target.value)} style={inputStyle}>
        <option value="">-</option>
        {def.opcoes.map(o => <option key={o.key} value={o.key}>{o.label} ({o.pontos} pts)</option>)}
      </select>
    </Campo>
  )
}

function Bloco({ titulo, itens }) {
  return (
    <div style={{ background: TEMA.card, border: `1px solid ${TEMA.borda}`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: TEMA.laranjaLuminoso, textTransform: 'uppercase', margin: '0 0 8px' }}>{titulo}</p>
      {itens.map(([label, valor], i) => (
        <p key={i} style={{ fontSize: 13, margin: '4px 0', color: TEMA.textoPrincipal }}>
          {label && <strong>{label}: </strong>}{valor}
        </p>
      ))}
    </div>
  )
}

function Secao({ titulo, children }) {
  return (
    <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${TEMA.linhaInterna}` }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: TEMA.laranjaLuminoso, textTransform: 'uppercase', margin: '0 0 12px' }}>{titulo}</p>
      {children}
    </div>
  )
}

function LinhaCampos({ children }) {
  return <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{children}</div>
}

function Campo({ label, children, style }) {
  return (
    <div style={{ marginBottom: 10, minWidth: 140, ...style }}>
      <label style={{ fontSize: 12, color: TEMA.textoSecundario, display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: 9, borderRadius: 6, border: `1px solid ${TEMA.linhaInterna}`, boxSizing: 'border-box',
  fontSize: 13, background: 'rgba(255,255,255,0.03)', color: TEMA.textoPrincipal,
}

const botao = {
  flex: 1, padding: 11, border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13,
}
