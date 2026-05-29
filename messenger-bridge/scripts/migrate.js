const fs = require("node:fs");
const path = require("node:path");
const { neon } = require("@neondatabase/serverless");

async function migrate() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const sql = neon(dbUrl);
  const schema = fs.readFileSync(path.join(__dirname, "../../packages/db/schema.sql"), "utf-8");

  console.log("Running database migration...");
  
  try {
    // Execute schema SQL as individual statements
    const statements = schema
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith("--"));

    for (const stmt of statements) {
      await sql`${stmt}`;
    }

    console.log("Migration complete!");
    
    // Verify
    const version = await sql`SELECT value FROM global_settings WHERE key = 'schema_version'`;
    console.log("Schema version:", version[0]?.value || "unknown");
  } catch (error) {
    console.error("Migration failed:", error.message);
    process.exit(1);
  }
}

migrate();
