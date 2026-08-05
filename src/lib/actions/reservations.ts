"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyMany } from "@/lib/notify";
import { revalidatePath } from "next/cache";

export type ReservationInput = {
  room: string;
  date: string;
  start_time: string;
  end_time: string;
  group_name?: string | null;
  purpose: string;
};

export async function requestRoomReservation(input: ReservationInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };

  const room = (input.room ?? "").replace(/\s*\(.*\)/, "").trim();
  const purpose = (input.purpose ?? "").trim();
  if (!room || !input.date || !purpose) return { error: "Salle, date et motif requis" as const };

  const { data, error } = await supabase
    .from("room_reservations")
    .insert({
      requested_by: user.id,
      room,
      date: input.date,
      start_time: input.start_time,
      end_time: input.end_time,
      group_name: input.group_name?.trim() || null,
      purpose,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Notifie le staff (admin/pasteur)
  try {
    const admin = createAdminClient();
    const { data: staff } = await admin
      .from("profiles").select("id").in("role", ["admin", "pasteur"]);
    const ids = (staff ?? []).map(s => s.id as string).filter(id => id !== user.id);
    if (ids.length) {
      await notifyMany(ids, {
        type: "system",
        title: "🏢 Demande de réservation de salle",
        body: `${room} — ${new Date(input.date).toLocaleDateString("fr-CH")} ${input.start_time}–${input.end_time} · ${purpose}`,
        link: "/espace-membres?panel=agenda",
      });
    }
  } catch { /* la notif ne doit pas bloquer la demande */ }

  revalidatePath("/espace-membres");
  return { id: data.id };
}

export async function listMyReservations() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };
  const { data, error } = await supabase
    .from("room_reservations")
    .select("*")
    .eq("requested_by", user.id)
    .order("date", { ascending: true });
  if (error) return { error: error.message };
  return { data: data ?? [] };
}
