

import type { Plan, SupportTicket, User, TicketReply, AdminPermission, TrackingSettings } from "./types";
import { addAuditLog as addAuditLogDB, updateUserInDb, fetchTeamMembersFromFirestore as dbFetchTeamMembers } from "./data"; // Import the real audit log function
import { User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where, collectionGroup, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
// import { adminDb } from "./firebase-admin"; // Removido para evitar import no cliente
import { FirestorePermissionError } from './errors';
import { errorEmitter } from './error-emitter';


// This file acts as a centralized, in-memory "database" for the admin panel.
// In a real application, these functions would interact with a proper database (e.g., Firestore, PostgreSQL).

type AuditInfo = { userId: string, userName: string };

export interface Campaign {
    id: number;
    name: string;
    status: "Ativa" | "Agendada" | "Rascunho" | "Enviada";
    sent: number;
    openRate: string;
    clickRate: string;
}

export interface Payment {
  id: string;
  userName: string;
  userEmail: string;
  planName: string;
  amount: number;
  date: string;
  status: "Pago" | "Falhou";
}

export interface FeatureFlags {
    pdfExport: boolean;
    csvImport: boolean;
}

export interface AdminDashboardData {
    totalUsers: number;
    mrr: number;
    activeToday: number;
    totalTransactions: number;
    recentUsers: User[];
    featureFlags: FeatureFlags;
}

export interface PaymentsData {
    monthlyRevenue: number;
    newSubscriptions: number;
 churnRate: number;
    payments: Payment[];
}

// ===================================================================================
// IN-MEMORY DATABASE (MOCK DATA - SOME PARTS ARE BEING MIGRATED TO FIRESTORE)
// ===================================================================================
let adminData = {
    users: [
        { id: '1', name: "Ana Silva", email: "ana.silva@exemplo.com", avatar: "https://i.pravatar.cc/150?u=a042581f4e29026704d", plan: "Pro", signupDate: "2024-05-15", status: "Ativo", role: "Dono", companyId: "1", stripeCustomerId: "cus_123", stripeSubscriptionId: "sub_123", adminRole: 'Super Admin', adminPermissions: ['dashboard', 'plans', 'users', 'payments', 'marketing', 'tracking', 'integrations', 'support'], aiReportsGenerated: 2, reportGenerationTimestamp: new Date().toISOString() },
        { id: '2', name: "Bruno Costa", email: "bruno.costa@exemplo.com", avatar: "https://i.pravatar.cc/150?u=a042581f4e29026705d", plan: "Gratuito", signupDate: "2024-05-12", status: "Ativo", role: "Dono", companyId: "2", adminRole: 'Nenhum', adminPermissions: [], aiReportsGenerated: 1, reportGenerationTimestamp: new Date().toISOString() },
        { id: '3', name: "Carlos Pereira", email: "carlos.p@exemplo.com", avatar: "https://i.pravatar.cc/150?u=a042581f4e29026706d", plan: "Pro", signupDate: "2024-04-30", status: "Inativo", role: "Dono", companyId: "3", stripeCustomerId: "cus_456", adminRole: 'Nenhum', adminPermissions: [] },
        { id: '4', name: "Daniela Martins", email: "daniela.m@exemplo.com", avatar: "https://i.pravatar.cc/150?u=a042581f4e29026707d", plan: "Gratuito", signupDate: "2024-04-22", status: "Ativo", role: "Dono", companyId: "4", adminRole: 'Nenhum', adminPermissions: [] },
        { id: '5', name: "Fernanda Lima", email: "fernanda.l@exemplo.com", avatar: "https://i.pravatar.cc/150?u=a042581f4e29026708d", plan: "Pro", signupDate: "2024-06-01", status: "Ativo", role: "Membro", companyId: "1", adminRole: 'Nenhum', adminPermissions: [] },
        { id: 'admin-user', name: "Admin", email: "admin@zonafiscal.com", avatar: "", plan: "Pro", signupDate: "2024-01-01", status: "Ativo", role: "Dono", companyId: "admin_co", adminRole: 'Super Admin', adminPermissions: ['dashboard', 'plans', 'users', 'payments', 'marketing', 'tracking', 'integrations', 'support'] },
    ] as User[],
    plans: [
        { id: '1', name: "Gratuito", price: 0, subscribers: 2, status: "Ativo", features: { transactions: 50, aiTips: false, pdfExport: false, prioritySupport: false, forecast: false, goalsAndBudgets: false, teamMembersIncluded: 0, aiReportLimit: 1, pricePerMember: 9.90, accountingReports: false } },
        { id: '2', name: "Pro", price: 29.90, priceIdMonthly: "price_1PStA1RxmG12W2h4kL7d2j3d", priceIdYearly: "price_1PStA1RxmG12W2h44kGq5b1t", subscribers: 2, status: "Ativo", features: { transactions: -1, aiTips: true, pdfExport: true, prioritySupport: true, forecast: true, goalsAndBudgets: true, teamMembersIncluded: 1, aiReportLimit: 10, pricePerMember: 9.90, accountingReports: true } },
    ] as Plan[],
    payments: [
        { id: 'pay_1', userName: "Ana Silva", userEmail: "ana.silva@exemplo.com", planName: "Pro Mensal", amount: 29.90, date: "2024-07-28", status: "Pago" },
        { id: 'pay_2', userName: "Bruno Costa", userEmail: "bruno.costa@exemplo.com", planName: "Pro Anual", amount: 299.00, date: "2024-07-28", status: "Pago" },
        { id: 'pay_3', userName: "Carlos Pereira", userEmail: "carlos.p@exemplo.com", planName: "Pro Mensal", amount: 29.90, date: "2024-07-27", status: "Falhou" },
        { id: 'pay_4', userName: "Daniela Martins", userEmail: "daniela.m@exemplo.com", planName: "Pro Mensal", amount: 29.90, date: "2024-07-26", status: "Pago" },
    ] as Payment[],
    campaigns: [
        { id: 1, name: "Boas-vindas Novos Usuários", status: "Ativa", sent: 1257, openRate: "45.2%", clickRate: "12.3%" },
        { id: 2, name: "Promoção Plano Pro (Anual)", status: "Agendada", sent: 0, openRate: "N/A", clickRate: "N/A" },
        { id: 3, name: "Dicas de Organização Financeira", status: "Rascunho", sent: 0, openRate: "N/A", clickRate: "N/A" },
        { id: 4, name: "Lançamento Nova Função: Relatórios", status: "Enviada", sent: 980, openRate: "38.9%", clickRate: "8.7%" },
    ] as Campaign[],
    featureFlags: {
        pdfExport: true,
        csvImport: false,
    } as FeatureFlags,
    dashboardMetrics: {
        totalUsers: 1257,
        mrr: 25231.89,
        activeToday: 573,
        totalTransactions: 142890,
    }
}

// In a real app, this would be a real database call. Here we simulate it.
let trackingSettings: TrackingSettings = {
    metaPixelId: "1234567890", // Example ID
    googleAnalyticsId: "G-ABCDEFGHIJ", // Example ID
};


// ===================================================================================
// DATA ACCESS FUNCTIONS
// ===================================================================================

export async function createUserInDb(firebaseUser: FirebaseUser, trackingData: { utmSource?: string; utmMedium?: string; utmCampaign?: string; utmContent?: string; utmTerm?: string; }): Promise<User> {
    console.log(`Attempting to create user ${firebaseUser.uid} in Firestore.`);
    const newUser: User = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
        email: firebaseUser.email!,
        avatar: firebaseUser.photoURL || `https://i.pravatar.cc/150?u=${firebaseUser.uid}`,
        plan: 'Gratuito',
        signupDate: new Date().toISOString(),
        status: 'Ativo',
        companyId: `comp_${firebaseUser.uid}`, // Each new user is the owner of their own "company"
        role: 'Dono',
        adminRole: 'Nenhum',
        adminPermissions: [],
        aiReportsGenerated: 0, // Inicializar contador de relatórios
        reportGenerationTimestamp: new Date().toISOString(), // Inicializar timestamp
        ...trackingData,
    };
    
    // For "gustpaz@gmail.com", grant Super Admin rights
    if (newUser.email === 'gustpaz@gmail.com') {
        newUser.adminRole = 'Super Admin';
        newUser.adminPermissions = ['dashboard', 'plans', 'users', 'payments', 'marketing', 'tracking', 'integrations', 'support'];
    }

    const userDocRef = doc(db, 'users', newUser.id);
    await setDoc(userDocRef, newUser);
    console.log(`User ${firebaseUser.uid} successfully created in Firestore.`);
    
    return newUser;
}

export async function getUserById(userId: string): Promise<User | undefined> {
    if (!userId) return undefined;
    const userDocRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userDocRef).catch(serverError => {
        if (serverError.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userDocRef.path, operation: 'get' }));
        }
        throw serverError;
    });

    if (userSnap.exists()) {
        return userSnap.data() as User;
    }
    
    // Fallback to mock data only if not found in Firestore
    const mockUser = adminData.users.find(u => u.id === userId);
    if (mockUser) return mockUser;

    return undefined;
}


export async function verifyAdmin(userId: string, requiredPermission?: AdminPermission): Promise<User> {
    const user = await getUserById(userId);

    if (!user) {
        throw new Error("Usuário não encontrado.");
    }

    const isSuperAdmin = user.adminRole === 'Super Admin';
    const hasPermission = user.adminPermissions?.includes(requiredPermission!);

    if (isSuperAdmin || hasPermission) {
        return user;
    }

    throw new Error("Acesso negado. Você não tem permissão para executar esta ação.");
}


export async function getAdminDashboardData(): Promise<AdminDashboardData> {
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
    const usersCollection = collection(db, 'users');
    const allUsersSnapshot = await getDocs(usersCollection);
    const allUsers = allUsersSnapshot.docs.map(doc => doc.data() as User);
    
    return {
        totalUsers: allUsers.length,
        mrr: adminData.dashboardMetrics.mrr, // This would need a proper calculation
        activeToday: adminData.dashboardMetrics.activeToday,
        totalTransactions: adminData.dashboardMetrics.totalTransactions,
        recentUsers: [...allUsers].sort((a,b) => new Date(b.signupDate).getTime() - new Date(a.signupDate).getTime()).slice(0, 4),
        featureFlags: adminData.featureFlags,
    }
}

export async function updateFeatureFlags(flags: FeatureFlags, auditInfo: AuditInfo) {
    const oldFlags = { ...adminData.featureFlags };
    adminData.featureFlags = flags;

    const changes = Object.keys(flags).filter(key => flags[key as keyof FeatureFlags] !== oldFlags[key as keyof FeatureFlags])
        .map(key => `${key} foi ${flags[key as keyof FeatureFlags] ? 'ativada' : 'desativada'}`).join(', ');

    if (changes) {
        await addAuditLogDB({
            ...auditInfo,
            action: 'update',
            entity: 'feature_flags',
            entityId: 'global_flags',
            date: new Date().toISOString(),
            details: `Funcionalidades atualizadas: ${changes}.`,
        });
    }

    return adminData.featureFlags;
}

export async function getCampaigns(): Promise<Campaign[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return adminData.campaigns;
}

export async function addCampaign(): Promise<Campaign> {
    const newCampaign = {
        id: adminData.campaigns.length + 1,
        name: `Nova Campanha #${adminData.campaigns.length + 1}`,
        status: "Rascunho" as const,
        sent: 0,
        openRate: "N/A",
        clickRate: "N/A",
    };
    adminData.campaigns.push(newCampaign);
    return newCampaign;
}

export async function getPaymentsData(): Promise<PaymentsData> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
        monthlyRevenue: 8245.50,
        newSubscriptions: 275,
        churnRate: 4.1,
        payments: adminData.payments,
    }
}

export async function updatePaymentStatus(paymentId: string, status: "Pago" | "Falhou", auditInfo: AuditInfo): Promise<Payment> {
    const payment = adminData.payments.find(p => p.id === paymentId);
    if (!payment) throw new Error("Payment not found");
    payment.status = status;

    if (status === 'Pago') {
        const user = await getUserById(auditInfo.userId); // Assuming admin action implies user context
        if (user && user.status === 'Inativo') {
            user.status = 'Ativo';
            await updateUser(user, {userId: 'admin', userName: 'System'});
        }
    }
    
    return payment;
}

export async function getPlans(): Promise<Plan[]> {
  await new Promise(resolve => setTimeout(resolve, 300));
  return adminData.plans;
}


export async function getPlanByName(name: string): Promise<Plan | undefined> {
    return adminData.plans.find(p => p.name === name);
}

export async function savePlan(plan: Plan, auditInfo: AuditInfo): Promise<Plan> {
    const index = adminData.plans.findIndex(p => p.id === plan.id);
    let action: 'create' | 'update' = 'update';
    let savedPlan: Plan;

    if (index > -1) {
        savedPlan = adminData.plans[index] = { ...adminData.plans[index], ...plan };
    } else {
        action = 'create';
        savedPlan = { ...plan, id: `plan_${Date.now()}` };
        adminData.plans.push(savedPlan);
    }
    
    await addAuditLogDB({
        ...auditInfo,
        action: action,
        entity: 'plan',
        entityId: savedPlan.id,
        date: new Date().toISOString(),
        details: `Plano "${savedPlan.name}" foi ${action === 'create' ? 'criado' : 'atualizado'}.`,
    });

    return savedPlan;
}

export async function findUserByStripeCustomerId(customerId: string): Promise<User | undefined> {
    const usersCollection = collection(db, 'users');
    const q = query(usersCollection, where("stripeCustomerId", "==", customerId));
    const snapshot = await getDocs(q).catch(serverError => {
        if (serverError.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: usersCollection.path, operation: 'list' }));
        }
        throw serverError;
    });
    if (snapshot.empty) {
        return adminData.users.find(u => u.stripeCustomerId === customerId); // Fallback to mock
    }
    return snapshot.docs[0].data() as User;
}

export async function updateUser(user: User, auditInfo: AuditInfo): Promise<User> {
    const savedUser = await updateUserInDb(user, auditInfo);
    
    // Update local mock data if user exists there
    const index = adminData.users.findIndex(u => u.id === user.id);
    if (index > -1) {
        adminData.users[index] = savedUser;
    }
    
    return savedUser;
}

export async function deleteUser(userId: string, auditInfo: AuditInfo): Promise<{ success: boolean }> {
    const userToDelete = await getUserById(userId);
    if (!userToDelete) {
        throw new Error("User to delete not found.");
    }

    const docRef = doc(db, 'users', userId);
    await deleteDoc(docRef).catch(serverError => {
        if (serverError.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'delete' }));
        }
        throw serverError;
    });

    // Also remove from mock data for consistency during transition
    const index = adminData.users.findIndex(u => u.id === userId);
    if (index > -1) {
        adminData.users.splice(index, 1);
    }
    
    await addAuditLogDB({
        ...auditInfo,
        action: 'delete',
        entity: 'user',
        entityId: userId,
        details: `Usuário "${userToDelete.name}" (${userToDelete.email}) foi excluído.`,
        date: new Date().toISOString(),
    });
    
    return { success: true };
}

// Admin-facing function to get all tickets.
export async function getSupportTickets(): Promise<SupportTicket[]> {
    const ticketsGroup = collectionGroup(db, 'tickets');
    const snapshot = await getDocs(ticketsGroup).catch(serverError => {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: 'tickets', // Special path for collectionGroup query
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw serverError;
    });
    return snapshot.docs.map(d => ({id: d.id, ...d.data() } as SupportTicket)).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Admin-facing function to update ticket status.
export async function updateSupportTicketStatus(ticketId: string, status: SupportTicket['status'], auditInfo: AuditInfo): Promise<SupportTicket> {
    const ticket = await getTicketById(ticketId);
    if (!ticket) throw new Error("Ticket not found");
    
    const ticketRef = doc(db, `users/${ticket.userId}/tickets`, ticketId);

    const oldStatus = ticket.status;
    ticket.status = status;
    ticket.updatedAt = new Date().toISOString();
    
    const updatePayload = { status: status, updatedAt: new Date() };
    await updateDoc(ticketRef, updatePayload).catch(serverError => {
        if (serverError.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: ticketRef.path,
                operation: 'update',
                requestResourceData: updatePayload
            }));
        }
        throw serverError;
    });

    await addAuditLogDB({
        ...auditInfo,
        action: 'update',
        entity: 'support_ticket',
        entityId: ticket.id,
        date: new Date().toISOString(),
        details: `Status do ticket #${ticket.id.slice(-6)} alterado de "${oldStatus}" para "${status}".`,
    });

    return ticket;
}

export async function getTicketById(ticketId: string): Promise<SupportTicket | undefined> {
    const ticketsGroup = collectionGroup(db, 'tickets');
    const q = query(ticketsGroup, where('__name__', '==', `*/${ticketId}`));
    const snapshot = await getDocs(q).catch(serverError => {
        if (serverError.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: 'tickets', // Path for collection group query
                operation: 'list' // `getDocs` on a collection group is a `list` operation
            }));
        }
        throw serverError;
    });

    if (snapshot.empty) return undefined;

    const docSnap = snapshot.docs[0];
    const data = docSnap.data();
    
    const pathParts = docSnap.ref.path.split('/');
    const userId = pathParts[1]; 
    
    return { 
        id: docSnap.id, 
        ...data,
        userId: userId,
        createdAt: (data.createdAt as any).toDate().toISOString(),
        updatedAt: (data.updatedAt as any).toDate().toISOString(),
    } as SupportTicket;
}


// Admin-facing function to add a reply.
export async function addTicketReply(ticketId: string, reply: Omit<TicketReply, 'id' | 'createdAt'>): Promise<TicketReply> {
    const ticket = await getTicketById(ticketId);
    if (!ticket) throw new Error("Ticket not found");

    const newReply: TicketReply = {
        ...reply,
        id: `rep_${Date.now()}`,
        createdAt: new Date().toISOString(),
    };

    const ticketRef = doc(db, `users/${ticket.userId}/tickets`, ticketId);
    
    const currentReplies = ticket.replies || [];
    
    const updatedData = {
        replies: [...currentReplies, newReply],
        updatedAt: new Date(),
        status: reply.authorRole === 'admin' && ticket.status === 'Aberto' ? 'Em Andamento' : ticket.status
    };

    await updateDoc(ticketRef, updatedData).catch(serverError => {
        if (serverError.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: ticketRef.path,
                operation: 'update',
                requestResourceData: updatedData
            }));
        }
        throw serverError;
    });
    
    return newReply;
}

export async function inviteNewTeamMember(
  companyId: string, 
  email: string,
  inviterName: string,
  companyName: string,
  ownerPlan: string
): Promise<{ user?: User; inviteLink?: string }> {
    const usersCollection = collection(db, 'users');
    const q = query(usersCollection, where("email", "==", email));
    const snapshot = await getDocs(q);

    // Verificar se usuário já existe
    if (!snapshot.empty) {
        const existingUser = snapshot.docs[0].data() as User;
        
        if (existingUser.companyId) {
            throw new Error("Usuário já pertence a uma equipe.");
        }
        
        // Usuário existe mas não está em equipe
        // Criar convite para ele aceitar
        const { createInvite } = await import('./invite-tokens');
        const { inviteLink } = await createInvite(
          email,
          companyId,
          '', // invitedBy será preenchido pela action
          inviterName,
          companyName,
          ownerPlan
        );
        
        return { user: existingUser, inviteLink };
    }
    
    // Usuário não existe - criar convite
    const { createInvite } = await import('./invite-tokens');
    const { inviteLink } = await createInvite(
      email,
      companyId,
      '',
      inviterName,
      companyName,
      ownerPlan
    );
    
    return { inviteLink };
}

export async function removeTeamMemberById(memberId: string): Promise<void> {
    const memberDocRef = doc(db, 'users', memberId);
    const memberSnap = await getDoc(memberDocRef);

    if (memberSnap.exists()) {
        await setDoc(memberDocRef, { companyId: undefined, role: undefined }, { merge: true });
    } else {
        throw new Error("Membro não encontrado para remover.");
    }
}

export async function getTrackingSettings(): Promise<TrackingSettings> {
    await new Promise(resolve => setTimeout(resolve, 200));
    // In a real app, this would read from a file or database.
    return trackingSettings;
}

export async function saveTrackingSettings(settings: TrackingSettings, auditInfo: AuditInfo): Promise<TrackingSettings> {
    await new Promise(resolve => setTimeout(resolve, 200));
    // In a real app, this would write to a file or database.
    trackingSettings = settings;

    // We don't have auditInfo here, but in a real scenario, you'd get it from the user session.
    await addAuditLogDB({
        userId: 'admin-user', // Placeholder
        userName: 'Admin', // Placeholder
        action: 'update',
        entity: 'tracking',
        entityId: 'global_settings',
        date: new Date().toISOString(),
        details: `Configurações de rastreamento atualizadas. Pixel ID: ${settings.metaPixelId}`,
    });

    return trackingSettings;
}

export async function getUsers(): Promise<User[]> {
    const usersCollection = collection(db, 'users');
    const snapshot = await getDocs(usersCollection).catch(serverError => {
        if (serverError.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: usersCollection.path, operation: 'list' }));
        }
        throw serverError;
    });
    return snapshot.docs.map(doc => doc.data() as User);
}

// Function to fetch team members safely.
export async function fetchTeamMembers(actorId: string): Promise<User[]> {
    return dbFetchTeamMembers(actorId);
}


// Exporting the raw data object for potential direct use if needed (not recommended for actions)
export { adminData };

    