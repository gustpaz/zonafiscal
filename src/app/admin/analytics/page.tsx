"use client";

import { useEffect, useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, DollarSign, Users, Loader2, Search, Download } from "lucide-react";
import { getAnalyticsDataClient, type CampaignAnalytics, type TrafficSource } from "@/lib/client-admin-analytics";
import { useAdminAccess } from "@/hooks/use-admin-access";
import AdminAccessDenied from "@/components/admin-access-denied";
import { useToast } from "@/hooks/use-toast";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ['#72A7A7', '#4A7C7C', '#9DCDCD', '#5F8E8E', '#B5E3E3'];

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [isPending, startTransition] = useTransition();
  const { isAuthorized, isChecking, accessDenied } = useAdminAccess('marketing', false);
  const { toast } = useToast();

  const fetchData = () => {
    startTransition(async () => {
      try {
        const result = await getAnalyticsDataClient();
        setData(result);
      } catch (error) {
        console.error("Erro ao buscar analytics:", error);
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os dados de analytics.",
          variant: "destructive",
        });
      }
    });
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchData();
    }
  }, [isAuthorized]);

  // Mostra loading enquanto verifica permissões
  if (isChecking) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  // Se não tem autorização, mostra página de erro
  if (accessDenied || (!isChecking && !isAuthorized)) {
    return <AdminAccessDenied 
      title="Acesso ao Analytics Negado"
      description="Você não tem permissões de administrador para visualizar analytics."
    />;
  }

  if (isPending || !data) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const filteredCampaigns = data.campaigns.filter((c: CampaignAnalytics) => {
    const matchesSearch = 
      c.campaign.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.medium.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource = sourceFilter === 'all' || c.source === sourceFilter;
    return matchesSearch && matchesSource;
  });

  const exportCSV = () => {
    const headers = ['Fonte', 'Meio', 'Campanha', 'Conjunto', 'Anúncio', 'Cadastros', 'Conversões', 'Planos', 'Taxa Conv.', 'Receita'];
    const rows = filteredCampaigns.map((c: CampaignAnalytics) => {
      const plansStr = Object.entries(c.planBreakdown)
        .map(([plan, count]) => `${plan}:${count}`)
        .join('; ') || '-';
      
      return [
        c.source,
        c.medium,
        c.campaign,
        c.content || '-',
        c.term || '-',
        c.signups,
        c.conversions,
        plansStr,
        `${c.conversionRate.toFixed(2)}%`,
        `R$ ${c.revenue.toFixed(2)}`
      ];
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    toast({ title: "CSV exportado com sucesso!" });
  };

  // Gerar insights automáticos baseados nos dados
  const generateInsights = () => {
    if (!data || data.campaigns.length === 0) return [];

    const insights: { type: 'success' | 'warning' | 'info'; title: string; description: string }[] = [];

    // 1. Melhor campanha por taxa de conversão
    const bestConversionCampaign = [...data.campaigns].sort((a, b) => b.conversionRate - a.conversionRate)[0];
    if (bestConversionCampaign && bestConversionCampaign.conversionRate > 0) {
      insights.push({
        type: 'success',
        title: '🏆 Melhor Taxa de Conversão',
        description: `A campanha "${bestConversionCampaign.campaign}" (${bestConversionCampaign.source}) tem ${bestConversionCampaign.conversionRate.toFixed(1)}% de conversão. ${bestConversionCampaign.conversionRate > 20 ? 'Excelente performance! Invista mais aqui.' : 'Considere investir mais nesta campanha.'}`
      });
    }

    // 2. Melhor campanha por receita
    const bestRevenueCampaign = [...data.campaigns].sort((a, b) => b.revenue - a.revenue)[0];
    if (bestRevenueCampaign && bestRevenueCampaign.revenue > 0) {
      insights.push({
        type: 'success',
        title: '💰 Maior Receita',
        description: `A campanha "${bestRevenueCampaign.campaign}" gerou ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bestRevenueCampaign.revenue)} com ${bestRevenueCampaign.conversions} conversões.`
      });
    }

    // 3. Planos mais populares
    const planCounts: Record<string, number> = {};
    data.campaigns.forEach((c: CampaignAnalytics) => {
      Object.entries(c.planBreakdown).forEach(([plan, count]) => {
        planCounts[plan] = (planCounts[plan] || 0) + (count as number);
      });
    });
    
    const topPlan = Object.entries(planCounts).sort((a, b) => b[1] - a[1])[0];
    if (topPlan) {
      insights.push({
        type: 'info',
        title: '📊 Plano Mais Popular',
        description: `O plano "${topPlan[0]}" foi escolhido ${topPlan[1]} vezes. ${topPlan[0] === 'Pro' ? 'Usuários buscam funcionalidades avançadas.' : topPlan[0] === 'Business' || topPlan[0] === 'Premium' ? 'Alta qualidade de leads - clientes premium!' : 'Oportunidade de upsell para planos pagos.'}`
      });
    }

    // 4. Alertas de baixa performance
    const lowPerformanceCampaigns = data.campaigns.filter((c: CampaignAnalytics) => 
      c.signups >= 10 && c.conversionRate < 5
    );
    if (lowPerformanceCampaigns.length > 0) {
      insights.push({
        type: 'warning',
        title: '⚠️ Campanhas com Baixa Conversão',
        description: `${lowPerformanceCampaigns.length} campanha(s) com menos de 5% de conversão. Revise a segmentação ou criativo: ${lowPerformanceCampaigns.map((c: CampaignAnalytics) => c.campaign).slice(0, 2).join(', ')}.`
      });
    }

    // 5. Fonte de tráfego predominante
    const topSource = data.trafficSources[0];
    if (topSource) {
      const sourcePercent = ((topSource.totalUsers / data.totalSignups) * 100).toFixed(1);
      insights.push({
        type: 'info',
        title: '🎯 Fonte Principal',
        description: `${sourcePercent}% dos cadastros vêm de "${topSource.source}". ${topSource.conversions > 0 ? `Esta fonte gerou ${topSource.conversions} conversões.` : 'Considere otimizar para conversões pagas.'}`
      });
    }

    // 6. Oportunidades de melhoria
    if (data.totalConversions > 0 && data.totalSignups > 0) {
      const overallRate = (data.totalConversions / data.totalSignups) * 100;
      if (overallRate < 10) {
        insights.push({
          type: 'warning',
          title: '📈 Oportunidade de Crescimento',
          description: `Taxa geral de conversão está em ${overallRate.toFixed(1)}%. Benchmark de SaaS é 10-15%. Considere melhorar onboarding ou oferecer trial.`
        });
      } else if (overallRate >= 20) {
        insights.push({
          type: 'success',
          title: '🚀 Performance Excepcional',
          description: `Taxa de conversão de ${overallRate.toFixed(1)}% está acima do mercado (10-15%)! Considere escalar investimento.`
        });
      }
    }

    return insights;
  };

  const insights = generateInsights();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold">Analytics de Campanhas</h2>
        <p className="text-muted-foreground">
          Análise detalhada de performance de campanhas, conjuntos e anúncios via UTMs e Pixel
        </p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Cadastros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalSignups}</div>
            <p className="text-xs text-muted-foreground">Usuários que se cadastraram</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversões (Planos Pagos)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalConversions}</div>
            <p className="text-xs text-muted-foreground">
              Taxa: {data.totalSignups > 0 ? ((data.totalConversions / data.totalSignups) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">De conversões rastreadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fontes de Tráfego</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.trafficSources.length}</div>
            <p className="text-xs text-muted-foreground">Canais diferentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Insights Automáticos */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              💡 Insights Automáticos
            </CardTitle>
            <CardDescription>
              Análise inteligente dos seus dados para tomada de decisão
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.map((insight, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    insight.type === 'success' 
                      ? 'bg-green-500/10 border-green-500/30' 
                      : insight.type === 'warning'
                      ? 'bg-yellow-500/10 border-yellow-500/30'
                      : 'bg-blue-500/10 border-blue-500/30'
                  }`}
                >
                  <h4 className="font-semibold mb-2">{insight.title}</h4>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Fontes de Tráfego</CardTitle>
            <CardDescription>Cadastros por canal de aquisição</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.trafficSources}
                  dataKey="totalUsers"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.source}: ${entry.totalUsers}`}
                >
                  {data.trafficSources.map((entry: TrafficSource, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 5 Campanhas</CardTitle>
            <CardDescription>Por número de conversões</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.campaigns.slice(0, 5)}>
                <XAxis dataKey="campaign" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="conversions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela Detalhada */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Performance Detalhada por Campanha</CardTitle>
              <CardDescription>Análise granular de cada campanha, conjunto e anúncio</CardDescription>
            </div>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por campanha, fonte ou meio..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrar por fonte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Fontes</SelectItem>
                {data.trafficSources.map((source: TrafficSource) => (
                  <SelectItem key={source.source} value={source.source}>
                    {source.source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Meio</TableHead>
                  <TableHead>Campanha</TableHead>
                  <TableHead>Conjunto</TableHead>
                  <TableHead>Anúncio</TableHead>
                  <TableHead className="text-center">Cadastros</TableHead>
                  <TableHead className="text-center">Conversões</TableHead>
                  <TableHead className="text-center">Planos</TableHead>
                  <TableHead className="text-center">Taxa Conv.</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center h-24 text-muted-foreground">
                      Nenhuma campanha encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCampaigns.map((campaign: CampaignAnalytics, index: number) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Badge variant="outline">{campaign.source}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{campaign.medium}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{campaign.campaign}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {campaign.content || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {campaign.term || '-'}
                      </TableCell>
                      <TableCell className="text-center">{campaign.signups}</TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium text-green-500">{campaign.conversions}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {Object.keys(campaign.planBreakdown).length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {Object.entries(campaign.planBreakdown).map(([plan, count]) => (
                              <Badge key={plan} variant="outline" className="text-xs">
                                {plan}: {count}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={campaign.conversionRate > 10 ? "default" : "secondary"}>
                          {campaign.conversionRate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(campaign.revenue)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

