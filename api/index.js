module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host || 'pawperfume-v2.vercel.app'}`);
  const path = url.pathname; const method = req.method;
  if (method === "OPTIONS") { res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,Authorization" }); return res.end(); }

  if (path === "/api" || path === "/api/ping") {
    const db = await getDb();
    return send(res, 200, { ok: true, time: new Date().toISOString(), db: !!db });
  }

  if (path === "/webhook") return handleWebhook(req, res, url);
  if (path.startsWith("/api/admin")) return handleAdmin(req, res, path);

  // Admin dashboard
  if (path === "/admin") {
    try {
      const fs = require("fs"), p = require("path");
      const html = fs.readFileSync(p.join(process.cwd(), "public", "admin.html"), "utf-8");
      res.writeHead(200, { "Content-Type": "text/html" });
      return res.end(html);
    } catch (e) { return send(res, 500, { error: "Admin page not found" }); }
  }

  try {
    const fs = require("fs"), p = require("path");
    const html = fs.readFileSync(p.join(process.cwd(), "public", "index.html"), "utf-8");
    res.writeHead(200, { "Content-Type": "text/html" });
    return res.end(html);
  } catch (e) {
    return send(res, 500, { error: "Failed to load page" });
  }
};

function send(r, s, d) { r.writeHead(s, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }); r.end(JSON.stringify(d)); }
function readBody(req) { return new Promise((R, J) => { let d = ""; req.on("data", c => d += c); req.on("end", () => R(d)); req.on("error", J); }); }

// ── DATABASE ────────────────────────────────────────
let _db = null; let _dbUrl = null;
async function getDb() {
  if (_db) return _db;
  // Build clean URL
  const raw = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!raw) return null;
  try {
    const u = new URL(raw);
    _dbUrl = `postgresql://${u.username}:${u.password}@${u.hostname}${u.pathname}?sslmode=require`;
    const API = `https://${u.hostname}/sql`;
    _db = async (query, params = []) => {
      const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json", "Neon-Connection-String": _dbUrl }, body: JSON.stringify({ query, params }) });
      const d = await r.json();
      if (d.message && d.code) throw new Error(d.message);
      return d.rows || [];
    };
    await _db("SELECT 1");
    return _db;
  } catch (e) { console.error("DB init:", e.message); return null; }
}

// ── WEBHOOK ─────────────────────────────────────────
async function handleWebhook(req, res, url) {
  if (req.method === "GET") {
    if (url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === process.env.FB_VERIFY_TOKEN) {
      res.writeHead(200, { "Content-Type": "text/plain" }); return res.end(url.searchParams.get("hub.challenge") || "");
    }
    res.writeHead(403); return res.end("Forbidden");
  }
  if (req.method !== "POST") { res.writeHead(405); return res.end("Method not allowed"); }
  let body = ""; req.on("data", c => body += c); req.on("end", () => processWebhook(res, body));
}

async function processWebhook(res, body) {
  res.writeHead(200); res.end("EVENT_RECEIVED");
  try {
    const db = await getDb(); if (!db) return;
    const data = JSON.parse(body); if (!data?.entry) return;
    for (const entry of data.entry) {
      for (const ev of entry.messaging || []) {
        const sid = ev.sender?.id; if (!sid) continue;
        const e = s => String(s || "").replace(/'/g, "''");
        let convs = await db(`SELECT * FROM conversations WHERE tenant_id=1 AND sender_id='${e(sid)}'`);
        if (!convs.length) convs = await db(`INSERT INTO conversations (tenant_id,sender_id) VALUES (1,'${e(sid)}') RETURNING *`);
        const cid = convs[0].id;
        if (ev.message?.text) { await db(`INSERT INTO messages (tenant_id,conversation_id,sender_type,content) VALUES (1,${cid},'customer','${e(ev.message.text)}')`); await db(`UPDATE conversations SET updated_at=NOW(),last_activity_at=NOW() WHERE id=${cid}`); }
        if (ev.postback?.payload === "GET_STARTED") {
          const w = "Welcome to PawPerfume! 🧴 Premium scents, delivered. How can we help?";
          await db(`INSERT INTO messages (tenant_id,conversation_id,sender_type,content) VALUES (1,${cid},'bot','${e(w)}')`);
          const t = process.env.FB_PAGE_ACCESS_TOKEN; if (t) fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${t}`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({recipient:{id:sid},message:{text:w},messaging_type:"RESPONSE"}) }).catch(()=>{});
        }
      }
    }
  } catch (e) { console.error("Webhook:", e.message); }
}

// ── ADMIN API ───────────────────────────────────────
async function handleAdmin(req, res, path) {
  const db = await getDb(); if (!db) return send(res, 500, { error: "Database not connected" });
  const route = path.replace("/api/admin", "").replace(/\/$/, "").replace(/^\//, "");
  let body = {}; if (["POST","PUT"].includes(req.method)) { try { body = JSON.parse(await readBody(req)); } catch(e) {} }

  const pass = process.env.ADMIN_PASSWORD;
  if (pass && route !== "login" && route !== "status" && route !== "tenant-config") {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (token !== pass) return send(res, 401, { error: "Unauthorized" });
  }

  try {
    const e = s => String(s || "").replace(/'/g, "''");
    switch (route) {
      case "login": return body.password === pass ? send(res, 200, { ok: true, token: pass }) : send(res, 401, { error: "Invalid password" });
      case "status": return send(res, 200, { ok: true, db: !!db, version: "2.0" });
      case "send-message":
        if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
        const fbToken = process.env.FB_PAGE_ACCESS_TOKEN;
        if (!fbToken) return send(res, 500, { error: "FB_PAGE_ACCESS_TOKEN not set" });
        const fbResp = await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${fbToken}`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipient: { id: body.senderId }, message: { text: body.text }, messaging_type: "RESPONSE" })
        });
        const fbData = await fbResp.json();
        if (fbData.error) return send(res, 400, { error: fbData.error.message || "Failed to send" });
        await db(`INSERT INTO messages (tenant_id,conversation_id,sender_type,content) VALUES (1,(SELECT id FROM conversations WHERE sender_id='${e(body.senderId)}' LIMIT 1),'bot','${e(body.text)}')`);
        return send(res, 200, { ok: true, fb_id: fbData.message_id });
      case "tenant-config": return send(res, 200, (await db("SELECT * FROM tenants WHERE slug='default'"))[0] || {});
      case "conversations": return send(res, 200, { conversations: await db("SELECT * FROM conversations WHERE tenant_id=1 ORDER BY updated_at DESC LIMIT 50"), total: ((await db("SELECT COUNT(*)::int as c FROM conversations WHERE tenant_id=1"))[0]||{}).c||0 });
      case "orders": return send(res, 200, { orders: await db("SELECT * FROM orders WHERE tenant_id=1 ORDER BY updated_at DESC LIMIT 50"), custom_fields: await db("SELECT * FROM tenant_custom_fields WHERE tenant_id=1"), order_statuses: await db("SELECT * FROM tenant_order_statuses WHERE tenant_id=1 ORDER BY sort_order") });
      case "automations": return send(res, 200, await db("SELECT * FROM automations WHERE tenant_id=1"));
      case "finance": return send(res, 200, await db("SELECT * FROM ledger_entries WHERE tenant_id=1 ORDER BY date DESC LIMIT 50"));
      case "faqs": return send(res, 200, await db("SELECT * FROM faqs WHERE tenant_id=1 ORDER BY sort_order"));
      case "quick-replies": return send(res, 200, await db("SELECT * FROM quick_replies WHERE tenant_id=1 ORDER BY sort_order"));
      case "custom-fields": return send(res, 200, await db("SELECT * FROM tenant_custom_fields WHERE tenant_id=1 ORDER BY sort_order"));
      case "tags": return send(res, 200, await db("SELECT * FROM tenant_tags WHERE tenant_id=1 ORDER BY tag_label"));
      case "media": return send(res, 200, await db("SELECT * FROM media_assets WHERE tenant_id=1"));
      case "bot-flow": return send(res, 200, await db("SELECT * FROM bot_flow_steps WHERE tenant_id=1 ORDER BY sort_order"));
      default:
        const mm = route.match(/^messages\/(\d+)$/); if (mm) return send(res, 200, { messages: await db(`SELECT * FROM messages WHERE tenant_id=1 AND conversation_id=${mm[1]} ORDER BY created_at ASC LIMIT 100`) });
        const cc = route.match(/^conversations\/(\d+)$/); if (cc) return send(res, 200, (await db(`SELECT * FROM conversations WHERE tenant_id=1 AND id=${cc[1]}`))[0] || {});
        const oo = route.match(/^orders\/(\d+)$/);
        if (oo && req.method === "PUT") {
          const sets = []; const vals = []; let n = 1;
          if (body.customer_name) { sets.push(`customer_name=$${n++}`); vals.push(body.customer_name); }
          if (body.status) { sets.push(`status=$${n++}`); vals.push(body.status); }
          if (body.amount !== undefined) { sets.push(`amount=$${n++}`); vals.push(body.amount); }
          if (body.custom_fields) { sets.push(`custom_fields=$${n++}`); vals.push(JSON.stringify(body.custom_fields)); }
          if (sets.length) { sets.push("updated_at=NOW()"); await db(`UPDATE orders SET ${sets.join(",")} WHERE tenant_id=1 AND id=${oo[1]}`, vals); }
          return send(res, 200, { ok: true });
        }
        if (route === "tenants" && req.method === "PUT") {
          const sets = []; const vals = []; let n = 1;
          ["brand_name","brand_tagline","brand_welcome_message","brand_favicon_emoji","brand_primary_color","brand_accent_color","ai_system_prompt","ai_language","ai_tone"].forEach(k => { if (body[k] !== undefined) { sets.push(`${k}=$${n++}`); vals.push(body[k]); } });
          if (sets.length) { sets.push("updated_at=NOW()"); await db(`UPDATE tenants SET ${sets.join(",")} WHERE id=1`, vals); }
          return send(res, 200, { ok: true });
        }
        if (req.method === "POST") {
          switch (route) {
            case "faqs": await db(`INSERT INTO faqs (tenant_id,question,answer,keywords) VALUES (1,'${e(body.question)}','${e(body.answer)}','${e(body.keywords)}')`); break;
            case "quick-replies": await db(`INSERT INTO quick_replies (tenant_id,label,message) VALUES (1,'${e(body.label)}','${e(body.message)}')`); break;
            case "automations": await db(`INSERT INTO automations (tenant_id,name,trigger_type,trigger_value) VALUES (1,'${e(body.name)}','${e(body.trigger_type)}','${e(body.trigger_value)}')`); break;
            case "custom-fields": await db(`INSERT INTO tenant_custom_fields (tenant_id,field_key,field_label,field_type,field_options,apply_to) VALUES (1,'${e(body.fieldKey)}','${e(body.fieldLabel)}','${e(body.fieldType||"text")}','${e(JSON.stringify(body.fieldOptions||[]))}','${e(body.applyTo||"orders")}')`); break;
            case "tags": await db(`INSERT INTO tenant_tags (tenant_id,tag_key,tag_label,color) VALUES (1,'${e(body.tagKey)}','${e(body.tagLabel)}','${e(body.color||"#8b5cf6")}')`); break;
            case "media": await db(`INSERT INTO media_assets (tenant_id,category,filename,url) VALUES (1,'${e(body.category||"general")}','${e(body.filename||"")}','${e(body.url)}')`); break;
            case "finance": await db(`INSERT INTO ledger_entries (tenant_id,date,description,category,amount,type) VALUES (1,'${e(body.date||new Date().toISOString().split("T")[0])}','${e(body.description)}','${e(body.category)}',${body.amount||0},'${e(body.type||"expense")}')`); break;
            case "orders": await db(`INSERT INTO orders (tenant_id,customer_name,amount,status,payment_status) VALUES (1,'${e(body.customerName||"")}',${body.amount||0},'${e(body.status||"new")}','${e(body.paymentStatus||"pending")}')`); break;
            case "bot-flow": await db(`INSERT INTO bot_flow_steps (tenant_id,step_key,step_label,step_type,prompt_message,next_step,input_variable,sort_order) VALUES (1,'${e(body.stepKey)}','${e(body.stepLabel)}','${e(body.stepType||"text_input")}','${e(body.promptMessage||"")}','${e(body.nextStep||"")}','${e(body.inputVariable||"")}',${body.sortOrder||99})`); break;
          }
          return send(res, 200, { ok: true });
        }
        return send(res, 404, { error: `Route not found: ${route}` });
    }
  } catch (e) { return send(res, 500, { error: e.message }); }
}
