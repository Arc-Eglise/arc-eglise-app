import { NextRequest, NextResponse } from "next/server"
import {
  requireAuth, unauthorizedResponse, badRequestResponse,
  getUserPrefs, SSE_HEADERS, sseChunk,
} from "@/lib/bible-ai"
import { chat } from "@/lib/arc-ai/provider-manager"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient }      from "@/lib/supabase/server"
import type { BibleLevel }   from "@/lib/bible-ai-prompts"

export async function POST(req: NextRequest) {
  let userId: string
  try { userId = await requireAuth() } catch { return unauthorizedResponse() }

  const body = await req.json().catch(() => null)
  if (!body) return badRequestResponse("JSON invalide")

  const { action } = body as { action: string }
  const supabase = createClient()
  const admin    = createAdminClient()

  switch (action) {
    // ── Créer un plan ──────────────────────────────────────────────
    case "create": {
      const { title, level, duration_days = 30, language, focus, generate = false } = body as {
        title?: string
        level?: BibleLevel
        duration_days?: number
        language?: string
        focus?: string
        generate?: boolean
      }
      const prefs = await getUserPrefs(userId)
      const lang  = language ?? prefs.language
      const lvl   = level    ?? prefs.level
      const planTitle = title ?? (focus ? `Plan : ${focus}` : `Plan ${duration_days} jours`)

      const { data: plan, error } = await admin.from("ai_reading_plans").insert({
        user_id: userId, title: planTitle, level: lvl,
        duration_days, language: lang, focus: focus ?? null, created_by_ai: generate,
      }).select("id, title").single()

      if (error || !plan) return NextResponse.json({ error: "Erreur création plan" }, { status: 500 })

      if (!generate) return NextResponse.json({ plan })

      // Générer les jours via IA (streaming)
      const system = `Tu génères un plan de lecture biblique structuré en ${lang}.
RÈGLES ABSOLUES :
- Exactement ${duration_days} jours numérotés de 1 à ${duration_days}
- Chaque jour : 1-2 références bibliques LISIBLES (ex: "Jean 3:16", "Psaumes 23", "Genèse 1:1-10")
- Niveau : ${lvl === "enfant" ? "passages courts et bien connus, vocabulaire simple" : lvl === "avance" || lvl === "enseignant" ? "passages plus longs et profonds" : "équilibre entre facilité et profondeur"}
${focus ? `- Thème central : ${focus}` : "- Équilibre Ancien Testament et Nouveau Testament"}
- Question de réflexion par jour : courte, personnelle, pratique
- Guide de prière par jour : 1-2 phrases d'invitation à la prière
- Répondre UNIQUEMENT avec du JSON valide, sans markdown, sans texte avant ou après :
{"days":[{"day":1,"title":"Titre court du jour","passages":["Jean 3:16","Romains 8:1"],"reflection":"Question de réflexion personnelle ?","prayer_guide":"Prière d'invitation courte."}]}`

      const message = `Génère un plan de lecture biblique de ${duration_days} jours${focus ? ` centré sur "${focus}"` : " avec un bon équilibre AT/NT"} pour un niveau ${lvl} en ${lang}. Réponds uniquement en JSON.`

      const enc = new TextEncoder()
      const { readable, writable } = new TransformStream()
      const writer = writable.getWriter()

      ;(async () => {
        try {
          await writer.write(enc.encode(sseChunk({ type: "start", plan_id: plan.id })))
          const result = await chat(
            [{ role: "user", content: message }],
            "auto",
            { system, maxTokens: 8192 }
          )
          const raw = result.content
          // Nettoyer markdown éventuel (```json ... ```)
          const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim()
          const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
          if (!jsonMatch) throw new Error("Le modèle IA n'a pas retourné de JSON valide")
          const parsed = JSON.parse(jsonMatch[0]) as { days: { day: number; title: string; passages: string[]; reflection: string; prayer_guide: string }[] }

          // Insérer les jours en DB
          const rows = parsed.days.slice(0, duration_days).map(d => ({
            plan_id: plan.id,
            day_number: d.day,
            title: d.title ?? `Jour ${d.day}`,
            // Normaliser passages : accepte string[] ou [{reference}] ou string
            passages: Array.isArray(d.passages)
              ? d.passages.map((p: unknown) => typeof p === "string" ? p : (p as Record<string,string>)?.reference ?? String(p))
              : [],
            reflection: d.reflection ?? null,
            prayer_guide: d.prayer_guide ?? null,
          }))
          const { error: insertError } = await admin.from("ai_reading_plan_days").insert(rows)
          if (insertError) {
            console.error("[plans/create] Erreur insertion jours:", insertError.message)
            await writer.write(enc.encode(sseChunk({ type: "error", error: `Erreur base de données: ${insertError.message}` })))
          } else {
            await writer.write(enc.encode(sseChunk({ type: "end", plan_id: plan.id, days_count: rows.length })))
          }
        } catch (err) {
          await writer.write(enc.encode(sseChunk({ type: "error", error: String(err) })))
        } finally {
          await writer.close()
        }
      })()

      return new Response(readable, { headers: SSE_HEADERS })
    }

    // ── Lister les plans ────────────────────────────────────────────
    case "list": {
      const { data: plans } = await supabase
        .from("ai_reading_plans")
        .select("id, title, level, duration_days, language, focus, is_active, created_at, updated_at, created_by_ai, started_at")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
      return NextResponse.json({ plans: plans ?? [] })
    }

    // ── Lire les jours d'un plan ────────────────────────────────────
    case "get_days": {
      const { plan_id } = body as { plan_id: string }
      if (!plan_id) return badRequestResponse("plan_id requis")
      const { data: days } = await supabase
        .from("ai_reading_plan_days")
        .select("*")
        .eq("plan_id", plan_id)
        .order("day_number")
      return NextResponse.json({ days: days ?? [] })
    }

    // ── Démarrer un plan (enregistre started_at) ────────────────────
    case "start_plan": {
      const { plan_id } = body as { plan_id: string }
      if (!plan_id) return badRequestResponse("plan_id requis")
      const { error } = await supabase
        .from("ai_reading_plans")
        .update({ started_at: new Date().toISOString() })
        .eq("id", plan_id)
        .eq("user_id", userId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    // ── Lecture du jour (calcule le jour courant + textes des versets) ──
    case "get_today": {
      // Plan le plus récemment démarré et actif
      const { data: planRow } = await supabase
        .from("ai_reading_plans")
        .select("id, title, duration_days, started_at, focus")
        .eq("user_id", userId)
        .eq("is_active", true)
        .not("started_at", "is", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .single()

      if (!planRow?.started_at) return NextResponse.json({ today: null })

      const startDate  = new Date(planRow.started_at)
      const now        = new Date()
      const daysSince  = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const currentDay = Math.max(1, Math.min(daysSince + 1, planRow.duration_days))

      const { data: day } = await supabase
        .from("ai_reading_plan_days")
        .select("*")
        .eq("plan_id", planRow.id)
        .eq("day_number", currentDay)
        .single()

      if (!day) return NextResponse.json({ today: null })

      // Nombre de jours complétés pour la barre de progression
      const { count: completedCount } = await supabase
        .from("ai_reading_plan_days")
        .select("*", { count: "exact", head: true })
        .eq("plan_id", planRow.id)
        .eq("is_completed", true)

      // Récupérer le texte des versets via scripture.api.bible
      const bibleKey  = (process.env.BIBLE_API_KEY ?? "").replace(/^﻿/, "").trim()
      const bibleId   = process.env.BIBLE_DEFAULT_ID ?? "61fd76eafa1ef5f7-01"
      const bibleBase = process.env.BIBLE_API_BASE ?? "https://api.scripture.api.bible/v1"
      const verseTexts: { reference: string; text: string }[] = []

      if (bibleKey && bibleKey !== "your_api_bible_key_here") {
        for (const passage of (day.passages ?? [])) {
          try {
            const sr = await fetch(
              `${bibleBase}/bibles/${bibleId}/search?query=${encodeURIComponent(passage)}&limit=1&sort=relevance`,
              { headers: { "api-key": bibleKey } }
            )
            if (sr.ok) {
              const { data: sd } = await sr.json()
              const verse = sd?.verses?.[0]
              if (verse?.text) verseTexts.push({ reference: verse.reference ?? passage, text: verse.text.trim() })
            }
          } catch { /* skip */ }
        }
      }

      // Fallback IA si la Bible API n'est pas disponible ou n'a rien retourné
      if (verseTexts.length === 0 && (day.passages ?? []).length > 0) {
        try {
          const aiResult = await chat(
            [{ role: "user", content: `Donne le texte exact en français (version TOB ou Louis Segond) des versets : ${(day.passages as string[]).join(", ")}. Format : une ligne par verset, "Référence : texte du verset"` }],
            "auto",
            { maxTokens: 600 }
          )
          verseTexts.push({ reference: (day.passages as string[]).join(" · "), text: aiResult.content })
        } catch { /* skip */ }
      }

      return NextResponse.json({
        today: {
          plan_id:       planRow.id,
          plan_title:    planRow.title,
          current_day:   currentDay,
          total_days:    planRow.duration_days,
          completed_days: completedCount ?? 0,
          day_id:        day.id,
          day_title:     day.title,
          passages:      day.passages ?? [],
          verse_texts:   verseTexts,
          reflection:    day.reflection,
          prayer_guide:  day.prayer_guide,
          is_completed:  day.is_completed,
        }
      })
    }

    // ── Textes des versets d'un jour (Bible API + fallback IA) ─────
    case "get_day_verses": {
      const { plan_id, day_number } = body as { plan_id: string; day_number: number }
      if (!plan_id || !day_number) return badRequestResponse("plan_id et day_number requis")

      const { data: dayRow } = await supabase
        .from("ai_reading_plan_days")
        .select("passages")
        .eq("plan_id", plan_id)
        .eq("day_number", day_number)
        .single()

      const passages: string[] = dayRow?.passages ?? []
      if (!passages.length) return NextResponse.json({ verse_texts: [] })

      const bibleKey  = (process.env.BIBLE_API_KEY ?? "").replace(/^﻿/, "").trim()
      const bibleId   = process.env.BIBLE_DEFAULT_ID ?? "61fd76eafa1ef5f7-01"
      const bibleBase = process.env.BIBLE_API_BASE ?? "https://api.scripture.api.bible/v1"
      const verseTexts: { reference: string; text: string }[] = []

      if (bibleKey && bibleKey !== "your_api_bible_key_here") {
        for (const passage of passages) {
          try {
            const sr = await fetch(
              `${bibleBase}/bibles/${bibleId}/search?query=${encodeURIComponent(passage)}&limit=1&sort=relevance`,
              { headers: { "api-key": bibleKey } }
            )
            if (sr.ok) {
              const { data: sd } = await sr.json()
              const verse = sd?.verses?.[0]
              if (verse?.text) verseTexts.push({ reference: verse.reference ?? passage, text: verse.text.trim() })
            }
          } catch { /* skip */ }
        }
      }

      // Fallback IA si l'API Bible ne retourne rien
      if (verseTexts.length === 0) {
        try {
          const aiResult = await chat(
            [{ role: "user", content: `Donne le texte exact en français (version TOB ou Louis Segond) des versets : ${passages.join(", ")}. Pour chaque verset, réponds sur une ligne séparée au format "Référence : texte du verset". Sois précis et fidèle au texte biblique.` }],
            "auto",
            { maxTokens: 600 }
          )
          // Découper la réponse ligne par ligne pour extraire chaque verset
          const lines = aiResult.content.split("\n").filter(l => l.trim())
          if (lines.length >= passages.length) {
            passages.forEach((passage, i) => {
              const line = lines[i] ?? ""
              const colonIdx = line.indexOf(":")
              if (colonIdx > -1) {
                verseTexts.push({ reference: passage, text: line.slice(colonIdx + 1).trim() })
              } else {
                verseTexts.push({ reference: passage, text: line.trim() })
              }
            })
          } else {
            verseTexts.push({ reference: passages.join(" · "), text: aiResult.content.trim() })
          }
        } catch { /* skip */ }
      }

      return NextResponse.json({ verse_texts: verseTexts })
    }

    // ── Marquer un jour complété ────────────────────────────────────
    case "complete_day": {
      const { plan_id, day_number } = body as { plan_id: string; day_number: number }
      if (!plan_id || !day_number) return badRequestResponse("plan_id et day_number requis")
      const { error } = await supabase
        .from("ai_reading_plan_days")
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq("plan_id", plan_id)
        .eq("day_number", day_number)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    // ── Supprimer un plan ───────────────────────────────────────────
    case "delete": {
      const { plan_id } = body as { plan_id: string }
      if (!plan_id) return badRequestResponse("plan_id requis")
      await supabase.from("ai_reading_plans").update({ is_active: false }).eq("id", plan_id).eq("user_id", userId)
      return NextResponse.json({ ok: true })
    }

    default:
      return badRequestResponse(`Action inconnue: ${action}`)
  }
}
