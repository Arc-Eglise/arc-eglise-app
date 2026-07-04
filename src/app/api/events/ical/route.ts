import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function escapeIcal(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function formatDate(dateStr: string, timeStr?: string | null): string {
  const date = new Date(dateStr + (timeStr ? `T${timeStr}` : "T00:00:00"));
  if (timeStr) {
    // DATETIME format
    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  }
  // DATE format
  return dateStr.replace(/-/g, "");
}

export async function GET() {
  const supabase = createClient();

  const { data: events } = await supabase
    .from("events")
    .select("id, title, date, time_start, time_end, location, description")
    .eq("is_published", true)
    .gte("date", new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0])
    .order("date", { ascending: true })
    .limit(50);

  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ARC Eglise//ARC Agenda//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:ARC — Ambassade du Royaume de Christ",
    "X-WR-CALDESC:Événements de l'église ARC La Chaux-de-Fonds",
    "X-WR-TIMEZONE:Europe/Zurich",
  ];

  for (const ev of events ?? []) {
    const dtstart = ev.time_start
      ? `DTSTART;TZID=Europe/Zurich:${formatDate(ev.date, ev.time_start).slice(0, -1)}`
      : `DTSTART;VALUE=DATE:${formatDate(ev.date)}`;

    const dtend = ev.time_end
      ? `DTEND;TZID=Europe/Zurich:${formatDate(ev.date, ev.time_end).slice(0, -1)}`
      : ev.time_start
      ? `DTEND;TZID=Europe/Zurich:${formatDate(ev.date, ev.time_start).slice(0, -1)}`
      : `DTEND;VALUE=DATE:${formatDate(ev.date)}`;

    lines.push(
      "BEGIN:VEVENT",
      `UID:${ev.id}@arc-eglise.ch`,
      `DTSTAMP:${now}`,
      dtstart,
      dtend,
      `SUMMARY:${escapeIcal(ev.title)}`,
      ...(ev.location ? [`LOCATION:${escapeIcal(ev.location)}`] : []),
      ...(ev.description ? [`DESCRIPTION:${escapeIcal(ev.description)}`] : []),
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="arc-eglise-agenda.ics"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
