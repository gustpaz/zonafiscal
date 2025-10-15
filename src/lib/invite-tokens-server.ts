/**
 * Server-side functions for invite token management
 * Uses Firebase Admin SDK for server-side operations
 */

import { adminDb } from "./firebase-admin";
import type { Invite } from "./types";

/**
 * Server-side version of createInvite using Firebase Admin SDK
 */
export async function createInviteServer(
  email: string,
  companyId: string,
  invitedBy: string,
  inviterName: string,
  companyName: string,
  ownerPlan: string
): Promise<{ invite: Invite; inviteLink: string }> {
  const inviteId = `${companyId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const token = `${inviteId}_${Math.random().toString(36).substr(2, 9)}`;
  
  const invite: Invite = {
    id: inviteId,
    email,
    companyId,
    invitedBy,
    inviterName,
    companyName,
    ownerPlan,
    token,
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
  };

  // Save to Firestore using Admin SDK
  await adminDb.collection('invites').doc(inviteId).set(invite);
  
  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/accept-invite?token=${token}`;
  
  return { invite, inviteLink };
}
