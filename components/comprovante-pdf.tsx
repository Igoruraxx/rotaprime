'use client'

import { useState } from 'react'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

interface DadosComprovante {
  codigo: string
  status: string
  destinatario: string
  endereco_entrega: string
  data_entrega: string | null
  data_chegada: string
  data_limite_entrega: string
  descricao?: string | null
  quantidade?: number
  valor_pacote: number
  transportadora?: string | null
  nf_remessa?: string | null
  foto?: string | null
  gps_foto?: string | null
  entregador_nome?: string
  observacoes?: string | null
}

export default function BotaoComprovante({
  dados,
  className = '',
  children,
}: {
  dados: DadosComprovante
  className?: string
  children?: React.ReactNode
}) {
  const [gerando, setGerando] = useState(false)

  async function gerarPDF() {
    setGerando(true)
    try {
      const doc = new jsPDF('p', 'mm', 'a4')
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 15
      const contentWidth = pageWidth - margin * 2
      let y = margin

      // ── Cabeçalho ──
      doc.setFillColor(88, 28, 135) // roxo escuro
      doc.rect(0, 0, pageWidth, 35, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(22)
      doc.setFont('helvetica', 'bold')
      doc.text('Rota Prime', margin, 15)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('Sistema de Gestão de Entregas', margin, 22)

      doc.setFontSize(9)
      doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, margin, 29)

      // ── Título ──
      y = 45
      doc.setTextColor(88, 28, 135)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(`COMPROVANTE DE ENTREGA`, margin, y)
      y += 8

      doc.setDrawColor(88, 28, 135)
      doc.setLineWidth(0.5)
      doc.line(margin, y, pageWidth - margin, y)
      y += 8

      // ── Info do Pacote ──
      doc.setTextColor(50, 50, 50)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')

      const infoRows = [
        ['Código do Pacote', dados.codigo],
        ['Status', dados.status],
        ['Destinatário', dados.destinatario],
        ['Endereço', dados.endereco_entrega],
        ['Data de Chegada', dados.data_chegada ? new Date(dados.data_chegada).toLocaleDateString('pt-BR') : '—'],
        ['Data Limite', dados.data_limite_entrega ? new Date(dados.data_limite_entrega).toLocaleDateString('pt-BR') : '—'],
        ['Data de Entrega', dados.data_entrega ? new Date(dados.data_entrega).toLocaleDateString('pt-BR') : '—'],
        ['Descrição', dados.descricao || '—'],
        ['Quantidade', String(dados.quantidade || '—')],
        ['Transportadora', dados.transportadora || '—'],
        ['NF / Remessa', dados.nf_remessa || '—'],
        ['Valor', `R$ ${Number(dados.valor_pacote).toFixed(2)}`],
        ['Entregador', dados.entregador_nome || '—'],
      ]

      ;(doc as any).autoTable({
        startY: y,
        head: [['Campo', 'Valor']],
        body: infoRows,
        theme: 'grid',
        headStyles: {
          fillColor: [88, 28, 135],
          textColor: 255,
          fontSize: 9,
          fontStyle: 'bold',
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [50, 50, 50],
        },
        alternateRowStyles: {
          fillColor: [245, 245, 250],
        },
        columnStyles: {
          0: { cellWidth: 45, fontStyle: 'bold', textColor: [100, 100, 100] },
          1: { cellWidth: 'auto' },
        },
        margin: { left: margin, right: margin },
        tableWidth: contentWidth,
      })

      y = (doc as any).lastAutoTable.finalY + 10

      // ── Seção: Observações ──
      if (dados.observacoes) {
        doc.setFillColor(255, 245, 240)
        doc.rect(margin, y, contentWidth, 20, 'F')

        doc.setTextColor(200, 80, 30)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text('📝 Observações:', margin + 3, y + 6)

        doc.setTextColor(80, 80, 80)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.text(dados.observacoes, margin + 3, y + 14)

        y += 28
      }

      // ── Seção: GPS ──
      if (dados.gps_foto) {
        doc.setFillColor(240, 248, 255)
        doc.rect(margin, y, contentWidth, 16, 'F')

        doc.setTextColor(30, 100, 180)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text('📍 Localização (GPS):', margin + 3, y + 6)

        doc.setTextColor(60, 60, 60)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(dados.gps_foto, margin + 3, y + 13)

        y += 22
      }

      // ── Seção: Foto ──
      if (dados.foto) {
        try {
          // Tenta carregar a imagem via canvas
          const img = await loadImage(dados.foto)
          const maxW = contentWidth
          const maxH = 70
          let imgW = img.width
          let imgH = img.height
          const ratio = Math.min(maxW / imgW, maxH / imgH, 1)
          imgW = imgW * ratio
          imgH = imgH * ratio

          const xOffset = margin + (contentWidth - imgW) / 2

          doc.setFillColor(245, 245, 245)
          doc.rect(margin, y, contentWidth, imgH + 8, 'F')

          doc.setTextColor(100, 100, 100)
          doc.setFontSize(8)
          doc.setFont('helvetica', 'bold')
          doc.text('📸 Foto da Entrega', margin + 3, y + 4)

          doc.addImage(img, 'JPEG', xOffset, y + 8, imgW, imgH)
          y += imgH + 16
        } catch {
          y += 6
        }
      }

      // ── Linha de Assinatura ──
      y = Math.max(y + 10, 240)
      doc.setDrawColor(180, 180, 180)
      doc.setLineWidth(0.5)
      doc.line(margin, y, pageWidth - margin, y)
      y += 5
      doc.setTextColor(120, 120, 120)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('Assinatura do Recebedor', margin, y + 2)
      y += 10

      doc.line(margin, y, pageWidth / 2 - 10, y)
      doc.setTextColor(120, 120, 120)
      doc.setFontSize(8)
      doc.text('Nome / Assinatura', margin, y + 5)

      // ── Rodapé ──
      const footerY = doc.internal.pageSize.getHeight() - 15
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.3)
      doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3)

      doc.setTextColor(150, 150, 150)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text('Rota Prime - Sistema de Gestão de Entregas', margin, footerY)
      doc.text(`Página 1`, pageWidth - margin, footerY, { align: 'right' })

      // ── Salvar ──
      doc.save(`comprovante-${dados.codigo}.pdf`)
    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
      alert('Erro ao gerar comprovante. Tente novamente.')
    } finally {
      setGerando(false)
    }
  }

  return (
    <button
      onClick={gerarPDF}
      disabled={gerando}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {gerando ? (
        <>
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Gerando...
        </>
      ) : (
        children || (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            Comprovante PDF
          </>
        )
      )}
    </button>
  )
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
