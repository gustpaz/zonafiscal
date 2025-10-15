"use client";

import jsPDF from 'jspdf';
import type { GenerateFinancialReportOutput } from '@/ai/flows/generate-financial-report';
import { getLogoBase64 } from './logo-utils';

export async function generateSimpleReportPDF(report: GenerateFinancialReportOutput): Promise<Blob> {
  const doc = new jsPDF();
  
  const primaryBlue = '#3b82f6';
  const darkGray = '#1f2937';
  const mediumGray = '#6b7280';
  const lightGray = '#f3f4f6';
  
  let yPosition = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const leftMargin = 25; // Margem maior
  const rightMargin = pageWidth - 25; // Margem maior
  const contentWidth = rightMargin - leftMargin;
  
  // ========== HEADER ==========
  // Carregar logo real do sistema
  try {
    console.log('Carregando logo para header...');
    const logoBase64 = await getLogoBase64();
    console.log('Logo carregado com sucesso, adicionando ao PDF...');
    doc.addImage(logoBase64, 'PNG', leftMargin, yPosition, 12, 12);
    console.log('Logo adicionado ao header ✓');
    
    // Nome da marca
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkGray);
    doc.text('ZONA FISCAL', leftMargin + 18, yPosition + 9);
  } catch (error) {
    console.warn('Erro ao carregar logo, usando fallback:', error);
    // Fallback: quadrado azul com "ZF"
    doc.setFillColor(59, 130, 246);
    doc.rect(leftMargin, yPosition, 12, 12, 'F');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('ZF', leftMargin + 3, yPosition + 8);
    
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkGray);
    doc.text('ZONA FISCAL', leftMargin + 18, yPosition + 9);
  }
  
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
  
  // Título do relatório (adaptativo)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGray);
  
  // Verificar se o título cabe em uma linha
  const titleLines = doc.splitTextToSize(report.title, contentWidth);
  doc.text(titleLines, leftMargin, yPosition);
  
  yPosition += (titleLines.length * 6) + 4;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(mediumGray);
  doc.text('Análise inteligente das suas finanças', leftMargin, yPosition);
  
  yPosition += 15;
  
  // ========== RESUMO EXECUTIVO ==========
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryBlue);
  doc.setFillColor(239, 246, 255);
  doc.rect(leftMargin, yPosition - 4, contentWidth, 8, 'F');
  doc.text('RESUMO EXECUTIVO', leftMargin + 2, yPosition + 1);
  
  yPosition += 10;
  
  // Calcular altura necessária para o resumo
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const summaryLines = doc.splitTextToSize(report.summary, contentWidth - 10);
  const summaryHeight = Math.max(20, (summaryLines.length * 4) + 10);
  
  // Box do resumo com altura dinâmica
  doc.setFillColor(249, 250, 251);
  doc.rect(leftMargin, yPosition, contentWidth, summaryHeight, 'F');
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(2);
  doc.line(leftMargin, yPosition, leftMargin, yPosition + summaryHeight);
  
  doc.setTextColor(darkGray);
  doc.text(summaryLines, leftMargin + 5, yPosition + 5);
  
  yPosition += summaryHeight + 5;
  
  // ========== INDICADORES FINANCEIROS ==========
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryBlue);
  doc.setFillColor(239, 246, 255);
  doc.rect(leftMargin, yPosition - 4, contentWidth, 8, 'F');
  doc.text('INDICADORES FINANCEIROS', leftMargin + 2, yPosition + 1);
  
  yPosition += 12;
  
  // KPIs em cards
  const kpiWidth = (contentWidth - 9) / 4;
  const kpis = [
    { label: 'RECEITAS', value: report.totalIncome, color: [34, 197, 94] },
    { label: 'DESPESAS', value: report.totalExpenses, color: [239, 68, 68] },
    { label: 'LUCRO PJ', value: report.businessProfit, color: [59, 130, 246] },
    { label: 'GASTOS PF', value: report.personalSpending, color: [168, 85, 247] },
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
    
    // Processar texto de forma muito simples
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);
    
    // LIMPEZA MUITO AGRESSIVA - Remover TODOS os caracteres problemáticos
    let cleanText = report.reportDetails
      // REMOVER TODOS os caracteres estranhos primeiro
      .replace(/[Ø=Ü°¸Ê¡¢£¤¥¦§¨©ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ]/g, '')
      // Limpar sequências específicas problemáticas
      .replace(/Ø=Ü[°¸Ê¡]/g, '\n\n')
      .replace(/Ø=Ü/g, '\n\n')
      // Adicionar quebras antes de títulos conhecidos
      .replace(/(Entradas|Saídas|Visão Geral|Dicas do Zona Fiscal)/g, '\n\n$1')
      // Limpar markdown
      .replace(/### /g, '\n\n')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      // Corrigir caracteres quebrados específicos
      .replace(/per odo/g, 'período')
      .replace(/n o/g, 'não')
      .replace(/neg cio/g, 'negócio')
      .replace(/l quido/g, 'líquido')
      .replace(/v rias/g, 'várias')
      .replace(/gen ricas/g, 'genéricas')
      .replace(/otimiza o/g, 'otimização')
      .replace(/espec fico/g, 'específico')
      .replace(/Licen a/g, 'Licença')
      .replace(/Servi os/g, 'Serviços')
      .replace(/acion veis/g, 'acionáveis')
      .replace(/empr stimos/g, 'empréstimos')
      .replace(/finan as/g, 'finanças')
      .replace(/rela o/g, 'relação')
      .replace(/poss vel/g, 'possível')
      .replace(/sustent vel/g, 'sustentável')
      // Corrigir palavras juntas
      .replace(/ENTRADASNO/g, 'ENTRADAS\n\nNO')
      .replace(/SAÍDASSEUS/g, 'SAÍDAS\n\nSEUS')
      .replace(/VISÃO GERALNESTE/g, 'VISÃO GERAL\n\nNESTE')
      .replace(/DICAS DO ZONA FISCAL1/g, 'DICAS DO ZONA FISCAL\n\n1')
      // Normalizar espaços e quebras
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();
    
    // Dividir em parágrafos simples
    const paragraphs = cleanText.split('\n\n').filter(p => p.trim().length > 0);
    
    paragraphs.forEach((paragraph) => {
      // Verificar se cabe na página (com margem maior)
      if (yPosition > 220) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Verificar se é título (palavras-chave conhecidas ou linha curta)
      const trimmedPara = paragraph.trim();
      const knownTitles = ['Entradas', 'Saídas', 'Visão Geral', 'Dicas do Zona Fiscal'];
      const isKnownTitle = knownTitles.some(title => trimmedPara.toLowerCase().startsWith(title.toLowerCase()));
      const isShortTitle = trimmedPara.length < 80 && !trimmedPara.match(/[.!?]$/) && trimmedPara.length > 0 && !trimmedPara.includes(',');
      const isTitle = isKnownTitle || isShortTitle;
      
      if (isTitle) {
        // Renderizar como título com quebra de linha se necessário
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryBlue);
        
        // Verificar se o título cabe em uma linha
        const titleLines = doc.splitTextToSize(trimmedPara.toUpperCase(), contentWidth);
        doc.text(titleLines, leftMargin, yPosition);
        yPosition += (titleLines.length * 5) + 8; // Espaçamento maior para títulos
        
        // Log para debug
        console.log(`Título renderizado: "${trimmedPara}" - ${titleLines.length} linhas`);
      } else {
        // Renderizar como parágrafo normal
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(55, 65, 81);
        const wrappedLines = doc.splitTextToSize(trimmedPara, contentWidth);
        doc.text(wrappedLines, leftMargin, yPosition);
        yPosition += (wrappedLines.length * 4) + 8;
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
    
    // Disclaimer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(156, 163, 175);
    doc.text(
      'Este relatório foi gerado por Inteligência Artificial e deve ser usado como ferramenta de análise.',
      pageWidth / 2,
      270,
      { align: 'center' }
    );
    
    // Logo pequeno no footer (centrado)
    try {
      const logoBase64 = await getLogoBase64();
      doc.addImage(logoBase64, 'PNG', pageWidth / 2 - 6, 275, 12, 12);
    } catch (error) {
      // Fallback: quadrado pequeno azul
      doc.setFillColor(59, 130, 246);
      doc.rect(pageWidth / 2 - 6, 275, 12, 12, 'F');
    }
    
    // Link do site (clicável) - com www
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(59, 130, 246);
    
    // Adicionar link clicável
    const linkText = 'www.zonafiscal.com.br';
    const linkWidth = doc.getTextWidth(linkText);
    const linkX = (pageWidth - linkWidth) / 2;
    
    // Texto do link
    doc.text(linkText, linkX, 290);
    
    // Linha sublinhada para indicar que é clicável
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.5);
    doc.line(linkX, 290.5, linkX + linkWidth, 290.5);
    
    // Adicionar anotação de link (clicável no PDF)
    doc.link(linkX, 287, linkWidth, 4, { url: 'https://www.zonafiscal.com.br' });
  }
  
  return doc.output('blob');
}
