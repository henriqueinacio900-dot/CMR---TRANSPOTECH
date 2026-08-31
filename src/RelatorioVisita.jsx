import { useEffect, useState } from 'react'
import jsPDF from 'jspdf'
import { listarRelatoriosVisita, buscarRelatorioPorAtividade, salvarRelatorioVisita, uploadFotoRelatorio } from './api'
import {
  SEGMENTOS, PRODUTOS_MOVIMENTADOS, CAMPOS_PCI, OPORTUNIDADES_OPCOES,
  calcularNotaPCI, classificarPciNovo,
} from './constants'
import { TEMA } from './theme'

function campo(chave) { return CAMPOS_PCI.find(c => c.chave === chave) }

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
              <span style={{
                fontSize: 13, fontWeight: 700, padding: '4px 10px', borderRadius: 20, flexShrink: 0,
                background: classif.cor + '22', color: classif.cor, border: `1px solid ${classif.cor}55`,
              }}>
                {r.nota_pci ?? '—'} / 100
              </span>
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
  const [fotos, setFotos] = useState(relatorio.fotos || [])
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
      for (const arquivo of arquivos) urls.push(await uploadFotoRelatorio(arquivo))
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

      {relatorio.fotos && relatorio.fotos.length > 0 && (
        <div style={{ background: TEMA.card, border: `1px solid ${TEMA.borda}`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: TEMA.laranjaLuminoso, textTransform: 'uppercase', margin: '0 0 8px' }}>
            Fotos da visita ({relatorio.fotos.length})
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
            {relatorio.fotos.map(url => (
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
  const resp = await fetch(url)
  const blob = await resp.blob()
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onload = () => resolve(leitor.result)
    leitor.onerror = reject
    leitor.readAsDataURL(blob)
  })
}

async function gerarPdfRelatorio(relatorio, opcaoLabel) {
  const doc = new jsPDF()
  const laranja = [247, 126, 1]
  let y = 20

  doc.setFillColor(...laranja)
  doc.rect(0, 0, 210, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.text('Relatório de Visita Comercial — PCI', 14, 14)

  doc.setTextColor(20, 20, 20)
  y = 32
  doc.setFontSize(16)
  doc.text(relatorio.empresa || '-', 14, y)
  y += 8

  const classif = classificarPciNovo(relatorio.nota_pci)
  doc.setFontSize(13)
  doc.setTextColor(...laranja)
  doc.text(`Nota PCI: ${relatorio.nota_pci ?? '-'} / 100 — ${classif.label}`, 14, y)
  doc.setTextColor(20, 20, 20)
  y += 10

  function linha(rotulo, valor) {
    if (y > 275) { doc.addPage(); y = 20 }
    doc.setFontSize(10)
    doc.setFont(undefined, 'bold')
    doc.text(`${rotulo}:`, 14, y)
    doc.setFont(undefined, 'normal')
    const texto = doc.splitTextToSize(String(valor ?? '-'), 140)
    doc.text(texto, 60, y)
    y += 6 * texto.length
  }

  function tituloSecao(t) {
    if (y > 270) { doc.addPage(); y = 20 }
    y += 4
    doc.setFontSize(11)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(...laranja)
    doc.text(t, 14, y)
    doc.setTextColor(20, 20, 20)
    doc.setFont(undefined, 'normal')
    y += 6
  }

  tituloSecao('Dados da visita')
  linha('Cidade/UF', `${relatorio.cidade || '-'} ${relatorio.estado ? '/' + relatorio.estado : ''}`)
  linha('Data da visita', relatorio.data_visita ? new Date(relatorio.data_visita + 'T00:00:00').toLocaleDateString('pt-BR') : '-')
  linha('Consultor', relatorio.consultor?.nome || '-')

  tituloSecao('Contato principal')
  linha('Nome', relatorio.contato_nome)
  linha('Cargo', relatorio.contato_cargo)
  linha('Perfil', opcaoLabel('contato_perfil', relatorio.contato_perfil))

  tituloSecao('Perfil da operação')
  linha('Segmento', relatorio.segmento === 'Outros' ? relatorio.segmento_outro : relatorio.segmento)
  linha('Produto movimentado', relatorio.produto_movimentado === 'Outros' ? relatorio.produto_outro : relatorio.produto_movimentado)
  linha('Tipo de operação', opcaoLabel('tipo_operacao', relatorio.tipo_operacao))
  linha('Tipo de piso', opcaoLabel('tipo_piso', relatorio.tipo_piso))
  linha('Turnos', opcaoLabel('turnos', relatorio.turnos))
  linha('Dias de operação', opcaoLabel('dias_semana', relatorio.dias_semana))

  tituloSecao('Frota de empilhadeiras')
  linha('Total de máquinas', opcaoLabel('qtd_maquinas_faixa', relatorio.qtd_maquinas_faixa))
  linha('Elétricas / GLP / Diesel', `${relatorio.qtd_eletricas ?? 0} / ${relatorio.qtd_glp ?? 0} / ${relatorio.qtd_diesel ?? 0}`)
  linha('Classes I-V', `${relatorio.qtd_classe_i ?? 0} / ${relatorio.qtd_classe_ii ?? 0} / ${relatorio.qtd_classe_iii ?? 0} / ${relatorio.qtd_classe_iv ?? 0} / ${relatorio.qtd_classe_v ?? 0}`)

  tituloSecao('Manutenção e consumo')
  linha('Manutenção interna', opcaoLabel('manutencao_interna', relatorio.manutencao_interna))
  linha('Técnico interno', opcaoLabel('tecnico_interno', relatorio.tecnico_interno))
  linha('Consumo de peças', opcaoLabel('consumo_pecas', relatorio.consumo_pecas))
  linha('Consumo de pneus', opcaoLabel('consumo_pneus', relatorio.consumo_pneus))
  linha('Consumo de rodas', opcaoLabel('consumo_rodas', relatorio.consumo_rodas))

  tituloSecao('Projetos futuros')
  linha('Existe projeto futuro?', opcaoLabel('projeto_futuro', relatorio.projeto_futuro))
  linha('Tipo de projeto', relatorio.tipo_projeto === 'Outros' ? relatorio.tipo_projeto_outro : opcaoLabel('tipo_projeto', relatorio.tipo_projeto))
  linha('Prazo', opcaoLabel('prazo_projeto', relatorio.prazo_projeto))

  tituloSecao('Oportunidades identificadas')
  linha('', (relatorio.oportunidades || []).length > 0
    ? relatorio.oportunidades.map(k => OPORTUNIDADES_OPCOES.find(o => o.key === k)?.label || k).join(', ')
    : 'Nenhuma')

  tituloSecao('Aderência e potencial')
  linha('Aderência', opcaoLabel('aderencia', relatorio.aderencia))
  linha('Estimativa de custo mensal', opcaoLabel('custo_mensal_estimado', relatorio.custo_mensal_estimado))

  tituloSecao('Comentários')
  linha('', relatorio.comentarios || relatorio.descricao_geral || '-')

  if (relatorio.fotos && relatorio.fotos.length > 0) {
    doc.addPage()
    y = 20
    tituloSecao(`Fotos da visita (${relatorio.fotos.length})`)
    let x = 14
    const largura = 85
    const altura = 60
    let coluna = 0
    for (const url of relatorio.fotos) {
      try {
        const base64 = await imagemParaBase64(url)
        if (y + altura > 280) { doc.addPage(); y = 20; x = 14; coluna = 0 }
        doc.addImage(base64, 'JPEG', x, y, largura, altura)
        if (coluna === 0) {
          x = 14 + largura + 6
          coluna = 1
        } else {
          x = 14
          coluna = 0
          y += altura + 6
        }
      } catch (e) {
        console.error('Não deu pra incluir uma foto no PDF:', e)
      }
    }
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
