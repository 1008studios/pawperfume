-- PawPerfume Migration v3.2
-- Bot Flow Enhancement: image_url, carousel_items, ai_decision, faq_embeddings (RAG), flow_templates

BEGIN;

-- 1. Add missing columns to bot_flow_steps
ALTER TABLE bot_flow_steps ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE bot_flow_steps ADD COLUMN IF NOT EXISTS carousel_items JSONB DEFAULT '[]';
ALTER TABLE bot_flow_steps ADD COLUMN IF NOT EXISTS ai_prompt TEXT;
ALTER TABLE bot_flow_steps ADD COLUMN IF NOT EXISTS ai_context TEXT;
ALTER TABLE bot_flow_steps ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT false;
ALTER TABLE bot_flow_steps ADD COLUMN IF NOT EXISTS validation_pattern TEXT;
ALTER TABLE bot_flow_steps ADD COLUMN IF NOT EXISTS error_message TEXT;

-- 2. Add FAQ embedding column for RAG vector search
ALTER TABLE faqs ADD COLUMN IF NOT EXISTS embedding TEXT;

-- 3. Flow templates table
CREATE TABLE IF NOT EXISTS flow_templates (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    steps JSONB NOT NULL DEFAULT '[]',
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flow_templates_tenant ON flow_templates(tenant_id, category);

-- 4. Add step validation constraints
ALTER TABLE bot_flow_steps 
    ADD CONSTRAINT chk_bot_flow_step_type 
    CHECK (step_type IN ('text_input', 'button_choice', 'auto', 'image', 'carousel', 'ai_decision'));

-- 5. Seed: upgrade existing steps to support new features
UPDATE bot_flow_steps SET is_required = true WHERE input_variable IS NOT NULL AND input_variable != '';

-- 6. Seed: system flow templates
INSERT INTO flow_templates (tenant_id, name, description, category, steps, is_system) VALUES
(1, 'Product Order Flow', 'Step-by-step ordering: name → scent → size → address → confirm', 'ordering', 
'[{"step_key":"greet","step_label":"Welcome","step_type":"auto","prompt_message":"Welcome to PawPerfume! Let me help you find your perfect scent.","next_step":"ask_name","sort_order":0},{"step_key":"ask_name","step_label":"Ask Name","step_type":"text_input","prompt_message":"What is your name?","next_step":"ask_scent","input_variable":"customer_name","sort_order":1,"is_required":true},{"step_key":"ask_scent","step_label":"Scent Preference","step_type":"button_choice","prompt_message":"What type of scent do you prefer?","next_step":"ask_size","input_variable":"scent_preference","button_choices":[{"label":"Floral","next_step":"ask_size"},{"label":"Woody","next_step":"ask_size"},{"label":"Fresh / Citrus","next_step":"ask_size"},{"label":"Oriental","next_step":"ask_size"},{"label":"Fruity","next_step":"ask_size"}],"sort_order":2},{"step_key":"ask_size","step_label":"Bottle Size","step_type":"button_choice","prompt_message":"Which size would you like?","next_step":"ask_address","input_variable":"bottle_size","button_choices":[{"label":"30ml - ₱599","next_step":"ask_address"},{"label":"50ml - ₱899","next_step":"ask_address"},{"label":"100ml - ₱1,499","next_step":"ask_address"},{"label":"Sample Set - ₱299","next_step":"ask_address"}],"sort_order":3},{"step_key":"ask_address","step_label":"Delivery Address","step_type":"text_input","prompt_message":"Where should we deliver? Please provide your complete address.","next_step":"confirm","input_variable":"delivery_address","sort_order":4,"is_required":true},{"step_key":"confirm","step_label":"Confirmation","step_type":"auto","prompt_message":"Thank you! Our team will confirm your order shortly.","sort_order":5}]'
, true) ON CONFLICT DO NOTHING;

INSERT INTO flow_templates (tenant_id, name, description, category, steps, is_system) VALUES
(1, 'FAQ / Support Bot', 'Answers common questions and routes to a human if needed', 'support',
'[{"step_key":"intro","step_label":"Greeting","step_type":"auto","prompt_message":"Hi! I am the PawPerfume support bot. Ask me anything about our products, pricing, delivery, or payment. Type \"agent\" to talk to a human.","next_step":"ai_faq","sort_order":0},{"step_key":"ai_faq","step_label":"AI FAQ Lookup","step_type":"ai_decision","prompt_message":"Let me check our knowledge base...","next_step":"intro","input_variable":"faq_answer","sort_order":1,"ai_prompt":"Search the FAQ database for the best answer to the customer question. If not found, suggest they type \"agent\" for a human.","ai_context":"faq"}]'
, true) ON CONFLICT DO NOTHING;

INSERT INTO flow_templates (tenant_id, name, description, category, steps, is_system) VALUES
(1, 'Lead Capture', 'Collects name, email/phone, and interest for follow-up', 'marketing',
'[{"step_key":"greet_lead","step_label":"Greeting","step_type":"auto","prompt_message":"Hi! Interested in our premium perfumes? Let me get your details so we can send you a special offer.","next_step":"ask_name_lead","sort_order":0},{"step_key":"ask_name_lead","step_label":"Ask Name","step_type":"text_input","prompt_message":"What is your name?","next_step":"ask_contact","input_variable":"customer_name","sort_order":1,"is_required":true},{"step_key":"ask_contact","step_label":"Contact Info","step_type":"text_input","prompt_message":"What is your mobile number or email so we can reach you?","next_step":"ask_interest","input_variable":"contact_info","sort_order":2,"is_required":true},{"step_key":"ask_interest","step_label":"Interest","step_type":"button_choice","prompt_message":"What are you most interested in?","input_variable":"interest","button_choices":[{"label":"Floral Scents","next_step":"thank_lead"},{"label":"Woody Scents","next_step":"thank_lead"},{"label":"Fresh Scents","next_step":"thank_lead"},{"label":"Gift Sets","next_step":"thank_lead"},{"label":"Just Browsing","next_step":"thank_lead"}],"sort_order":3},{"step_key":"thank_lead","step_label":"Thank You","step_type":"auto","prompt_message":"Got it! We will send you a personalized offer soon. Stay tuned!","sort_order":4}]'
, true) ON CONFLICT DO NOTHING;

-- 7. Update schema version
INSERT INTO global_settings (key, value) 
VALUES ('schema_version', '"pawperfume-v3.2"') 
ON CONFLICT (key) DO UPDATE SET value = '"pawperfume-v3.2"', updated_at = NOW();

COMMIT;
