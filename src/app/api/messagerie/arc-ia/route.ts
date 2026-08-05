import { NextRequest } from "next/server";
import {
  requireAuth, unauthorizedResponse, badRequestResponse,
  checkAiRateLimit, rateLimitedResponse, streamArcAgentic,
} from "@/lib/bible-ai";
import { createClient } from "@/lib/supabase/server";
import { ESPACE_MEMBRE_GUIDE } from "@/lib/arc-ia-guide";
import { ARC_IA_GUARDRAILS } from "@/lib/arc-ia-guardrails";
import { buildArcToolsPrompt, type ArcActionType } from "@/lib/arc-ia-actions";
import { droits } from "@/lib/droits";
import { getAuthorizedMailboxes } from "@/lib/mail/mailbox-config";
import { getRecentSessions } from "@/lib/arc-ai";

export const dynamic = "force-dynamic";

// Mots vides FR — pour une extraction légère de sujets (sans appel LLM).
const STOPWORDS = new Set([
  "alors","aussi","avec","avoir","bien","boureau","cette","comme","comment","dans","donc","elle","entre",
  "est-ce","etre","être","faire","fais","fait","pour","pourquoi","quand","quel","quelle","quels","quelles",
  "sans","sont","suis","tout","tous","toute","toutes","très","vous","peux","peut","puis","aide","aider",
  "veux","voudrais","aimerais","merci","bonjour","salut","stp","svp","j'ai","c'est","qu'est",
]);
function extractTopics(msg: string): string[] {
  const words = msg.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zà-ÿ0-9\s'-]/gi, " ").split(/\s+/)
    .map((w) => w.replace(/^[''-]+|[''-]+$/g, ""))
    .filter((w) => w.length > 4 && !STOPWORDS.has(w));
  return Array.from(new Set(words)).slice(0, 3);
}

export async function POST(req: NextRequest) {
  let userId: string;
  try { userId = await requireAuth(); } catch { return unauthorizedResponse(); }
  if (!(await checkAiRateLimit(userId))) return rateLimitedResponse();

  let body: { message?: string; history?: { role: string; content: string }[]; locale?: string };
  try { body = await req.json(); } catch { return badRequestResponse("JSON invalide"); }

  const message = body.message?.trim();
  const history = body.history ?? [];
  const LANG_NAMES: Record<string, string> = { fr: "français", en: "English", de: "Deutsch", es: "español", pt: "português", kg: "lingala" };
  const langName = LANG_NAMES[body.locale ?? "fr"] ?? "français";
  if (!message) return badRequestResponse("Message requis");

  // Profil : prénom (personnalisation) + rôle/groupes (droits → actions autorisées).
  // Le prénom, le rôle et les groupes servent au CALCUL LOCAL des droits ; seul le
  // prénom est réellement transmis au LLM externe (minimisation des données).
  const supabase = createClient();
  const { data: prof } = await supabase
    .from("profiles").select("first_name, role, groups").eq("id", userId).maybeSingle();
  const prenom = (prof?.first_name as string | null)?.trim() || "";
  const profileLike = {
    id: userId,
    role: (prof?.role as string | null) ?? null,
    groups: (prof?.groups as string[] | null) ?? [],
  };

  // Mémoire — « n'oublie rien + apprend au quotidien ». On lit un RÉSUMÉ COMPACT
  // stocké en base (jamais l'historique brut) : centres d'intérêt + résumés des
  // dernières sessions. Respecte l'opt-out `memory_enabled`.
  const { data: prefs } = await supabase
    .from("ai_user_preferences").select("fav_topics, memory_enabled").eq("user_id", userId).maybeSingle();
  const memoryEnabled = (prefs?.memory_enabled as boolean | null) !== false;
  const favTopics = memoryEnabled ? ((prefs?.fav_topics as string[] | null) ?? []) : [];
  const recentSessions = memoryEnabled ? await getRecentSessions(userId, 3) : [];
  const memoryBlock = memoryEnabled && (favTopics.length || recentSessions.length)
    ? [
        "MÉMOIRE (ce que tu sais déjà de ce membre — utilise-la avec naturel, sans la réciter) :",
        favTopics.length ? `Sujets qui l'intéressent : ${favTopics.join(", ")}.` : "",
        recentSessions.length ? `Échanges récents :\n${recentSessions.map((s) => `- ${s}`).join("\n")}` : "",
      ].filter(Boolean).join("\n")
    : "";

  // Actions autorisées pour ce membre (double garde : le prompt ne documente que
  // les actions permises, et le client re-filtrera au rendu).
  const allowed: ArcActionType[] = [
    "open_panel", "open_bible_tool", "open_verse",
    "launch_reading_plan", "create_event_draft",
    "search_messages", "open_person", "contact_pastor",
  ];
  const canMail = getAuthorizedMailboxes(profileLike.role ?? "", profileLike.groups ?? []).length > 0;
  if (canMail) allowed.push("search_mail");
  // (create_event_draft = réservation d'un créneau/salle, ouverte à tout membre.)
  void droits; // droits disponibles pour d'éventuelles restrictions futures

  const systemPrompt = [
    `LANGUE : réponds IMPÉRATIVEMENT et intégralement en ${langName}, quelle que soit la langue du message reçu. Toute ta réponse (y compris les titres et boutons d'action) doit être en ${langName}.`,
    "Tu es ARC IA, l'assistant pastoral bienveillant de l'ARC Église (Ambassade du Royaume de Christ, La Chaux-de-Fonds, Suisse).",
    `Tu accompagnes ${prenom || "ce membre"} avec chaleur, écoute active et empathie.`,
    "Style : messages courts, clairs, chaleureux et fraternels, sans jargon technique. Tu tutoies avec respect.",
    "Tu peux aider sur : la vie de l'église, la foi, la Bible, la prière, les événements, l'orientation vers les bonnes personnes.",
    "Tu connais l'Espace Membre et tu aides le membre à s'y retrouver : quand il demande « comment faire… » ou « où trouver… », donne des instructions claires et pas à pas en t'appuyant sur le guide ci-dessous (nomme le menu et les boutons exacts).",
    ESPACE_MEMBRE_GUIDE,
    ARC_IA_GUARDRAILS,
    memoryBlock,
    buildArcToolsPrompt(allowed),
    "IMPORTANT — transfert humain : pour toute situation grave, sensible ou personnelle (deuil, crise, dépression, conflit, décision de vie, besoin d'accompagnement réel), invite avec tact et douceur à contacter un responsable humain via le bouton « Parler à un responsable ». Tu ne remplaces jamais le pasteur ni un conseiller.",
    "Ne fais jamais de diagnostic médical ou psychologique.",
  ].filter(Boolean).join("\n");

  // Apprentissage (non affiché) : après la réponse, on mémorise un RÉSUMÉ COMPACT
  // de l'échange + on enrichit les centres d'intérêt. Écriture rapide (pas d'appel
  // LLM), scopée à l'utilisateur (RLS). Ignorée si l'opt-out mémoire est actif.
  const onDone = memoryEnabled
    ? async () => {
        const summary = message.length > 150 ? message.slice(0, 150) + "…" : message;
        const merged = Array.from(new Set([...extractTopics(message), ...favTopics])).slice(0, 15);
        await Promise.all([
          supabase.from("ai_bible_sessions").insert({
            user_id: userId, mode: "messagerie",
            title: message.slice(0, 60), summary: `Tu m'as parlé de : « ${summary} »`,
          }),
          supabase.from("ai_user_preferences").upsert(
            { user_id: userId, fav_topics: merged, updated_at: new Date().toISOString() },
            { onConflict: "user_id" },
          ),
        ]);
      }
    : undefined;

  try {
    return await streamArcAgentic(message, history, systemPrompt, onDone);
  } catch (err) {
    console.error("[messagerie/arc-ia]", err);
    return new Response("Le service ARC IA est momentanément indisponible. Réessaie dans un instant.", {
      status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
