const crypto = require("node:crypto");
const {
  getOrCreateConversation, getAllConversations, getConversationCount,
  getConversationById, updateConversationStatus, updateConversationTags,
  updateConversationCustomFields, updateConversationNotes,
  logMessage, getMessages, toggleBot, isBotEnabled,
  getAllAutomations, createAutomation, updateAutomation, deleteAutomation,
  getAllOrders, createOrder, updateOrder,
  getLedger, addLedgerEntry,
  getAllQuickReplies, createQuickReply, updateQuickReply, deleteQuickReply,
  getAllFaqs, createFaq, updateFaq, deleteFaq,
  getCustomFields, createCustomField, updateCustomField, deleteCustomField,
  getBotFlowSteps, createBotFlowStep, updateBotFlowStep, deleteBotFlowStep,
  getBotFlowState, updateBotFlowState, resetBotFlowState,
  getOrderStatuses, createOrderStatus, updateOrderStatus, deleteOrderStatus,
  getFinanceCategories, createFinanceCategory,
  getTags, createTag, deleteTag,
  getMediaAssets, createMediaAsset,
  getMessageTemplates, createMessageTemplate,
  getTenantBySlug, getTenantById, getAllTenants, createTenant, updateTenantConfig,
  createTenantUser, verifyTenantUser, getTenantUsers,
  getAllSettings, updateSettings, logAdminAudit,
} = require("./db");

// ═══════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(";").forEach(c => {
    const [key, ...val] = c.trim().split("=");
    if (key) cookies[key] = decodeURIComponent(val.join("="));
  });
  return cookies;
}

function requireAuth(req) {
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  const cookies = parseCookies(req.headers.cookie || "");
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    if (token) return { role: "admin" };
    if (cookies.saas_token) return { role: "admin" };
    return null;
  }

  if (token === adminPassword) return { role: "admin" };
  if (cookies.saas_token === adminPassword) return { role: "admin" };

  return null;
}

function getTenantSlugFromHost(host) {
  if (!host) return null;
  const parts = host.replace(/:\d+$/, "").split(".");
  if (parts.length >= 3 && parts[0] !== "www") return parts[0];
  return null;
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function json(res, data, status = 200) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.end(JSON.stringify(data));
}

function error(res, message, status = 400) {
  json(res, { error: message }, status);
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => { data += chunk; });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const PUBLIC_PAGES = new Set(["privacy", "terms", "data-deletion"]);

// ═══════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════

module.exports = async function adminHandler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const path = url.pathname;

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    return res.end();
  }

  const pageName = path.replace(/^\/api\/admin\/?/, "").replace(/\/$/, "");
  if (PUBLIC_PAGES.has(pageName)) return handlePublicPage(res, pageName);

  const authed = requireAuth(req);
  if (!authed) return error(res, "Unauthorized", 401);

  const hostSlug = getTenantSlugFromHost(req.headers.host);
  const tenantSlug = hostSlug || "default";
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant && tenantSlug !== "default") return error(res, `Tenant "${tenantSlug}" not found`, 404);
  const tenantId = tenant?.id || null;

  let body = {};
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    try { const raw = await readBody(req); body = raw ? JSON.parse(raw) : {}; } catch (e) {}
  }

  const route = path.replace(/^\/api\/admin\/?/, "");
  const segments = route.split("/").filter(Boolean);
  const action = segments[0] || "status";
  const id = segments[1] || null;

  switch (action) {
    case "status": return json(res, { ok: true, tenant: tenant?.name || "SAAS", version: "2.0.0" });
    case "login": return handleLogin(res, tenantId, body);
    case "tenant-config": return handleTenantConfig(res, tenant);
    case "tenants": return handleTenants(res, req.method, id, body);
    case "tenant-users": return handleTenantUsers(res, tenantId, req.method, id, body);

    // Conversations
    case "conversations": return handleConversations(res, tenantId, req.method, id, body);
    case "messages": return handleMessages(res, tenantId, id, body);
    case "toggle-bot": return handleToggleBot(res, tenantId, id);

    // Configurable entities
    case "custom-fields": return handleCustomFields(res, tenantId, req.method, id, body);
    case "bot-flow": return handleBotFlow(res, tenantId, req.method, id, body);
    case "order-statuses": return handleOrderStatuses(res, tenantId, req.method, id, body);
    case "finance-categories": return handleFinanceCategories(res, tenantId, req.method, id, body);
    case "tags": return handleTags(res, tenantId, req.method, id, body);

    // Business operations
    case "automations": return handleAutomations(res, tenantId, req.method, id, body);
    case "orders": return handleOrders(res, tenantId, req.method, id, body);
    case "finance": return handleFinance(res, tenantId, req.method, id, body);
    case "quick-replies": return handleQuickReplies(res, tenantId, req.method, id, body);
    case "faqs": return handleFaqs(res, tenantId, req.method, id, body);
    case "media": return handleMedia(res, tenantId, req.method, id, body);
    case "message-templates": return handleMessageTemplates(res, tenantId, req.method, id, body);
    case "settings": return handleSettings(res, tenantId, req.method, body);

    // Export
    case "export": return handleExport(res, tenantId, body);

    default: return error(res, `Unknown route: ${action}`, 404);
  }
};

// ═══════════════════════════════════════════════════════════
// PUBLIC PAGES
// ═══════════════════════════════════════════════════════════

function handlePublicPage(res, page) {
  const pages = {
    privacy: html(`<h1>Privacy Policy</h1><p>This SAAS processes messages sent to Facebook Pages. Data is stored securely and can be deleted upon request. By using this service, you consent to data processing necessary for operation.</p>`),
    terms: html(`<h1>Terms of Service</h1><p>Use this service in compliance with Facebook Platform Policies. Service provided as-is without warranty. Do not use for spam or prohibited content.</p>`),
    "data-deletion": html(`<h1>Data Deletion</h1><p>To request data deletion, contact the admin of this Facebook page or the SAAS operator. All conversation data can be permanently deleted.</p>`),
  };
  if (pages[page]) { res.writeHead(200, { "Content-Type": "text/html" }); return res.end(pages[page]); }
  res.writeHead(404); return res.end("Not found");
}

function html(body) {
  return `<html><body style="font-family:sans-serif;padding:40px;max-width:700px;margin:auto;">${body}</body></html>`;
}

// ═══════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════

function handleLogin(res, tenantId, body) {
  const password = body.password || "";
  if (password === process.env.ADMIN_PASSWORD) {
    res.setHeader("Set-Cookie", `saas_token=${password}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`);
    return json(res, { ok: true, token: password });
  }
  // Try tenant user login
  if (tenantId && body.email) {
    return verifyTenantUser(tenantId, body.email, body.password).then(user => {
      if (user) return json(res, { ok: true, user });
      return error(res, "Invalid credentials", 401);
    });
  }
  return error(res, "Invalid password", 401);
}

// ═══════════════════════════════════════════════════════════
// TENANT CONFIG
// ═══════════════════════════════════════════════════════════

function handleTenantConfig(res, tenant) {
  if (!tenant) return error(res, "Tenant not found", 404);
  return json(res, {
    id: tenant.id, slug: tenant.slug, name: tenant.name,
    brand_name: tenant.brand_name, brand_tagline: tenant.brand_tagline,
    brand_logo_url: tenant.brand_logo_url,
    brand_primary_color: tenant.brand_primary_color,
    brand_accent_color: tenant.brand_accent_color,
    brand_background_color: tenant.brand_background_color,
    brand_favicon_emoji: tenant.brand_favicon_emoji,
    brand_welcome_title: tenant.brand_welcome_title,
    brand_welcome_message: tenant.brand_welcome_message,
    ai_enabled: tenant.ai_enabled, ai_language: tenant.ai_language, ai_tone: tenant.ai_tone,
    plan: tenant.plan, is_active: tenant.is_active,
  });
}

// ═══════════════════════════════════════════════════════════
// TENANTS (Master Admin only)
// ═══════════════════════════════════════════════════════════

async function handleTenants(res, method, id, body) {
  if (method === "GET") {
    if (id) return json(res, await getTenantById(parseInt(id, 10)));
    return json(res, await getAllTenants());
  }
  if (method === "POST") {
    const tenant = await createTenant(body);
    return json(res, tenant, 201);
  }
  if (method === "PUT" && id) {
    const updated = await updateTenantConfig(parseInt(id, 10), body);
    return json(res, updated);
  }
  return error(res, "Method not allowed", 405);
}

async function handleTenantUsers(res, tenantId, method, id, body) {
  if (method === "GET") return json(res, await getTenantUsers(tenantId));
  if (method === "POST") {
    const user = await createTenantUser(tenantId, body);
    return json(res, user, 201);
  }
  return error(res, "Method not allowed", 405);
}

// ═══════════════════════════════════════════════════════════
// CUSTOM FIELDS
// ═══════════════════════════════════════════════════════════

async function handleCustomFields(res, tenantId, method, id, body) {
  if (method === "GET") return json(res, await getCustomFields(tenantId));
  if (method === "POST") {
    const field = await createCustomField(tenantId, body);
    await logAdminAudit(tenantId, body.email || "admin", "custom_field_created", { fieldKey: body.fieldKey });
    return json(res, field, 201);
  }
  if (method === "PUT" && id) {
    const field = await updateCustomField(tenantId, parseInt(id, 10), body);
    return json(res, field);
  }
  if (method === "DELETE" && id) {
    await deleteCustomField(tenantId, parseInt(id, 10));
    return json(res, { ok: true });
  }
  return error(res, "Method not allowed", 405);
}

// ═══════════════════════════════════════════════════════════
// BOT FLOW
// ═══════════════════════════════════════════════════════════

async function handleBotFlow(res, tenantId, method, id, body) {
  if (method === "GET" && !id) return json(res, await getBotFlowSteps(tenantId));
  if (method === "GET" && id === "state") {
    // GET /api/admin/bot-flow/state?conversation_id=X
    return error(res, "Use query param", 400);
  }
  if (method === "POST" && id === "state") {
    const { conversationId, currentStep, collectedData, isComplete } = body;
    await updateBotFlowState(conversationId, { currentStep, collectedData, isComplete });
    return json(res, { ok: true });
  }
  if (method === "POST") {
    const step = await createBotFlowStep(tenantId, body);
    return json(res, step, 201);
  }
  if (method === "PUT" && id) {
    const step = await updateBotFlowStep(tenantId, parseInt(id, 10), body);
    return json(res, step);
  }
  if (method === "DELETE" && id) {
    await deleteBotFlowStep(tenantId, parseInt(id, 10));
    return json(res, { ok: true });
  }
  return error(res, "Method not allowed", 405);
}

// ═══════════════════════════════════════════════════════════
// ORDER STATUSES
// ═══════════════════════════════════════════════════════════

async function handleOrderStatuses(res, tenantId, method, id, body) {
  if (method === "GET") return json(res, await getOrderStatuses(tenantId));
  if (method === "POST") return json(res, await createOrderStatus(tenantId, body), 201);
  if (method === "PUT" && id) return json(res, await updateOrderStatus(tenantId, parseInt(id, 10), body));
  if (method === "DELETE" && id) {
    await deleteOrderStatus(tenantId, parseInt(id, 10));
    return json(res, { ok: true });
  }
  return error(res, "Method not allowed", 405);
}

// ═══════════════════════════════════════════════════════════
// FINANCE CATEGORIES
// ═══════════════════════════════════════════════════════════

async function handleFinanceCategories(res, tenantId, method, id, body) {
  if (method === "GET") return json(res, await getFinanceCategories(tenantId));
  if (method === "POST") return json(res, await createFinanceCategory(tenantId, body), 201);
  return error(res, "Method not allowed", 405);
}

// ═══════════════════════════════════════════════════════════
// TAGS
// ═══════════════════════════════════════════════════════════

async function handleTags(res, tenantId, method, id, body) {
  if (method === "GET") return json(res, await getTags(tenantId));
  if (method === "POST") return json(res, await createTag(tenantId, body), 201);
  if (method === "DELETE" && id) {
    await deleteTag(tenantId, parseInt(id, 10));
    return json(res, { ok: true });
  }
  return error(res, "Method not allowed", 405);
}

// ═══════════════════════════════════════════════════════════
// CONVERSATIONS
// ═══════════════════════════════════════════════════════════

async function handleConversations(res, tenantId, method, id, body) {
  if (method === "GET") {
    if (id) {
      const conv = await getConversationById(tenantId, parseInt(id, 10));
      // Also load flow state
      if (conv) {
        const flow = await getBotFlowState(parseInt(id, 10));
        conv.bot_flow_state = flow || null;
      }
      return json(res, conv);
    }
    const { limit = 50, offset = 0, status, search, tag } = body;
    const convs = await getAllConversations(tenantId, { limit, offset, status, search, tag });
    const count = await getConversationCount(tenantId);
    // Load custom field definitions for table display
    const fields = await getCustomFields(tenantId);
    return json(res, { conversations: convs, total: count, custom_fields: fields.filter(f => f.visible_in_table) });
  }
  if (method === "PUT" && id) {
    const cid = parseInt(id, 10);
    if (body.status) await updateConversationStatus(tenantId, cid, body.status);
    if (body.tags) await updateConversationTags(tenantId, cid, body.tags);
    if (body.custom_fields) await updateConversationCustomFields(tenantId, cid, body.custom_fields);
    if (body.notes !== undefined) await updateConversationNotes(tenantId, cid, body.notes);
    return json(res, { ok: true });
  }
  return error(res, "Method not allowed", 405);
}

// ═══════════════════════════════════════════════════════════
// MESSAGES
// ═══════════════════════════════════════════════════════════

async function handleMessages(res, tenantId, convId, body) {
  if (!convId) return error(res, "conversation_id required in URL: /api/admin/messages/:id");
  const msgs = await getMessages(tenantId, parseInt(convId, 10), { limit: body.limit || 50, before: body.before });
  return json(res, { messages: [...msgs].reverse() });
}

async function handleToggleBot(res, tenantId, convId) {
  if (!convId) return error(res, "conversation_id required");
  const enabled = await toggleBot(tenantId, parseInt(convId, 10));
  return json(res, { bot_enabled: enabled });
}

// ═══════════════════════════════════════════════════════════
// AUTOMATIONS
// ═══════════════════════════════════════════════════════════

async function handleAutomations(res, tenantId, method, id, body) {
  if (method === "GET") return json(res, await getAllAutomations(tenantId));
  if (method === "POST") return json(res, await createAutomation(tenantId, body), 201);
  if (method === "PUT" && id) return json(res, await updateAutomation(tenantId, parseInt(id, 10), body));
  if (method === "DELETE" && id) {
    await deleteAutomation(tenantId, parseInt(id, 10));
    return json(res, { ok: true });
  }
  return error(res, "Method not allowed", 405);
}

// ═══════════════════════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════════════════════

async function handleOrders(res, tenantId, method, id, body) {
  if (method === "GET") {
    const { limit = 50, offset = 0, status } = body;
    const orders = await getAllOrders(tenantId, { limit, offset, status });
    const fields = await getCustomFields(tenantId);
    const statuses = await getOrderStatuses(tenantId);
    return json(res, { orders, custom_fields: fields.filter(f => f.apply_to === "orders" || f.apply_to === "both"), order_statuses: statuses });
  }
  if (method === "POST") return json(res, await createOrder(tenantId, body), 201);
  if (method === "PUT" && id) return json(res, await updateOrder(tenantId, parseInt(id, 10), body));
  return error(res, "Method not allowed", 405);
}

// ═══════════════════════════════════════════════════════════
// FINANCE
// ═══════════════════════════════════════════════════════════

async function handleFinance(res, tenantId, method, id, body) {
  if (method === "GET") return json(res, await getLedger(tenantId, body));
  if (method === "POST") return json(res, await addLedgerEntry(tenantId, body), 201);
  return error(res, "Method not allowed", 405);
}

// ═══════════════════════════════════════════════════════════
// QUICK REPLIES
// ═══════════════════════════════════════════════════════════

async function handleQuickReplies(res, tenantId, method, id, body) {
  if (method === "GET") return json(res, await getAllQuickReplies(tenantId));
  if (method === "POST") return json(res, await createQuickReply(tenantId, body), 201);
  if (method === "PUT" && id) return json(res, await updateQuickReply(tenantId, parseInt(id, 10), body));
  if (method === "DELETE" && id) {
    await deleteQuickReply(tenantId, parseInt(id, 10));
    return json(res, { ok: true });
  }
  return error(res, "Method not allowed", 405);
}

// ═══════════════════════════════════════════════════════════
// FAQs
// ═══════════════════════════════════════════════════════════

async function handleFaqs(res, tenantId, method, id, body) {
  if (method === "GET") return json(res, await getAllFaqs(tenantId));
  if (method === "POST") return json(res, await createFaq(tenantId, body), 201);
  if (method === "PUT" && id) return json(res, await updateFaq(tenantId, parseInt(id, 10), body));
  if (method === "DELETE" && id) {
    await deleteFaq(tenantId, parseInt(id, 10));
    return json(res, { ok: true });
  }
  return error(res, "Method not allowed", 405);
}

// ═══════════════════════════════════════════════════════════
// MEDIA ASSETS
// ═══════════════════════════════════════════════════════════

async function handleMedia(res, tenantId, method, id, body) {
  if (method === "GET") return json(res, await getMediaAssets(tenantId, body.category));
  if (method === "POST") return json(res, await createMediaAsset(tenantId, body), 201);
  return error(res, "Method not allowed", 405);
}

// ═══════════════════════════════════════════════════════════
// MESSAGE TEMPLATES
// ═══════════════════════════════════════════════════════════

async function handleMessageTemplates(res, tenantId, method, id, body) {
  if (method === "GET") return json(res, await getMessageTemplates(tenantId));
  if (method === "POST") return json(res, await createMessageTemplate(tenantId, body), 201);
  return error(res, "Method not allowed", 405);
}

// ═══════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════

async function handleSettings(res, tenantId, method, body) {
  if (method === "GET") return json(res, await getAllSettings(tenantId));
  if (method === "PUT") {
    await updateSettings(tenantId, body);
    return json(res, { ok: true });
  }
  return error(res, "Method not allowed", 405);
}

// ═══════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════

async function handleExport(res, tenantId, body) {
  const convs = await getAllConversations(tenantId, { limit: 10000 });
  const csv = ["id,name,sender_id,status,category,created_at"];
  for (const c of convs) {
    csv.push([c.id, `"${(c.name || "").replace(/"/g, '""')}"`, c.sender_id, c.status, c.category || "", c.created_at].join(","));
  }
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=conversations.csv");
  return res.end(csv.join("\n"));
}
