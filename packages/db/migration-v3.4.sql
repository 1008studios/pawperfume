-- PawPerfume Migration v3.4
-- AI-Centric Bot Flow: AI generates all messages guided by flow skeleton

BEGIN;

-- 1. Add AI persona and mode columns per step
ALTER TABLE bot_flow_steps ADD COLUMN IF NOT EXISTS ai_persona TEXT DEFAULT 'friendly';
ALTER TABLE bot_flow_steps ADD COLUMN IF NOT EXISTS ai_mode TEXT DEFAULT 'guided';
-- ai_mode: 'guided' = AI generates response following the guide, 'exact' = use prompt_message verbatim

-- 2. Update existing steps to use guided AI mode
UPDATE bot_flow_steps SET ai_mode = 'guided' WHERE ai_mode IS NULL;

-- 3. Update schema version
INSERT INTO global_settings (key, value) 
VALUES ('schema_version', '"pawperfume-v3.4"') 
ON CONFLICT (key) DO UPDATE SET value = '"pawperfume-v3.4"', updated_at = NOW();

COMMIT;
