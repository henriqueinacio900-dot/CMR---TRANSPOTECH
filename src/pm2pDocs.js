import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { IMG_LOGO_TRANSPOTECH, IMG_CAPA_PM2P, IMG_FOTO_TECNICO } from './pdfAssets'
import { dataExtensa, textoDiarias, textoDias } from './pm2pCalc'

// Documentos da Proposta PM2P, no formato do modelo enviado (4 páginas):
// capa, escopo técnico, investimento e tarifas, aceite com assinaturas.

const LARANJA = [247, 126, 1]
const GRAFITE = [34, 34, 34]
const CINZA = [110, 110, 110]
const CINZA_CLARO = [243, 243, 243]

const brl = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const tarifa = (v, un) => `${brl(v)}/${un}`
const nomeArquivo = (cliente, ext) =>
  `Proposta-PM2P-${String(cliente || 'cliente').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')}.${ext}`

function linhasProposta(d) {
  return {
    cliente: d.cliente || '',
    local: [d.cidade, d.estado].filter(Boolean).join(' – '),
    diarias: textoDiarias(d.diariasSemana),
    tecnicos: `${d.tecnicos} técnico${Number(d.tecnicos) === 1 ? '' : 's'}`,
    meses: `${d.validadeMeses} meses`,
    dias: textoDias(d.dias),
    data: dataExtensa(d.data ? new Date(d.data) : new Date()),
    faixas: [
      ['Segunda a sexta, das 8h às 18h', tarifa(d.horaComercial, 'h')],
      ['Segunda a sexta, das 18h às 22h, e sábados, das 8h às 12h', tarifa(d.horaExtra, 'h')],
      ['Domingos, feriados e demais horários', tarifa(d.horaEspecial, 'h')],
      ['Deslocamento excedente', tarifa(d.kmExcedente, 'km')],
    ],
  }
}

export function gerarPdfProposta(d) {
  const L = linhasProposta(d)
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const W = 297, H = 210, X = 32, XF = W - 22

  function moldura(secao, pagina) {
    doc.setFillColor(...LARANJA)
    doc.triangle(0, 0, 22, 0, 0, H, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...CINZA)
    doc.text(`PM2P  /  ${secao}`, X, 14)
    doc.addImage(IMG_LOGO_TRANSPOTECH, 'PNG', XF - 42, 7, 42, 10.9)
    doc.setDrawColor(215, 215, 215); doc.setLineWidth(0.2); doc.line(X, 21, XF, 21)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7)
    doc.text('www.transpotech.com.br', X, 200)
    doc.setFont('helvetica', 'bold'); doc.text(`${String(pagina).padStart(2, '0')} / 04`, XF, 200, { align: 'right' })
  }
  const titulo = (t, sub, y = 40) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(24); doc.setTextColor(...GRAFITE); doc.text(t, X, y)
    if (sub) { doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...CINZA); doc.text(sub, X, y + 8) }
  }

  // ---- 1) Capa ----
  moldura(`PROPOSTA PARA ${L.cliente.toUpperCase()}`, 1)
  doc.addImage(IMG_CAPA_PM2P, 'PNG', X, 30, 38, 47.2)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(28); doc.setTextColor(...GRAFITE)
  doc.text('Proposta técnica e comercial', X, 100)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(13); doc.setTextColor(...CINZA)
  doc.text('Programa de Manutenção Produtiva Programável', X, 109)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...GRAFITE)
  doc.text(`${L.cliente}${L.local ? `  |  ${L.local}` : ''}`, X, 124)
  const caixas = [
    [`${L.diarias} por semana`, 'Programação semanal'],
    [L.meses, 'Vigência contratual'],
    [L.tecnicos, 'Manutenção especializada'],
  ]
  const largura = (XF - X - 12) / 3
  caixas.forEach(([t, s], i) => {
    const x = X + i * (largura + 6)
    doc.setFillColor(...CINZA_CLARO); doc.rect(x, 138, largura, 26, 'F')
    doc.setFillColor(...LARANJA); doc.rect(x, 138, largura, 0.9, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...GRAFITE); doc.text(t, x + 4, 150)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...CINZA); doc.text(s, x + 4, 158)
  })
  doc.setFontSize(8); doc.text(L.data, X, 186)
  if (d.numero) doc.text(`Proposta ${d.numero}`, XF, 186, { align: 'right' })

  // ---- 2) Escopo técnico ----
  doc.addPage(); moldura('ESCOPO TÉCNICO', 2)
  titulo('Como será o atendimento', 'Visitas programadas mensalmente com técnico especializado.')
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...CINZA)
  doc.text(`Escopo desta proposta: ${d.maquinas} máquina${Number(d.maquinas) === 1 ? '' : 's'} · ${L.diarias} por semana (${L.dias}) · ${L.tecnicos}.`, X, 56)
  const itens = [
    ['Inspeção e diagnóstico', 'Aplicação de checklist para identificar defeitos, vazamentos e sinais de falhas futuras.'],
    ['Manutenção programada', 'Execução do checklist preventivo conforme o horímetro, com limpeza, lubrificação, aplicação de graxa e testes.'],
    ['Correções e carregadores', 'Correção dos defeitos identificados durante a intervenção e análise dos carregadores no local.'],
  ]
  itens.forEach(([t, s], i) => {
    const y = 72 + i * 28
    doc.setFillColor(...LARANJA); doc.rect(X, y - 5, 1.1, 18, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...GRAFITE); doc.text(t, X + 5, y)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...CINZA)
    doc.text(doc.splitTextToSize(s, 120), X + 5, y + 6)
  })
  doc.addImage(IMG_FOTO_TECNICO, 'JPEG', XF - 52, 34, 52, 87)
  doc.setFillColor(...CINZA_CLARO); doc.rect(X, 160, XF - X, 22, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...GRAFITE); doc.text('Gestão do contrato', X + 5, 170)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...CINZA)
  doc.text('Um consultor administrativo acompanha a gestão do contrato.', X + 5, 177)

  // ---- 3) Investimento e tarifas ----
  doc.addPage(); moldura('CONDIÇÕES COMERCIAIS', 3)
  titulo('Investimento e tarifas',
    `Plano mensal com ${L.diarias} por semana, vigência de ${L.meses} e ${L.tecnicos} especializado${Number(d.tecnicos) === 1 ? '' : 's'}.`)
  doc.setFillColor(...CINZA_CLARO); doc.rect(X, 58, XF - X, 22, 'F')
  doc.setFillColor(...LARANJA); doc.rect(X, 58, 1.1, 22, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...GRAFITE); doc.text('Investimento mensal', X + 6, 66)
  doc.setFontSize(18); doc.text(brl(d.investimentoMensal), X + 6, 75)
  doc.setFontSize(11); doc.text('Atendimentos e deslocamentos excedentes', X, 95)
  autoTable(doc, {
    startY: 100, margin: { left: X, right: 22 },
    head: [['Faixa de atendimento', 'Tarifa']], body: L.faixas,
    theme: 'plain',
    headStyles: { fillColor: GRAFITE, textColor: 255, fontStyle: 'bold', fontSize: 9, cellPadding: 3.5 },
    bodyStyles: { fontSize: 9, textColor: [70, 70, 70], cellPadding: 4 },
    alternateRowStyles: { fillColor: CINZA_CLARO },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold', textColor: GRAFITE, cellWidth: 45 } },
  })

  // ---- 4) Aceite e assinaturas ----
  doc.addPage(); moldura('FORMALIZAÇÃO', 4)
  titulo('Aceite da proposta', `${L.cliente}${L.local ? `  |  ${L.local}` : ''}`)
  doc.setFillColor(...CINZA_CLARO); doc.rect(X, 56, XF - X, 16, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...GRAFITE); doc.text('Aceite das condições técnicas e comerciais.', X + 5, 63)
  doc.setFont('helvetica', 'normal'); doc.setTextColor(...CINZA)
  doc.text('Declaro estar de acordo com a proposta técnica e comercial do PM2P.', X + 5, 69)

  const colW = (XF - X - 14) / 2
  const bloco = (x, tituloBloco, campos) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...GRAFITE); doc.text(tituloBloco, x, 88)
    campos.forEach(([rotulo, valor], i) => {
      const y = 112 + i * 20
      if (valor) { doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...GRAFITE); doc.text(valor, x, y - 2) }
      doc.setDrawColor(120, 120, 120); doc.setLineWidth(0.25); doc.line(x, y, x + colW, y)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...CINZA); doc.text(rotulo, x, y + 4.5)
    })
  }
  bloco(X, 'TRANSPOTECH', [['Assinatura', ''], ['Nome (vendedor)', d.vendedor || ''], ['Data', '']])
  bloco(X + colW + 14, L.cliente.toUpperCase(), [['Assinatura', ''], ['Nome', ''], ['Departamento', ''], ['Data', '']])

  doc.save(nomeArquivo(d.cliente, 'pdf'))
}

// Word editável: arquivo .doc em HTML (abre direto no Word), com os mesmos campos do PDF.
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function gerarWordProposta(d) {
  const L = linhasProposta(d)
  const linhaAss = rot => `<p style="margin:26pt 0 0 0;border-bottom:1px solid #666;width:100%">&nbsp;</p><p style="font-size:8pt;color:#777;margin:2pt 0 0 0">${rot}</p>`
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>Proposta PM2P</title>
<style>
 @page { size: 29.7cm 21cm; margin: 1.8cm 2cm; mso-page-orientation: landscape; }
 body { font-family: Calibri, Arial, sans-serif; color: #222; }
 h1 { font-size: 26pt; margin: 0 0 4pt 0; } h2 { font-size: 20pt; margin: 0 0 4pt 0; }
 .lar { color: #F77E01; font-weight: bold; } .sub { color: #666; font-size: 11pt; }
 table { border-collapse: collapse; width: 100%; } td, th { padding: 7pt 9pt; font-size: 10pt; }
 th { background: #222; color: #fff; text-align: left; } tr.alt td { background: #f3f3f3; }
 .caixa { background: #f3f3f3; border-left: 4pt solid #F77E01; padding: 8pt 12pt; }
</style></head><body>
<p class="lar" style="font-size:9pt">TRANSPOTECH — PM2P / PROPOSTA PARA ${esc(L.cliente.toUpperCase())}</p>
<h1>Proposta técnica e comercial</h1>
<p class="sub">Programa de Manutenção Produtiva Programável</p>
<p style="font-size:12pt"><b>${esc(L.cliente)}${L.local ? ` | ${esc(L.local)}` : ''}</b></p>
<table><tr>
 <td class="caixa"><b style="font-size:14pt">${esc(L.diarias)} por semana</b><br><span class="sub">Programação semanal</span></td>
 <td class="caixa"><b style="font-size:14pt">${esc(L.meses)}</b><br><span class="sub">Vigência contratual</span></td>
 <td class="caixa"><b style="font-size:14pt">${esc(L.tecnicos)}</b><br><span class="sub">Manutenção especializada</span></td>
</tr></table>
<p class="sub">${esc(L.data)}${d.numero ? ` — Proposta ${esc(d.numero)}` : ''}</p>
<br clear="all" style="page-break-before:always">

<h2>Como será o atendimento</h2>
<p class="sub">Visitas programadas mensalmente com técnico especializado.</p>
<p>Escopo desta proposta: <b>${esc(d.maquinas)} máquina(s)</b> · ${esc(L.diarias)} por semana (${esc(L.dias)}) · ${esc(L.tecnicos)}.</p>
<p><b>Inspeção e diagnóstico</b><br>Aplicação de checklist para identificar defeitos, vazamentos e sinais de falhas futuras.</p>
<p><b>Manutenção programada</b><br>Execução do checklist preventivo conforme o horímetro, com limpeza, lubrificação, aplicação de graxa e testes.</p>
<p><b>Correções e carregadores</b><br>Correção dos defeitos identificados durante a intervenção e análise dos carregadores no local.</p>
<p class="caixa"><b>Gestão do contrato</b><br>Um consultor administrativo acompanha a gestão do contrato.</p>
<br clear="all" style="page-break-before:always">

<h2>Investimento e tarifas</h2>
<p class="sub">Plano mensal com ${esc(L.diarias)} por semana, vigência de ${esc(L.meses)} e ${esc(L.tecnicos)} especializado${Number(d.tecnicos) === 1 ? '' : 's'}.</p>
<p class="caixa"><b>Investimento mensal</b><br><b style="font-size:18pt">${esc(brl(d.investimentoMensal))}</b></p>
<p><b>Atendimentos e deslocamentos excedentes</b></p>
<table><tr><th>Faixa de atendimento</th><th style="text-align:right">Tarifa</th></tr>
${L.faixas.map(([f, t], i) => `<tr class="${i % 2 ? '' : 'alt'}"><td>${esc(f)}</td><td style="text-align:right"><b>${esc(t)}</b></td></tr>`).join('')}
</table>
<br clear="all" style="page-break-before:always">

<h2>Aceite da proposta</h2>
<p class="sub">${esc(L.cliente)}${L.local ? ` | ${esc(L.local)}` : ''}</p>
<p class="caixa"><b>Aceite das condições técnicas e comerciais.</b><br>Declaro estar de acordo com a proposta técnica e comercial do PM2P.</p>
<table><tr>
<td style="width:48%;vertical-align:top"><p><b>TRANSPOTECH</b></p>${linhaAss('Assinatura')}<p style="margin:26pt 0 0 0">${esc(d.vendedor || '')}</p><p style="border-top:1px solid #666;font-size:8pt;color:#777;margin:0">Nome (vendedor)</p>${linhaAss('Data')}</td>
<td style="width:4%"></td>
<td style="width:48%;vertical-align:top"><p><b>${esc(L.cliente.toUpperCase())}</b></p>${linhaAss('Assinatura')}${linhaAss('Nome')}${linhaAss('Departamento')}${linhaAss('Data')}</td>
</tr></table>
</body></html>`
  const blob = new Blob(['﻿', html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = nomeArquivo(d.cliente, 'doc')
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}