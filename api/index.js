module.exports = async function handler(req, res) {
  // CORS
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,Authorization" });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const path = url.pathname;

  // Ping
  if (path === "/api/ping" || path === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true, version: "2.0", time: new Date().toISOString() }));
  }

  // Admin routes
  if (path.startsWith("/api/admin")) {
    return handleAdmin(req, res, path, url);
  }

  // Webhook
  if (path === "/webhook" || path.startsWith("/api/webhook")) {
    return handleWebhook(req, res, path, url);
  }

  // If no API match, serve static
  if (path === "/" || path === "/admin" || path === "/admin.html") {
    return serveAdminHTML(req, res);
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
};

// ── STATIC ──────────────────────────────────────────────
function serveAdminHTML(req, res) {
  const fs = require("node:fs");
  const path = require("node:path");
  const htmlPath = path.join(process.cwd(), "public", "admin.html");
  try {
    const html = fs.readFileSync(htmlPath, "utf-8");
    res.writeHead(200, { "Content-Type": "text/html", "Access-Control-Allow-Origin": "*" });
    res.end(html);
  } catch (e) {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>PawPerfume Admin</title><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a0a;color:#eaedf3}</style></head><body><div style="text-align:center"><h1>🧴 PawPerfume</h1><p>Admin Dashboard</p><div id="login"><input type="password" id="pw" placeholder="Password" style="padding:10px;font-size:14px;margin:10px;border-radius:8px;border:1px solid #3a3a3c;background:#1c1c1e;color:#eaedf3"><br><button onclick="login()" style="padding:10px 24px;font-size:14px;background:#8b5cf6;color:#fff;border:none;border-radius:8px;cursor:pointer">Sign In</button></div></div><script>
let T="";function A(){return{Authorization:"Bearer "+T,"Content-Type":"application/json"}};async function api(p,m,b){let o={method:m,headers:A()};if(b&&m!=="GET")o.body=JSON.stringify(b);let r=await fetch(p,m==="GET"?{headers:A()}:o);return await r.json()}function show(m){document.getElementById("login").innerHTML=m}
async function login(){let pw=document.getElementById("pw").value;let r=await api("/api/admin/login","POST",{password:pw});if(r.ok){T=r.token;show("<h2>✅ Logged in</h2><p>Database connected.</p><button onclick='loadDashboard()' style='padding:10px 24px;background:#8b5cf6;color:#fff;border:none;border-radius:8px;cursor:pointer;margin-top:10px'>Open Dashboard</button>")}else{show("<p style='color:#ef4444'>Wrong password</p><button onclick='location.reload()'>Try again</button>")}}
async function loadDashboard(){
  let t=await api("/api/admin/tenant-config");
  let s=await api("/api/admin/status");
  show("<h2>🧴 "+(t.brand_name||"PawPerfume")+"</h2><p>"+(t.brand_tagline||"Premium Scents, Delivered")+"</p><hr style='margin:20px 0;border-color:#3a3a3c'>"+
    "<p>Status: "+(s.ok?"✅ Connected":"❌ Error")+"</p><p>Tenant: "+(t.slug||"default")+"</p><p>Plan: "+(t.plan||"free")+"</p>"+
    "<p style='margin-top:20px;font-size:12px;color:#8b90a0'>Full dashboard coming soon. Database is live with 23 tables.</p>"+
    "<div style='margin-top:20px'><a href='/api/admin/conversations' style='color:#8b5cf6'>View Conversations API →</a></div>");
}
</script></body></html>`);
  }
}

// ── ADMIN API ───────────────────────────────────────────
async function handleAdmin(req, res, path, url) {
  const route = path.replace("/api/admin", "").replace(/\/$/, "").replace(/^\//, "");
  const db = await getDbConnection();
  const method = req.method;

  // Parse body
  let body = {};
  if (["POST","PUT","PATCH"].includes(method)) {
    try {
      const raw = await readBody(req);
      body = raw ? JSON.parse(raw) : {};
    } catch (e) {}
  }

  // Auth (skip for login, status, tenant-config)
  if (!["login","status","tenant-config"].includes(route.replace(/\/.*/,""))) {
    const pass = process.env.ADMIN_PASSWORD;
    if (pass) {
      const auth = req.headers.authorization || "";
      const token = auth.replace(/^Bearer\s+/i, "");
      if (token !== pass) {
        res.writeHead(401, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Unauthorized" }));
      }
    }
  }

  try {
    let result;
    switch (route) {
      case "login": {
        if (body.password === process.env.ADMIN_PASSWORD) {
          res.writeHead(200, { "Content-Type": "application/json", "Set-Cookie": `saas_token=${body.password}; Path=/; Max-Age=604800` });
          return res.end(JSON.stringify({ ok: true, token: body.password }));
        }
        return err(res, 401, "Invalid password");
      }
      case "status":
        return json(res, { ok: true, db: !!db, version: "2.0" });
      case "tenant-config":
        if (!db) return err(res, 500, "No DB");
        try {
          const t = await db("SELECT * FROM tenants WHERE slug = 'default' LIMIT 1");
          return json(res, t[0] || { slug: "default", name: "PawPerfume" });
        } catch (e) { return json(res, { slug: "default", name: "PawPerfume" }); }
      case "conversations":
        if (!db) return err(res, 500);
        try {
          const convs = await db("SELECT * FROM conversations WHERE tenant_id = 1 ORDER BY updated_at DESC LIMIT 50");
          return json(res, { conversations: convs, total: convs.length });
        } catch (e) { return err(res, 500, "Query failed: " + e.message); }
      case "orders":
        if (!db) return err(res, 500);
        try {
          const orders = await db("SELECT * FROM orders WHERE tenant_id = 1 ORDER BY updated_at DESC LIMIT 50");
          const fields = await db("SELECT * FROM tenant_custom_fields WHERE tenant_id = 1 ORDER BY sort_order");
          const statuses = await db("SELECT * FROM tenant_order_statuses WHERE tenant_id = 1 ORDER BY sort_order");
          return json(res, { orders, custom_fields: fields, order_statuses: statuses });
        } catch (e) { return err(res, 500, "Query failed: " + e.message); }
      case "automations":
        if (!db) return err(res, 500);
        try {
          const items = await db("SELECT * FROM automations WHERE tenant_id = 1 ORDER BY id");
          return json(res, items);
        } catch (e) { return err(res, 500); }
        break;
      case "finance":
        if (!db) return err(res, 500);
        try {
          const items = await db("SELECT * FROM ledger_entries WHERE tenant_id = 1 ORDER BY date DESC LIMIT 50");
          return json(res, items);
        } catch (e) { return err(res, 500); }
        break;
      case "faqs":
        if (!db) return err(res, 500);
        try { return json(res, await db("SELECT * FROM faqs WHERE tenant_id = 1 ORDER BY sort_order")); } catch (e) { return err(res, 500); }
      case "quick-replies":
        if (!db) return err(res, 500);
        try { return json(res, await db("SELECT * FROM quick_replies WHERE tenant_id = 1 ORDER BY sort_order")); } catch (e) { return err(res, 500); }
      case "custom-fields":
        if (!db) return err(res, 500);
        try { return json(res, await db("SELECT * FROM tenant_custom_fields WHERE tenant_id = 1 ORDER BY sort_order")); } catch (e) { return err(res, 500); }
      case "tags":
        if (!db) return err(res, 500);
        try { return json(res, await db("SELECT * FROM tenant_tags WHERE tenant_id = 1 ORDER BY sort_order")); } catch (e) { return err(res, 500); }
      case "media":
        if (!db) return err(res, 500);
        try { return json(res, await db("SELECT * FROM media_assets WHERE tenant_id = 1 ORDER BY created_at DESC")); } catch (e) { return err(res, 500); }
      case "bot-flow":
        if (!db) return err(res, 500);
        try { return json(res, await db("SELECT * FROM bot_flow_steps WHERE tenant_id = 1 ORDER BY sort_order")); } catch (e) { return err(res, 500); }
      default:
        // Handle /api/admin/conversations/123 etc
        if (route.startsWith("conversations/")) {
          const id = route.split("/")[1];
          if (method === "PUT" && body) {
            // Update conversation
            break;
          }
          // Get messages for a conversation
          try {
            const msgs = await db("SELECT * FROM messages WHERE tenant_id = 1 AND conversation_id = " + parseInt(id) + " ORDER BY created_at ASC LIMIT 50");
            return json(res, { messages: msgs });
          } catch (e) { return err(res, 500); }
        }
        if (route.startsWith("orders/") && method === "PUT") {
          const id = route.split("/")[1];
          const sets = []; const vals = []; let idx = 1;
          if (body.status) { sets.push(`status = $${idx++}`); vals.push(body.status); }
          if (body.customer_name) { sets.push(`customer_name = $${idx++}`); vals.push(body.customer_name); }
          if (body.amount !== undefined) { sets.push(`amount = $${idx++}`); vals.push(body.amount); }
          if (body.custom_fields) { sets.push(`custom_fields = $${idx++}`); vals.push(JSON.stringify(body.custom_fields)); }
          if (sets.length > 0) {
            sets.push("updated_at = NOW()");
            vals.push(parseInt(id));
            await db(`UPDATE orders SET ${sets.join(", ")} WHERE id = $${idx}`, vals);
            return json(res, { ok: true });
          }
          return json(res, { ok: true });
        }
        if (route.startsWith("messages/")) {
          const id = route.split("/")[1];
          try {
            const msgs = await db("SELECT * FROM messages WHERE tenant_id = 1 AND conversation_id = " + parseInt(id) + " ORDER BY created_at ASC LIMIT 100");
            return json(res, { messages: msgs });
          } catch (e) { return err(res, 500); }
        }
        return err(res, 404, `Unknown route: ${route}`);
    }
  } catch (e) {
    return err(res, 500, e.message);
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Route not handled" }));
}

// ── WEBHOOK ─────────────────────────────────────────────
async function handleWebhook(req, res, path, url) {
  if (req.method === "GET") {
    if (url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === process.env.FB_VERIFY_TOKEN) {
      res.writeHead(200, { "Content-Type": "text/plain" });
      return res.end(url.searchParams.get("hub.challenge") || "");
    }
    res.writeHead(403);
    return res.end("Forbidden");
  }

  if (req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", async () => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("EVENT_RECEIVED");
      try {
        const data = JSON.parse(body);
        await processWebhookEvent(data);
      } catch (e) {
        console.error("Webhook error:", e.message);
      }
    });
    return;
  }

  res.writeHead(405);
  res.end("Method not allowed");
}

async function processWebhookEvent(data) {
  if (!data?.entry) return;
  const db = await getDbConnection();
  if (!db) return;

  for (const entry of data.entry) {
    for (const event of entry.messaging || []) {
      const senderId = event.sender?.id;
      const msg = event.message;
      const postback = event.postback;
      if (!senderId) continue;

      // Get or create conversation
      let convs = await db("SELECT * FROM conversations WHERE tenant_id = 1 AND sender_id = '" + senderId.replace(/'/g, "''") + "'");
      let conv;
      if (convs.length === 0) {
        convs = await db("INSERT INTO conversations (tenant_id, sender_id) VALUES (1, '" + senderId.replace(/'/g, "''") + "') RETURNING *");
      }
      conv = convs[0];

      if (msg?.text) {
        await db("INSERT INTO messages (tenant_id, conversation_id, sender_type, content, mid) VALUES (1, " + conv.id + ", 'customer', '" + msg.text.replace(/'/g, "''") + "', " + (msg.mid ? "'" + msg.mid.replace(/'/g, "''") + "'" : "NULL") + ")");
        await db("UPDATE conversations SET updated_at = NOW(), last_activity_at = NOW() WHERE id = " + conv.id);
      } else if (msg?.attachments) {
        for (const att of msg.attachments) {
          await db("INSERT INTO messages (tenant_id, conversation_id, sender_type, message_type, content, media_url) VALUES (1, " + conv.id + ", 'customer', '" + (att.type || "file") + "', '[" + att.type + "]', " + (att.payload?.url ? "'" + att.payload.url.replace(/'/g, "''") + "'" : "NULL") + ")");
        }
      }

      if (postback?.payload === "GET_STARTED") {
        const welcome = "Welcome to PawPerfume! 🧴 Premium scents, delivered to you. How can we help?";
        await db("INSERT INTO messages (tenant_id, conversation_id, sender_type, content) VALUES (1, " + conv.id + ", 'bot', '" + welcome.replace(/'/g, "''") + "')");
        await sendFB(senderId, welcome);
      }
    }
  }
}

async function sendFB(recipientId, text) {
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!token) return;
  try {
    await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: { id: recipientId }, message: { text }, messaging_type: "RESPONSE" }),
    });
  } catch (e) {}
}

// ── HELPERS ─────────────────────────────────────────────
function json(res, data) {
  res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(data));
}

function err(res, status, msg) {
  res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify({ error: msg }));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", c => data += c);
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

// ── DATABASE ────────────────────────────────────────────
let _db = null;
async function getDbConnection() {
  const url = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) return null;

  if (_db) return _db;

  const u = new URL(url);
  const clean = `postgresql://${u.username}:${u.password}@${u.hostname}${u.pathname}?sslmode=require`;
  const host = u.hostname;
  const API = `https://${host}/sql`;

  async function query(sql, params = []) {
    const r = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Neon-Connection-String": clean },
      body: JSON.stringify({ query: sql, params }),
    });
    const d = await r.json();
    if (d.message && d.code) throw new Error(d.message);
    return d.rows || [];
  }

  try {
    await query("SELECT 1");
    _db = query;
    return query;
  } catch (e) {
    console.error("DB init failed:", e.message);
  }
  return null;
}
