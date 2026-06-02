-- PawPerfume Performance Indexes
-- Run this after initial schema deployment
-- These indexes are critical for query performance at scale

-- ============================================================
-- CONVERSATIONS TABLE
-- ============================================================
-- Used by: webhook (sender lookup), admin (list by tenant)
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_id 
	ON conversations(tenant_id);

CREATE INDEX IF NOT EXISTS idx_conversations_sender_id 
	ON conversations(tenant_id, sender_id);

CREATE INDEX IF NOT EXISTS idx_conversations_updated_at 
	ON conversations(tenant_id, updated_at DESC);

-- Partial index for active conversations only
CREATE INDEX IF NOT EXISTS idx_conversations_active 
	ON conversations(tenant_id, updated_at DESC) 
	WHERE status = 'active';

-- ============================================================
-- MESSAGES TABLE (most queried table)
-- ============================================================
-- Used by: message list endpoint, bot engine (history)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
	ON messages(conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_messages_tenant_conversation 
	ON messages(tenant_id, conversation_id, created_at ASC);

-- For recent messages query in bot engine
CREATE INDEX IF NOT EXISTS idx_messages_recent 
	ON messages(conversation_id, created_at DESC);

-- ============================================================
-- ORDERS TABLE
-- ============================================================
-- Used by: admin orders list, status filtering
CREATE INDEX IF NOT EXISTS idx_orders_tenant_id 
	ON orders(tenant_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_status 
	ON orders(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_orders_conversation_id 
	ON orders(conversation_id);

-- Composite for common admin queries
CREATE INDEX IF NOT EXISTS idx_orders_tenant_status_date 
	ON orders(tenant_id, status, updated_at DESC);

-- ============================================================
-- LEDGER ENTRIES (finance)
-- ============================================================
-- Used by: finance page, date filtering
CREATE INDEX IF NOT EXISTS idx_ledger_tenant_date 
	ON ledger_entries(tenant_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_ledger_tenant_category 
	ON ledger_entries(tenant_id, category);

-- ============================================================
-- AUTOMATIONS
-- ============================================================
-- Used by: bot engine (active automations)
CREATE INDEX IF NOT EXISTS idx_automations_active 
	ON automations(tenant_id, is_active) 
	WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_automations_trigger 
	ON automations(tenant_id, trigger_type, is_active);

-- ============================================================
-- FAQS
-- ============================================================
-- Used by: bot engine (FAQ matching)
CREATE INDEX IF NOT EXISTS idx_faqs_tenant 
	ON faqs(tenant_id, sort_order);

-- ============================================================
-- BOT FLOW STATE
-- ============================================================
-- Used by: bot engine (state lookup by conversation)
CREATE INDEX IF NOT EXISTS idx_bot_flow_state_conversation 
	ON bot_flow_state(conversation_id, is_complete);

-- ============================================================
-- COLUMN CONFIGS
-- ============================================================
-- Used by: admin UI (config lookup by table)
CREATE INDEX IF NOT EXISTS idx_column_configs_table 
	ON column_configs(tenant_id, table_name, sort_order);

-- ============================================================
-- CUSTOM FIELDS
-- ============================================================
-- Used by: admin UI, order forms
CREATE INDEX IF NOT EXISTS idx_custom_fields_apply_to 
	ON tenant_custom_fields(tenant_id, apply_to, sort_order);

-- ============================================================
-- RECEIPT EXTRACTIONS
-- ============================================================
-- Used by: admin receipt list
CREATE INDEX IF NOT EXISTS idx_receipt_extractions_tenant 
	ON receipt_extractions(tenant_id, created_at DESC);

-- ============================================================
-- AUDIT LOG (if used)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_created 
	ON audit_log(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_action 
	ON audit_log(tenant_id, action, created_at DESC);

-- ============================================================
-- ANALYZE tables after index creation
-- ============================================================
-- This updates PostgreSQL's query planner statistics
ANALYZE conversations;
ANALYZE messages;
ANALYZE orders;
ANALYZE ledger_entries;
ANALYZE automations;
ANALYZE faqs;
ANALYZE bot_flow_state;
ANALYZE column_configs;
ANALYZE tenant_custom_fields;
ANALYZE receipt_extractions;

-- ============================================================
-- EXPLAIN: Why these indexes matter
-- ============================================================
-- 
-- Without indexes, every query scans the entire table:
--   SELECT * FROM messages WHERE conversation_id = 42 
--   → Seq Scan on messages (cost=0.00..1500.00 rows=50000)
--   → Execution time: 150ms
--
-- With index:
--   → Index Scan using idx_messages_conversation_id (cost=0.42..12.50 rows=100)
--   → Execution time: 0.5ms
--
-- The bot engine queries messages on EVERY incoming message,
-- so this index alone can reduce webhook response time by 100x+
