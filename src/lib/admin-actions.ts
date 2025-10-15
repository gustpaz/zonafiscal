

'use server';

import {
  getAdminDashboardData as getDashboardData,
  getCampaigns as getCampaignsData,
  addCampaign as addCampaignData,
  getPaymentsData as getPaymentsDataDB,
  updatePaymentStatus as updatePaymentStatusDB,
  getPlans as getPlansData,
  savePlan as savePlanData,
  getUsers as getUsersData,
  updateUser as updateUserDB,
  deleteUser as deleteUserDB,
  updateFeatureFlags as updateFeatureFlagsDB,
  getSupportTickets,
  updateSupportTicketStatus,
  getTicketById as getTicketByIdDB,
  addTicketReply as addTicketReplyDB,
  verifyAdmin,
  getTrackingSettings as getTrackingSettingsData,
  saveTrackingSettings as saveTrackingSettingsData,
} from "./admin-data";
import type { Plan, SupportTicket, TicketReply, TrackingSettings, User as AppUser } from "./types";
import { revalidatePath } from "next/cache";

type AuditInfo = { userId: string, userName: string };

// Server actions to interact with the centralized admin data source.
// This simulates a backend API layer for the admin panel.

export async function getAdminDashboardData() {
  return getDashboardData();
}

export async function updateFeatureFlags(flags: { pdfExport: boolean, csvImport: boolean }, auditInfo: AuditInfo) {
    await verifyAdmin(auditInfo.userId, 'dashboard'); // Apenas admins com acesso ao dashboard podem mudar
    const result = await updateFeatureFlagsDB(flags, auditInfo);
    revalidatePath("/admin/dashboard");
    revalidatePath("/audit");
    return result;
}

export async function getCampaigns() {
  return getCampaignsData();
}

export async function addCampaign() {
  const result = await addCampaignData();
  revalidatePath("/admin/marketing");
  return result;
}

export async function getPaymentsData() {
    return getPaymentsDataDB();
}

export async function updatePaymentStatus(paymentId: string, status: "Pago" | "Falhou", auditInfo: AuditInfo) {
    await verifyAdmin(auditInfo.userId, 'payments');
    const result = await updatePaymentStatusDB(paymentId, status, auditInfo);
    revalidatePath("/admin/payments");
    return result;
}

export async function getPlans() {
    return getPlansData();
}

export async function savePlan(plan: Plan, auditInfo: AuditInfo) {
    await verifyAdmin(auditInfo.userId, 'plans');
    const result = await savePlanData(plan, auditInfo);
    revalidatePath("/admin/plans");
    revalidatePath("/audit");
    return result;
}

export async function getUsers() {
    return getUsersData();
}

export async function updateUser(user: AppUser, auditInfo: AuditInfo) {
    // Admin action can update any user, so we don't verify ownership here, but we do verify admin permission.
    await verifyAdmin(auditInfo.userId, 'users');
    const result = await updateUserDB(user, auditInfo);
    revalidatePath("/admin/users");
    revalidatePath("/audit");
    return result;
}

export async function deleteUser(userId: string, auditInfo: AuditInfo) {
    await verifyAdmin(auditInfo.userId, 'users');
    const result = await deleteUserDB(userId, auditInfo);
    revalidatePath("/admin/users");
    revalidatePath("/audit");
    return result;
}

// Support Ticket Admin Actions
export async function getTickets() {
    return getSupportTickets();
}

export async function updateTicketStatus(ticketId: string, status: SupportTicket['status'], auditInfo: AuditInfo) {
    await verifyAdmin(auditInfo.userId, 'support');
    const result = await updateSupportTicketStatus(ticketId, status, auditInfo);
    revalidatePath("/admin/support");
    revalidatePath(`/support/${ticketId}`);
    revalidatePath("/audit");
    return result;
}

export async function getTicketById(ticketId: string) {
    return getTicketByIdDB(ticketId);
}

export async function addTicketReply(ticketId: string, reply: Omit<TicketReply, 'id' | 'createdAt'>, auditInfo: AuditInfo) {
    await verifyAdmin(auditInfo.userId, 'support');
    const result = await addTicketReplyDB(ticketId, reply);
    revalidatePath(`/support/${ticketId}`);
    return result;
}

// Tracking Settings Actions
export async function getTrackingSettings() {
    return getTrackingSettingsData();
}

export async function saveTrackingSettings(settings: TrackingSettings, auditInfo: AuditInfo) {
    await verifyAdmin(auditInfo.userId, 'tracking');
    const result = await saveTrackingSettingsData(settings, auditInfo);
    revalidatePath("/admin/tracking");
    return result;
}
