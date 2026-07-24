// CRM pastoral — Résolution de segment (Phase 6)
// Traduit un jeu de filtres (identiques à la liste CRM) en une liste de membres.
// Partagé entre la page communication (aperçu) et l'action d'envoi (autorité
// serveur) pour garantir que l'aperçu == les destinataires réels.

import type { SupabaseClient } from "@supabase/supabase-js";
import { computeEngagement, type EngagementStatus } from "./engagement";

export interface SegmentFilters {
  q?: string;
  stage?: string;
  tag?: string;
  group?: string;
  engagement?: string;
}

export interface SegmentMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

export interface SendSegmentResult {
  error?: string;
  success?: boolean;
  sent?: number;
  failed?: number;
  total?: number;
  noEmail?: number;
}

export function hasSegmentFilter(f: SegmentFilters): boolean {
  return !!(f.q || f.stage || f.tag || f.group || f.engagement);
}

/**
 * Résout les membres validés correspondant au segment. Utilise le client admin
 * (accès à tous les profils + emails). L'engagement est recalculé si filtré.
 */
export async function resolveSegment(admin: SupabaseClient, f: SegmentFilters): Promise<SegmentMember[]> {
  const { data } = await admin
    .from("profiles")
    .select("id, first_name, last_name, email, groups, crm_tags, pastoral_stage")
    .eq("validated", true);

  let list = (data ?? []) as Array<Record<string, unknown>>;

  const q = f.q?.trim().toLowerCase();
  if (q) {
    list = list.filter(m => {
      const name = [m.first_name, m.last_name].filter(Boolean).join(" ").toLowerCase();
      const tags = (m.crm_tags as string[] | null) ?? [];
      return name.includes(q) || tags.some(t => t.toLowerCase().includes(q));
    });
  }
  if (f.stage)  list = list.filter(m => ((m.pastoral_stage as string | null) ?? "visiteur") === f.stage);
  if (f.tag)    list = list.filter(m => ((m.crm_tags as string[] | null) ?? []).includes(f.tag!));
  if (f.group)  list = list.filter(m => ((m.groups as string[] | null) ?? []).includes(f.group!));

  if (f.engagement) {
    const since90 = Date.now() - 90 * 24 * 3600 * 1000;
    const [att, int] = await Promise.all([
      admin.from("event_attendance").select("user_id, checked_in_at"),
      admin.from("member_interactions").select("member_id, occurred_at"),
    ]);
    const lastAtt = new Map<string, string>();
    const count90 = new Map<string, number>();
    for (const a of att.data ?? []) {
      const uid = a.user_id as string; const at = a.checked_in_at as string | null;
      if (!at) continue;
      if (!lastAtt.has(uid) || new Date(at) > new Date(lastAtt.get(uid)!)) lastAtt.set(uid, at);
      if (new Date(at).getTime() >= since90) count90.set(uid, (count90.get(uid) ?? 0) + 1);
    }
    const lastInt = new Map<string, string>();
    for (const it of int.data ?? []) {
      const mid = it.member_id as string; const at = it.occurred_at as string | null;
      if (!at) continue;
      if (!lastInt.has(mid) || new Date(at) > new Date(lastInt.get(mid)!)) lastInt.set(mid, at);
    }
    list = list.filter(m => {
      const id = m.id as string;
      const st: EngagementStatus = computeEngagement({
        lastAttendanceAt:   lastAtt.get(id) ?? null,
        attendanceCount90d: count90.get(id) ?? 0,
        lastInteractionAt:  lastInt.get(id) ?? null,
      }).status;
      return st === f.engagement;
    });
  }

  return list.map(m => ({
    id: m.id as string,
    first_name: (m.first_name as string | null) ?? null,
    last_name:  (m.last_name as string | null) ?? null,
    email:      (m.email as string | null) ?? null,
  }));
}
