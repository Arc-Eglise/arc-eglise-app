const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;
const PROJECT_REF = "resmfttbtszfdtqwcfmw";
const SQL_FILE    = process.argv[2];

if (!DB_PASSWORD) { console.error("❌ SUPABASE_DB_PASSWORD manquant"); process.exit(1); }
if (!SQL_FILE)    { console.error("❌ Usage: node scripts/run-sql.cjs <fichier.sql>"); process.exit(1); }

const sql = fs.readFileSync(path.resolve(SQL_FILE), "utf8");

const client = new Client({
  host:     `db.${PROJECT_REF}.supabase.co`,
  port:     5432,
  database: "postgres",
  user:     "postgres",
  password: DB_PASSWORD,
  ssl:      { rejectUnauthorized: false },
});

(async () => {
  try {
    await client.connect();
    console.log("✅ Connecté à Supabase");
    await client.query(sql);
    console.log(`✅ ${path.basename(SQL_FILE)} exécuté avec succès`);
  } catch (e) {
    console.error("❌ Erreur :", e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
