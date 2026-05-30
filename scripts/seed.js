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

async function q(sql, params = []) {
  const r = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Neon-Connection-String": dbUrl },
    body: JSON.stringify({ query: sql, params }),
  });
  const d = await r.json();
  if (d.message && d.code) throw new Error(d.message);
  return d.rows || [];
}

async function seed() {
  console.log("🌿 Seeding PawPerfume...\n");

  // 1. Update default tenant to PawPerfume
  await q(`UPDATE tenants SET
    name = 'PawPerfume',
    brand_name = 'PawPerfume',
    brand_tagline = 'Premium Scents, Delivered',
    brand_primary_color = '#8b5cf6',
    brand_accent_color = '#ec4899',
    brand_background_color = '#0a0a0a',
    brand_favicon_emoji = '🧴',
    brand_welcome_message = 'Welcome to PawPerfume! 🧴 We craft premium perfumes and deliver straight to your door.',
    ai_system_prompt = 'You are the friendly assistant of PawPerfume, a premium perfume business. Keep replies short (2-3 sentences). Help customers choose scents, place orders, and answer questions about delivery and pricing.',
    ai_language = 'en',
    ai_tone = 'friendly',
    plan = 'pro'
    WHERE slug = 'default'`);
  console.log("✅ Branding updated: PawPerfume 🧴");

  // 2. Get tenant ID
  const tenants = await q("SELECT id FROM tenants WHERE slug = 'default'");
  const tid = tenants[0].id;
  console.log(`   Tenant ID: ${tid}`);

  // 3. Custom fields
  const fields = [
    ["scent_preference", "Scent Preference", "select", '["Floral","Woody","Fresh / Citrus","Oriental","Fruity","Any"]', "orders", 0],
    ["bottle_size", "Bottle Size", "select", '["30ml (₱599)","50ml (₱899)","100ml (₱1,499)","Sample Set (₱299)"]', "orders", 1],
    ["delivery_address", "Delivery Address", "text", "[]", "orders", 2],
    ["delivery_method", "Delivery Method", "select", '["Standard Delivery","Express Delivery","Pickup"]', "orders", 3],
    ["gift_wrapping", "Gift Wrapping", "select", '["No","Yes (+₱50)"]', "orders", 4],
    ["special_notes", "Special Instructions", "text", "[]", "orders", 5],
    ["preferred_contact", "Preferred Contact", "select", '["Messenger","SMS","Email"]', "both", 6],
  ];
  for (const [key, label, type, opts, apply, sort] of fields) {
    await q(
      "INSERT INTO tenant_custom_fields (tenant_id, field_key, field_label, field_type, field_options, apply_to, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (tenant_id, field_key) DO UPDATE SET field_label = $3, field_options = $5",
      [tid, key, label, type, opts, apply, sort]
    );
    console.log(`   ✅ Field: ${label}`);
  }

  // 4. Bot flow steps
  const prefix = `INSERT INTO bot_flow_steps (tenant_id, step_key, step_label, step_type, prompt_message, button_choices, next_step, input_variable, sort_order) VALUES (`;
  const flow = [
    ["greet", "Welcome", "auto", "Welcome to PawPerfume! 🧴 Let me help you find your perfect scent.", "[]", "ask_name", null, 0],
    ["ask_name", "Ask Name", "text_input", "What is your name?", "[]", "ask_scent", "customer_name", 1],
    ["ask_scent", "Scent Preference", "button_choice", "What type of scent do you prefer? 🌸", '[{"label":"Floral","next_step":"ask_size"},{"label":"Woody","next_step":"ask_size"},{"label":"Fresh / Citrus","next_step":"ask_size"},{"label":"Oriental","next_step":"ask_size"},{"label":"Fruity","next_step":"ask_size"},{"label":"Not Sure","next_step":"ask_size"}]', null, "scent_preference", 2],
    ["ask_size", "Bottle Size", "button_choice", "What size would you like? 🧴", '[{"label":"30ml - ₱599","next_step":"ask_address"},{"label":"50ml - ₱899","next_step":"ask_address"},{"label":"100ml - ₱1,499","next_step":"ask_address"},{"label":"Sample Set - ₱299","next_step":"ask_address"}]', null, "bottle_size", 3],
    ["ask_address", "Delivery Address", "text_input", "Where should we deliver your perfume? 🏠 Please provide your complete address.", "[]", "ask_gift", "delivery_address", 4],
    ["ask_gift", "Gift Wrapping", "button_choice", "Would you like gift wrapping? 🎁", '[{"label":"Yes (+₱50)","next_step":"confirm"},{"label":"No","next_step":"confirm"}]', null, "gift_wrapping", 5],
    ["confirm", "Confirmation", "auto", "Thank you! One of our team will confirm your order shortly. You will receive updates here on Messenger. 🧴✨", "[]", null, null, 6],
  ];
  for (const [key, label, type, prompt, choices, next, variable, sort] of flow) {
    await q(
      prefix + "$1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (tenant_id, step_key) DO UPDATE SET step_label = $3, prompt_message = $5, button_choices = $6, next_step = $7, input_variable = $8, sort_order = $9",
      [tid, key, label, type, prompt, choices, next, variable, sort]
    );
    console.log(`   ✅ Flow: ${label}`);
  }

  // 5. FAQs
  const faqs = [
    ["How much are your perfumes?", "Sample Sets from ₱299 • 30ml ₱599 • 50ml ₱899 • 100ml ₱1,499. Free delivery on orders ₱1,000+!", "price,cost,magkano,presyo"],
    ["What scents are available?", "We offer Floral 🌸, Woody 🌲, Fresh/Citrus 🍋, Oriental 🌙, and Fruity 🍓 scents. Custom blends also available!", "scent,smell,amoy,available,available"],
    ["How long is delivery?", "Metro Manila: 1-2 days. Provincial: 3-5 days. Express delivery available for Metro Manila.", "delivery,shipping,how long,tagal,dating"],
    ["Do you deliver nationwide?", "Yes! We deliver anywhere in the Philippines via LBC, J&T, or Lalamove (Metro Manila).", "nationwide,province,probinsya,ship"],
    ["How do I pay?", "GCash, Maya, BPI/BDO transfer, and COD (Metro Manila only). Payment details sent after order confirmation.", "payment,pay,bayad,gcash,maya,bank"],
    ["Do you do custom scents?", "Yes! Custom blends from ₱999. Tell us your preferred notes and we will craft something unique for you.", "custom,personalized,blend,mix,sarili"],
    ["Are your perfumes long-lasting?", "Yes! Eau de Parfum concentration — lasts 6-8 hours. Premium oils imported from France.", "long lasting,tagal,matagal,whole day,hours"],
    ["Can I return or exchange?", "Returns accepted within 7 days for unopened bottles. If there is an issue, message us and we will make it right!", "return,exchange,refund,balik,palit,soli"],
  ];
  for (const [qText, answer, keywords] of faqs) {
    await q(
      "INSERT INTO faqs (tenant_id, question, answer, keywords, category) VALUES ($1, $2, $3, $4, 'products') ON CONFLICT DO NOTHING",
      [tid, qText, answer, keywords]
    );
    console.log(`   ✅ FAQ: ${qText.slice(0, 45)}...`);
  }

  // 6. Quick replies
  const qrs = [
    ["👋 Welcome", "Welcome to PawPerfume! 🧴 Premium perfumes delivered to your door. How can we help today?"],
    ["💰 Pricing", "Our prices:\n• Sample Set: ₱299\n• 30ml: ₱599\n• 50ml: ₱899\n• 100ml: ₱1,499\nFree delivery on orders ₱1,000+!"],
    ["🚚 Delivery", "Metro Manila: 1-2 days. Provincial: 3-5 days via LBC/J&T. Free shipping ₱1,000+!"],
    ["💳 Payment", "We accept GCash, Maya, BPI/BDO, and COD (Metro Manila)."],
  ];
  for (const [label, message] of qrs) {
    await q("INSERT INTO quick_replies (tenant_id, label, message) VALUES ($1, $2, $3)", [tid, label, message]);
    console.log(`   ✅ QR: ${label}`);
  }

  // 7. Order statuses
  const stats = [
    ["confirmed", "Confirmed", "#4d8ef7"], ["preparing", "Preparing", "#f59e0b"],
    ["out_for_delivery", "Out for Delivery", "#8b5cf6"], ["delivered", "Delivered", "#10b981"],
  ];
  for (const [key, label, color] of stats) {
    await q("INSERT INTO tenant_order_statuses (tenant_id, status_key, status_label, color) VALUES ($1, $2, $3, $4) ON CONFLICT (tenant_id, status_key) DO UPDATE SET status_label = $3, color = $4", [tid, key, label, color]);
  }
  console.log("   ✅ 8 order statuses");

  // 8. Tags
  const tags = [
    ["vip", "VIP Customer", "#f59e0b"], ["repeat", "Repeat Buyer", "#10b981"],
    ["new", "New Customer", "#4d8ef7"], ["urgent", "Urgent", "#ef4444"], ["custom", "Custom Order", "#8b5cf6"],
  ];
  for (const [key, label, color] of tags) {
    await q("INSERT INTO tenant_tags (tenant_id, tag_key, tag_label, color) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING", [tid, key, label, color]);
  }
  console.log("   ✅ 5 tags");

  console.log("\n🌿 PawPerfume seeded! Deploying now...");
  console.log("   Admin: https://pawperfume.vercel.app/admin");
  console.log("   Password: antigravity-admin-2026");
}

seed().catch(e => { console.error("Seed error:", e.message); process.exit(1); });
