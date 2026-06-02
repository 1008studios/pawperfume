-- PawPerfume Migration v3.1
-- Security & Performance Improvements
-- Run: npx neondb execute packages/db/migration-v3.1.sql

BEGIN;

-- ============================================================
-- 1. Add missing foreign key constraints
-- ============================================================
-- Some tables reference tenant_id but don't have FK constraints
ALTER TABLE orders 
	ADD CONSTRAINT fk_orders_conversation 
	FOREIGN KEY (conversation_id) REFERENCES conversations(id) 
	ON DELETE SET NULL;

-- ============================================================
-- 2. Add CHECK constraints for data validation
-- ============================================================
-- Orders amount must be positive
ALTER TABLE orders 
	ADD CONSTRAINT chk_orders_amount 
	CHECK (amount >= 0);

-- Ledger amount must be positive (type indicates income/expense)
ALTER TABLE ledger_entries 
	ADD CONSTRAINT chk_ledger_amount 
	CHECK (amount >= 0);

-- Ledger type must be valid
ALTER TABLE ledger_entries 
	ADD CONSTRAINT chk_ledger_type 
	CHECK (type IN ('income', 'expense'));

-- Order status must be valid
ALTER TABLE orders 
	ADD CONSTRAINT chk_orders_status 
	CHECK (status IN ('new', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'));

-- Payment status must be valid
ALTER TABLE orders 
	ADD CONSTRAINT chk_orders_payment_status 
	CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed'));

-- Conversation status must be valid
ALTER TABLE conversations 
	ADD CONSTRAINT chk_conversations_status 
	CHECK (status IN ('active', 'archived', 'blocked'));

-- ============================================================
-- 3. Add audit columns for tracking changes
-- ============================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_by TEXT;

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS updated_by TEXT;

-- ============================================================
-- 4. Add indexes (from indexes.sql)
-- ============================================================
\i indexes.sql

-- ============================================================
-- 5. Add session table for proper session management
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_sessions (
	id BIGSERIAL PRIMARY KEY,
	token TEXT UNIQUE NOT NULL,
	ip_address TEXT,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	expires_at TIMESTAMPTZ NOT NULL,
	last_activity TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token 
	ON admin_sessions(token);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires 
	ON admin_sessions(expires_at);

-- ============================================================
-- 6. Add webhook_logs table for debugging
-- ============================================================
CREATE TABLE IF NOT EXISTS webhook_logs (
	id BIGSERIAL PRIMARY KEY,
	tenant_id BIGINT,
	event_type TEXT,
	sender_id TEXT,
	payload_hash TEXT, -- Store hash, not full payload for privacy
	processed BOOLEAN DEFAULT false,
	error_message TEXT,
	created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_created 
	ON webhook_logs(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_sender 
	ON webhook_logs(sender_id, created_at DESC);

-- ============================================================
-- 7. Add rate_limit_tracking table
-- ============================================================
CREATE TABLE IF NOT EXISTS rate_limit_tracking (
	id BIGSERIAL PRIMARY KEY,
	key TEXT NOT NULL, -- e.g., "ip:192.168.1.1" or "sender:123456"
	action TEXT NOT NULL, -- e.g., "login", "webhook", "api"
	count INT DEFAULT 1,
	window_start TIMESTAMPTZ DEFAULT NOW(),
	window_end TIMESTAMPTZ NOT NULL,
	UNIQUE(key, action, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_key 
	ON rate_limit_tracking(key, action, window_end);

-- ============================================================
-- 8. Add materialized view for dashboard stats (optional)
-- ============================================================
-- This pre-computes expensive aggregations
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_order_stats AS
SELECT 
	tenant_id,
	COUNT(*) as total_orders,
	COUNT(*) FILTER (WHERE status = 'new') as new_orders,
	COUNT(*) FILTER (WHERE status = 'delivered') as delivered_orders,
	SUM(amount) as total_revenue,
	SUM(amount) FILTER (WHERE payment_status = 'paid') as paid_revenue,
	DATE_TRUNC('day', created_at) as order_date
FROM orders
GROUP BY tenant_id, DATE_TRUNC('day', created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_order_stats 
	ON mv_order_stats(tenant_id, order_date);

-- Refresh function (call periodically or after order changes)
CREATE OR REPLACE FUNCTION refresh_order_stats()
RETURNS void AS $$
BEGIN
	REFRESH MATERIALIZED VIEW CONCURRENTLY mv_order_stats;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 9. Add function to clean up old data
-- ============================================================
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
	-- Delete webhook logs older than 30 days
	DELETE FROM webhook_logs WHERE created_at < NOW() - INTERVAL '30 days';
	
	-- Delete expired sessions
	DELETE FROM admin_sessions WHERE expires_at < NOW();
	
	-- Delete old rate limit entries
	DELETE FROM rate_limit_tracking WHERE window_end < NOW();
	
	-- Archive old messages (move to archive table if needed)
	-- DELETE FROM messages WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 10. Add tenant isolation helper
-- ============================================================
-- For future multi-tenant support
CREATE OR REPLACE FUNCTION get_tenant_id()
RETURNS BIGINT AS $$
BEGIN
	RETURN COALESCE(current_setting('app.tenant_id', true)::BIGINT, 1);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 11. Update schema version
-- ============================================================
INSERT INTO global_settings (key, value) 
VALUES ('schema_version', '"pawperfume-v3.1"') 
ON CONFLICT (key) DO UPDATE SET value = '"pawperfume-v3.1"', updated_at = NOW();

COMMIT;

-- ============================================================
-- POST-MIGRATION: Analyze tables for query optimizer
-- ============================================================
ANALYZE;
