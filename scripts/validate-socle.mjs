#!/usr/bin/env node
/**
 * validate-socle.mjs — Validation du socle /api/v1 (ADR-001 Chantier B / B4)
 *
 * Smoke test HTTP de bout en bout : exerce le vrai code path (routes Next +
 * @arc/core transpilé) et vérifie endpoints, formes de réponse, en-têtes de
 * rate limiting, spec OpenAPI, erreurs typées et dégradation fail-open.
 *
 * Usage : node scripts/validate-socle.mjs [BASE_URL]
 *   BASE_URL par défaut : http://localhost:3000
 *
 * ⚠️ Tant que la migration B3 (arc_api_rate_limit / arc_api_log) n'est pas
 *    exécutée, le rate limiting est en fail-open : X-RateLimit-Limit reflète la
 *    politique correcte, mais Remaining ne décrémente pas et aucun 429 n'est émis.
 *    La validation de l'application effective du quota (429) + de la
 *    journalisation en base se fait à la bascule, une fois la migration jouée.
 */

const BASE = (process.argv[2] || process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "")
const V1 = `${BASE}/api/v1`

let passed = 0
let failed = 0
const failures = []

function check(name, cond, detail = "") {
  if (cond) {
    passed++
    console.log(`  ✅ ${name}`)
  } else {
    failed++
    failures.push(name + (detail ? ` — ${detail}` : ""))
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`)
  }
}

const isUuid = v => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
const isNum  = v => v != null && v !== "" && Number.isFinite(Number(v))

function assertRateLimitHeaders(h, expectedLimit) {
  check("en-tête X-Request-Id est un UUID", isUuid(h.get("x-request-id")), h.get("x-request-id") ?? "absent")
  check("en-tête X-RateLimit-Limit numérique", isNum(h.get("x-ratelimit-limit")), h.get("x-ratelimit-limit") ?? "absent")
  check("en-tête X-RateLimit-Remaining numérique", isNum(h.get("x-ratelimit-remaining")), h.get("x-ratelimit-remaining") ?? "absent")
  check("en-tête X-RateLimit-Reset numérique", isNum(h.get("x-ratelimit-reset")), h.get("x-ratelimit-reset") ?? "absent")
  if (expectedLimit != null) {
    check(`X-RateLimit-Limit = ${expectedLimit} (politique public/visiteur)`,
      Number(h.get("x-ratelimit-limit")) === expectedLimit, h.get("x-ratelimit-limit") ?? "absent")
  }
}

async function run() {
  console.log(`\n🔎 Validation du socle — ${V1}\n`)

  // ── 1. /health (public, dynamique, rate-limité) ──────────────────────────
  console.log("• GET /health")
  {
    const r = await fetch(`${V1}/health`)
    const body = await r.json().catch(() => ({}))
    check("statut 200 ou 503", r.status === 200 || r.status === 503, `reçu ${r.status}`)
    check("champ version = v1", body.version === "v1", JSON.stringify(body).slice(0, 80))
    check("champ checks.api = ok", body?.checks?.api === "ok")
    check("fail-open : pas de 429 sans la table de compteur", r.status !== 429, `reçu ${r.status}`)
    assertRateLimitHeaders(r.headers, 120)
  }

  // ── 2. /referentiel (public, statique, source @arc/core) ─────────────────
  console.log("• GET /referentiel")
  {
    const r = await fetch(`${V1}/referentiel`)
    const body = await r.json().catch(() => ({}))
    check("statut 200", r.status === 200, `reçu ${r.status}`)
    check("4 rôles", body?.data?.roles?.length === 4, `len=${body?.data?.roles?.length}`)
    check("13 fonctions", body?.data?.fonctions?.length === 13, `len=${body?.data?.fonctions?.length}`)
    check("5 étapes pipeline", body?.data?.pipeline?.length === 5, `len=${body?.data?.pipeline?.length}`)
    check("meta.source = @arc/core", body?.meta?.source === "@arc/core", body?.meta?.source)
  }

  // ── 3. /openapi.json (public, statique) ──────────────────────────────────
  console.log("• GET /openapi.json")
  {
    const r = await fetch(`${V1}/openapi.json`)
    const spec = await r.json().catch(() => ({}))
    check("statut 200", r.status === 200, `reçu ${r.status}`)
    check("openapi = 3.1.0", spec.openapi === "3.1.0", spec.openapi)
    check("composant réponse RateLimited documenté", !!spec?.components?.responses?.RateLimited)
    check("en-têtes X-RateLimit-* documentés", !!spec?.components?.headers?.["X-RateLimit-Limit"])
    check("réponse 429 sur /health", !!spec?.paths?.["/health"]?.get?.responses?.["429"])
    check("réponse 429 sur /profile/me", !!spec?.paths?.["/profile/me"]?.get?.responses?.["429"])
    check("schéma Error : code RATE_LIMITED", (spec?.components?.schemas?.Error?.properties?.code?.enum || []).includes("RATE_LIMITED"))
  }

  // ── 4. /profile/me sans session → 401 typé ───────────────────────────────
  console.log("• GET /profile/me (anonyme)")
  {
    const r = await fetch(`${V1}/profile/me`)
    const body = await r.json().catch(() => ({}))
    check("statut 401", r.status === 401, `reçu ${r.status}`)
    check("code d'erreur UNAUTHORIZED", body?.code === "UNAUTHORIZED", body?.code)
    check("message d'erreur présent", typeof body?.error === "string" && body.error.length > 0)
    check("en-tête X-Request-Id présent même en erreur", isUuid(r.headers.get("x-request-id")))
  }

  // ── Bilan ────────────────────────────────────────────────────────────────
  console.log(`\n${failed === 0 ? "✅" : "❌"} Résultat : ${passed} réussis, ${failed} échoués`)
  if (failed > 0) {
    console.log("\nÉchecs :")
    for (const f of failures) console.log(`  • ${f}`)
    process.exit(1)
  }
  console.log("Socle /api/v1 validé (mode fail-open — voir l'en-tête du script pour la bascule).\n")
}

run().catch(err => {
  console.error("\n💥 Le serveur est-il démarré ? (npm run dev)\n", err.message)
  process.exit(1)
})
