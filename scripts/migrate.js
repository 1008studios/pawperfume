const fs = require("node:fs");
const path = require("node:path");

const envFile = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf-8");
for (const line of envFile.split("\n")) {
  const m = line.match(/^(\w+)="(.+)"$/);
  if (m) process.env[m[1]] = m[2];
}

const raw = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
const u = new URL(raw);
const dbUrl = `postgresql://${u.username}:${u.password}@${u.hostname}${u.pathname}?sslmode=require`;
const API = `https://${u.hostname}/sql`;

async function neonql(query) {
  const r = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Neon-Connection-String": dbUrl },
    body: JSON.stringify({ query, params: [] }),
  });
  const d = await r.json();
  if (d.message && d.code) throw new Error(d.message);
  return d.rows || [];
}

async function migrate() {
  const schemaPath = path.join(__dirname, "..", "packages", "db", "schema.sql");
  let sql = fs.readFileSync(schemaPath, "utf-8");

  // Replace dollar quoting with single quotes for HTTP API compat
  sql = sql.replace(/\$\$([^$]*)\$\$/g, (_, content) => {
    return "'" + content.replace(/'/g, "''") + "'";
  });

  const stmts = sql
    .split("\n")
    .filter(l => { const t = l.trim(); return t && !t.startsWith("--"); })
    .join("\n")
    .split(";")
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Running ${stmts.length} statements on unpooled Neon...\n`);

  let created = 0;
  for (let i = 0; i < stmts.length; i++) {
    const stmt = stmts[i];
    const preview = stmt.replace(/\s+/g, " ").slice(0, 80);
    try {
      await neonql(stmt);
      created++;
      console.log(`  [${i + 1}] ✅ ${preview}...`);
    } catch (e) {
      const msg = e.message || "";
      if (/already exists|duplicate key/i.test(msg)) {
        console.log(`  [${i + 1}] ⏭️ ${preview}...`);
      } else if (/does not exist/i.test(msg)) {
        // Index before table — re-run after all tables
        console.log(`  [${i + 1}] ⏸️ ${preview} (deferred)...`);
        // Save for re-run
        stmts.push(stmt);
      } else {
        console.warn(`  [${i + 1}] ⚠️ ${msg.slice(0, 90)}`);
      }
    }
  }

  // Verify
  const tables = await neonql("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
  console.log(`\n✅ Done! ${tables.length} tables: ${tables.map(t => t.table_name).join(", ")}`);
}

migrate().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
