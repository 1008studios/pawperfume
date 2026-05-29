const { neon } = require("@neondatabase/serverless");
const crypto = require("node:crypto");

let sqlClient = null;
const DB_SCHEMA_VERSION = "2026-05-29-v2";

function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  if (!sqlClient) sqlClient = neon(process.env.DATABASE_URL);
  return sqlClient;
}

async function initDb() { return true; }

// ═══════════════════════════════════════════════════════════
// TENANT OPERATIONS
// ═══════════════════════════════════════════════════════════

async function getTenantBySlug(slug) {
  const rows = await getDb()`SELECT * FROM tenants WHERE slug = ${slug} LIMIT 1`;
  return rows[0] || null;
}

async function getTenantById(id) {
  const rows = await getDb()`SELECT * FROM tenants WHERE id = ${id} LIMIT 1`;
  return rows[0] || null;
}

async function getAllTenants() {
  return await getDb()`SELECT * FROM tenants ORDER BY created_at DESC`;
}

async function createTenant({ slug, name, brandName, plan = "free" }) {
  const rows = await getDb()`
    INSERT INTO tenants (slug, name, brand_name, plan)
    VALUES (${slug}, ${name}, ${brandName || name}, ${plan})
    RETURNING *
  `;
  // Seed defaults for new tenant
  const tenantId = rows[0].id;
  await seedTenantDefaults(tenantId);
  return rows[0];
}

async function seedTenantDefaults(tenantId) {
  const statuses = [
    ["new", "New", "#4d8ef7", 1],
    ["in_progress", "In Progress", "#f59e0b", 2],
    ["completed", "Completed", "#10b981", 3],
    ["cancelled", "Cancelled", "#ef4444", 4],
  ];
  for (const [key, label, color, order] of statuses) {
    await getDb()`INSERT INTO tenant_order_statuses (tenant_id, status_key, status_label, color, sort_order) VALUES (${tenantId}, ${key}, ${label}, ${color}, ${order}) ON CONFLICT (tenant_id, status_key) DO NOTHING`;
  }
  const cats = [
    ["materials", "Materials", "expense", "#f59e0b", 1],
    ["marketing", "Marketing", "expense", "#8b5cf6", 2],
    ["sales", "Sales", "revenue", "#10b981", 3],
    ["other", "Other", "expense", "#8b90a0", 99],
  ];
  for (const [key, label, type, color, order] of cats) {
    await getDb()`INSERT INTO tenant_finance_categories (tenant_id, category_key, category_label, type, color, sort_order) VALUES (${tenantId}, ${key}, ${label}, ${type}, ${color}, ${order}) ON CONFLICT (tenant_id, category_key, type) DO NOTHING`;
  }
}

async function updateTenantConfig(tenantId, config) {
  const allowed = [
    "fb_page_access_token", "fb_app_secret", "fb_verify_token", "fb_page_id",
    "brand_name", "brand_tagline", "brand_logo_url", "brand_primary_color",
    "brand_accent_color", "brand_background_color", "brand_favicon_emoji",
    "brand_welcome_title", "brand_welcome_message",
    "ai_system_prompt", "ai_model", "ai_enabled", "ai_language", "ai_tone",
    "is_active", "plan",
  ];
  const setClauses = [];
  for (const k of allowed) {
    if (config[k] !== undefined) {
      const val = config[k] === null ? "NULL" : `'${String(config[k]).replace(/'/g, "''")}'`;
      setClauses.push(`${k} = ${val}`);
    }
  }
  if (setClauses.length === 0) return null;
  setClauses.push("updated_at = NOW()");

  const sql = `UPDATE tenants SET ${setClauses.join(", ")} WHERE id = $1 RETURNING *`;
  const rows = await getDb()`UPDATE tenants SET ${setClauses.join(", ")} WHERE id = ${tenantId} RETURNING *`.catch(() => []);
  return rows[0] || null;
}

// ═══════════════════════════════════════════════════════════
// TENANT USERS
// ═══════════════════════════════════════════════════════════

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function createTenantUser(tenantId, { email, password, name, role = "member" }) {
  const rows = await getDb()`
    INSERT INTO tenant_users (tenant_id, email, password_hash, name, role)
    VALUES (${tenantId}, ${email}, ${hashPassword(password)}, ${name || null}, ${role})
    RETURNING id, email, name, role, created_at
  `;
  return rows[0];
}

async function verifyTenantUser(tenantId, email, password) {
  const rows = await getDb()`
    SELECT id, email, name, role, password_hash FROM tenant_users
    WHERE tenant_id = ${tenantId} AND email = ${email} LIMIT 1
  `;
  if (!rows[0]) return null;
  if (rows[0].password_hash !== hashPassword(password)) return null;
  const { password_hash, ...user } = rows[0];
  return user;
}

async function getTenantUsers(tenantId) {
  return await getDb()`SELECT id, email, name, role, created_at FROM tenant_users WHERE tenant_id = ${tenantId} ORDER BY created_at`;
}

// ═══════════════════════════════════════════════════════════
// CUSTOM FIELDS (per tenant — replaces hardcoded fields)
// ═══════════════════════════════════════════════════════════

async function getCustomFields(tenantId) {
  return await getDb()`
    SELECT * FROM tenant_custom_fields WHERE tenant_id = ${tenantId}
    ORDER BY sort_order, id
  `;
}

async function createCustomField(tenantId, { fieldKey, fieldLabel, fieldType, fieldOptions, applyTo, isRequired, visibleInTable }) {
  const rows = await getDb()`
    INSERT INTO tenant_custom_fields (tenant_id, field_key, field_label, field_type, field_options, apply_to, is_required, visible_in_table)
    VALUES (${tenantId}, ${fieldKey}, ${fieldLabel}, ${fieldType || "text"}, ${JSON.stringify(fieldOptions || [])}, ${applyTo || "orders"}, ${isRequired || false}, ${visibleInTable !== false})
    RETURNING *
  `;
  return rows[0];
}

async function updateCustomField(tenantId, id, updates) {
  const sets = [];
  if (updates.fieldLabel !== undefined) sets.push(`field_label = '${String(updates.fieldLabel).replace(/'/g, "''")}'`);
  if (updates.fieldOptions !== undefined) sets.push(`field_options = '${JSON.stringify(updates.fieldOptions).replace(/'/g, "''")}'`);
  if (updates.isRequired !== undefined) sets.push(`is_required = ${updates.isRequired}`);
  if (updates.visibleInTable !== undefined) sets.push(`visible_in_table = ${updates.visibleInTable}`);
  if (updates.sortOrder !== undefined) sets.push(`sort_order = ${updates.sortOrder}`);
  if (sets.length === 0) return null;
  sets.push("updated_at = NOW()");

  await getDb()`UPDATE tenant_custom_fields SET ${sets.join(", ")} WHERE tenant_id = ${tenantId} AND id = ${id}`;
  return await getDb()`SELECT * FROM tenant_custom_fields WHERE tenant_id = ${tenantId} AND id = ${id}`.then(r => r[0]);
}

async function deleteCustomField(tenantId, id) {
  await getDb()`DELETE FROM tenant_custom_fields WHERE tenant_id = ${tenantId} AND id = ${id}`;
}

// ═══════════════════════════════════════════════════════════
// BOT FLOW STEPS (replaces hardcoded pet intake flow)
// ═══════════════════════════════════════════════════════════

async function getBotFlowSteps(tenantId) {
  return await getDb()`
    SELECT * FROM bot_flow_steps WHERE tenant_id = ${tenantId}
    ORDER BY sort_order, id
  `;
}

async function createBotFlowStep(tenantId, step) {
  const rows = await getDb()`
    INSERT INTO bot_flow_steps (tenant_id, step_key, step_label, step_type, prompt_message, button_choices, next_step, fallback_step, input_variable, validation, sort_order)
    VALUES (${tenantId}, ${step.stepKey}, ${step.stepLabel}, ${step.stepType || "text_input"}, ${step.promptMessage || null}, ${JSON.stringify(step.buttonChoices || [])}, ${step.nextStep || null}, ${step.fallbackStep || null}, ${step.inputVariable || null}, ${JSON.stringify(step.validation || {})}, ${step.sortOrder || 0})
    RETURNING *
  `;
  return rows[0];
}

async function updateBotFlowStep(tenantId, id, updates) {
  const sets = [];
  const map = {
    stepLabel: "step_label", stepType: "step_type", promptMessage: "prompt_message",
    nextStep: "next_step", fallbackStep: "fallback_step", inputVariable: "input_variable",
    sortOrder: "sort_order", isActive: "is_active",
  };
  for (const [k, col] of Object.entries(map)) {
    if (updates[k] !== undefined) {
      const v = updates[k];
      if (k === "buttonChoices" || k === "validation") {
        sets.push(`${col} = '${JSON.stringify(v).replace(/'/g, "''")}'`);
      } else if (k === "isActive") {
        sets.push(`${col} = ${v}`);
      } else {
        sets.push(`${col} = '${String(v || "").replace(/'/g, "''")}'`);
      }
    }
  }
  if (updates.buttonChoices !== undefined) sets.push(`button_choices = '${JSON.stringify(updates.buttonChoices).replace(/'/g, "''")}'`);
  if (updates.validation !== undefined) sets.push(`validation = '${JSON.stringify(updates.validation).replace(/'/g, "''")}'`);
  if (sets.length === 0) return null;
  sets.push("updated_at = NOW()");

  await getDb()`UPDATE bot_flow_steps SET ${sets.join(", ")} WHERE tenant_id = ${tenantId} AND id = ${id}`;
  return await getDb()`SELECT * FROM bot_flow_steps WHERE tenant_id = ${tenantId} AND id = ${id}`.then(r => r[0]);
}

async function deleteBotFlowStep(tenantId, id) {
  await getDb()`DELETE FROM bot_flow_steps WHERE tenant_id = ${tenantId} AND id = ${id}`;
}

async function getBotFlowState(conversationId) {
  const rows = await getDb()`SELECT * FROM bot_flow_state WHERE conversation_id = ${conversationId} LIMIT 1`;
  return rows[0] || null;
}

async function updateBotFlowState(conversationId, { currentStep, collectedData, isComplete }) {
  const data = collectedData ? JSON.stringify(collectedData) : null;
  await getDb()`
    INSERT INTO bot_flow_state (conversation_id, current_step, collected_data, is_complete)
    VALUES (${conversationId}, ${currentStep || null}, ${data ? data + "::jsonb" : "'{}'::jsonb"}, ${isComplete || false})
    ON CONFLICT (conversation_id)
    DO UPDATE SET current_step = COALESCE(${currentStep || null}, bot_flow_state.current_step),
                  collected_data = CASE WHEN ${data !== null} THEN ${data + "::jsonb"} ELSE bot_flow_state.collected_data END,
                  is_complete = COALESCE(${isComplete || null}, bot_flow_state.is_complete),
                  completed_at = CASE WHEN ${isComplete === true} THEN NOW() ELSE bot_flow_state.completed_at END
  `;
}

async function resetBotFlowState(conversationId) {
  await getDb()`UPDATE bot_flow_state SET current_step = NULL, collected_data = '{}'::jsonb, is_complete = false, completed_at = NULL, started_at = NOW() WHERE conversation_id = ${conversationId}`;
}

// ═══════════════════════════════════════════════════════════
// ORDER STATUSES (customizable per tenant)
// ═══════════════════════════════════════════════════════════

async function getOrderStatuses(tenantId) {
  return await getDb()`SELECT * FROM tenant_order_statuses WHERE tenant_id = ${tenantId} ORDER BY sort_order`;
}

async function createOrderStatus(tenantId, { statusKey, statusLabel, color }) {
  const rows = await getDb()`
    INSERT INTO tenant_order_statuses (tenant_id, status_key, status_label, color)
    VALUES (${tenantId}, ${statusKey}, ${statusLabel}, ${color || "#4d8ef7"})
    RETURNING *
  `;
  return rows[0];
}

async function updateOrderStatus(tenantId, id, updates) {
  const sets = [];
  if (updates.statusLabel) sets.push(`status_label = '${String(updates.statusLabel).replace(/'/g, "''")}'`);
  if (updates.color) sets.push(`color = '${updates.color}'`);
  if (updates.sortOrder !== undefined) sets.push(`sort_order = ${updates.sortOrder}`);
  if (sets.length === 0) return null;
  await getDb()`UPDATE tenant_order_statuses SET ${sets.join(", ")} WHERE tenant_id = ${tenantId} AND id = ${id}`;
  return await getDb()`SELECT * FROM tenant_order_statuses WHERE tenant_id = ${tenantId} AND id = ${id}`.then(r => r[0]);
}

async function deleteOrderStatus(tenantId, id) {
  await getDb()`DELETE FROM tenant_order_statuses WHERE tenant_id = ${tenantId} AND id = ${id}`;
}

// ═══════════════════════════════════════════════════════════
// FINANCE CATEGORIES
// ═══════════════════════════════════════════════════════════

async function getFinanceCategories(tenantId) {
  return await getDb()`SELECT * FROM tenant_finance_categories WHERE tenant_id = ${tenantId} ORDER BY sort_order`;
}

async function createFinanceCategory(tenantId, { categoryKey, categoryLabel, type, color }) {
  const rows = await getDb()`
    INSERT INTO tenant_finance_categories (tenant_id, category_key, category_label, type, color)
    VALUES (${tenantId}, ${categoryKey}, ${categoryLabel}, ${type || "expense"}, ${color || "#8b90a0"})
    RETURNING *
  `;
  return rows[0];
}

// ═══════════════════════════════════════════════════════════
// TAGS
// ═══════════════════════════════════════════════════════════

async function getTags(tenantId) {
  return await getDb()`SELECT * FROM tenant_tags WHERE tenant_id = ${tenantId} ORDER BY sort_order`;
}

async function createTag(tenantId, { tagKey, tagLabel, color }) {
  const rows = await getDb()`
    INSERT INTO tenant_tags (tenant_id, tag_key, tag_label, color)
    VALUES (${tenantId}, ${tagKey}, ${tagLabel}, ${color || "#4d8ef7"})
    RETURNING *
  `;
  return rows[0];
}

async function deleteTag(tenantId, id) {
  await getDb()`DELETE FROM tenant_tags WHERE tenant_id = ${tenantId} AND id = ${id}`;
}

// ═══════════════════════════════════════════════════════════
// CONVERSATIONS
// ═══════════════════════════════════════════════════════════

async function getOrCreateConversation(tenantId, senderId, name) {
  const existing = await getDb()`SELECT * FROM conversations WHERE tenant_id = ${tenantId} AND sender_id = ${senderId} LIMIT 1`;
  if (existing[0]) return existing[0];

  const rows = await getDb()`
    INSERT INTO conversations (tenant_id, sender_id, name)
    VALUES (${tenantId}, ${senderId}, ${name || null})
    RETURNING *
  `;
  return rows[0];
}

async function getConversationById(tenantId, id) {
  const rows = await getDb()`SELECT * FROM conversations WHERE tenant_id = ${tenantId} AND id = ${id} LIMIT 1`;
  return rows[0] || null;
}

async function getAllConversations(tenantId, { limit = 50, offset = 0, status, search, tag } = {}) {
  let conds = [`tenant_id = $1`];
  let params = [tenantId];
  let idx = 2;

  if (status) { conds.push(`status = $${idx++}`); params.push(status); }
  if (search) { conds.push(`(name ILIKE $${idx} OR sender_id ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
  if (tag) { conds.push(`tags @> $${idx}::jsonb`); params.push(JSON.stringify([tag])); idx++; }

  const where = conds.join(" AND ");
  return await getDb()`${`SELECT * FROM conversations WHERE ${where} ORDER BY updated_at DESC LIMIT ${limit} OFFSET ${offset}`}`.catch(() => []);
}

async function getConversationCount(tenantId) {
  const rows = await getDb()`SELECT COUNT(*) as count FROM conversations WHERE tenant_id = ${tenantId}`;
  return parseInt(rows[0]?.count || "0", 10);
}

async function updateConversationStatus(tenantId, id, status) {
  await getDb()`UPDATE conversations SET status = ${status}, updated_at = NOW() WHERE tenant_id = ${tenantId} AND id = ${id}`;
}

async function updateConversationTags(tenantId, id, tags) {
  await getDb()`UPDATE conversations SET tags = ${JSON.stringify(tags)}::jsonb, updated_at = NOW() WHERE tenant_id = ${tenantId} AND id = ${id}`;
}

async function updateConversationCustomFields(tenantId, id, customFields) {
  await getDb()`UPDATE conversations SET custom_fields = ${JSON.stringify(customFields)}::jsonb, updated_at = NOW() WHERE tenant_id = ${tenantId} AND id = ${id}`;
}

async function updateConversationNotes(tenantId, id, notes) {
  await getDb()`UPDATE conversations SET notes = ${notes}, updated_at = NOW() WHERE tenant_id = ${tenantId} AND id = ${id}`;
}

// ═══════════════════════════════════════════════════════════
// MESSAGES
// ═══════════════════════════════════════════════════════════

async function logMessage(tenantId, { conversationId, senderType, messageType, content, mediaUrl, mid, replyToMid }) {
  const rows = await getDb()`
    INSERT INTO messages (tenant_id, conversation_id, sender_type, message_type, content, media_url, mid, reply_to_mid)
    VALUES (${tenantId}, ${conversationId}, ${senderType}, ${messageType || "text"}, ${content || null}, ${mediaUrl || null}, ${mid || null}, ${replyToMid || null})
    RETURNING *
  `;
  await getDb()`
    UPDATE conversations SET updated_at = NOW(), last_activity_at = NOW()
    WHERE tenant_id = ${tenantId} AND id = ${conversationId}
  `;
  return rows[0];
}

async function getMessages(tenantId, conversationId, { limit = 50, before } = {}) {
  if (before) {
    return await getDb()`
      SELECT * FROM messages WHERE tenant_id = ${tenantId} AND conversation_id = ${conversationId} AND id < ${before}
      ORDER BY created_at DESC LIMIT ${limit}
    `;
  }
  return await getDb()`
    SELECT * FROM messages WHERE tenant_id = ${tenantId} AND conversation_id = ${conversationId}
    ORDER BY created_at ASC LIMIT ${limit}
  `;
}

async function toggleBot(tenantId, conversationId) {
  const rows = await getDb()`
    UPDATE conversations SET is_bot_enabled = NOT is_bot_enabled, updated_at = NOW()
    WHERE tenant_id = ${tenantId} AND id = ${conversationId} RETURNING is_bot_enabled
  `;
  return rows[0]?.is_bot_enabled;
}

async function isBotEnabled(tenantId, conversationId) {
  const rows = await getDb()`SELECT is_bot_enabled FROM conversations WHERE tenant_id = ${tenantId} AND id = ${conversationId}`;
  return rows[0]?.is_bot_enabled !== false;
}

// ═══════════════════════════════════════════════════════════
// AUTOMATIONS
// ═══════════════════════════════════════════════════════════

async function getAllAutomations(tenantId) {
  return await getDb()`SELECT * FROM automations WHERE tenant_id = ${tenantId} ORDER BY automation_group_id, id`;
}

async function createAutomation(tenantId, { name, triggerType, triggerValue, steps, description, groupId }) {
  const rows = await getDb()`
    INSERT INTO automations (tenant_id, name, trigger_type, trigger_value, steps, description, automation_group_id)
    VALUES (${tenantId}, ${name}, ${triggerType}, ${triggerValue || null}, ${JSON.stringify(steps || [])}, ${description || null}, ${groupId || null})
    RETURNING *
  `;
  return rows[0];
}

async function updateAutomation(tenantId, id, updates) {
  const sets = [];
  if (updates.name !== undefined) sets.push(`name = '${String(updates.name).replace(/'/g, "''")}'`);
  if (updates.is_active !== undefined) sets.push(`is_active = ${updates.is_active}`);
  if (updates.steps !== undefined) sets.push(`steps = '${JSON.stringify(updates.steps).replace(/'/g, "''")}'`);
  if (updates.trigger_value !== undefined) sets.push(`trigger_value = '${String(updates.trigger_value || "").replace(/'/g, "''")}'`);
  if (updates.description !== undefined) sets.push(`description = '${String(updates.description || "").replace(/'/g, "''")}'`);
  if (sets.length === 0) return null;
  sets.push("updated_at = NOW()");

  await getDb()`UPDATE automations SET ${sets.join(", ")} WHERE tenant_id = ${tenantId} AND id = ${id}`;
  return await getDb()`SELECT * FROM automations WHERE tenant_id = ${tenantId} AND id = ${id}`.then(r => r[0]);
}

async function deleteAutomation(tenantId, id) {
  await getDb()`DELETE FROM automations WHERE tenant_id = ${tenantId} AND id = ${id}`;
}

// ═══════════════════════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════════════════════

async function getAllOrders(tenantId, { limit = 50, offset = 0, status } = {}) {
  if (status) {
    return await getDb()`SELECT * FROM orders WHERE tenant_id = ${tenantId} AND status = ${status} ORDER BY updated_at DESC LIMIT ${limit} OFFSET ${offset}`;
  }
  return await getDb()`SELECT * FROM orders WHERE tenant_id = ${tenantId} ORDER BY updated_at DESC LIMIT ${limit} OFFSET ${offset}`;
}

async function createOrder(tenantId, { conversationId, customerName, amount, status, paymentStatus, items, customFields }) {
  const rows = await getDb()`
    INSERT INTO orders (tenant_id, conversation_id, customer_name, amount, status, payment_status, items, custom_fields)
    VALUES (${tenantId}, ${conversationId || null}, ${customerName || null}, ${amount || null}, ${status || "new"}, ${paymentStatus || "pending"}, ${JSON.stringify(items || [])}, ${JSON.stringify(customFields || {})})
    RETURNING *
  `;
  return rows[0];
}

async function updateOrder(tenantId, id, updates) {
  const sets = [];
  if (updates.status !== undefined) sets.push(`status = '${String(updates.status).replace(/'/g, "''")}'`);
  if (updates.custom_fields !== undefined) sets.push(`custom_fields = '${JSON.stringify(updates.custom_fields).replace(/'/g, "''")}'`);
  if (updates.payment_status !== undefined) sets.push(`payment_status = '${String(updates.payment_status).replace(/'/g, "''")}'`);
  if (updates.amount !== undefined) sets.push(`amount = ${updates.amount}`);
  if (updates.customer_name !== undefined) sets.push(`customer_name = '${String(updates.customer_name).replace(/'/g, "''")}'`);
  if (updates.notes !== undefined) sets.push(`notes = '${String(updates.notes).replace(/'/g, "''")}'`);
  if (sets.length === 0) return null;
  sets.push("updated_at = NOW()");

  await getDb()`UPDATE orders SET ${sets.join(", ")} WHERE tenant_id = ${tenantId} AND id = ${id}`;
  return await getDb()`SELECT * FROM orders WHERE tenant_id = ${tenantId} AND id = ${id}`.then(r => r[0]);
}

// ═══════════════════════════════════════════════════════════
// FINANCE
// ═══════════════════════════════════════════════════════════

async function getLedger(tenantId, { limit = 100, offset = 0, month } = {}) {
  if (month) {
    return await getDb()`SELECT * FROM ledger_entries WHERE tenant_id = ${tenantId} AND date >= ${month + "-01"}::date AND date < (${month + "-01"}::date + INTERVAL '1 month') ORDER BY date DESC, id DESC LIMIT ${limit} OFFSET ${offset}`;
  }
  return await getDb()`SELECT * FROM ledger_entries WHERE tenant_id = ${tenantId} ORDER BY date DESC, id DESC LIMIT ${limit} OFFSET ${offset}`;
}

async function addLedgerEntry(tenantId, { date, description, category, amount, type }) {
  const rows = await getDb()`
    INSERT INTO ledger_entries (tenant_id, date, description, category, amount, type)
    VALUES (${tenantId}, ${date}, ${description || ""}, ${category || ""}, ${amount || 0}, ${type || "expense"})
    RETURNING *
  `;
  return rows[0];
}

// ═══════════════════════════════════════════════════════════
// QUICK REPLIES
// ═══════════════════════════════════════════════════════════

async function getAllQuickReplies(tenantId) {
  return await getDb()`SELECT * FROM quick_replies WHERE tenant_id = ${tenantId} ORDER BY sort_order`;
}

async function createQuickReply(tenantId, { label, message, category }) {
  const rows = await getDb()`
    INSERT INTO quick_replies (tenant_id, label, message, category) VALUES (${tenantId}, ${label}, ${message}, ${category || "general"})
    RETURNING *
  `;
  return rows[0];
}

async function updateQuickReply(tenantId, id, updates) {
  const sets = [];
  if (updates.label !== undefined) sets.push(`label = '${String(updates.label).replace(/'/g, "''")}'`);
  if (updates.message !== undefined) sets.push(`message = '${String(updates.message).replace(/'/g, "''")}'`);
  if (updates.category !== undefined) sets.push(`category = '${String(updates.category).replace(/'/g, "''")}'`);
  if (sets.length === 0) return null;
  await getDb()`UPDATE quick_replies SET ${sets.join(", ")} WHERE tenant_id = ${tenantId} AND id = ${id}`;
  return await getDb()`SELECT * FROM quick_replies WHERE tenant_id = ${tenantId} AND id = ${id}`.then(r => r[0]);
}

async function deleteQuickReply(tenantId, id) {
  await getDb()`DELETE FROM quick_replies WHERE tenant_id = ${tenantId} AND id = ${id}`;
}

// ═══════════════════════════════════════════════════════════
// FAQs
// ═══════════════════════════════════════════════════════════

async function getAllFaqs(tenantId) {
  return await getDb()`SELECT * FROM faqs WHERE tenant_id = ${tenantId} ORDER BY sort_order`;
}

async function createFaq(tenantId, { question, answer, keywords, category }) {
  const rows = await getDb()`
    INSERT INTO faqs (tenant_id, question, answer, keywords, category) VALUES (${tenantId}, ${question}, ${answer}, ${keywords || null}, ${category || "general"})
    RETURNING *
  `;
  return rows[0];
}

async function updateFaq(tenantId, id, updates) {
  const sets = [];
  if (updates.question !== undefined) sets.push(`question = '${String(updates.question).replace(/'/g, "''")}'`);
  if (updates.answer !== undefined) sets.push(`answer = '${String(updates.answer).replace(/'/g, "''")}'`);
  if (updates.keywords !== undefined) sets.push(`keywords = '${String(updates.keywords).replace(/'/g, "''")}'`);
  if (updates.category !== undefined) sets.push(`category = '${String(updates.category).replace(/'/g, "''")}'`);
  if (sets.length === 0) return null;
  sets.push("updated_at = NOW()");
  await getDb()`UPDATE faqs SET ${sets.join(", ")} WHERE tenant_id = ${tenantId} AND id = ${id}`;
  return await getDb()`SELECT * FROM faqs WHERE tenant_id = ${tenantId} AND id = ${id}`.then(r => r[0]);
}

async function deleteFaq(tenantId, id) {
  await getDb()`DELETE FROM faqs WHERE tenant_id = ${tenantId} AND id = ${id}`;
}

// ═══════════════════════════════════════════════════════════
// MEDIA ASSETS
// ═══════════════════════════════════════════════════════════

async function getMediaAssets(tenantId, category) {
  if (category) {
    return await getDb()`SELECT * FROM media_assets WHERE tenant_id = ${tenantId} AND category = ${category} ORDER BY created_at DESC`;
  }
  return await getDb()`SELECT * FROM media_assets WHERE tenant_id = ${tenantId} ORDER BY category, created_at DESC`;
}

async function createMediaAsset(tenantId, { category, filename, url, content_type, metadata }) {
  const rows = await getDb()`
    INSERT INTO media_assets (tenant_id, category, filename, url, content_type, metadata)
    VALUES (${tenantId}, ${category || "general"}, ${filename || null}, ${url}, ${content_type || null}, ${JSON.stringify(metadata || {})})
    RETURNING *
  `;
  return rows[0];
}

// ═══════════════════════════════════════════════════════════
// MESSAGE TEMPLATES
// ═══════════════════════════════════════════════════════════

async function getMessageTemplates(tenantId) {
  return await getDb()`SELECT * FROM message_templates WHERE tenant_id = ${tenantId} ORDER BY name`;
}

async function createMessageTemplate(tenantId, { name, templateType, content, description }) {
  const rows = await getDb()`
    INSERT INTO message_templates (tenant_id, name, template_type, content, description)
    VALUES (${tenantId}, ${name}, ${templateType || "text"}, ${JSON.stringify(content)}, ${description || null})
    RETURNING *
  `;
  return rows[0];
}

// ═══════════════════════════════════════════════════════════
// TENANT SETTINGS
// ═══════════════════════════════════════════════════════════

async function getAllSettings(tenantId) {
  const rows = await getDb()`SELECT key, value FROM tenant_settings WHERE tenant_id = ${tenantId}`;
  const settings = {};
  for (const r of rows) settings[r.key] = r.value;
  return settings;
}

async function updateSettings(tenantId, updates) {
  for (const [key, value] of Object.entries(updates)) {
    const jsonVal = typeof value === "string" ? `"${value}"` : JSON.stringify(value);
    await getDb()`
      INSERT INTO tenant_settings (tenant_id, key, value, updated_at)
      VALUES (${tenantId}, ${key}, ${jsonVal}::jsonb, NOW())
      ON CONFLICT (tenant_id, key)
      DO UPDATE SET value = ${jsonVal}::jsonb, updated_at = NOW()
    `;
  }
}

// ═══════════════════════════════════════════════════════════
// AUDIT
// ═══════════════════════════════════════════════════════════

async function logAdminAudit(tenantId, userEmail, action, details = {}) {
  await getDb()`
    INSERT INTO audit_log (tenant_id, user_email, action, details)
    VALUES (${tenantId}, ${userEmail}, ${action}, ${JSON.stringify(details)})
  `;
}

module.exports = {
  getDb, initDb,
  // Tenants
  getTenantBySlug, getTenantById, getAllTenants, createTenant, updateTenantConfig,
  seedTenantDefaults,
  // Tenant Users
  createTenantUser, verifyTenantUser, getTenantUsers,
  // Custom Fields
  getCustomFields, createCustomField, updateCustomField, deleteCustomField,
  // Bot Flow
  getBotFlowSteps, createBotFlowStep, updateBotFlowStep, deleteBotFlowStep,
  getBotFlowState, updateBotFlowState, resetBotFlowState,
  // Order Statuses
  getOrderStatuses, createOrderStatus, updateOrderStatus, deleteOrderStatus,
  // Finance Categories
  getFinanceCategories, createFinanceCategory,
  // Tags
  getTags, createTag, deleteTag,
  // Conversations
  getOrCreateConversation, getConversationById, getAllConversations,
  getConversationCount, updateConversationStatus, updateConversationTags,
  updateConversationCustomFields, updateConversationNotes,
  // Messages
  logMessage, getMessages, toggleBot, isBotEnabled,
  // Automations
  getAllAutomations, createAutomation, updateAutomation, deleteAutomation,
  // Orders
  getAllOrders, createOrder, updateOrder,
  // Finance
  getLedger, addLedgerEntry,
  // Quick Replies
  getAllQuickReplies, createQuickReply, updateQuickReply, deleteQuickReply,
  // FAQs
  getAllFaqs, createFaq, updateFaq, deleteFaq,
  // Media
  getMediaAssets, createMediaAsset,
  // Templates
  getMessageTemplates, createMessageTemplate,
  // Settings
  getAllSettings, updateSettings,
  // Audit
  logAdminAudit,
};
