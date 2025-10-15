"use client";

import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import type { GenerateFinancialReportOutput } from '@/ai/flows/generate-financial-report';

// Estilos para o documento PDF - Design profissional do Zona Fiscal
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 40,
    paddingLeft: 50,
    paddingRight: 50,
    paddingBottom: 60,
    color: '#1f2937', // Cinza escuro moderno
    backgroundColor: '#ffffff',
  },
  // Header com logo e identidade visual
  headerContainer: {
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 3,
    borderBottomColor: '#3b82f6', // Azul primário
    borderBottomStyle: 'solid',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 32,
    height: 32,
    backgroundColor: '#3b82f6',
    borderRadius: 6,
  },
  logoText: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
  },
  generatedDate: {
    fontSize: 9,
    color: '#6b7280',
  },
  title: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
    marginTop: 10,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 11,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  // Seções do relatório
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 12,
    color: '#3b82f6', // Azul
    backgroundColor: '#eff6ff',
    padding: 8,
    borderRadius: 4,
  },
  summaryBox: {
    backgroundColor: '#f9fafb',
    padding: 15,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    borderLeftStyle: 'solid',
  },
  summaryText: {
    fontSize: 11,
    lineHeight: 1.6,
    textAlign: 'justify',
    color: '#374151',
  },
  // Cards de KPIs
  kpiContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
    marginTop: 15,
    gap: 10,
  },
  kpiBox: {
    width: '23%',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'solid',
  },
  kpiLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    marginTop: 4,
  },
  kpiValueIncome: {
    color: '#10b981', // Verde
  },
  kpiValueExpense: {
    color: '#ef4444', // Vermelho
  },
  kpiValueProfit: {
    color: '#3b82f6', // Azul
  },
  kpiValuePersonal: {
    color: '#8b5cf6', // Roxo
  },
  // Análise detalhada
  analysisSection: {
    marginTop: 10,
    marginBottom: 15,
  },
  detailsH3: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    marginTop: 15,
    marginBottom: 8,
    color: '#1f2937',
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    borderBottomStyle: 'solid',
  },
  detailsText: {
    fontSize: 10,
    lineHeight: 1.6,
    color: '#374151',
    textAlign: 'justify',
    marginBottom: 8,
  },
  // Footer profissional
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    borderTopStyle: 'solid',
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
  },
  footerBrand: {
    fontSize: 9,
    color: '#3b82f6',
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
    marginTop: 4,
  },
});

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

const ReportPdfDocument = ({ report }: { report: GenerateFinancialReportOutput }) => {
  console.log("ReportPdfDocument - Renderizando com dados:", {
    hasReport: !!report,
    hasTitle: !!report?.title,
    hasSummary: !!report?.summary,
    hasReportDetails: !!report?.reportDetails,
    totalIncome: report?.totalIncome,
    totalExpenses: report?.totalExpenses,
  });

  if (!report || !report.title || !report.summary) {
    console.error("ReportPdfDocument - Dados inválidos, retornando erro");
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text>Erro: Dados do relatório incompletos</Text>
        </Page>
      </Document>
    );
  }

  console.log("ReportPdfDocument - Iniciando renderização completa");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Profissional com Logo */}
        <View style={styles.headerContainer}>
          <View style={styles.logoSection}>
            <View style={styles.logo}>
              <View style={styles.logoIcon} />
              <Text style={styles.logoText}>Zona Fiscal</Text>
            </View>
            <Text style={styles.generatedDate}>
              Gerado em {new Date().toLocaleDateString('pt-BR', { 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric' 
              })}
            </Text>
          </View>
          <Text style={styles.title}>{report.title || 'Relatório Financeiro'}</Text>
          <Text style={styles.subtitle}>Análise inteligente das suas finanças</Text>
        </View>

        {/* Resumo Executivo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Resumo Executivo</Text>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryText}>{report.summary || ''}</Text>
          </View>
        </View>

        {/* KPIs em Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Indicadores Financeiros</Text>
          <View style={styles.kpiContainer}>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Receitas</Text>
              <Text style={[styles.kpiValue, styles.kpiValueIncome]}>
                {formatCurrency(report.totalIncome || 0)}
              </Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Despesas</Text>
              <Text style={[styles.kpiValue, styles.kpiValueExpense]}>
                {formatCurrency(report.totalExpenses || 0)}
              </Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Lucro PJ</Text>
              <Text style={[styles.kpiValue, styles.kpiValueProfit]}>
                {formatCurrency(report.businessProfit || 0)}
              </Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Gastos PF</Text>
              <Text style={[styles.kpiValue, styles.kpiValuePersonal]}>
                {formatCurrency(report.personalSpending || 0)}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Análise Detalhada */}
        {report.reportDetails && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Análise Detalhada</Text>
            <View style={styles.analysisSection}>
              <Text style={styles.detailsText}>{report.reportDetails}</Text>
            </View>
          </View>
        )}

        {/* Footer Profissional */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Este relatório foi gerado por Inteligência Artificial e deve ser usado como ferramenta de análise.
          </Text>
          <Text style={styles.footerBrand}>ZONA FISCAL</Text>
        </View>
      </Page>
    </Document>
  );
};

export default ReportPdfDocument;
