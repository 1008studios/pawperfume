const crypto = require("node:crypto");

let _dbUrl = null;
function setDbUrl(url) { _dbUrl = url; }
function getDbUrl() {
  if (_dbUrl) return _dbUrl;
  const raw = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "";
  // Strip channel_binding=require which breaks the HTTP API
  const u = new URL(raw);
  return `postgresql://${u.username}:${u.password}@${u.hostname}${u.pathname}?sslmode=require`;
}

const DB_SCHEMA_VERSION = "2026-05-30-pawperfume-v1";

async function dbQuery(query, params = []) {
  const url = getDbUrl();
  if (!url) throw new Error("DATABASE_URL not set");

  // Use Neon HTTP SQL API
  const parsed = new URL(url);
  const apiUrl = `https://${parsed.hostname}/sql`;

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Neon-Connection-String": url,
    },
    body: JSON.stringify({ query, params }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => res.statusText);
    throw new Error(`Neon query failed (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  if (data.error) throw new Error(data.error);

  return data.rows || [];
}

function getDb() { return { query: dbQuery }; }

async function initDb() { return true; }

// ═══════════════════════════════════════════════════════
// TENANT OPERATIONS
// ═══════════════════════════════════════════════════════

async function getTenantBySlug(slug) {
  const rows = await dbQuery("SELECT * FROM tenants WHERE slug = $1", [slug]);
  return rows[0] || null;
}

async function getTenantById(id) {
  const rows = await dbQuery("SELECT * FROM tenants WHERE id = $1", [id]);
  return rows[0] || null;
}

async function getAllTenants() {
  return await dbQuery("SELECT * FROM tenants ORDER BY created_at DESC");
}

async function createTenant({ slug, name, brandName, plan = "free" }) {
  const rows = await dbQuery(
    "INSERT INTO tenants (slug, name, brand_name, plan) VALUES ($1, $2, $3, $4) RETURNING *",
    [slug, name, brandName || name, plan]
  );
  if (rows[0]) await seedTenantDefaults(rows[0].id);
  return rows[0];
}

async function seedTenantDefaults(tenantId) {
  const statuses = [
    ["new", "New", "#4d8ef7", 1], ["in_progress", "In Progress", "#f59e0b", 2],
    ["completed", "Completed", "#10b981", 3], ["cancelled", "Cancelled", "#ef4444", 4],
  ];
  for (const [key, label, color, order] of statuses) {
    await dbQuery(
      "INSERT INTO tenant_order_statuses (tenant_id, status_key, status_label, color, sort_order) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING",
      [tenantId, key, label, color, order]
    );
  }
  const cats = [
    ["materials", "Materials", "expense", "#f59e0b", 1],
    ["marketing", "Marketing", "expense", "#8b5cf6", 2],
    ["sales", "Sales", "revenue", "#10b981", 3],
    ["other", "Other", "expense", "#8b90a0", 99],
  ];
  for (const [key, label, type, color, order] of cats) {
    await dbQuery(
      "INSERT INTO tenant_finance_categories (tenant_id, category_key, category_label, type, color, sort_order) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING",
      [tenantId, key, label, type, color, order]
    );
  }
}

async function updateTenantConfig(tenantId, config) {
  const allowed = [
    "fb_page_access_token", "fb_app_secret", "fb_verify_token", "fb_page_id",
    "brand_name", "brand_tagline", "brand_logo_url", "brand_primary_color",
    "brand_accent_color", "brand_background_color", "brand_favicon_emoji",
    "brand_welcome_title", "brand_welcome_message",
    "ai_system_prompt", "ai_model", "ai_enabled", "ai_language", "ai_tone",
  ];
  const sets = []; const vals = []; let idx = 1;
  for (const k of allowed) {
    if (config[k] !== undefined) {
      sets.push(`${k} = $${idx}`); vals.push(config[k]); idx++;
    }
  }
  if (sets.length === 0) return null;
  sets.push("updated_at = NOW()");
  vals.push(tenantId);
  const result = await dbQuery(`UPDATE tenants SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`, vals);
  return result[0] || null;
}

// ═══════════════════════════════════════════════════════
// CUSTOM FIELDS
// ═══════════════════════════════════════════════════════

async function getCustomFields(tenantId) {
  return await dbQuery("SELECT * FROM tenant_custom_fields WHERE tenant_id = $1 ORDER BY sort_order, id", [tenantId]);
}

async function createCustomField(tenantId, { fieldKey, fieldLabel, fieldType, fieldOptions, applyTo, isRequired }) {
  const rows = await dbQuery(
    "INSERT INTO tenant_custom_fields (tenant_id, field_key, field_label, field_type, field_options, apply_to, is_required) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
    [tenantId, fieldKey, fieldLabel, fieldType || "text", JSON.stringify(fieldOptions || []), applyTo || "orders", isRequired || false]
  );
  return rows[0];
}

async function updateCustomField(tenantId, id, updates) {
  const sets = []; const vals = []; let idx = 1;
  if (updates.fieldLabel !== undefined) { sets.push(`field_label = $${idx++}`); vals.push(updates.fieldLabel); }
  if (updates.fieldOptions !== undefined) { sets.push(`field_options = $${idx++}`); vals.push(JSON.stringify(updates.fieldOptions)); }
  if (updates.isRequired !== undefined) { sets.push(`is_required = $${idx++}`); vals.push(updates.isRequired); }
  if (updates.visibleInTable !== undefined) { sets.push(`visible_in_table = $${idx++}`); vals.push(updates.visibleInTable); }
  if (sets.length === 0) return null;
  sets.push("updated_at = NOW()");
  vals.push(tenantId, id);
  await dbQuery(`UPDATE tenant_custom_fields SET ${sets.join(", ")} WHERE tenant_id = $${idx++} AND id = $${idx++}`, vals);
  return await dbQuery("SELECT * FROM tenant_custom_fields WHERE tenant_id = $1 AND id = $2", [tenantId, id]).then(r => r[0]);
}

async function deleteCustomField(tenantId, id) {
  await dbQuery("DELETE FROM tenant_custom_fields WHERE tenant_id = $1 AND id = $2", [tenantId, id]);
}

// ═══════════════════════════════════════════════════════
// BOT FLOW STEPS
// ═══════════════════════════════════════════════════════

async function getBotFlowSteps(tenantId) {
  return await dbQuery("SELECT * FROM bot_flow_steps WHERE tenant_id = $1 ORDER BY sort_order, id", [tenantId]);
}

async function createBotFlowStep(tenantId, step) {
  const rows = await dbQuery(
    "INSERT INTO bot_flow_steps (tenant_id, step_key, step_label, step_type, prompt_message, button_choices, next_step, fallback_step, input_variable, validation, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *",
    [tenantId, step.stepKey, step.stepLabel, step.stepType || "text_input", step.promptMessage || null, JSON.stringify(step.buttonChoices || []), step.nextStep || null, step.fallbackStep || null, step.inputVariable || null, JSON.stringify(step.validation || {}), step.sortOrder || 0]
  );
  return rows[0];
}

async function updateBotFlowStep(tenantId, id, updates) {
  const sets = []; const vals = []; let idx = 1;
  const map = { stepLabel: "step_label", stepType: "step_type", promptMessage: "prompt_message", nextStep: "next_step", fallbackStep: "fallback_step", inputVariable: "input_variable", sortOrder: "sort_order", isActive: "is_active" };
  for (const [k, col] of Object.entries(map)) {
    if (updates[k] !== undefined) {
      sets.push(`${col} = $${idx++}`); vals.push(k === "isActive" ? updates[k] : String(updates[k] || ""));
    }
  }
  if (updates.buttonChoices !== undefined) { sets.push(`button_choices = $${idx++}`); vals.push(JSON.stringify(updates.buttonChoices)); }
  if (updates.validation !== undefined) { sets.push(`validation = $${idx++}`); vals.push(JSON.stringify(updates.validation)); }
  if (sets.length === 0) return null;
  sets.push("updated_at = NOW()");
  vals.push(tenantId, id);
  await dbQuery(`UPDATE bot_flow_steps SET ${sets.join(", ")} WHERE tenant_id = $${idx++} AND id = $${idx++}`, vals);
  return await dbQuery("SELECT * FROM bot_flow_steps WHERE tenant_id = $1 AND id = $2", [tenantId, id]).then(r => r[0]);
}

async function deleteBotFlowStep(tenantId, id) {
  await dbQuery("DELETE FROM bot_flow_steps WHERE tenant_id = $1 AND id = $2", [tenantId, id]);
}

async function getBotFlowState(conversationId) {
  const rows = await dbQuery("SELECT * FROM bot_flow_state WHERE conversation_id = $1", [conversationId]);
  return rows[0] || null;
}

async function updateBotFlowState(conversationId, { currentStep, collectedData, isComplete }) {
  const existing = await getBotFlowState(conversationId);
  if (existing) {
    const updates = []; const vals = []; let idx = 1;
    if (currentStep !== undefined) { updates.push(`current_step = $${idx++}`); vals.push(currentStep); }
    if (collectedData !== undefined) { updates.push(`collected_data = $${idx++}`); vals.push(JSON.stringify(collectedData)); }
    if (isComplete !== undefined) { updates.push(`is_complete = $${idx++}`); vals.push(isComplete); }
    if (isComplete) { updates.push("completed_at = NOW()"); }
    if (updates.length === 0) return;
    vals.push(conversationId);
    await dbQuery(`UPDATE bot_flow_state SET ${updates.join(", ")} WHERE conversation_id = $${idx}`, vals);
  } else {
    await dbQuery(
      "INSERT INTO bot_flow_state (conversation_id, current_step, collected_data, is_complete) VALUES ($1, $2, $3, $4)",
      [conversationId, currentStep || null, JSON.stringify(collectedData || {}), isComplete || false]
    );
  }
}

async function resetBotFlowState(conversationId) {
  await dbQuery(
    "UPDATE bot_flow_state SET current_step = NULL, collected_data = '{}'::jsonb, is_complete = false, completed_at = NULL, started_at = NOW() WHERE conversation_id = $1",
    [conversationId]
  );
}

// ═══════════════════════════════════════════════════════
// ORDER STATUSES
// ═══════════════════════════════════════════════════════

async function getOrderStatuses(tenantId) {
  return await dbQuery("SELECT * FROM tenant_order_statuses WHERE tenant_id = $1 ORDER BY sort_order", [tenantId]);
}

async function createOrderStatus(tenantId, { statusKey, statusLabel, color }) {
  return (await dbQuery(
    "INSERT INTO tenant_order_statuses (tenant_id, status_key, status_label, color) VALUES ($1, $2, $3, $4) RETURNING *",
    [tenantId, statusKey, statusLabel, color || "#4d8ef7"]
  ))[0];
}

async function updateOrderStatus(tenantId, id, updates) {
  const sets = []; const vals = []; let idx = 1;
  if (updates.statusLabel) { sets.push(`status_label = $${idx++}`); vals.push(updates.statusLabel); }
  if (updates.color) { sets.push(`color = $${idx++}`); vals.push(updates.color); }
  if (updates.sortOrder !== undefined) { sets.push(`sort_order = $${idx++}`); vals.push(updates.sortOrder); }
  if (sets.length === 0) return null;
  vals.push(tenantId, id);
  await dbQuery(`UPDATE tenant_order_statuses SET ${sets.join(", ")} WHERE tenant_id = $${idx++} AND id = $${idx++}`, vals);
  return (await dbQuery("SELECT * FROM tenant_order_statuses WHERE tenant_id = $1 AND id = $2", [tenantId, id]))[0];
}

async function deleteOrderStatus(tenantId, id) {
  await dbQuery("DELETE FROM tenant_order_statuses WHERE tenant_id = $1 AND id = $2", [tenantId, id]);
}

// ═══════════════════════════════════════════════════════
// FINANCE CATEGORIES
// ═══════════════════════════════════════════════════════

async function getFinanceCategories(tenantId) {
  return await dbQuery("SELECT * FROM tenant_finance_categories WHERE tenant_id = $1 ORDER BY sort_order", [tenantId]);
}

async function createFinanceCategory(tenantId, { categoryKey, categoryLabel, type, color }) {
  return (await dbQuery(
    "INSERT INTO tenant_finance_categories (tenant_id, category_key, category_label, type, color) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [tenantId, categoryKey, categoryLabel, type || "expense", color || "#8b90a0"]
  ))[0];
}

// ═══════════════════════════════════════════════════════
// TAGS
// ═══════════════════════════════════════════════════════

async function getTags(tenantId) {
  return await dbQuery("SELECT * FROM tenant_tags WHERE tenant_id = $1 ORDER BY sort_order", [tenantId]);
}

async function createTag(tenantId, { tagKey, tagLabel, color }) {
  return (await dbQuery(
    "INSERT INTO tenant_tags (tenant_id, tag_key, tag_label, color) VALUES ($1, $2, $3, $4) RETURNING *",
    [tenantId, tagKey, tagLabel, color || "#4d8ef7"]
  ))[0];
}

async function deleteTag(tenantId, id) {
  await dbQuery("DELETE FROM tenant_tags WHERE tenant_id = $1 AND id = $2", [tenantId, id]);
}

// ═══════════════════════════════════════════════════════
// CONVERSATIONS
// ═══════════════════════════════════════════════════════

async function getOrCreateConversation(tenantId, senderId, name) {
  const existing = await dbQuery("SELECT * FROM conversations WHERE tenant_id = $1 AND sender_id = $2", [tenantId, senderId]);
  if (existing[0]) return existing[0];
  const rows = await dbQuery("INSERT INTO conversations (tenant_id, sender_id, name) VALUES ($1, $2, $3) RETURNING *", [tenantId, senderId, name || null]);
  return rows[0];
}

async function getConversationById(tenantId, id) {
  return (await dbQuery("SELECT * FROM conversations WHERE tenant_id = $1 AND id = $2", [tenantId, id]))[0] || null;
}

async function getAllConversations(tenantId, { limit = 50, offset = 0, status, search, tag } = {}) {
  let conds = ["tenant_id = $1"]; let vals = [tenantId]; let idx = 2;
  if (status) { conds.push(`status = $${idx++}`); vals.push(status); }
  if (search) { conds.push(`(name ILIKE $${idx} OR sender_id ILIKE $${idx})`); vals.push(`%${search}%`); idx++; }
  if (tag) { conds.push(`tags @> $${idx}::jsonb`); vals.push(JSON.stringify([tag])); idx++; }
  vals.push(limit, offset);
  return await dbQuery(
    `SELECT * FROM conversations WHERE ${conds.join(" AND ")} ORDER BY updated_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    vals
  );
}

async function getConversationCount(tenantId) {
  return parseInt(((await dbQuery("SELECT COUNT(*)::int as count FROM conversations WHERE tenant_id = $1", [tenantId]))[0] || {}).count || 0, 10);
}

async function updateConversationStatus(tenantId, id, status) {
  await dbQuery("UPDATE conversations SET status = $1, updated_at = NOW() WHERE tenant_id = $2 AND id = $3", [status, tenantId, id]);
}

async function updateConversationTags(tenantId, id, tags) {
  await dbQuery("UPDATE conversations SET tags = $1::jsonb, updated_at = NOW() WHERE tenant_id = $2 AND id = $3", [JSON.stringify(tags), tenantId, id]);
}

async function updateConversationCustomFields(tenantId, id, customFields) {
  await dbQuery("UPDATE conversations SET custom_fields = $1::jsonb, updated_at = NOW() WHERE tenant_id = $2 AND id = $3", [JSON.stringify(customFields), tenantId, id]);
}

async function updateConversationNotes(tenantId, id, notes) {
  await dbQuery("UPDATE conversations SET notes = $1, updated_at = NOW() WHERE tenant_id = $2 AND id = $3", [notes, tenantId, id]);
}

// ═══════════════════════════════════════════════════════
// MESSAGES
// ═══════════════════════════════════════════════════════

async function logMessage(tenantId, { conversationId, senderType, messageType, content, mediaUrl, mid, replyToMid }) {
  const rows = await dbQuery(
    "INSERT INTO messages (tenant_id, conversation_id, sender_type, message_type, content, media_url, mid, reply_to_mid) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
    [tenantId, conversationId, senderType, messageType || "text", content || null, mediaUrl || null, mid || null, replyToMid || null]
  );
  await dbQuery("UPDATE conversations SET updated_at = NOW(), last_activity_at = NOW() WHERE tenant_id = $1 AND id = $2", [tenantId, conversationId]);
  return rows[0];
}

async function getMessages(tenantId, conversationId, { limit = 50, before } = {}) {
  if (before) {
    return await dbQuery(
      "SELECT * FROM messages WHERE tenant_id = $1 AND conversation_id = $2 AND id < $3 ORDER BY created_at DESC LIMIT $4",
      [tenantId, conversationId, before, limit]
    );
  }
  return await dbQuery(
    "SELECT * FROM messages WHERE tenant_id = $1 AND conversation_id = $2 ORDER BY created_at ASC LIMIT $3",
    [tenantId, conversationId, limit]
  );
}

async function toggleBot(tenantId, conversationId) {
  const rows = await dbQuery(
    "UPDATE conversations SET is_bot_enabled = NOT is_bot_enabled, updated_at = NOW() WHERE tenant_id = $1 AND id = $2 RETURNING is_bot_enabled",
    [tenantId, conversationId]
  );
  return rows[0]?.is_bot_enabled;
}

async function isBotEnabled(tenantId, conversationId) {
  const rows = await dbQuery("SELECT is_bot_enabled FROM conversations WHERE tenant_id = $1 AND id = $2", [tenantId, conversationId]);
  return (rows[0] || {}).is_bot_enabled !== false;
}

// ═══════════════════════════════════════════════════════
// AUTOMATIONS
// ═══════════════════════════════════════════════════════

async function getAllAutomations(tenantId) {
  return await dbQuery("SELECT * FROM automations WHERE tenant_id = $1 ORDER BY automation_group_id, id", [tenantId]);
}

async function createAutomation(tenantId, { name, triggerType, triggerValue, steps, description, groupId }) {
  return (await dbQuery(
    "INSERT INTO automations (tenant_id, name, trigger_type, trigger_value, steps, description, automation_group_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
    [tenantId, name, triggerType, triggerValue || null, JSON.stringify(steps || []), description || null, groupId || null]
  ))[0];
}

async function updateAutomation(tenantId, id, updates) {
  const sets = []; const vals = []; let idx = 1;
  if (updates.name !== undefined) { sets.push(`name = $${idx++}`); vals.push(updates.name); }
  if (updates.is_active !== undefined) { sets.push(`is_active = $${idx++}`); vals.push(updates.is_active); }
  if (updates.steps !== undefined) { sets.push(`steps = $${idx++}`); vals.push(JSON.stringify(updates.steps)); }
  if (updates.trigger_value !== undefined) { sets.push(`trigger_value = $${idx++}`); vals.push(updates.trigger_value); }
  if (sets.length === 0) return null;
  sets.push("updated_at = NOW()");
  vals.push(tenantId, id);
  await dbQuery(`UPDATE automations SET ${sets.join(", ")} WHERE tenant_id = $${idx++} AND id = $${idx++}`, vals);
  return (await dbQuery("SELECT * FROM automations WHERE tenant_id = $1 AND id = $2", [tenantId, id]))[0];
}

async function deleteAutomation(tenantId, id) {
  await dbQuery("DELETE FROM automations WHERE tenant_id = $1 AND id = $2", [tenantId, id]);
}

// ═══════════════════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════════════════

async function getAllOrders(tenantId, { limit = 50, offset = 0, status } = {}) {
  if (status) {
    return await dbQuery("SELECT * FROM orders WHERE tenant_id = $1 AND status = $2 ORDER BY updated_at DESC LIMIT $3 OFFSET $4", [tenantId, status, limit, offset]);
  }
  return await dbQuery("SELECT * FROM orders WHERE tenant_id = $1 ORDER BY updated_at DESC LIMIT $2 OFFSET $3", [tenantId, limit, offset]);
}

async function createOrder(tenantId, { conversationId, customerName, amount, status, paymentStatus, items, customFields }) {
  return (await dbQuery(
    "INSERT INTO orders (tenant_id, conversation_id, customer_name, amount, status, payment_status, items, custom_fields) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
    [tenantId, conversationId || null, customerName || null, amount || 0, status || "new", paymentStatus || "pending", JSON.stringify(items || []), JSON.stringify(customFields || {})]
  ))[0];
}

async function updateOrder(tenantId, id, updates) {
  const sets = []; const vals = []; let idx = 1;
  if (updates.status !== undefined) { sets.push(`status = $${idx++}`); vals.push(updates.status); }
  if (updates.custom_fields !== undefined) { sets.push(`custom_fields = $${idx++}`); vals.push(JSON.stringify(updates.custom_fields)); }
  if (updates.payment_status !== undefined) { sets.push(`payment_status = $${idx++}`); vals.push(updates.payment_status); }
  if (updates.amount !== undefined) { sets.push(`amount = $${idx++}`); vals.push(updates.amount); }
  if (updates.customer_name !== undefined) { sets.push(`customer_name = $${idx++}`); vals.push(updates.customer_name); }
  if (updates.notes !== undefined) { sets.push(`notes = $${idx++}`); vals.push(updates.notes); }
  if (sets.length === 0) return null;
  sets.push("updated_at = NOW()");
  vals.push(tenantId, id);
  await dbQuery(`UPDATE orders SET ${sets.join(", ")} WHERE tenant_id = $${idx++} AND id = $${idx++}`, vals);
  return (await dbQuery("SELECT * FROM orders WHERE tenant_id = $1 AND id = $2", [tenantId, id]))[0];
}

// ═══════════════════════════════════════════════════════
// FINANCE
// ═══════════════════════════════════════════════════════

async function getLedger(tenantId, { limit = 100, offset = 0, month } = {}) {
  if (month) {
    return await dbQuery("SELECT * FROM ledger_entries WHERE tenant_id = $1 AND date >= $2::date AND date < ($2::date + INTERVAL '1 month') ORDER BY date DESC, id DESC LIMIT $3 OFFSET $4", [tenantId, month + "-01", limit, offset]);
  }
  return await dbQuery("SELECT * FROM ledger_entries WHERE tenant_id = $1 ORDER BY date DESC, id DESC LIMIT $2 OFFSET $3", [tenantId, limit, offset]);
}

async function addLedgerEntry(tenantId, { date, description, category, amount, type }) {
  return (await dbQuery(
    "INSERT INTO ledger_entries (tenant_id, date, description, category, amount, type) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
    [tenantId, date, description || "", category || "", amount || 0, type || "expense"]
  ))[0];
}

// ═══════════════════════════════════════════════════════
// QUICK REPLIES / FAQS / MEDIA / SETTINGS
// ═══════════════════════════════════════════════════════

async function getAllQuickReplies(tenantId) {
  return await dbQuery("SELECT * FROM quick_replies WHERE tenant_id = $1 ORDER BY sort_order", [tenantId]);
}

async function createQuickReply(tenantId, { label, message, category }) {
  return (await dbQuery("INSERT INTO quick_replies (tenant_id, label, message, category) VALUES ($1,$2,$3,$4) RETURNING *", [tenantId, label, message, category || "general"]))[0];
}

async function deleteQuickReply(tenantId, id) {
  await dbQuery("DELETE FROM quick_replies WHERE tenant_id = $1 AND id = $2", [tenantId, id]);
}

async function getAllFaqs(tenantId) {
  return await dbQuery("SELECT * FROM faqs WHERE tenant_id = $1 ORDER BY sort_order", [tenantId]);
}

async function createFaq(tenantId, { question, answer, keywords, category }) {
  return (await dbQuery("INSERT INTO faqs (tenant_id, question, answer, keywords, category) VALUES ($1,$2,$3,$4,$5) RETURNING *", [tenantId, question, answer, keywords || null, category || "general"]))[0];
}

async function deleteFaq(tenantId, id) {
  await dbQuery("DELETE FROM faqs WHERE tenant_id = $1 AND id = $2", [tenantId, id]);
}

async function getMediaAssets(tenantId, category) {
  if (category) return await dbQuery("SELECT * FROM media_assets WHERE tenant_id = $1 AND category = $2 ORDER BY created_at DESC", [tenantId, category]);
  return await dbQuery("SELECT * FROM media_assets WHERE tenant_id = $1 ORDER BY category, created_at DESC", [tenantId]);
}

async function createMediaAsset(tenantId, { category, filename, url, content_type, metadata }) {
  return (await dbQuery("INSERT INTO media_assets (tenant_id, category, filename, url, content_type, metadata) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *", [tenantId, category || "general", filename || null, url, content_type || null, JSON.stringify(metadata || {})]))[0];
}

async function getMessageTemplates(tenantId) {
  return await dbQuery("SELECT * FROM message_templates WHERE tenant_id = $1 ORDER BY name", [tenantId]);
}

async function createMessageTemplate(tenantId, { name, templateType, content, description }) {
  return (await dbQuery("INSERT INTO message_templates (tenant_id, name, template_type, content, description) VALUES ($1,$2,$3,$4,$5) RETURNING *", [tenantId, name, templateType || "text", JSON.stringify(content), description || null]))[0];
}

async function getAllSettings(tenantId) {
  const rows = await dbQuery("SELECT key, value FROM tenant_settings WHERE tenant_id = $1", [tenantId]);
  const settings = {};
  for (const r of rows) settings[r.key] = r.value;
  return settings;
}

async function updateSettings(tenantId, updates) {
  for (const [key, value] of Object.entries(updates)) {
    const jsonVal = JSON.stringify(value);
    await dbQuery(
      "INSERT INTO tenant_settings (tenant_id, key, value, updated_at) VALUES ($1,$2,$3::jsonb,NOW()) ON CONFLICT (tenant_id, key) DO UPDATE SET value = $3::jsonb, updated_at = NOW()",
      [tenantId, key, jsonVal]
    );
  }
}

async function logAdminAudit(tenantId, userEmail, action, details = {}) {
  await dbQuery("INSERT INTO audit_log (tenant_id, user_email, action, details) VALUES ($1,$2,$3,$4)", [tenantId, userEmail, action, JSON.stringify(details)]);
}

async function updateQuickReply(tenantId, id, updates) {
  const sets = []; const vals = []; let idx = 1;
  if (updates.label !== undefined) { sets.push(`label = $${idx++}`); vals.push(updates.label); }
  if (updates.message !== undefined) { sets.push(`message = $${idx++}`); vals.push(updates.message); }
  if (sets.length === 0) return null;
  vals.push(tenantId, id);
  await dbQuery(`UPDATE quick_replies SET ${sets.join(", ")} WHERE tenant_id = $${idx++} AND id = $${idx++}`, vals);
  return (await dbQuery("SELECT * FROM quick_replies WHERE tenant_id = $1 AND id = $2", [tenantId, id]))[0];
}

async function updateFaq(tenantId, id, updates) {
  const sets = []; const vals = []; let idx = 1;
  if (updates.question !== undefined) { sets.push(`question = $${idx++}`); vals.push(updates.question); }
  if (updates.answer !== undefined) { sets.push(`answer = $${idx++}`); vals.push(updates.answer); }
  if (updates.keywords !== undefined) { sets.push(`keywords = $${idx++}`); vals.push(updates.keywords); }
  if (sets.length === 0) return null;
  sets.push("updated_at = NOW()");
  vals.push(tenantId, id);
  await dbQuery(`UPDATE faqs SET ${sets.join(", ")} WHERE tenant_id = $${idx++} AND id = $${idx++}`, vals);
  return (await dbQuery("SELECT * FROM faqs WHERE tenant_id = $1 AND id = $2", [tenantId, id]))[0];
}

module.exports = {
  setDbUrl, getDbUrl, getDb, dbQuery, initDb,
  getTenantBySlug, getTenantById, getAllTenants, createTenant, updateTenantConfig, seedTenantDefaults,
  getCustomFields, createCustomField, updateCustomField, deleteCustomField,
  getBotFlowSteps, createBotFlowStep, updateBotFlowStep, deleteBotFlowStep,
  getBotFlowState, updateBotFlowState, resetBotFlowState,
  getOrderStatuses, createOrderStatus, updateOrderStatus, deleteOrderStatus,
  getFinanceCategories, createFinanceCategory,
  getTags, createTag, deleteTag,
  getOrCreateConversation, getConversationById, getAllConversations,
  getConversationCount, updateConversationStatus, updateConversationTags,
  updateConversationCustomFields, updateConversationNotes,
  logMessage, getMessages, toggleBot, isBotEnabled,
  getAllAutomations, createAutomation, updateAutomation, deleteAutomation,
  getAllOrders, createOrder, updateOrder,
  getLedger, addLedgerEntry,
  getAllQuickReplies, createQuickReply, updateQuickReply, deleteQuickReply,
  getAllFaqs, createFaq, updateFaq, deleteFaq,
  getMediaAssets, createMediaAsset,
  getMessageTemplates, createMessageTemplate,
  getAllSettings, updateSettings,
  logAdminAudit,
};
