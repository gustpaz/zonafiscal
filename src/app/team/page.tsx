

"use client";

import { useState, useTransition, useEffect } from 'react';
import DashboardHeader from '@/components/dashboard-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MoreVertical, Trash2, UserPlus, Loader2, Edit } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import type { User, Plan } from '@/lib/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { removeTeamMember, updateTeamMemberPermissions } from '@/lib/actions';
import { addUserToSubscription, removeUserFromSubscription } from '@/lib/stripe/actions';
import { useToast } from '@/hooks/use-toast';
import { getPlanByName } from '@/lib/admin-data';
import Link from 'next/link';
import TeamMemberPermissionsDialog from '@/components/team-member-permissions-dialog';
import { getEffectivePlan } from '@/lib/subscription-utils';

export default function TeamPage() {
    const { user } = useAuth();
    const [team, setTeam] = useState<User[]>([]);
    const [userPlan, setUserPlan] = useState<Plan | null>(null);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteLink, setInviteLink] = useState('');
    const [sendingEmail, setSendingEmail] = useState(false);
    const [selectedMember, setSelectedMember] = useState<User | null>(null);
    const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const fetchTeamAndPlan = () => {
        if (!user) return;
        startTransition(async () => {
            try {
                const response = await fetch(`/api/team/members?userId=${user.uid}`);
                const result = await response.json();
                
                if (result.success) {
                    const members = result.members;
                    setTeam(members);
                    const owner = members.find((m: User) => m.role === 'Dono');
                    
                    if (owner) {
                        // Usar plano efetivo (considera cancelamento pendente)
                        const effectivePlan = getEffectivePlan(owner);
                        const planData = await getPlanByName(effectivePlan);
                        setUserPlan(planData || null);
                    }
                } else {
                    console.error('❌ Erro ao buscar membros:', result.error);
                    setTeam([]);
                }
            } catch (error) {
                console.error('❌ Erro na requisição:', error);
                setTeam([]);
            }
        });
    };

    useEffect(() => {
        if (user) {
            fetchTeamAndPlan();
        }
    }, [user]);

    const handleInvite = () => {
        if (!inviteEmail) return;
        startTransition(async () => {
            if (!user) return;
            
            try {
                const response = await fetch('/api/team/invite', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        ownerId: user.uid,
                        email: inviteEmail
                    })
                });

                const inviteResult = await response.json();
                
                if (inviteResult.success && inviteResult.owner) {
                    // Mostrar link de convite
                    if (inviteResult.inviteLink) {
                        setInviteLink(inviteResult.inviteLink);
                    }
                    
                    toast({ 
                        title: "Convite Criado!", 
                        description: `Link de convite gerado para ${inviteEmail}.` 
                    });
                    
                    fetchTeamAndPlan();

                    // Cobrar se necessário
                    if (inviteResult.owner.stripeSubscriptionId && inviteResult.shouldCharge) {
                        const updateSubResult = await addUserToSubscription(inviteResult.owner.stripeSubscriptionId);
                        if (!updateSubResult.success) {
                            toast({ title: "Erro na Assinatura", description: updateSubResult.error, variant: "destructive" });
                        }
                    }
                } else {
                    toast({ title: "Erro ao Convidar", description: inviteResult.error, variant: "destructive" });
                }
            } catch (error) {
                console.error('Erro ao convidar membro:', error);
                toast({ title: "Erro ao Convidar", description: "Erro de conexão", variant: "destructive" });
            }
        });
    };

    const handleSendEmail = async () => {
        if (!inviteEmail || !inviteLink || !user) return;
        
        setSendingEmail(true);
        
        try {
            const { fetchWithAuth } = await import('@/lib/auth-token');
            
            const response = await fetchWithAuth('/api/send-invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: inviteEmail,
                    role: 'member', // Padrão: membro
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                toast({ 
                    title: "Email Enviado!", 
                    description: `Convite enviado para ${inviteEmail}` 
                });
                setInviteEmail('');
                setInviteLink('');
            } else {
                toast({ 
                    title: "Erro ao enviar email", 
                    description: data.error || "Tente copiar o link e enviar manualmente.",
                    variant: "destructive" 
                });
            }
        } catch (error) {
            console.error("Erro ao enviar email:", error);
            toast({ 
                title: "Erro", 
                description: "Não foi possível enviar o email. Use o link manual.",
                variant: "destructive" 
            });
        } finally {
            setSendingEmail(false);
        }
    };

    const handleCopyLink = () => {
        if (inviteLink) {
            navigator.clipboard.writeText(inviteLink);
            toast({ title: "Link copiado!", description: "Cole e envie para o membro." });
        }
    };

    const handleWhatsApp = () => {
        if (inviteLink && inviteEmail) {
            const message = `Olá! Você foi convidado para colaborar no Zona Fiscal. Acesse: ${inviteLink}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
        }
    };

    const handleMailto = () => {
        if (inviteLink && inviteEmail) {
            const subject = 'Convite para Zona Fiscal';
            const body = `Você foi convidado para colaborar no Zona Fiscal!\n\nAcesse este link para aceitar o convite:\n${inviteLink}`;
            window.open(`mailto:${inviteEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
        }
    };

    const handleRemoveMember = (memberId: string) => {
        startTransition(async () => {
            if (!user) return;
            const removeResult = await removeTeamMember(user.uid, memberId);

            if (removeResult.success && removeResult.owner) {
                 toast({ title: "Membro Removido", description: "O usuário foi removido da equipe." });
                 fetchTeamAndPlan();

                if (removeResult.owner.stripeSubscriptionId && removeResult.wasPaidMember) {
                    const updateSubResult = await removeUserFromSubscription(removeResult.owner.stripeSubscriptionId);
                     if (!updateSubResult.success) {
                         toast({ title: "Erro na Assinatura", description: updateSubResult.error, variant: "destructive" });
                    }
                }
            } else {
                toast({ title: "Erro ao Remover", description: removeResult.error, variant: "destructive" });
            }
        });
    };

    const handleManagePermissions = (member: User) => {
        setSelectedMember(member);
        setIsPermissionsDialogOpen(true);
    }
    
    const handleSavePermissions = async (memberId: string, permissions: User['teamPermissions']) => {
        let success = false;
        await startTransition(async () => {
             if (!user) return;
             const result = await updateTeamMemberPermissions(user.uid, memberId, permissions);
             if (result.success) {
                 toast({ title: "Permissões atualizadas!" });
                 fetchTeamAndPlan();
                 success = true;
             } else {
                 toast({ title: "Erro", description: result.error, variant: 'destructive' });
             }
        });
        return success;
    }

    const includedMembers = userPlan?.features.teamMembersIncluded || 0;
    const canInvite = includedMembers > 0;
    // Contar apenas membros que não são donos (excluir o dono da contagem)
    const currentMemberCount = team.filter(member => member.role !== 'Dono').length;
    const hasFreeSlots = currentMemberCount < includedMembers;
    const pricePerMember = userPlan?.features.pricePerMember || 0;
    
    const getInviteDescription = () => {
        if (isPending && !userPlan) {
            return "Carregando informações do plano...";
        }
        if (!canInvite) {
            return <>Faça <Link href="/pricing" className="underline font-medium">upgrade para o Plano Pro</Link> para poder convidar membros para sua equipe.</>;
        }
        if (hasFreeSlots) {
            const remainingSlots = includedMembers - currentMemberCount;
            return `Você ainda pode convidar ${remainingSlots} membro(s) gratuitamente.`;
        }
        return `Adicione novos usuários para colaborar. Um valor adicional de R$ ${pricePerMember.toFixed(2).replace('.', ',')} será cobrado em sua assinatura por cada novo membro.`;
    };


    if (!user) return null;

    return (
        <>
            <div className="flex flex-col gap-8 p-4 md:p-8">
                <DashboardHeader title="Gerenciamento de Equipe" />

                <Card>
                    <CardHeader>
                        <CardTitle>Convidar Novo Membro</CardTitle>
                        <CardDescription>
                            {getInviteDescription()}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex w-full items-center space-x-2">
                            <Input 
                                type="email" 
                                placeholder="Email do novo membro" 
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                disabled={isPending || !canInvite || !!inviteLink}
                            />
                            <Button onClick={handleInvite} disabled={isPending || !inviteEmail || !canInvite || !!inviteLink}>
                                {isPending ? <Loader2 className="mr-2 animate-spin" /> : <UserPlus className="mr-2"/>}
                                Convidar
                            </Button>
                        </div>
                        
                        {inviteLink && (
                            <div className="mt-4 p-4 bg-muted rounded-lg space-y-4">
                                <div className="space-y-2">
                                    <p className="text-sm font-semibold">✅ Convite Criado!</p>
                                    <p className="text-xs text-muted-foreground">
                                        Escolha como enviar o convite para {inviteEmail}:
                                    </p>
                                </div>
                                
                                <div className="flex flex-col gap-2">
                                    <Button 
                                        onClick={handleSendEmail} 
                                        disabled={sendingEmail}
                                        className="w-full"
                                        variant="default"
                                    >
                                        {sendingEmail ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Enviando Email...
                                            </>
                                        ) : (
                                            <>
                                                📧 Enviar Email Automático
                                            </>
                                        )}
                                    </Button>
                                    
                                    <div className="text-center text-xs text-muted-foreground">ou</div>
                                    
                                    <div className="grid grid-cols-3 gap-2">
                                        <Button onClick={handleCopyLink} variant="outline" size="sm">
                                            📋 Copiar
                                        </Button>
                                        <Button onClick={handleMailto} variant="outline" size="sm">
                                            ✉️ Email
                                        </Button>
                                        <Button onClick={handleWhatsApp} variant="outline" size="sm">
                                            💬 WhatsApp
                                        </Button>
                                    </div>
                                </div>
                                
                                <div className="space-y-1">
                                    <p className="text-xs font-medium">Link do Convite:</p>
                                    <div className="flex gap-2">
                                        <Input 
                                            value={inviteLink} 
                                            readOnly 
                                            className="text-xs font-mono"
                                            onClick={(e) => e.currentTarget.select()}
                                        />
                                    </div>
                                </div>
                                
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => {
                                        setInviteLink('');
                                        setInviteEmail('');
                                    }}
                                    className="w-full"
                                >
                                    Fechar
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Membros da Equipe</CardTitle>
                        <CardDescription>
                            Gerencie os usuários que têm acesso a esta conta.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Usuário</TableHead>
                                    <TableHead>Função</TableHead>
                                    <TableHead>Permissões</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isPending && team.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">
                                            <Loader2 className="animate-spin mx-auto" />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    team.map(member => (
                                        <TableRow key={member.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar>
                                                        <AvatarImage src={member.avatar} alt={member.name} />
                                                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium">{member.name}</p>
                                                        <p className="text-sm text-muted-foreground">{member.email}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={member.role === 'Dono' ? 'default' : 'secondary'}>{member.role}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm text-muted-foreground">
                                                    {member.role === 'Dono' ? 'Acesso total' : `${member.teamPermissions?.length || 0} permissões`}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {member.role !== 'Dono' && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" disabled={isPending}>
                                                                <MoreVertical className="size-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onSelect={() => handleManagePermissions(member)}>
                                                                <Edit className="mr-2"/>
                                                                Gerenciar Permissões
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem 
                                                                className="text-red-500 focus:text-red-500" 
                                                                onSelect={() => handleRemoveMember(member.id)}
                                                            >
                                                                <Trash2 className="mr-2" />
                                                                Remover da Equipe
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            {selectedMember && (
                <TeamMemberPermissionsDialog
                    isOpen={isPermissionsDialogOpen}
                    onOpenChange={setIsPermissionsDialogOpen}
                    member={selectedMember}
                    onSave={handleSavePermissions}
                />
            )}
        </>
    )
}
