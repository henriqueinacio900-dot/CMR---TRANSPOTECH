import { useEffect, useState } from 'react'
import { listarRelatoriosVisita, buscarRelatorioPorAtividade, salvarRelatorioVisita, uploadFotoRelatorio } from './api'
import { TEMA } from './theme'
import PciForm from './PciForm.jsx'

const PERFIS_CONTATO = [
  { key: 'decisor', label: 'Decisor' },
  { key: 'influenciador', label: 'Influenciador' },
  { key: 'tecnico', label: 'Técnico' },
  { key: 'usuario', label: 'Usuário' },
]

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
    if (abrirParaAtividade) {
      abrirFormulario(abrirParaAtividade)
    }
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
      <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>Relatórios de visita</p>
      <p style={{ fontSize: 12, color: TEMA.textoSecundario, margin: '0 0 16px' }}>
        Preenchidos a partir das visitas agendadas na aba Atividades.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {relatorios.map(r => (
          <div
            key={r.id}
            onClick={() => { setRelatorioAtual(r); setModo('ver') }}
            style={{ background: TEMA.card, border: `1px solid ${TEMA.borda}`, borderRadius: 10, padding: 12, cursor: 'pointer' }}
          >
            <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: TEMA.textoPrincipal }}>
              {r.empresa || r.negocio?.cliente?.razao_social}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: TEMA.textoSecundario }}>
              {r.cidade} · {r.consultor?.nome} · {r.data_visita ? new Date(r.data_visita + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
            </p>
          </div>
        ))}
        {relatorios.length === 0 && <p style={{ color: TEMA.textoDiscreto, fontSize: 13 }}>Nenhum relatório preenchido ainda.</p>}
      </div>
    </div>
  )
}

function FormularioRelatorio({ relatorio, onSalvo, onCancelar }) {
  const [campos, setCampos] = useState({
    empresa: relatorio.empresa || '', cidade: relatorio.cidade || '', estado: relatorio.estado || '',
    data_visita: relatorio.data_visita || new Date().toISOString().slice(0, 10),
    contato_nome: relatorio.contato_nome || '', contato_cargo: relatorio.contato_cargo || '', perfil_contato: relatorio.perfil_contato || '',
    segmento: relatorio.segmento || '', tipo_operacao: relatorio.tipo_operacao || '', tipo_piso: relatorio.tipo_piso || '',
    tipo_produto: relatorio.tipo_produto || '', qtd_turnos: relatorio.qtd_turnos || '',
    qtd_maquinas_total: relatorio.qtd_maquinas_total ?? '', qtd_eletricas: relatorio.qtd_eletricas ?? '',
    qtd_glp: relatorio.qtd_glp ?? '', qtd_diesel: relatorio.qtd_diesel ?? '',
    qtd_classe_i: relatorio.qtd_classe_i ?? '', qtd_classe_ii: relatorio.qtd_classe_ii ?? '',
    qtd_classe_iii: relatorio.qtd_classe_iii ?? '', qtd_classe_iv: relatorio.qtd_classe_iv ?? '', qtd_classe_v: relatorio.qtd_classe_v ?? '',
    marcas_predominantes: relatorio.marcas_predominantes || '', idade_media_frota: relatorio.idade_media_frota || '',
    possui_manutencao_interna: relatorio.possui_manutencao_interna || '', qtd_tecnicos_internos: relatorio.qtd_tecnicos_internos || '',
    consumo_pecas: relatorio.consumo_pecas || '', consumo_pneus: relatorio.consumo_pneus || '', consumo_baterias: relatorio.consumo_baterias || '',
    modelo_baterias: relatorio.modelo_baterias || '', principais_dores: relatorio.principais_dores || '',
    existe_projeto_futuro: relatorio.existe_projeto_futuro || '', tipo_projeto: relatorio.tipo_projeto || '',
    prazo_estimado: relatorio.prazo_estimado || '', oportunidades_identificadas: relatorio.oportunidades_identificadas || '',
    descricao_geral: relatorio.descricao_geral || '',
  })
  const [fotos, setFotos] = useState(relatorio.fotos || [])
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const [erroFoto, setErroFoto] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [salvo, setSalvo] = useState(false)

  function set(campo, valor) { setCampos({ ...campos, [campo]: valor }) }

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
        const url = await uploadFotoRelatorio(arquivo)
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

  function removerFoto(url) {
    setFotos(f => f.filter(x => x !== url))
  }

  async function salvar() {
    setSalvando(true)
    setErro('')
    try {
      const dados = {
        ...campos,
        fotos,
        negocio_id: relatorio.negocio_id || null,
        atividade_id: relatorio.atividade_id || null,
        qtd_maquinas_total: campos.qtd_maquinas_total !== '' ? Number(campos.qtd_maquinas_total) : null,
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
    } catch (e) {
      setErro('Não deu pra salvar: ' + (e.message || 'erro desconhecido'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div style={{ padding: 24, color: TEMA.textoPrincipal, maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Relatório de visita comercial — PCI</p>
        <button onClick={onCancelar} style={{ background: 'none', border: 'none', color: TEMA.textoSecundario, fontSize: 13, cursor: 'pointer' }}>Fechar</button>
      </div>

      {salvo && (
        <div style={{ background: 'rgba(34,197,94,0.1)', border: `1px solid ${TEMA.verde}55`, borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <p style={{ color: TEMA.verde, fontSize: 13, margin: 0, fontWeight: 600 }}>✓ Relatório salvo com sucesso.</p>
        </div>
      )}

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
        <Campo label="Perfil do contato">
          <select value={campos.perfil_contato} onChange={e => set('perfil_contato', e.target.value)} style={inputStyle}>
            <option value="">-</option>
            {PERFIS_CONTATO.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </Campo>
      </Secao>

      <Secao titulo="3. Perfil da operação">
        <LinhaCampos>
          <Campo label="Segmento" style={{ flex: 1 }}><input value={campos.segmento} onChange={e => set('segmento', e.target.value)} style={inputStyle} /></Campo>
          <Campo label="Tipo de operação" style={{ flex: 1 }}><input value={campos.tipo_operacao} onChange={e => set('tipo_operacao', e.target.value)} style={inputStyle} /></Campo>
        </LinhaCampos>
        <LinhaCampos>
          <Campo label="Tipo de piso" style={{ flex: 1 }}><input value={campos.tipo_piso} onChange={e => set('tipo_piso', e.target.value)} style={inputStyle} /></Campo>
          <Campo label="Tipo de produto movimentado" style={{ flex: 1 }}><input value={campos.tipo_produto} onChange={e => set('tipo_produto', e.target.value)} style={inputStyle} /></Campo>
        </LinhaCampos>
        <Campo label="Quantidade de turnos"><input value={campos.qtd_turnos} onChange={e => set('qtd_turnos', e.target.value)} style={inputStyle} /></Campo>
      </Secao>

      <Secao titulo="4. Frota de empilhadeiras">
        <Campo label="Quantidade total de máquinas"><input type="number" value={campos.qtd_maquinas_total} onChange={e => set('qtd_maquinas_total', e.target.value)} style={inputStyle} /></Campo>
        <LinhaCampos>
          <Campo label="Elétricas" style={{ flex: 1 }}><input type="number" value={campos.qtd_eletricas} onChange={e => set('qtd_eletricas', e.target.value)} style={inputStyle} /></Campo>
          <Campo label="GLP" style={{ flex: 1 }}><input type="number" value={campos.qtd_glp} onChange={e => set('qtd_glp', e.target.value)} style={inputStyle} /></Campo>
          <Campo label="Diesel" style={{ flex: 1 }}><input type="number" value={campos.qtd_diesel} onChange={e => set('qtd_diesel', e.target.value)} style={inputStyle} /></Campo>
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
        <LinhaCampos>
          <Campo label="Marcas predominantes" style={{ flex: 1 }}><input value={campos.marcas_predominantes} onChange={e => set('marcas_predominantes', e.target.value)} style={inputStyle} /></Campo>
          <Campo label="Idade média da frota" style={{ flex: 1 }}><input value={campos.idade_media_frota} onChange={e => set('idade_media_frota', e.target.value)} style={inputStyle} /></Campo>
        </LinhaCampos>
      </Secao>

      <Secao titulo="5. Manutenção e consumo">
        <LinhaCampos>
          <Campo label="Possui manutenção interna?" style={{ flex: 1 }}><input value={campos.possui_manutencao_interna} onChange={e => set('possui_manutencao_interna', e.target.value)} style={inputStyle} /></Campo>
          <Campo label="Qtd. técnicos internos" style={{ flex: 1 }}><input value={campos.qtd_tecnicos_internos} onChange={e => set('qtd_tecnicos_internos', e.target.value)} style={inputStyle} /></Campo>
        </LinhaCampos>
        <LinhaCampos>
          <Campo label="Consumo de peças" style={{ flex: 1 }}><input value={campos.consumo_pecas} onChange={e => set('consumo_pecas', e.target.value)} style={inputStyle} /></Campo>
          <Campo label="Consumo de pneus" style={{ flex: 1 }}><input value={campos.consumo_pneus} onChange={e => set('consumo_pneus', e.target.value)} style={inputStyle} /></Campo>
          <Campo label="Consumo de baterias" style={{ flex: 1 }}><input value={campos.consumo_baterias} onChange={e => set('consumo_baterias', e.target.value)} style={inputStyle} /></Campo>
        </LinhaCampos>
        <Campo label="Modelo de bateria atual"><input value={campos.modelo_baterias} onChange={e => set('modelo_baterias', e.target.value)} style={inputStyle} /></Campo>
        <Campo label="Principais dores"><textarea rows={2} value={campos.principais_dores} onChange={e => set('principais_dores', e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} /></Campo>
      </Secao>

      <Secao titulo="6. Projetos futuros">
        <Campo label="Existe projeto futuro?"><input value={campos.existe_projeto_futuro} onChange={e => set('existe_projeto_futuro', e.target.value)} style={inputStyle} /></Campo>
        <LinhaCampos>
          <Campo label="Tipo de projeto" style={{ flex: 1 }}><input value={campos.tipo_projeto} onChange={e => set('tipo_projeto', e.target.value)} style={inputStyle} /></Campo>
          <Campo label="Prazo estimado" style={{ flex: 1 }}><input value={campos.prazo_estimado} onChange={e => set('prazo_estimado', e.target.value)} style={inputStyle} /></Campo>
        </LinhaCampos>
        <Campo label="Oportunidades identificadas"><textarea rows={2} value={campos.oportunidades_identificadas} onChange={e => set('oportunidades_identificadas', e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} /></Campo>
      </Secao>

      <Secao titulo="7. Descrição geral da visita">
        <textarea rows={4} value={campos.descricao_geral} onChange={e => set('descricao_geral', e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
      </Secao>

      <Secao titulo={`Fotos da visita (${fotos.length}/10)`}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8, marginBottom: 10 }}>
          {fotos.map(url => (
            <div key={url} style={{ position: 'relative' }}>
              <img src={url} alt="Foto da visita" style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 6, border: `1px solid ${TEMA.linhaInterna}` }} />
              <button
                type="button"
                onClick={() => removerFoto(url)}
                style={{
                  position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none',
                  borderRadius: '50%', width: 20, height: 20, fontSize: 11, cursor: 'pointer', lineHeight: '20px', padding: 0,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        {fotos.length < 10 && (
          <label style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)',
            border: `1px solid ${TEMA.linhaInterna}`, borderRadius: 8, padding: '9px 14px', fontSize: 13, cursor: 'pointer',
          }}>
            {enviandoFoto ? 'Enviando...' : '📷 Adicionar foto(s)'}
            <input type="file" accept="image/*" multiple capture="environment" onChange={adicionarFotos} disabled={enviandoFoto} style={{ display: 'none' }} />
          </label>
        )}
        {erroFoto && <p style={{ color: TEMA.vermelho, fontSize: 12, marginTop: 6 }}>{erroFoto}</p>}
      </Secao>

      {relatorio.negocio_id && (
        <Secao titulo="8. Score PCI — perfil de cliente ideal">
          <div style={{ background: '#fff', borderRadius: 10, padding: 14 }}>
            <PciForm negocioId={relatorio.negocio_id} />
          </div>
        </Secao>
      )}
      {!relatorio.negocio_id && (
        <p style={{ fontSize: 12, color: TEMA.textoDiscreto, marginBottom: 16 }}>
          Essa visita não está ligada a um negócio no pipeline, então não dá pra preencher o PCI aqui.
        </p>
      )}

      {erro && <p style={{ color: TEMA.vermelho, fontSize: 13 }}>{erro}</p>}
      <div style={{ display: 'flex', gap: 8, marginTop: 8, marginBottom: 40 }}>
        <button onClick={onCancelar} style={{ ...botao, background: 'rgba(255,255,255,0.06)', color: TEMA.textoPrincipal, border: `1px solid ${TEMA.linhaInterna}` }}>
          Voltar
        </button>
        <button onClick={salvar} disabled={salvando} style={{ ...botao, background: '#F77E01', color: '#fff' }}>
          {salvando ? 'Salvando...' : 'Salvar relatório'}
        </button>
      </div>
    </div>
  )
}

function VisualizarRelatorio({ relatorio, onFechar, onAbrirNegocio }) {
  return (
    <div style={{ padding: 24, color: TEMA.textoPrincipal, maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{relatorio.empresa}</p>
        <button onClick={onFechar} style={{ background: 'none', border: 'none', color: TEMA.textoSecundario, fontSize: 13, cursor: 'pointer' }}>Voltar</button>
      </div>

      <Bloco titulo="Dados da visita" itens={[
        ['Cidade/UF', `${relatorio.cidade || '-'} ${relatorio.estado ? '/' + relatorio.estado : ''}`],
        ['Data da visita', relatorio.data_visita ? new Date(relatorio.data_visita + 'T00:00:00').toLocaleDateString('pt-BR') : '-'],
        ['Consultor', relatorio.consultor?.nome || '-'],
      ]} />

      <Bloco titulo="Contato principal" itens={[
        ['Nome', relatorio.contato_nome || '-'],
        ['Cargo', relatorio.contato_cargo || '-'],
        ['Perfil', PERFIS_CONTATO.find(p => p.key === relatorio.perfil_contato)?.label || '-'],
      ]} />

      <Bloco titulo="Perfil da operação" itens={[
        ['Segmento', relatorio.segmento || '-'],
        ['Tipo de operação', relatorio.tipo_operacao || '-'],
        ['Tipo de piso', relatorio.tipo_piso || '-'],
        ['Produto movimentado', relatorio.tipo_produto || '-'],
        ['Turnos', relatorio.qtd_turnos || '-'],
      ]} />

      <Bloco titulo="Frota de empilhadeiras" itens={[
        ['Total de máquinas', relatorio.qtd_maquinas_total ?? '-'],
        ['Elétricas / GLP / Diesel', `${relatorio.qtd_eletricas ?? 0} / ${relatorio.qtd_glp ?? 0} / ${relatorio.qtd_diesel ?? 0}`],
        ['Classes I-V', `${relatorio.qtd_classe_i ?? 0} / ${relatorio.qtd_classe_ii ?? 0} / ${relatorio.qtd_classe_iii ?? 0} / ${relatorio.qtd_classe_iv ?? 0} / ${relatorio.qtd_classe_v ?? 0}`],
        ['Marcas predominantes', relatorio.marcas_predominantes || '-'],
        ['Idade média da frota', relatorio.idade_media_frota || '-'],
      ]} />

      <Bloco titulo="Manutenção e consumo" itens={[
        ['Manutenção interna', relatorio.possui_manutencao_interna || '-'],
        ['Técnicos internos', relatorio.qtd_tecnicos_internos || '-'],
        ['Consumo peças/pneus/baterias', `${relatorio.consumo_pecas || '-'} / ${relatorio.consumo_pneus || '-'} / ${relatorio.consumo_baterias || '-'}`],
        ['Modelo de bateria', relatorio.modelo_baterias || '-'],
        ['Principais dores', relatorio.principais_dores || '-'],
      ]} />

      <Bloco titulo="Projetos futuros" itens={[
        ['Existe projeto futuro?', relatorio.existe_projeto_futuro || '-'],
        ['Tipo de projeto', relatorio.tipo_projeto || '-'],
        ['Prazo estimado', relatorio.prazo_estimado || '-'],
        ['Oportunidades identificadas', relatorio.oportunidades_identificadas || '-'],
      ]} />

      <Bloco titulo="Descrição geral" itens={[[null, relatorio.descricao_geral || '-']]} />

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

      {relatorio.negocio_id && (
        <div style={{ marginTop: 16 }}>
          <Secao titulo="Score PCI">
            <div style={{ background: '#fff', borderRadius: 10, padding: 14 }}>
              <PciForm negocioId={relatorio.negocio_id} />
            </div>
          </Secao>
        </div>
      )}
    </div>
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
