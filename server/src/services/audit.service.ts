import { prisma } from "../utils/prisma";

// ── Audit action vocabulary ───────────────────────────────────────────────────

export type AuditAction =
  // Generic
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"
  | "ACTIVATED"
  // Settings & rules
  | "SETTING_CHANGED"
  | "RULE_CREATED"
  | "RULE_UPDATED"
  | "RULE_DELETED"
  // KYC
  | "KYC_APPROVED"
  | "KYC_REJECTED"
  // Users
  | "ROLE_CHANGED"
  | "USER_CREATED"
  | "USER_DELETED"
  // 2FA
  | "TWO_FACTOR_ENABLED"
  | "TWO_FACTOR_DISABLED"
  // Content
  | "STORY_APPROVED"
  | "STORY_REJECTED"
  // Finance
  | "WITHDRAWAL_APPROVED"
  | "WITHDRAWAL_REJECTED"
  | "INVESTMENT_APPROVED"
  | "INVESTMENT_REJECTED";

// ── Target type vocabulary (not an enum — easy to extend) ─────────────────────

export type AuditTargetType =
  | "USER"
  | "STORY"
  | "EPISODE"
  | "INVESTMENT"
  | "INVESTMENT_REQUEST"
  | "WITHDRAWAL"
  | "AUTO_APPROVAL_RULE"
  | "PLATFORM_SETTING"
  | "QUIZ_SESSION"
  | "CATEGORY";

// ── Core log function ─────────────────────────────────────────────────────────

export interface AuditLogParams {
  adminId: string;
  action: AuditAction;
  targetType: AuditTargetType | string;
  targetId: string;
  oldValue?: unknown;
  newValue?: unknown;
  ip?: string;
}

/**
 * Persist an immutable audit record. Fire-and-forget safe — errors are logged
 * but never thrown to avoid disrupting the main request flow.
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
  await prisma.auditLog
    .create({
      data: {
        adminId: params.adminId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        oldValue:
          params.oldValue !== undefined ? (params.oldValue as never) : undefined,
        newValue:
          params.newValue !== undefined ? (params.newValue as never) : undefined,
        ip: params.ip,
      },
    })
    .catch((err) => console.error("[audit]", err));
}

// ── Convenience wrappers for common operations ────────────────────────────────

export function auditApproval(
  adminId: string,
  targetType: string,
  targetId: string,
  ip?: string
) {
  return createAuditLog({ adminId, action: "APPROVED", targetType, targetId, ip });
}

export function auditRejection(
  adminId: string,
  targetType: string,
  targetId: string,
  reason?: string,
  ip?: string
) {
  return createAuditLog({
    adminId,
    action: "REJECTED",
    targetType,
    targetId,
    newValue: reason ? { reason } : undefined,
    ip,
  });
}

export function auditSuspension(
  adminId: string,
  targetId: string,
  reason?: string,
  ip?: string
) {
  return createAuditLog({
    adminId,
    action: "SUSPENDED",
    targetType: "USER",
    targetId,
    newValue: reason ? { reason } : undefined,
    ip,
  });
}

export function auditSettingChange(
  adminId: string,
  settingKey: string,
  oldValue: unknown,
  newValue: unknown,
  ip?: string
) {
  return createAuditLog({
    adminId,
    action: "SETTING_CHANGED",
    targetType: "PLATFORM_SETTING",
    targetId: settingKey,
    oldValue,
    newValue,
    ip,
  });
}

export function auditRoleChange(
  adminId: string,
  targetUserId: string,
  oldRole: string,
  newRole: string,
  ip?: string
) {
  return createAuditLog({
    adminId,
    action: "ROLE_CHANGED",
    targetType: "USER",
    targetId: targetUserId,
    oldValue: { role: oldRole },
    newValue: { role: newRole },
    ip,
  });
}
