import { NextRequest } from "next/server";
import {
  requireAuth, unauthorizedResponse, badRequestResponse,
  checkAiRateLimit, rateLimitedResponse, streamArcAI,
} from "@/lib/bible-ai";
import { createClient } from "@/lib/supabase/server";
import { ESPACE_MEMBRE_GUIDE } from "@/lib/arc-ia-guide";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let userId: string;
  try { userId = await requireAuth(); } catch { return unauthorizedResponse(); }
  if (!(await checkAiRateLimit(userId))) return rateLimitedResponse();

  let body: { message?: string; history?: { role: string; content: string }[] };
  try { body = await req.json(); } catch { return badRequestResponse("JSON invalide"); }

  const message = body.message?.trim();
  const history = body.history ?? [];
  if (!message) return badRequestResponse("Message requis");

  // Personnalisation minimale (protection des données) : seul le prénom du membre
  // est utilisé. On n'envoie PAS l'étape pastorale ni les groupes/ministères à un
  // LLM externe — minimisation des données transmises à un tiers.
  const supabase = createClient();
  const { data: prof } = await supabase
    .from("profiles").select("first_name").eq("id", userId).maybeSingle();
  const prenom = (prof?.first_name as string | null)?.trim() || "";

  const systemPrompt = [
    "Tu es ARC IA, l'assistant pastoral bienveillant de l'ARC Église (Ambassade du Royaume de Christ, La Chaux-de-Fonds, Suisse).",
    `Tu accompagnes ${prenom || "ce membre"} avec chaleur, écoute active et empathie.`,
    "Style : messages courts, clairs, chaleureux et fraternels, sans jargon technique. Tu tutoies avec respect.",
    "Tu peux aider sur : la vie de l'église, la foi, la Bible, la prière, les événements, l'orientation vers les bonnes personnes.",
    "Tu connais l'Espace Membre et tu aides le membre à s'y retrouver : quand il demande « comment faire… » ou « où trouver… », donne des instructions claires et pas à pas en t'appuyant sur le guide ci-dessous (nomme le menu et les boutons exacts).",
    ESPACE_MEMBRE_GUIDE,
    "IMPORTANT — transfert humain : pour toute situation grave, sensible ou personnelle (deuil, crise, dépression, conflit, décision de vie, besoin d'accompagnement réel), invite avec tact et douceur à contacter un responsable humain via le bouton « Parler à un responsable ». Tu ne remplaces jamais le pasteur ni un conseiller.",
    "Ne fais jamais de diagnostic médical ou psychologique.",
  ].filter(Boolean).join("\n");

  try {
    return await streamArcAI(message, history, systemPrompt);
  } catch (err) {
    console.error("[messagerie/arc-ia]", err);
    return new Response("Le service ARC IA est momentanément indisponible. Réessaie dans un instant.", {
      status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
