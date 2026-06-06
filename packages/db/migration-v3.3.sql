-- PawPerfume Migration v3.3
-- AI Configurability: per-step model selection, temperature, max tokens, global defaults
-- Also: orders page improvements, bot flow AI panel

BEGIN;

-- 1. AI model configuration on tenants (global defaults)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ai_model TEXT DEFAULT 'deepseek/deepseek-chat';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ai_temperature REAL DEFAULT 0.7;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ai_max_tokens INT DEFAULT 300;

-- 2. Per-step AI overrides on bot_flow_steps
ALTER TABLE bot_flow_steps ADD COLUMN IF NOT EXISTS ai_model TEXT;
ALTER TABLE bot_flow_steps ADD COLUMN IF NOT EXISTS ai_temperature REAL;
ALTER TABLE bot_flow_steps ADD COLUMN IF NOT EXISTS ai_max_tokens INT;

-- 3. Seed: default AI model for existing tenant
UPDATE tenants SET ai_model = 'deepseek/deepseek-chat', ai_temperature = 0.7, ai_max_tokens = 300 WHERE id = 1;

-- 4. Update schema version
INSERT INTO global_settings (key, value) 
VALUES ('schema_version', '"pawperfume-v3.3"') 
ON CONFLICT (key) DO UPDATE SET value = '"pawperfume-v3.3"', updated_at = NOW();

COMMIT;
