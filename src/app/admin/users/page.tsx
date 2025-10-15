

"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Search, MoreVertical, Loader2, PlusCircle, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import UserPlanManagementDialog from "@/components/user-plan-management-dialog";
import type { User as AppUser } from "@/lib/types";
import { getUsersClient, updateUserClient, deleteUserClient } from "@/lib/client-admin-users";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useAdminAccess } from "@/hooks/use-admin-access";
import AdminAccessDenied from "@/components/admin-access-denied";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { user: adminUser } = useAuth();
  const { isAuthorized, isChecking, accessDenied } = useAdminAccess('users', false);

  const fetchUsers = () => {
    startTransition(async () => {
      try {
        const result = await getUsersClient();
        setUsers(result);
      } catch (error) {
        console.error("Erro ao buscar usuários:", error);
        toast({
          title: "Erro ao carregar usuários",
          description: "Não foi possível carregar a lista de usuários.",
          variant: "destructive",
        });
      }
    });
  }

  useEffect(() => {
    if (isAuthorized) {
      fetchUsers();
    }
  }, [isAuthorized]);
  
  const handleOpenDialog = (user: AppUser | null) => {
    setSelectedUser(user);
    setIsPlanDialogOpen(true);
  };
  
  const handleSaveChanges = (updatedUser: AppUser) => {
    if (!adminUser) return;
    startTransition(async () => {
      try {
        await updateUserClient(updatedUser);
        toast({ title: `Usuário ${updatedUser.name} salvo!`});
        fetchUsers();
      } catch (error) {
        console.error("Erro ao salvar usuário:", error);
        toast({
          title: "Erro ao salvar usuário",
          description: "Não foi possível salvar as alterações.",
          variant: "destructive",
        });
      }
    });
  };

  const handleDeleteClick = (user: AppUser) => {
    setSelectedUser(user);
    setIsAlertOpen(true);
  };

  // Filtros e paginação - MOVIDO PARA ANTES DOS RETURNS
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPlan = planFilter === 'all' || user.plan === planFilter;
        const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesPlan && matchesStatus && matchesRole;
    });
  }, [users, searchTerm, planFilter, statusFilter, roleFilter]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, currentPage, itemsPerPage]);

  // Reset para primeira página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, planFilter, statusFilter, roleFilter]);

  const handleConfirmDelete = () => {
    if (!selectedUser || !adminUser) return;
    startTransition(async () => {
      try {
        await deleteUserClient(selectedUser.id);
        toast({ title: `Usuário ${selectedUser.name} excluído!` });
        setIsAlertOpen(false);
        fetchUsers();
      } catch (error) {
        console.error("Erro ao excluir usuário:", error);
        toast({
          title: "Erro ao excluir usuário",
          description: "Não foi possível excluir o usuário.",
          variant: "destructive",
        });
      }
    });
  }

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
      title="Acesso à Gestão de Usuários Negado"
      description="Você não tem permissões de administrador para gerenciar usuários."
    />;
  }
  
  return (
    <>
      <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2"><Users /> Gerenciamento de Usuários</CardTitle>
                    <CardDescription>Visualize, filtre e gerencie todos os usuários da plataforma.</CardDescription>
                </div>
                <Button onClick={() => handleOpenDialog(null)} className="mt-4 sm:mt-0">
                    <PlusCircle />
                    Novo Usuário
                </Button>
            </div>
          </CardHeader>
          <CardContent>
              <div className="flex flex-col gap-4 mb-6">
                  <div className="relative w-full">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Buscar por nome ou e-mail..." 
                        className="pl-8 w-full" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Select value={planFilter} onValueChange={setPlanFilter}>
                          <SelectTrigger>
                              <SelectValue placeholder="Filtrar por plano" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="all">Todos os Planos</SelectItem>
                              <SelectItem value="Pro">Pro</SelectItem>
                              <SelectItem value="Gratuito">Gratuito</SelectItem>
                          </SelectContent>
                      </Select>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger>
                              <SelectValue placeholder="Filtrar por status" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="all">Todos os Status</SelectItem>
                              <SelectItem value="Ativo">Ativo</SelectItem>
                              <SelectItem value="Inativo">Inativo</SelectItem>
                              <SelectItem value="Suspenso">Suspenso</SelectItem>
                          </SelectContent>
                      </Select>
                      <Select value={roleFilter} onValueChange={setRoleFilter}>
                          <SelectTrigger>
                              <SelectValue placeholder="Filtrar por função" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="all">Todas as Funções</SelectItem>
                              <SelectItem value="Dono">Dono</SelectItem>
                              <SelectItem value="Membro">Membro</SelectItem>
                          </SelectContent>
                      </Select>
                      <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                          <SelectTrigger>
                              <SelectValue placeholder="Itens por página" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="5">5 por página</SelectItem>
                              <SelectItem value="10">10 por página</SelectItem>
                              <SelectItem value="20">20 por página</SelectItem>
                              <SelectItem value="50">50 por página</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
              </div>
              <div className="overflow-x-auto">
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Usuário</TableHead>
                              <TableHead className="hidden sm:table-cell">Plano</TableHead>
                              <TableHead className="hidden lg:table-cell">Campanha</TableHead>
                              <TableHead className="hidden md:table-cell">Data de Cadastro</TableHead>
                              <TableHead className="hidden lg:table-cell">Data de Conversão</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {isPending && users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center h-24">
                                    <Loader2 className="animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                          ) : paginatedUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                    Nenhum usuário encontrado com os filtros aplicados.
                                </TableCell>
                            </TableRow>
                          ) : (
                            paginatedUsers.map(user => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={user.avatar} alt={user.name} />
                                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{user.name}</p>
                                                <p className="text-sm text-muted-foreground truncate max-w-[150px] sm:max-w-none">{user.email}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell">
                                        <Badge variant={user.plan === 'Pro' ? 'default' : 'secondary'}>{user.plan}</Badge>
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell">{user.utmCampaign || 'N/A'}</TableCell>
                                    <TableCell className="hidden md:table-cell">{new Date(user.signupDate).toLocaleDateString('pt-BR')}</TableCell>
                                    <TableCell className="hidden lg:table-cell">{user.convertedAt ? new Date(user.convertedAt).toLocaleDateString('pt-BR') : 'N/A'}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={
                                            user.status === 'Ativo' ? "text-green-400 border-green-400/50" : 
                                            user.status === 'Inativo' ? "text-gray-400 border-gray-400/50" :
                                            "text-red-400 border-red-400/50"
                                        }>
                                            {user.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreVertical className="size-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => handleOpenDialog(user)}>Gerenciar Usuário</DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    className="text-red-500 focus:text-red-500" 
                                                    onSelect={() => handleDeleteClick(user)}
                                                >
                                                    <Trash2 className="mr-2" />
                                                    Excluir Usuário
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                          )}
                      </TableBody>
                  </Table>
              </div>
              
              {/* Paginação */}
              {filteredUsers.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, filteredUsers.length)} a {Math.min(currentPage * itemsPerPage, filteredUsers.length)} de {filteredUsers.length} {filteredUsers.length === 1 ? 'usuário' : 'usuários'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          // Mostra sempre primeira, última e páginas próximas à atual
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
                              {showEllipsis && <span className="px-2">...</span>}
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
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
          </CardContent>
      </Card>

      
      <UserPlanManagementDialog
        isOpen={isPlanDialogOpen}
        onOpenChange={setIsPlanDialogOpen}
        user={selectedUser}
        onSave={handleSaveChanges}
      />
      
       <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso excluirá permanentemente o usuário <span className="font-bold">{selectedUser?.name}</span> e todos os seus dados.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDelete}>Confirmar Exclusão</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
