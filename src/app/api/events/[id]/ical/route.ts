import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function pad(n: number) { return String(n).padStart(2, "0"); }

function toIcalDate(date: string, time: string | null): string {
  const d = new Date(date + "T" + (time ?? "00:00:00"));
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    "00Z"
  );
}

function escapeIcal(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Non autorisé", { status: 401 });

  const { data: ev } = await supabase
    .from("events")
    .select("id, title, description, date, time_start, time_end, location")
    .eq("id", params.id)
    .eq("is_published", true)
    .single();

  if (!ev) return new NextResponse("Événement introuvable", { status: 404 });

  const dtstart = toIcalDate(ev.date, ev.time_start);
  const dtend   = toIcalDate(ev.date, ev.time_end ?? ev.time_start);
  const now     = toIcalDate(new Date().toISOString().split("T")[0], new Date().toTimeString().slice(0, 8));

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ARC Eglise//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${ev.id}@arc-eglise.ch`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeIcal(ev.title)}`,
    ev.description ? `DESCRIPTION:${escapeIcal(ev.description)}` : "",
    ev.location    ? `LOCATION:${escapeIcal(ev.location)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");

  const slug = ev.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.ics"`,
    },
  });
}
