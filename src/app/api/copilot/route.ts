import { NextRequest, NextResponse } from "next/server";

function fallbackResponse(prompt: string) {
  const normalized = prompt.toLowerCase();

  if (normalized.includes("horaire") || normalized.includes("culte") || normalized.includes("dimanche")) {
    return {
      answer:
        "Les cultes principaux ont lieu le dimanche à 9h30 et 17h00, avec une réunion de prière le mercredi à 19h00.",
    };
  }

  if (normalized.includes("évenement") || normalized.includes("événement") || normalized.includes("concert") || normalized.includes("soirée")) {
    return {
      answer:
        "Vous pouvez consulter la section événements pour voir les prochains rassemblements, soirées et activités communautaires.",
    };
  }

  if (normalized.includes("windows") || normalized.includes("25h2") || normalized.includes("compatib")) {
    return {
      answer:
        "L’application est conçue pour fonctionner correctement sur les navigateurs Windows 11 récents, y compris les environnements compatibles 25H2, avec une expérience optimisée pour l’usage en bureau et en mode PWA.",
    };
  }

  return {
    answer:
      "Je peux vous aider à retrouver les horaires, les événements, les informations sur la communauté ARC et les démarches pour rejoindre l’église.",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";

    if (!prompt) {
      return NextResponse.json({ error: "Le message est requis." }, { status: 400 });
    }

    const endpoint = process.env.MICROSOFT_COPILOT_ENDPOINT;
    const apiKey = process.env.COPILOT_API_KEY;
    const model = process.env.COPILOT_API_MODEL || "gpt-4o-mini";

    if (endpoint && apiKey) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "Tu es l’assistant de l’église ARC. Réponds de manière claire, chaleureuse et utile en français.",
            },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const message =
          data?.choices?.[0]?.message?.content ||
          data?.answer ||
          "Je n’ai pas reçu de réponse exploitable du service IA.";
        return NextResponse.json({ answer: message });
      }
    }

    return NextResponse.json(fallbackResponse(prompt));
  } catch (error) {
    console.error("[api/copilot]", error);
    return NextResponse.json(
      { answer: "Le service d’assistance est temporairement indisponible. Merci de réessayer dans un instant." },
      { status: 500 }
    );
  }
}
