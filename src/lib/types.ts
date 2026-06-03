export interface Tenant {
	id: number;
	slug: string;
	name: string;
	brand_name: string | null;
	brand_tagline: string;
	brand_primary_color: string;
	brand_accent_color: string;
	brand_favicon_emoji: string;
	brand_welcome_message: string | null;
	ai_system_prompt: string | null;
	ai_language: string;
	ai_tone: string;
	ai_enabled: boolean;
	plan: string;
	fb_page_access_token: string | null;
	fb_app_secret: string | null;
	fb_verify_token: string | null;
	fb_page_id: string | null;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

export interface Conversation {
	id: number;
	tenant_id: number;
	sender_id: string;
	name: string | null;
	status: string;
	tags: string[];
	notes: string | null;
	custom_fields: Record<string, unknown>;
	is_bot_enabled: boolean;
	last_activity_at: string | null;
	updated_at: string;
	created_at: string;
}

export interface Message {
	id: number;
	tenant_id: number;
	conversation_id: number;
	sender_type: 'customer' | 'bot' | 'agent';
	message_type: string;
	content: string | null;
	media_url: string | null;
	mid: string | null;
	created_at: string;
}

export interface Order {
	id: number;
	tenant_id: number;
	conversation_id: number | null;
	customer_name: string | null;
	status: string;
	payment_status: string;
	amount: number | null;
	custom_fields: Record<string, unknown>;
	notes: string | null;
	updated_at: string;
	created_at: string;
}

export interface LedgerEntry {
	id: number;
	tenant_id: number;
	date: string;
	description: string | null;
	category: string | null;
	amount: number;
	type: 'income' | 'expense';
	created_at: string;
}

export interface CustomField {
	id: number;
	tenant_id: number;
	field_key: string;
	field_label: string | null;
	field_type: string;
	field_options: string[];
	apply_to: string;
	sort_order: number;
}

export interface OrderStatus {
	id: number;
	tenant_id: number;
	status_key: string;
	status_label: string | null;
	color: string;
	sort_order: number;
}

export interface Tag {
	id: number;
	tenant_id: number;
	tag_key: string;
	tag_label: string | null;
	color: string;
}

export interface QuickReply {
	id: number;
	tenant_id: number;
	label: string | null;
	message: string | null;
	sort_order: number;
}

export interface Faq {
	id: number;
	tenant_id: number;
	question: string | null;
	answer: string | null;
	keywords: string | null;
	category: string;
	sort_order: number;
}

export interface BotFlowStep {
	id: number;
	tenant_id: number;
	step_key: string;
	step_label: string | null;
	step_type: string;
	prompt_message: string | null;
	button_choices: Array<{ label: string; next_step: string }>;
	next_step: string | null;
	input_variable: string | null;
	sort_order: number;
	image_url?: string | null;
	carousel_items?: Array<{
		title: string;
		subtitle: string;
		imageUrl: string;
		buttonLabel: string;
		buttonNextStep: string;
	}> | null;
}

export interface Automation {
	id: number;
	tenant_id: number;
	name: string | null;
	trigger_type: string | null;
	trigger_value: string | null;
	steps: unknown[];
	is_active: boolean;
	created_at: string;
}

export interface MediaAsset {
	id: number;
	tenant_id: number;
	category: string;
	filename: string | null;
	url: string | null;
	created_at: string;
}

export interface ColumnConfig {
	id: number;
	tenant_id: number;
	table_name: string;
	column_key: string;
	column_label: string;
	is_visible: boolean;
	sort_order: number;
	width: number | null;
}

export interface ReceiptExtraction {
	id: number;
	tenant_id: number;
	media_url: string;
	extracted_data: Record<string, unknown>;
	order_id: number | null;
	status: 'pending' | 'extracted' | 'confirmed' | 'failed';
	created_at: string;
}

export interface FinanceCategory {
	id: number;
	tenant_id: number;
	category_key: string;
	category_label: string | null;
	type: string;
	color: string;
}
