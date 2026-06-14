const fs   = require("fs");
const path = require("path");
const https = require("https");

const PAT     = process.env.SUPABASE_PAT;
const REF     = "resmfttbtszfdtqwcfmw";
const sqlFile = process.argv[2];

if (!PAT)     { console.error("❌ SUPABASE_PAT manquant"); process.exit(1); }
if (!sqlFile) { console.error("❌ Usage: node scripts/supabase-sql.cjs <fichier.sql>"); process.exit(1); }

const query = fs.readFileSync(path.resolve(sqlFile), "utf8");
const body  = JSON.stringify({ query });

const options = {
  hostname: "api.supabase.com",
  path:     `/v1/projects/${REF}/database/query`,
  method:   "POST",
  headers: {
    "Authorization": `Bearer ${PAT}`,
    "Content-Type":  "application/json",
    "Content-Length": Buffer.byteLength(body),
  },
};

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", chunk => data += chunk);
  res.on("end", () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log(`✅ ${path.basename(sqlFile)} exécuté avec succès`);
    } else {
      console.error(`❌ ${res.statusCode}: ${data}`);
      process.exit(1);
    }
  });
});

req.on("error", e => { console.error("❌ Réseau:", e.message); process.exit(1); });
req.write(body);
req.end();
