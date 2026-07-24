import { NextResponse } from "next/server"
import { ROLES, FONCTIONS, PIPELINE_STAGES } from "@arc/core"

export const dynamic = "force-static"

export function GET() {
  const spec = {
    openapi: "3.1.0",
    info: {
      title:       "ARC Église API",
      version:     "1.0.0",
      description: "API REST de l'ARC Église — La Chaux-de-Fonds, Suisse. Rate limiting par utilisateur (ou IP) : en-têtes X-RateLimit-* sur chaque réponse, 429 + Retry-After au dépassement.",
      contact:     { email: "arceglise.cdf@gmail.com" },
    },
    servers: [{ url: "https://arc-eglise.ch/api/v1", description: "Production" }],
    components: {
      securitySchemes: {
        cookieAuth: { type: "apiKey", in: "cookie", name: "sb-access-token" },
      },
      headers: {
        "X-RateLimit-Limit":     { description: "Plafond de requêtes pour la fenêtre courante", schema: { type: "integer" } },
        "X-RateLimit-Remaining": { description: "Requêtes restantes dans la fenêtre courante", schema: { type: "integer" } },
        "X-RateLimit-Reset":     { description: "Secondes avant réinitialisation de la fenêtre", schema: { type: "integer" } },
        "X-Request-Id":          { description: "Identifiant unique de la requête (journalisation)", schema: { type: "string", format: "uuid" } },
      },
      responses: {
        RateLimited: {
          description: "Quota de requêtes dépassé",
          headers: { "Retry-After": { description: "Secondes avant de réessayer", schema: { type: "integer" } } },
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
      },
      schemas: {
        Role:          { type: "string", enum: ROLES },
        Fonction:      { type: "string", enum: FONCTIONS },
        PipelineStage: { type: "string", enum: PIPELINE_STAGES },
        Error: {
          type: "object",
          required: ["error", "code"],
          properties: {
            error: { type: "string" },
            code:  { type: "string", enum: ["UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "VALIDATION", "CONFLICT", "RATE_LIMITED", "INTERNAL"] },
          },
        },
      },
    },
    paths: {
      "/health": {
        get: {
          summary: "Health check",
          operationId: "getHealth",
          tags: ["Système"],
          responses: {
            "200": { description: "Tous les services opérationnels" },
            "429": { $ref: "#/components/responses/RateLimited" },
            "503": { description: "Dégradé — au moins un service en erreur" },
          },
        },
      },
      "/referentiel": {
        get: {
          summary: "Référentiel officiel ARC",
          description: "Retourne les rôles, fonctions et étapes pipeline (source : @arc/core).",
          operationId: "getReferentiel",
          tags: ["Référentiel"],
          responses: {
            "200": {
              description: "Référentiel complet",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "object",
                        properties: {
                          roles:     { type: "array", items: { type: "object", properties: { slug: { $ref: "#/components/schemas/Role" }, label: { type: "string" } } } },
                          fonctions: { type: "array", items: { type: "object", properties: { slug: { $ref: "#/components/schemas/Fonction" }, label: { type: "string" } } } },
                          pipeline:  { type: "array", items: { type: "object", properties: { slug: { $ref: "#/components/schemas/PipelineStage" }, label: { type: "string" }, order: { type: "integer" } } } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/profile/me": {
        get: {
          summary: "Profil et droits de l'utilisateur courant",
          operationId: "getMyProfile",
          tags: ["Profil"],
          security: [{ cookieAuth: [] }],
          responses: {
            "200": { description: "Profil avec droits calculés depuis @arc/core" },
            "401": { description: "Non authentifié", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
      },
    },
    tags: [
      { name: "Système",      description: "Health, version" },
      { name: "Référentiel",  description: "Rôles, fonctions, pipeline — source @arc/core" },
      { name: "Profil",       description: "Profil utilisateur et droits" },
    ],
  }

  return NextResponse.json(spec, {
    headers: { "Content-Type": "application/json" },
  })
}
