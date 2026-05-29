-- ═══════════════════════════════════════════════════════════
-- Messenger SAAS v2 — Fully Customizable Multi-Tenant Schema
-- ═══════════════════════════════════════════════════════════

-- ── Tenants (Businesses) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id              BIGSERIAL PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Facebook / Messenger
  fb_page_access_token   TEXT,
  fb_app_secret           TEXT,
  fb_verify_token         TEXT,
  fb_page_id              TEXT,
  fb_graph_version        TEXT DEFAULT 'v21.0',
  fb_subscribed_fields    JSONB DEFAULT '["messages","messaging_postbacks","message_echoes","standby"]'::jsonb,

  -- Branding (ALL customizable per tenant)
  brand_name              TEXT,
  brand_tagline           TEXT DEFAULT 'We respond fast.',
  brand_logo_url          TEXT,
  brand_primary_color     TEXT DEFAULT '#4d8ef7',
  brand_accent_color      TEXT DEFAULT '#10b981',
  brand_background_color  TEXT DEFAULT '#0a0a0a',
  brand_favicon_emoji     TEXT DEFAULT '💬',
  brand_welcome_title     TEXT DEFAULT 'Welcome!',
  brand_welcome_message   TEXT DEFAULT 'Hello! How can we help you today?',

  -- AI Config (customizable per tenant)
  ai_system_prompt        TEXT DEFAULT 'You are a helpful business assistant. Keep replies short and friendly.',
  ai_model                TEXT DEFAULT 'gemini-2.5-flash-lite',
  ai_enabled              BOOLEAN NOT NULL DEFAULT true,
  ai_language             TEXT DEFAULT 'en',         -- en, tl, es, custom
  ai_tone                 TEXT DEFAULT 'friendly',   -- friendly, formal, casual

  -- Plan
  plan                    TEXT NOT NULL DEFAULT 'free',
  is_active               BOOLEAN NOT NULL DEFAULT true,
  trial_ends_at           TIMESTAMPTZ,

  -- Limits
  max_conversations       INT DEFAULT 500,
  max_automations         INT DEFAULT 10,
  max_seats               INT DEFAULT 1,
  max_storage_mb          INT DEFAULT 100,
  max_flow_steps          INT DEFAULT 10,
  max_custom_fields       INT DEFAULT 20,

  -- Vercel Blob
  blob_store_prefix       TEXT
);

-- ── Tenant Users ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_users (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  password_hash   TEXT NOT NULL,
  name            TEXT,
  role            TEXT NOT NULL DEFAULT 'member', -- owner, admin, member
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, email)
);

-- ── Tenant Custom Field Definitions ───────────────────────
-- Each tenant defines their own fields (not hardcoded Style/Background/Device)
CREATE TABLE IF NOT EXISTS tenant_custom_fields (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  field_key       TEXT NOT NULL,              -- e.g. "package_type", "preferred_color"
  field_label     TEXT NOT NULL,              -- e.g. "Package Type", "Preferred Color"
  field_type      TEXT NOT NULL DEFAULT 'text', -- text, select, multi_select, number, date, boolean, file
  field_options   JSONB DEFAULT '[]'::jsonb,   -- for select/multi_select: ["Option A", "Option B"]
  apply_to        TEXT NOT NULL DEFAULT 'orders', -- orders, conversations, both
  is_required     BOOLEAN NOT NULL DEFAULT false,
  sort_order      INT DEFAULT 0,
  visible_in_table BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, field_key)
);

-- ── Bot Flow Steps (replaces hardcoded pet intake) ────────
-- Each tenant builds their own conversation flow
CREATE TABLE IF NOT EXISTS bot_flow_steps (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  step_key        TEXT NOT NULL,              -- e.g. "ask_name", "ask_package"
  step_label      TEXT NOT NULL,              -- e.g. "Ask Customer Name"
  step_type       TEXT NOT NULL DEFAULT 'text_input', -- text_input, button_choice, image_upload, delay, auto
  prompt_message  TEXT,                       -- e.g. "What's your name po?"
  button_choices  JSONB DEFAULT '[]'::jsonb,  -- [{ "label": "Option 1", "next_step": "step_x" }]
  next_step       TEXT,                       -- default next step key (if no branching)
  fallback_step   TEXT,                       -- fallback if invalid input
  input_variable  TEXT,                       -- variable name to store response (e.g. "customer_name")
  validation      JSONB DEFAULT '{}'::jsonb,  -- { min_length: 2, max_length: 100, pattern: "^[a-zA-Z ]+$" }
  sort_order      INT DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, step_key)
);

-- Flow execution state per conversation
CREATE TABLE IF NOT EXISTS bot_flow_state (
  conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  current_step    TEXT,                       -- current step_key
  collected_data  JSONB DEFAULT '{}'::jsonb,  -- { customer_name: "Juan", package: "Premium" }
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  is_complete     BOOLEAN NOT NULL DEFAULT false,

  PRIMARY KEY (conversation_id)
);

-- ── Tenant Order Status Definitions ───────────────────────
CREATE TABLE IF NOT EXISTS tenant_order_statuses (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status_key      TEXT NOT NULL,              -- e.g. "in_progress", "ready_for_pickup"
  status_label    TEXT NOT NULL,              -- e.g. "In Progress", "Ready for Pickup"
  color           TEXT DEFAULT '#4d8ef7',
  sort_order      INT DEFAULT 0,
  is_default      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, status_key)
);

-- ── Tenant Finance Categories ─────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_finance_categories (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_key    TEXT NOT NULL,
  category_label  TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'expense', -- expense, revenue
  color           TEXT DEFAULT '#8b90a0',
  sort_order      INT DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, category_key, type)
);

-- ── Tenant Conversation Tags ──────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_tags (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tag_key         TEXT NOT NULL,
  tag_label       TEXT NOT NULL,
  color           TEXT DEFAULT '#4d8ef7',
  sort_order      INT DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, tag_key)
);

-- ── Conversations ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sender_id       TEXT NOT NULL,
  name            TEXT,
  profile_pic_url TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
  category        TEXT DEFAULT 'general',
  tags            JSONB DEFAULT '[]'::jsonb,
  notes           TEXT,
  extracted_data  JSONB DEFAULT '{}'::jsonb,
  custom_fields   JSONB DEFAULT '{}'::jsonb,   -- populated from tenant_custom_fields
  meta_attribution JSONB DEFAULT '{}'::jsonb,
  delivery_status TEXT DEFAULT 'none',
  read_count      INT DEFAULT 0,
  is_bot_enabled  BOOLEAN NOT NULL DEFAULT true,
  last_activity_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, sender_id)
);

CREATE INDEX idx_conversations_tenant ON conversations(tenant_id, updated_at DESC);
CREATE INDEX idx_conversations_sender ON conversations(tenant_id, sender_id);
CREATE INDEX idx_conversations_status ON conversations(tenant_id, status);

-- ── Messages ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id                BIGSERIAL PRIMARY KEY,
  tenant_id         BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id   BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type       TEXT NOT NULL,  -- customer, bot, admin, system
  message_type      TEXT NOT NULL DEFAULT 'text',
  content           TEXT,
  media_url         TEXT,
  mid               TEXT,
  reply_to_mid      TEXT,
  automation_name   TEXT,
  message_metadata  JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(tenant_id, conversation_id, created_at);
CREATE INDEX idx_messages_mid ON messages(mid) WHERE mid IS NOT NULL;

-- ── Automations ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS automations (
  id                BIGSERIAL PRIMARY KEY,
  tenant_id         BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  trigger_type      TEXT NOT NULL,
  trigger_value     TEXT,
  steps             JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  run_count         INT DEFAULT 0,
  automation_group_id BIGINT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_automations_tenant ON automations(tenant_id);

CREATE TABLE IF NOT EXISTS automation_groups (
  id                BIGSERIAL PRIMARY KEY,
  tenant_id         BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  sort_order        INT DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS automation_fires (
  id                BIGSERIAL PRIMARY KEY,
  tenant_id         BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  automation_id     BIGINT NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  conversation_id   BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  status            TEXT NOT NULL DEFAULT 'pending',
  scheduled_at      TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_automation_fires_pending ON automation_fires(tenant_id, status, scheduled_at);

-- ── Orders ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                BIGSERIAL PRIMARY KEY,
  tenant_id         BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id   BIGINT REFERENCES conversations(id) ON DELETE SET NULL,
  customer_name     TEXT,
  status            TEXT NOT NULL DEFAULT 'new',
  payment_status    TEXT DEFAULT 'pending',
  amount            DECIMAL(10,2),
  currency          TEXT DEFAULT 'PHP',
  items             JSONB DEFAULT '[]'::jsonb,
  custom_fields     JSONB DEFAULT '{}'::jsonb,   -- populated from tenant_custom_fields definitions
  leads_campaign    TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_tenant ON orders(tenant_id, updated_at DESC);
CREATE INDEX idx_orders_status ON orders(tenant_id, status);

-- ── Finance Ledger ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ledger_entries (
  id                BIGSERIAL PRIMARY KEY,
  tenant_id         BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date              DATE NOT NULL,
  description       TEXT,
  category          TEXT,
  amount            DECIMAL(10,2) NOT NULL,
  type              TEXT NOT NULL DEFAULT 'expense',
  business          TEXT,
  metadata          JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ledger_tenant ON ledger_entries(tenant_id, date);

-- ── Quick Replies ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quick_replies (
  id                BIGSERIAL PRIMARY KEY,
  tenant_id         BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  label             TEXT NOT NULL,
  message           TEXT NOT NULL,
  category          TEXT DEFAULT 'general',
  sort_order        INT DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── FAQ Knowledge Base ────────────────────────────────────
CREATE TABLE IF NOT EXISTS faqs (
  id                BIGSERIAL PRIMARY KEY,
  tenant_id         BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  question          TEXT NOT NULL,
  answer            TEXT NOT NULL,
  keywords          TEXT,
  category          TEXT DEFAULT 'general',
  sort_order        INT DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── AI Assets (RAG knowledge retrieval) ───────────────────
CREATE TABLE IF NOT EXISTS ai_assets (
  id                BIGSERIAL PRIMARY KEY,
  tenant_id         BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category          TEXT NOT NULL DEFAULT 'general',
  title             TEXT,
  content           TEXT NOT NULL,
  sort_order        INT DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Media Assets (Vercel Blob + general) ──────────────────
CREATE TABLE IF NOT EXISTS media_assets (
  id                BIGSERIAL PRIMARY KEY,
  tenant_id         BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category          TEXT NOT NULL DEFAULT 'general', -- sample_images, product_photos, templates
  filename          TEXT,
  url               TEXT NOT NULL,
  blob_path         TEXT,
  content_type      TEXT,
  metadata          JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_media_tenant ON media_assets(tenant_id, category);

-- ── Message Templates (carousel, button, etc) ─────────────
CREATE TABLE IF NOT EXISTS message_templates (
  id                BIGSERIAL PRIMARY KEY,
  tenant_id         BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  template_type     TEXT NOT NULL DEFAULT 'text', -- text, carousel, button, media
  content           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Audit Log ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id                BIGSERIAL PRIMARY KEY,
  tenant_id         BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_email        TEXT,
  action            TEXT NOT NULL,
  details           JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant ON audit_log(tenant_id, created_at DESC);

-- ── Global SAAS Settings ──────────────────────────────────
CREATE TABLE IF NOT EXISTS global_settings (
  key               TEXT PRIMARY KEY,
  value             JSONB,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Master Admin Users (SAAS-level, not per-tenant) ───────
CREATE TABLE IF NOT EXISTS master_admins (
  id                BIGSERIAL PRIMARY KEY,
  email             TEXT NOT NULL UNIQUE,
  password_hash     TEXT NOT NULL,
  name              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Default Seed Data ─────────────────────────────────────
INSERT INTO global_settings (key, value, updated_at)
VALUES ('schema_version', '"2026-05-29-v2"'::jsonb, NOW())
ON CONFLICT (key) DO NOTHING;

-- Insert a default tenant so the system works out of the box
INSERT INTO tenants (slug, name, brand_name, brand_tagline, brand_welcome_message, ai_system_prompt)
VALUES ('default', 'My Business', 'My Business', 'We respond fast.', 'Hello! How can we help you today?', 'You are a helpful business assistant. Keep replies short and friendly.')
ON CONFLICT (slug) DO NOTHING;

-- Default order statuses for the default tenant
INSERT INTO tenant_order_statuses (tenant_id, status_key, status_label, color, sort_order, is_default)
SELECT id, 'new', 'New', '#4d8ef7', 1, true FROM tenants WHERE slug = 'default'
ON CONFLICT (tenant_id, status_key) DO NOTHING;

INSERT INTO tenant_order_statuses (tenant_id, status_key, status_label, color, sort_order)
SELECT id, 'in_progress', 'In Progress', '#f59e0b', 2 FROM tenants WHERE slug = 'default'
ON CONFLICT (tenant_id, status_key) DO NOTHING;

INSERT INTO tenant_order_statuses (tenant_id, status_key, status_label, color, sort_order)
SELECT id, 'completed', 'Completed', '#10b981', 3 FROM tenants WHERE slug = 'default'
ON CONFLICT (tenant_id, status_key) DO NOTHING;

INSERT INTO tenant_order_statuses (tenant_id, status_key, status_label, color, sort_order)
SELECT id, 'cancelled', 'Cancelled', '#ef4444', 4 FROM tenants WHERE slug = 'default'
ON CONFLICT (tenant_id, status_key) DO NOTHING;

-- Default finance categories
INSERT INTO tenant_finance_categories (tenant_id, category_key, category_label, type, color, sort_order)
SELECT id, 'materials', 'Materials', 'expense', '#f59e0b', 1 FROM tenants WHERE slug = 'default'
ON CONFLICT (tenant_id, category_key, type) DO NOTHING;

INSERT INTO tenant_finance_categories (tenant_id, category_key, category_label, type, color, sort_order)
SELECT id, 'marketing', 'Marketing', 'expense', '#8b5cf6', 2 FROM tenants WHERE slug = 'default'
ON CONFLICT (tenant_id, category_key, type) DO NOTHING;

INSERT INTO tenant_finance_categories (tenant_id, category_key, category_label, type, color, sort_order)
SELECT id, 'sales', 'Sales', 'revenue', '#10b981', 3 FROM tenants WHERE slug = 'default'
ON CONFLICT (tenant_id, category_key, type) DO NOTHING;

INSERT INTO tenant_finance_categories (tenant_id, category_key, category_label, type, color, sort_order)
SELECT id, 'other', 'Other', 'expense', '#8b90a0', 99 FROM tenants WHERE slug = 'default'
ON CONFLICT (tenant_id, category_key, type) DO NOTHING;
