

"use client";

import { getTransactionsAction, deleteTransactionAction, updateTransactionAction } from "@/lib/actions.tsx";
import { getTransactionsClient } from "@/lib/client-data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Transaction, TransactionCategory, User } from "@/lib/types";
import { Home, Briefcase, Combine, LandPlot, HandCoins, Loader2, Search } from "lucide-react";
import { translatePaymentMethod } from "@/lib/translate";
import DashboardHeader from "@/components/dashboard-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ViewSwitcher from "@/components/view-switcher";
import { TransactionActions } from "@/components/transaction-actions";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { DateRange } from "react-day-picker";
import { useToast } from "@/hooks/use-toast";
import { AddTransactionSheet } from "@/components/add-transaction-sheet";
import { useSearchParams } from "next/navigation";
import { isInGracePeriod, getRemainingGracePeriod } from "@/lib/audit-filters";

const categoryIcons: Record<TransactionCategory, React.ReactNode> = {
  personal: <Home className="size-4" />,
  business: <Briefcase className="size-4" />,
  mixed: <Combine className="size-4" />,
  loan_to_business: <HandCoins className="size-4" />,
  loan_to_personal: <LandPlot className="size-4" />,
};

const categoryColors: Record<TransactionCategory, string> = {
  personal: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  business: "bg-green-500/10 text-green-400 border-green-500/20",
  mixed: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  loan_to_business: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  loan_to_personal: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

const categoryLabels: Record<TransactionCategory, string> = {
  personal: 'Pessoal',
  business: 'Empresarial',
  mixed: 'Misto',
  loan_to_business: 'Aporte (Empréstimo)',
  loan_to_personal: 'Retirada (Empréstimo)',
};

export default function TransactionsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const view = searchParams?.get('view') as 'personal' | 'business' | undefined;
  const { toast } = useToast();
  
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros e Paginação
  const [searchTerm, setSearchTerm] = useState("");
  const [authorFilter, setAuthorFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const fetchTransactions = useCallback(async () => {
    if (user) {
      setLoading(true);
      try {
        const transactionsData = await getTransactionsClient(user.uid);
        
        // Aplicar filtro de view se necessário
        let filteredData = transactionsData;
        if (view === 'business') {
          filteredData = transactionsData.filter(t => 
            ['business', 'mixed', 'loan_to_business', 'loan_to_personal'].includes(t.category)
          );
        } else if (view === 'personal') {
          filteredData = transactionsData.filter(t => 
            ['personal', 'mixed', 'loan_to_business', 'loan_to_personal'].includes(t.category)
          );
        }
        
        setAllTransactions(filteredData);
      } catch (error) {
        console.error("Erro ao buscar transações:", error);
        toast({ title: "Erro ao buscar transações", description: "Ocorreu um erro ao carregar os dados.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
  }, [user, view, toast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleTransactionUpdate = (updatedTransaction: Transaction) => {
    setAllTransactions(prev => prev.map(t => 
      t.id === updatedTransaction.id ? updatedTransaction : t
    ));
  };
  
  const handleTransactionAdd = (newTransactions: Transaction[]) => {
      setAllTransactions(prev => [...newTransactions, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const handleTransactionDelete = (deletedId: string) => {
    setAllTransactions(prev => prev.filter(t => t.id !== deletedId));
  };

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAuthor = authorFilter === 'all' || transaction.userId === authorFilter;
      const matchesDate = !dateRange || !dateRange.from || (transactionDate >= dateRange.from && transactionDate <= (dateRange.to || new Date()));
      return matchesSearch && matchesAuthor && matchesDate;
    });
  }, [allTransactions, searchTerm, authorFilter, dateRange]);

  // Reset para primeira página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, authorFilter, dateRange]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getAuthor = (userId: string) => {
    // Since we are simplifying to a single-user view for now, the author is always the current user.
    if (user && userId === user.uid) {
      return { name: user.displayName || 'Eu', avatar: user.photoURL || '' };
    }
    return { name: 'Desconhecido', avatar: '' };
  };

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <DashboardHeader title="Transações">
        <ViewSwitcher />
        <AddTransactionSheet onTransactionAdded={handleTransactionAdd} />
      </DashboardHeader>

      <Card>
        <CardHeader>
            <CardTitle>Histórico de Transações</CardTitle>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <div className="relative w-full flex-grow">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por descrição..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <DateRangePicker className="w-full sm:w-auto" />
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="hidden sm:table-cell">Data</TableHead>
                  <TableHead className="hidden md:table-cell">Método</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                   <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                ) : (
                  paginatedTransactions.map((transaction) => {
                    const author = getAuthor(transaction.userId);
                    return (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span>{transaction.description}</span>
                            {transaction.isImported && isInGracePeriod(transaction) && (
                              <Badge variant="outline" className="border-blue-500 text-blue-600 text-xs">
                                Importada
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={author.avatar} alt={author.name} />
                              <AvatarFallback>{author.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{author.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("capitalize gap-1.5 whitespace-nowrap", categoryColors[transaction.category])}>
                            {categoryIcons[transaction.category]}
                            <span>{categoryLabels[transaction.category]}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{new Date(transaction.date).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="capitalize hidden md:table-cell">
                          {translatePaymentMethod(transaction.paymentMethod)}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-medium",
                          transaction.type === "income" ? "text-green-500" : "text-red-500"
                        )}>
                          {transaction.type === "income" ? "+" : "-"} {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(transaction.amount)}
                        </TableCell>
                        <TableCell>
                          <TransactionActions 
                            transaction={transaction as Transaction} 
                            onTransactionDeleted={handleTransactionDelete} 
                            onTransactionUpdated={handleTransactionUpdate}
                           />
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {filteredTransactions.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, filteredTransactions.length)} a {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} de {filteredTransactions.length} {filteredTransactions.length === 1 ? 'transação' : 'transações'}
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm whitespace-nowrap">Itens por página</span>
                  <Select
                    value={String(itemsPerPage)}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value));
                      setCurrentPage(1); // Reset para primeira página ao mudar items por página
                    }}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 20, 50, 100].map(size => (
                        <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        // Mostra primeira, última e páginas próximas à atual
                        return page === 1 || 
                               page === totalPages || 
                               Math.abs(page - currentPage) <= 1;
                      })
                      .map((page, index, array) => {
                        // Adiciona "..." entre páginas não consecutivas
                        const prevPage = array[index - 1];
                        const showEllipsis = prevPage && page - prevPage > 1;
                        
                        return (
                          <div key={page} className="flex items-center">
                            {showEllipsis && <span className="px-2 text-muted-foreground">...</span>}
                            <Button
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="w-9"
                            >
                              {page}
                            </Button>
                          </div>
                        );
                      })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
