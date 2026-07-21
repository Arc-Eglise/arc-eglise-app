import { NextResponse } from "next/server"
import { ROLES, FONCTIONS, PIPELINE_STAGES } from "@arc/core"

export const dynamic = "force-static"

export function GET() {
  const spec = {
    openapi: "3.1.0",
    info: {
      title:       "ARC Église API",
      version:     "1.0.0",
      description: "API REST de l'ARC Église — La Chaux-de-Fonds, Suisse",
      contact:     { email: "arceglise.cdf@gmail.com" },
    },
    servers: [{ url: "https://arc-eglise.ch/api/v1", description: "Production" }],
    components: {
      securitySchemes: {
        cookieAuth: { type: "apiKey", in: "cookie", name: "sb-access-token" },
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
