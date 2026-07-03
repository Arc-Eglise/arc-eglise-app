"use client";

import { useState, useTransition } from "react";
import { rsvpEvent, checkInEvent, cancelCheckIn } from "@/lib/actions/membres";

type RsvpStatus = "going" | "maybe" | "declined" | null;

interface RsvpCounts { going: number; maybe: number }

interface EventCardProps {
  event: {
    id: string;
    title: string;
    description: string | null;
    date: string;
    time_start: string | null;
    time_end: string | null;
    location: string | null;
    capacity: number | null;
    price_chf: number;
    tags: string[];
  };
  myRsvp: RsvpStatus;
  counts: RsvpCounts;
  attendCount: number;
  myCheckedIn: string | null;
  isPast: boolean;
  isAdmin: boolean;
  attendees: { userId: string; name: string }[];
}

const BTNS: { status: "going" | "maybe" | "declined"; label: string; icon: string; active: string; inactive: string }[] = [
  { status: "going",    label: "J'y vais",        icon: "✓", active: "bg-green-500 text-white border-green-500",   inactive: "border-arc-border text-arc-text2 hover:border-green-400 hover:text-green-600" },
  { status: "maybe",   label: "Peut-être",        icon: "?", active: "bg-arc-blue text-white border-arc-blue",     inactive: "border-arc-border text-arc-text2 hover:border-arc-blue hover:text-arc-blue" },
  { status: "declined", label: "Je n'y vais pas", icon: "✕", active: "bg-red-400 text-white border-red-400",       inactive: "border-arc-border text-arc-text2 hover:border-red-400 hover:text-red-500" },
];

function RsvpButtons({ eventId, initial, counts }: { eventId: string; initial: RsvpStatus; counts: RsvpCounts }) {
  const [status, setStatus]         = useState<RsvpStatus>(initial);
  const [liveGoing, setLiveGoing]   = useState(counts.going);
  const [liveMaybe, setLiveMaybe]   = useState(counts.maybe);
  const [, startTransition]         = useTransition();
  const [pending, setPending]       = useState(false);

  function handleRsvp(next: "going" | "maybe" | "declined") {
    const prev   = status;
    const chosen = prev === next ? null : next;
    setPending(true);
    setStatus(chosen);
    if (prev === "going")    setLiveGoing(g => Math.max(0, g - 1));
    if (prev === "maybe")    setLiveMaybe(m => Math.max(0, m - 1));
    if (chosen === "going")  setLiveGoing(g => g + 1);
    if (chosen === "maybe")  setLiveMaybe(m => m + 1);
    startTransition(async () => {
      const res = await rsvpEvent(eventId, chosen);
      setPending(false);
      if (res.error) {
        setStatus(prev);
        if (prev === "going")    setLiveGoing(g => g + 1);
        if (prev === "maybe")    setLiveMaybe(m => m + 1);
        if (chosen === "going")  setLiveGoing(g => Math.max(0, g - 1));
        if (chosen === "maybe")  setLiveMaybe(m => Math.max(0, m - 1));
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {BTNS.map(btn => (
        <button
          key={btn.status}
          onClick={() => handleRsvp(btn.status)}
          disabled={pending}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
            status === btn.status ? btn.active : btn.inactive
          } disabled:opacity-50`}
        >
          <span className="text-[10px]">{btn.icon}</span>
          {btn.label}
        </button>
      ))}
      <div className="ml-auto flex items-center gap-3 text-[11px] text-arc-text3">
        {liveGoing > 0 && <span><span className="text-green-500">✓</span> {liveGoing} participant{liveGoing > 1 ? "s" : ""}</span>}
        {liveMaybe > 0 && <span><span className="text-arc-blue">?</span> {liveMaybe} peut-être</span>}
      </div>
    </div>
  );
}

function CheckInButton({ eventId, initialCheckedIn, initialAttendCount }: {
  eventId: string;
  initialCheckedIn: string | null;
  initialAttendCount: number;
}) {
  const [checkedIn, setCheckedIn]   = useState<string | null>(initialCheckedIn);
  const [count, setCount]           = useState(initialAttendCount);
  const [pending, setPending]       = useState(false);
  const [, startTransition]         = useTransition();

  function handleCheckIn() {
    if (checkedIn) {
      // Annuler
      setPending(true);
      setCheckedIn(null);
      setCount(c => Math.max(0, c - 1));
      startTransition(async () => { await cancelCheckIn(eventId); setPending(false); });
    } else {
      setPending(true);
      const now = new Date().toISOString();
      setCheckedIn(now);
      setCount(c => c + 1);
      startTransition(async () => { await checkInEvent(eventId); setPending(false); });
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={handleCheckIn}
        disabled={pending}
        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all disabled:opacity-50 ${
          checkedIn
            ? "bg-green-500 text-white border-green-500 hover:bg-green-600"
            : "bg-white border-arc-border text-arc-text2 hover:border-green-400 hover:text-green-600"
        }`}
      >
        {checkedIn ? "✓ Présent(e)" : "Pointer ma présence"}
      </button>
      {checkedIn && (
        <span className="text-[11px] text-arc-text3">
          Enregistré le {new Date(checkedIn).toLocaleDateString("fr-CH")}
        </span>
      )}
      {count > 0 && (
        <span className="ml-auto text-[11px] text-arc-text3">
          {count} présence{count > 1 ? "s" : ""} enregistrée{count > 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}

function AdminAttendees({ attendees, rsvpGoing, attendCount }: {
  attendees: { userId: string; name: string }[];
  rsvpGoing: number;
  attendCount: number;
}) {
  const [open, setOpen] = useState(false);
  const rate = rsvpGoing > 0 ? Math.round((attendCount / rsvpGoing) * 100) : null;

  return (
    <div className="mt-2 border-t border-arc-border pt-2">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-[11px] text-arc-blue hover:underline"
      >
        <span className="font-bold">📊 Rapport présences</span>
        <span className="text-arc-text3">
          {attendCount} présent{attendCount !== 1 ? "s" : ""}
          {rate !== null ? ` (${rate}% des RSVP "J'y vais")` : ""}
        </span>
        <span>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-2 bg-arc-bg rounded-xl p-3">
          {attendees.length === 0 ? (
            <p className="text-xs text-arc-text3">Aucune présence enregistrée.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {attendees.map(a => (
                <span key={a.userId} className="text-xs bg-white border border-arc-border rounded-full px-2.5 py-1 text-arc-navy">
                  ✓ {a.name}
                </span>
              ))}
            </div>
          )}
          {rsvpGoing > 0 && (
            <div className="mt-2 text-[10px] text-arc-text3">
              RSVP "J&apos;y vais" : {rsvpGoing} · Présents : {attendCount}
              {rate !== null && ` · Taux : ${rate}%`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function EventCard({ event: ev, myRsvp, counts, attendCount, myCheckedIn, isPast, isAdmin, attendees }: EventCardProps) {
  const d = new Date(ev.date + "T00:00:00");

  return (
    <div className={`bg-white border rounded-2xl p-5 flex gap-5 ${isPast ? "border-arc-border opacity-80" : "border-arc-border"}`}>
      <div className={`flex-shrink-0 text-center rounded-xl px-4 py-3 min-w-[64px] ${isPast ? "bg-gray-100" : "bg-arc-blueBg"}`}>
        <div className={`font-serif text-3xl font-bold leading-none ${isPast ? "text-arc-text3" : "text-arc-navy"}`}>
          {d.getDate()}
        </div>
        <div className={`text-[10px] font-bold uppercase mt-0.5 ${isPast ? "text-arc-text3" : "text-arc-blue"}`}>
          {d.toLocaleDateString("fr-CH", { month: "short" })}
        </div>
        {isPast && <div className="text-[8px] font-bold text-arc-text3 mt-0.5 uppercase">passé</div>}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
          <h3 className="font-bold text-arc-navy">{ev.title}</h3>
          {ev.price_chf > 0
            ? <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-arc-goldLight text-arc-goldDark flex-shrink-0">CHF {ev.price_chf}</span>
            : <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex-shrink-0">Gratuit</span>
          }
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mb-2">
          <div className="text-sm text-arc-text3">
            🕐 {ev.time_start?.slice(0, 5)}{ev.time_end ? ` — ${ev.time_end.slice(0, 5)}` : ""}
          </div>
          {ev.location && <div className="text-sm text-arc-text3">📍 {ev.location}</div>}
        </div>

        {ev.description && (
          <p className="text-sm text-arc-text2 leading-relaxed mb-2">{ev.description}</p>
        )}

        {ev.tags?.length > 0 && (
          <div className="flex gap-1.5 mb-2 flex-wrap">
            {ev.tags.map((t: string) => (
              <span key={t} className="text-[10px] bg-arc-blueBg text-arc-navy px-2 py-0.5 rounded-full">{t}</span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          {ev.capacity && (
            <div className="text-[11px] text-arc-text3">Capacité : {ev.capacity} places</div>
          )}
          {!isPast && (
            <a href={`/api/events/${ev.id}/ical`} download
              className="text-[11px] text-arc-blue hover:underline flex items-center gap-1">
              📅 Ajouter au calendrier
            </a>
          )}
        </div>

        {/* RSVP — uniquement pour les événements à venir */}
        {!isPast && (
          <RsvpButtons eventId={ev.id} initial={myRsvp} counts={counts} />
        )}

        {/* Check-in — pour les événements passés ET du jour */}
        {isPast && (
          <CheckInButton
            eventId={ev.id}
            initialCheckedIn={myCheckedIn}
            initialAttendCount={attendCount}
          />
        )}

        {/* Rapport admin */}
        {isAdmin && (
          <AdminAttendees
            attendees={attendees}
            rsvpGoing={counts.going}
            attendCount={attendCount}
          />
        )}
      </div>
    </div>
  );
}
