#!/usr/bin/env node
/**
 * check-isolation.js — Vérifie les règles d'isolation ADR-001 (Chantier B)
 *
 * Règles vérifiées :
 *   I1  src/ (app existante) ne doit PAS importer @arc/core ni @arc/ai-engine
 *   I2  packages/arc-core ne doit PAS importer @arc/ai-engine ni depuis src/app/
 *   I3  packages/arc-ai-engine peut importer @arc/core, mais PAS depuis src/app/
 *
 * Usage : node scripts/check-isolation.js
 * Retourne exit 1 si une violation est détectée.
 */

const fs   = require("fs")
const path = require("path")

const ROOT = path.resolve(__dirname, "..")

// ── Utilitaires ────────────────────────────────────────────────────────────
function walk(dir, exts = [".ts", ".tsx"]) {
  const results = []
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".next") continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) results.push(...walk(full, exts))
    else if (exts.some(e => entry.name.endsWith(e))) results.push(full)
  }
  return results
}

function importsOf(filePath) {
  const src = fs.readFileSync(filePath, "utf8")
  const re  = /(?:import|from|require)\s*\(?['"]([^'"]+)['"]\)?/g
  const imports = []
  let m
  while ((m = re.exec(src)) !== null) imports.push(m[1])
  return imports
}

function rel(p) { return path.relative(ROOT, p).replace(/\\/g, "/") }

// ── Zones ──────────────────────────────────────────────────────────────────
const SRC_DIR        = path.join(ROOT, "src")
const ARC_CORE_DIR   = path.join(ROOT, "packages", "arc-core", "src")
const ARC_AI_DIR     = path.join(ROOT, "packages", "arc-ai-engine", "src")

const violations = []

// I1 — src/ ne doit pas importer les packages du socle
for (const file of walk(SRC_DIR)) {
  for (const imp of importsOf(file)) {
    if (imp.startsWith("@arc/core") || imp.startsWith("@arc/ai-engine")) {
      violations.push({ rule: "I1", file: rel(file), import: imp })
    }
  }
}

// I2 — arc-core ne doit pas importer arc-ai-engine ni src/app/
for (const file of walk(ARC_CORE_DIR)) {
  for (const imp of importsOf(file)) {
    if (imp.startsWith("@arc/ai-engine")) {
      violations.push({ rule: "I2", file: rel(file), import: imp, reason: "arc-core → arc-ai-engine interdit (R9)" })
    }
    if (imp.includes("/src/app/") || imp.includes("@/app/")) {
      violations.push({ rule: "I2", file: rel(file), import: imp, reason: "arc-core → app/ interdit" })
    }
  }
}

// I3 — arc-ai-engine ne doit pas importer depuis src/app/
for (const file of walk(ARC_AI_DIR)) {
  for (const imp of importsOf(file)) {
    if (imp.includes("/src/app/") || imp.includes("@/app/")) {
      violations.push({ rule: "I3", file: rel(file), import: imp, reason: "arc-ai-engine → app/ interdit" })
    }
  }
}

// ── Rapport ────────────────────────────────────────────────────────────────
if (violations.length === 0) {
  console.log("✅ Isolation ADR-001 : aucune violation détectée")
  process.exit(0)
} else {
  console.error(`\n❌ Isolation ADR-001 : ${violations.length} violation(s) détectée(s)\n`)
  for (const v of violations) {
    const reason = v.reason ? ` — ${v.reason}` : ""
    console.error(`  [${v.rule}] ${v.file}\n        import "${v.import}"${reason}\n`)
  }
  process.exit(1)
}
