"use client";

import jsPDF from 'jspdf';
import type { GenerateFinancialReportOutput } from '@/ai/flows/generate-financial-report';

export function generateReportPDF(report: GenerateFinancialReportOutput): Blob {
  const doc = new jsPDF();
  
  const primaryBlue = '#3b82f6';
  const darkGray = '#1f2937';
  const mediumGray = '#6b7280';
  const lightGray = '#f3f4f6';
  
  let yPosition = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const leftMargin = 20;
  const rightMargin = pageWidth - 20;
  const contentWidth = rightMargin - leftMargin;
  
  // ========== HEADER ==========
  // Logo/Brand
  doc.setFillColor(59, 130, 246); // Azul
  doc.rect(leftMargin, yPosition, 10, 10, 'F');
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGray);
  doc.text('ZONA FISCAL', leftMargin + 15, yPosition + 7);
  
  // Data
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mediumGray);
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.text(`Gerado em ${today}`, rightMargin, yPosition + 7, { align: 'right' });
  
  yPosition += 15;
  
  // Linha separadora
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(1);
  doc.line(leftMargin, yPosition, rightMargin, yPosition);
  
  yPosition += 10;
  
  // Título do relatório
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGray);
  doc.text(report.title, leftMargin, yPosition);
  
  yPosition += 6;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(mediumGray);
  doc.text('Análise inteligente das suas finanças', leftMargin, yPosition);
  
  yPosition += 15;
  
  // ========== RESUMO EXECUTIVO ==========
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryBlue);
  doc.setFillColor(239, 246, 255); // Azul claríssimo
  doc.rect(leftMargin, yPosition - 4, contentWidth, 8, 'F');
  doc.text('RESUMO EXECUTIVO', leftMargin + 2, yPosition + 1);
  
  yPosition += 10;
  
  // Box do resumo
  doc.setFillColor(249, 250, 251); // Cinza claro
  doc.rect(leftMargin, yPosition, contentWidth, 20, 'F');
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(2);
  doc.line(leftMargin, yPosition, leftMargin, yPosition + 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkGray);
  const summaryLines = doc.splitTextToSize(report.summary, contentWidth - 10);
  doc.text(summaryLines, leftMargin + 5, yPosition + 5);
  
  yPosition += 25;
  
  // ========== INDICADORES FINANCEIROS ==========
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryBlue);
  doc.setFillColor(239, 246, 255);
  doc.rect(leftMargin, yPosition - 4, contentWidth, 8, 'F');
  doc.text('INDICADORES FINANCEIROS', leftMargin + 2, yPosition + 1);
  
  yPosition += 12;
  
  // KPIs em cards
  const kpiWidth = (contentWidth - 9) / 4; // 4 cards com espaços
  const kpis = [
    { label: 'RECEITAS', value: report.totalIncome, color: [34, 197, 94] }, // Verde mais vibrante
    { label: 'DESPESAS', value: report.totalExpenses, color: [239, 68, 68] }, // Vermelho
    { label: 'LUCRO PJ', value: report.businessProfit, color: [59, 130, 246] }, // Azul
    { label: 'GASTOS PF', value: report.personalSpending, color: [168, 85, 247] }, // Roxo mais vibrante
  ];
  
  kpis.forEach((kpi, index) => {
    const xPos = leftMargin + (index * (kpiWidth + 3));
    
    // Card background
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.rect(xPos, yPosition, kpiWidth, 18, 'FD');
    
    // Label
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(kpi.label, xPos + kpiWidth / 2, yPosition + 5, { align: 'center' });
    
    // Valor
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    const formattedValue = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(kpi.value);
    doc.text(formattedValue, xPos + kpiWidth / 2, yPosition + 13, { align: 'center' });
  });
  
  yPosition += 25;
  
  // ========== ANÁLISE DETALHADA ==========
  if (report.reportDetails) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryBlue);
    doc.setFillColor(239, 246, 255);
    doc.rect(leftMargin, yPosition - 4, contentWidth, 8, 'F');
    doc.text('ANÁLISE DETALHADA', leftMargin + 2, yPosition + 1);
    
    yPosition += 12;
    
    // Processar e renderizar o texto (sem Markdown por enquanto, apenas texto)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGray);
    
    // Processar o texto de forma mais robusta
    let cleanText = report.reportDetails
      // Primeiro, normalizar quebras de linha
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Limpar caracteres problemáticos
      .replace(/[^\x00-\x7F]/g, ' ')
      // Processar markdown
      .replace(/### /g, '\n\n### ')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/^\d+\.\s+/gm, '\n• ')
      .replace(/^-\s+/gm, '\n• ')
      .replace(/^#+\s+/gm, '')
      // Limpar espaços e quebras excessivas
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();
    
    // Dividir em seções por ### de forma mais precisa
    const rawSections = cleanText.split(/###/);
    const sections = rawSections.map(section => section.trim()).filter(s => s.length > 0);
    
    sections.forEach((section, index) => {
      // Verificar se cabe na página
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Dividir em linhas e processar
      const lines = section.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length === 0) return;
      
      // Primeira linha é título se não contém pontuação no final e é curta
      const firstLine = lines[0];
      const isTitle = firstLine.length < 60 && !firstLine.match(/[.!?]$/) && lines.length > 1;
      
      if (isTitle) {
        // Renderizar título da seção
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryBlue);
        doc.text(firstLine.toUpperCase(), leftMargin, yPosition);
        yPosition += 10;
        
        // Processar conteúdo da seção
        const contentLines = lines.slice(1);
        const fullContent = contentLines.join(' ').trim();
        
        if (fullContent) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(55, 65, 81);
          const wrappedLines = doc.splitTextToSize(fullContent, contentWidth);
          doc.text(wrappedLines, leftMargin, yPosition);
          yPosition += (wrappedLines.length * 4) + 10;
        }
      } else {
        // Processar como parágrafo normal
        const fullContent = lines.join(' ').trim();
        if (fullContent) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(55, 65, 81);
          const wrappedLines = doc.splitTextToSize(fullContent, contentWidth);
          doc.text(wrappedLines, leftMargin, yPosition);
          yPosition += (wrappedLines.length * 4) + 8;
        }
      }
    });
  }
  
  // ========== FOOTER ==========
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Linha superior
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.line(leftMargin, 280, rightMargin, 280);
    
    // Texto
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(156, 163, 175);
    doc.text(
      'Este relatório foi gerado por Inteligência Artificial e deve ser usado como ferramenta de análise.',
      pageWidth / 2,
      285,
      { align: 'center' }
    );
    
    // Brand
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(59, 130, 246);
    doc.text('ZONA FISCAL', pageWidth / 2, 290, { align: 'center' });
  }
  
  return doc.output('blob');
}

