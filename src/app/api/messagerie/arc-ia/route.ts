import { NextRequest } from "next/server";
import {
  requireAuth, unauthorizedResponse, badRequestResponse,
  checkAiRateLimit, rateLimitedResponse, streamArcAI,
} from "@/lib/bible-ai";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STAGE_LABELS: Record<string, string> = {
  visiteur: "visiteur", integration: "en intégration", actif: "membre actif",
  formation: "en formation", responsable: "responsable",
};

export async function POST(req: NextRequest) {
  let userId: string;
  try { userId = await requireAuth(); } catch { return unauthorizedResponse(); }
  if (!(await checkAiRateLimit(userId))) return rateLimitedResponse();

  let body: { message?: string; history?: { role: string; content: string }[] };
  try { body = await req.json(); } catch { return badRequestResponse("JSON invalide"); }

  const message = body.message?.trim();
  const history = body.history ?? [];
  if (!message) return badRequestResponse("Message requis");

  // Intégration CRM : contexte du membre pour personnaliser la réponse
  const supabase = createClient();
  const { data: prof } = await supabase
    .from("profiles").select("first_name, pastoral_stage, groups").eq("id", userId).maybeSingle();
  const prenom = (prof?.first_name as string | null)?.trim() || "";
  const stage  = STAGE_LABELS[(prof?.pastoral_stage as string | null) ?? ""] ?? "";
  const groups = ((prof?.groups as string[] | null) ?? []).join(", ");

  const systemPrompt = [
    "Tu es ARC IA, l'assistant pastoral bienveillant de l'ARC Église (Ambassade du Royaume de Christ, La Chaux-de-Fonds, Suisse).",
    `Tu accompagnes ${prenom || "ce membre"} avec chaleur, écoute active et empathie.`,
    stage  ? `Contexte : ${prenom || "Le membre"} est ${stage} dans la communauté.` : "",
    groups ? `Il/elle sert dans : ${groups}.` : "",
    "Style : messages courts, clairs, chaleureux et fraternels, sans jargon technique. Tu tutoies avec respect.",
    "Tu peux aider sur : la vie de l'église, la foi, la Bible, la prière, les événements, l'orientation vers les bonnes personnes.",
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
