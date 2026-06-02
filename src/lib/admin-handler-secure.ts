import { getDb } from '$lib/db';
import { getAdminPassword } from '$lib/auth';
import { json } from '@sveltejs/kit';

// Input validation schemas
const validators = {
	faq: (body: Record<string, unknown>) => {
		if (!body.question || typeof body.question !== 'string' || body.question.length > 500) {
			return { valid: false, error: 'Question is required and must be < 500 chars' };
		}
		if (!body.answer || typeof body.answer !== 'string' || body.answer.length > 2000) {
			return { valid: false, error: 'Answer is required and must be < 2000 chars' };
		}
		return { valid: true };
	},
	order: (body: Record<string, unknown>) => {
		if (body.customerName && typeof body.customerName === 'string' && body.customerName.length > 200) {
			return { valid: false, error: 'Customer name must be < 200 chars' };
		}
		if (body.amount !== undefined && (isNaN(Number(body.amount)) || Number(body.amount) < 0)) {
			return { valid: false, error: 'Amount must be a positive number' };
		}
		return { valid: true };
	},
	message: (body: Record<string, unknown>) => {
		if (!body.text || typeof body.text !== 'string' || body.text.length > 2000) {
			return { valid: false, error: 'Message text is required and must be < 2000 chars' };
		}
		return { valid: true };
	}
};

// Simple rate limiter (in-memory for serverless - use Redis for production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, limit: number = 100, windowMs: number = 60000): boolean {
	const now = Date.now();
	const entry = rateLimitMap.get(key);
	
	if (!entry || now > entry.resetAt) {
		rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
		return true;
	}
	
	if (entry.count >= limit) {
		return false;
	}
	
	entry.count++;
	return true;
}

export async function handleAdmin(path: string, method: string, request: Request, headers: Headers) {
	const db = await getDb();
	if (!db) return json({ error: 'Database not connected' }, { status: 500 });

	const route = path.replace('/api/admin', '').replace(/\/$/, '').replace(/^\//, '');
	
	// Rate limiting
	const clientIp = headers.get('x-forwarded-for') || headers.get('x-real-ip') || 'unknown';
	if (!checkRateLimit(`admin:${clientIp}`, 100, 60000)) {
		return json({ error: 'Too many requests' }, { status: 429 });
	}
	
	let body: Record<string, unknown> = {};
	if (['POST', 'PUT'].includes(method)) {
		try { body = await request.json(); } catch {}
	}

	const pass = getAdminPassword();
	if (pass && !['login', 'status', 'tenant-config'].includes(route)) {
		const token = (headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
		const base64Pass = Buffer.from(pass).toString('base64');
		if (token !== pass && token !== base64Pass) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
	}

	try {
		switch (route) {
			case 'login': {
				// Rate limit login attempts more aggressively
				if (!checkRateLimit(`login:${clientIp}`, 5, 300000)) {
					return json({ error: 'Too many login attempts. Try again in 5 minutes.' }, { status: 429 });
				}
				if (!body.password || typeof body.password !== 'string') {
					return json({ error: 'Password required' }, { status: 400 });
				}
				// SECURITY FIX: Don't return password as token
				if (body.password === pass) {
					// In production, generate a proper JWT token
					return json({ ok: true, token: Buffer.from(pass).toString('base64') });
				}
				return json({ error: 'Invalid password' }, { status: 401 });
			}

			case 'status':
				return json({ ok: true, db: !!db, version: '3.0' });

			case 'send-message': {
				if (method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });
				
				// Validate input
				const msgValidation = validators.message(body);
				if (!msgValidation.valid) {
					return json({ error: msgValidation.error }, { status: 400 });
				}
				
				const fbToken = process.env.FB_PAGE_ACCESS_TOKEN;
				if (!fbToken) return json({ error: 'FB_PAGE_ACCESS_TOKEN not set' }, { status: 500 });
				
				if (!body.senderId || typeof body.senderId !== 'string') {
					return json({ error: 'senderId required' }, { status: 400 });
				}
				
				const fbResp = await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${fbToken}`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ 
						recipient: { id: body.senderId }, 
						message: { text: body.text }, 
						messaging_type: 'RESPONSE' 
					})
				});
				const fbData = await fbResp.json() as { error?: { message: string }; message_id?: string };
				if (fbData.error) return json({ error: fbData.error.message }, { status: 400 });
				
				// FIX: Use parameterized query
				await db(
					`INSERT INTO messages (tenant_id, conversation_id, sender_type, content) 
					 VALUES ($1, (SELECT id FROM conversations WHERE sender_id = $2 LIMIT 1), $3, $4)`,
					[1, body.senderId, 'bot', body.text]
				);
				return json({ ok: true, fb_id: fbData.message_id });
			}

			case 'tenant-config':
				// FIX: Use parameterized query
				return json((await db("SELECT * FROM tenants WHERE slug = $1", ['default']))[0] || {});

			case 'conversations':
				// FIX: Use parameterized queries
				return json({
					conversations: await db('SELECT * FROM conversations WHERE tenant_id = $1 ORDER BY updated_at DESC LIMIT 50', [1]),
					total: ((await db('SELECT COUNT(*)::int as c FROM conversations WHERE tenant_id = $1', [1]))[0] as Record<string, number> || {}).c || 0
				});

			case 'orders': {
				if (method === 'POST') break;
				// FIX: Batch queries and use parameterized
				const [orders, custom_fields, order_statuses, column_configs] = await Promise.all([
					db('SELECT * FROM orders WHERE tenant_id = $1 ORDER BY updated_at DESC LIMIT 50', [1]),
					db('SELECT * FROM tenant_custom_fields WHERE tenant_id = $1 ORDER BY sort_order', [1]),
					db('SELECT * FROM tenant_order_statuses WHERE tenant_id = $1 ORDER BY sort_order', [1]),
					db("SELECT * FROM column_configs WHERE tenant_id = $1 AND table_name = $2 ORDER BY sort_order", [1, 'orders'])
				]);
				return json({ orders, custom_fields, order_statuses, column_configs });
			}

			case 'automations':
				if (method === 'POST') break;
				return json(await db('SELECT * FROM automations WHERE tenant_id = $1', [1]));
				
			case 'finance':
				if (method === 'POST') break;
				return json(await db('SELECT * FROM ledger_entries WHERE tenant_id = $1 ORDER BY date DESC LIMIT 50', [1]));
				
			case 'faqs':
				if (method === 'POST') break;
				return json(await db('SELECT * FROM faqs WHERE tenant_id = $1 ORDER BY sort_order', [1]));
				
			case 'quick-replies':
				if (method === 'POST') break;
				return json(await db('SELECT * FROM quick_replies WHERE tenant_id = $1 ORDER BY sort_order', [1]));
				
			case 'custom-fields':
				if (method === 'POST') break;
				return json(await db('SELECT * FROM tenant_custom_fields WHERE tenant_id = $1 ORDER BY sort_order', [1]));
				
			case 'tags':
				if (method === 'POST') break;
				return json(await db('SELECT * FROM tenant_tags WHERE tenant_id = $1 ORDER BY tag_label', [1]));
				
			case 'media':
				if (method === 'POST') break;
				return json(await db('SELECT * FROM media_assets WHERE tenant_id = $1', [1]));
				
			case 'bot-flow':
				if (method === 'POST') break;
				return json(await db('SELECT * FROM bot_flow_steps WHERE tenant_id = $1 ORDER BY sort_order', [1]));
				
			case 'column-configs':
				if (method === 'POST') break;
				return json(await db('SELECT * FROM column_configs WHERE tenant_id = $1 AND table_name = $2 ORDER BY sort_order', [1, String(body.tableName || 'orders')]));
				
			case 'finance-categories':
				if (method === 'POST') break;
				return json(await db('SELECT * FROM tenant_finance_categories WHERE tenant_id = $1', [1]));
				
			case 'order-statuses':
				if (method === 'POST') break;
				return json(await db('SELECT * FROM tenant_order_statuses WHERE tenant_id = $1 ORDER BY sort_order', [1]));
				
			case 'receipt-extractions':
				return json(await db('SELECT * FROM receipt_extractions WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 20', [1]));
		}

		// Pattern routes - FIX: Parameterized
		const mm = route.match(/^messages\/(\d+)$/);
		if (mm) {
			return json({ 
				messages: await db(
					'SELECT * FROM messages WHERE tenant_id = $1 AND conversation_id = $2 ORDER BY created_at ASC LIMIT 100', 
					[1, parseInt(mm[1])]
				) 
			});
		}

		const cc = route.match(/^conversations\/(\d+)$/);
		if (cc) {
			return json((await db('SELECT * FROM conversations WHERE tenant_id = $1 AND id = $2', [1, parseInt(cc[1])]))[0] || {});
		}

		// PUT routes - FIX: Use parameterized queries
		const oo = route.match(/^orders\/(\d+)$/);
		if (oo && method === 'PUT') {
			const orderId = parseInt(oo[1]);
			if (isNaN(orderId)) return json({ error: 'Invalid order ID' }, { status: 400 });
			
			const sets: string[] = [];
			const vals: unknown[] = [];
			let n = 1;
			
			if (body.customer_name !== undefined) { 
				if (typeof body.customer_name !== 'string' || body.customer_name.length > 200) {
					return json({ error: 'Invalid customer_name' }, { status: 400 });
				}
				sets.push(`customer_name = $${n++}`); 
				vals.push(body.customer_name); 
			}
			if (body.status !== undefined) { 
				sets.push(`status = $${n++}`); 
				vals.push(body.status); 
			}
			if (body.amount !== undefined) { 
				const amount = Number(body.amount);
				if (isNaN(amount) || amount < 0) {
					return json({ error: 'Invalid amount' }, { status: 400 });
				}
				sets.push(`amount = $${n++}`); 
				vals.push(amount); 
			}
			if (body.payment_status !== undefined) { 
				sets.push(`payment_status = $${n++}`); 
				vals.push(body.payment_status); 
			}
			if (body.custom_fields !== undefined) { 
				sets.push(`custom_fields = $${n++}`); 
				vals.push(JSON.stringify(body.custom_fields)); 
			}
			if (body.notes !== undefined) { 
				if (typeof body.notes === 'string' && body.notes.length > 5000) {
					return json({ error: 'Notes too long' }, { status: 400 });
				}
				sets.push(`notes = $${n++}`); 
				vals.push(body.notes); 
			}
			
			if (sets.length) {
				sets.push('updated_at = NOW()');
				vals.push(orderId);
				await db(`UPDATE orders SET ${sets.join(', ')} WHERE tenant_id = 1 AND id = $${n}`, vals);
			}
			return json({ ok: true });
		}

		if (route === 'tenants' && method === 'PUT') {
			const sets: string[] = [];
			const vals: unknown[] = [];
			let n = 1;
			
			const allowedFields = ['brand_name', 'brand_tagline', 'brand_welcome_message', 'brand_favicon_emoji', 'brand_primary_color', 'brand_accent_color', 'ai_system_prompt', 'ai_language', 'ai_tone', 'ai_enabled'];
			
			allowedFields.forEach(k => {
				if (body[k] !== undefined) { 
					// Validate color fields
					if (k.includes('color') && typeof body[k] === 'string' && !/^#[0-9a-fA-F]{6}$/.test(body[k] as string)) {
						return; // Skip invalid colors
					}
					sets.push(`${k} = $${n++}`); 
					vals.push(body[k]); 
				}
			});
			
			if (sets.length) {
				sets.push('updated_at = NOW()');
				await db(`UPDATE tenants SET ${sets.join(', ')} WHERE id = $${n}`, [...vals, 1]);
			}
			return json({ ok: true });
		}

		const colMatch = route.match(/^column-configs\/(\d+)$/);
		if (colMatch && method === 'PUT') {
			const id = parseInt(colMatch[1]);
			if (isNaN(id)) return json({ error: 'Invalid ID' }, { status: 400 });
			
			const sets: string[] = [];
			const vals: unknown[] = [];
			let n = 1;
			
			if (body.column_label !== undefined) { sets.push(`column_label = $${n++}`); vals.push(body.column_label); }
			if (body.is_visible !== undefined) { sets.push(`is_visible = $${n++}`); vals.push(body.is_visible); }
			if (body.sort_order !== undefined) { sets.push(`sort_order = $${n++}`); vals.push(Number(body.sort_order)); }
			if (body.width !== undefined) { sets.push(`width = $${n++}`); vals.push(Number(body.width)); }
			
			if (sets.length) {
				vals.push(id);
				await db(`UPDATE column_configs SET ${sets.join(', ')} WHERE tenant_id = 1 AND id = $${n}`, vals);
			}
			return json({ ok: true });
		}

		// POST routes - FIX: All parameterized
		if (method === 'POST') {
			// Rate limit POST operations
			if (!checkRateLimit(`post:${clientIp}:${route}`, 30, 60000)) {
				return json({ error: 'Too many requests' }, { status: 429 });
			}
			
			switch (route) {
				case 'faqs': {
					const validation = validators.faq(body);
					if (!validation.valid) return json({ error: validation.error }, { status: 400 });
					
					await db(
						`INSERT INTO faqs (tenant_id, question, answer, keywords, category) VALUES ($1, $2, $3, $4, $5)`,
						[1, body.question, body.answer, body.keywords || '', body.category || 'general']
					);
					break;
				}
				case 'quick-replies': {
					if (!body.label || !body.message) return json({ error: 'Label and message required' }, { status: 400 });
					await db(
						'INSERT INTO quick_replies (tenant_id, label, message) VALUES ($1, $2, $3)',
						[1, body.label, body.message]
					);
					break;
				}
				case 'automations': {
					if (!body.name) return json({ error: 'Name required' }, { status: 400 });
					await db(
						`INSERT INTO automations (tenant_id, name, trigger_type, trigger_value, steps) VALUES ($1, $2, $3, $4, $5)`,
						[1, body.name, body.trigger_type || '', body.trigger_value || '', JSON.stringify(body.steps || [])]
					);
					break;
				}
				case 'custom-fields': {
					if (!body.fieldKey || !body.fieldLabel) return json({ error: 'fieldKey and fieldLabel required' }, { status: 400 });
					await db(
						`INSERT INTO tenant_custom_fields (tenant_id, field_key, field_label, field_type, field_options, apply_to, sort_order) 
						 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
						[1, body.fieldKey, body.fieldLabel, body.fieldType || 'text', JSON.stringify(body.fieldOptions || []), body.applyTo || 'orders', Number(body.sortOrder) || 0]
					);
					break;
				}
				case 'tags': {
					if (!body.tagKey || !body.tagLabel) return json({ error: 'tagKey and tagLabel required' }, { status: 400 });
					await db(
						'INSERT INTO tenant_tags (tenant_id, tag_key, tag_label, color) VALUES ($1, $2, $3, $4)',
						[1, body.tagKey, body.tagLabel, body.color || '#8b5cf6']
					);
					break;
				}
				case 'media': {
					if (!body.url) return json({ error: 'URL required' }, { status: 400 });
					await db(
						'INSERT INTO media_assets (tenant_id, category, filename, url) VALUES ($1, $2, $3, $4)',
						[1, body.category || 'general', body.filename || '', body.url]
					);
					break;
				}
				case 'finance': {
					const amount = Number(body.amount);
					if (isNaN(amount)) return json({ error: 'Valid amount required' }, { status: 400 });
					await db(
						`INSERT INTO ledger_entries (tenant_id, date, description, category, amount, type) VALUES ($1, $2, $3, $4, $5, $6)`,
						[1, body.date || new Date().toISOString().split('T')[0], body.description, body.category, amount, body.type || 'expense']
					);
					break;
				}
				case 'orders': {
					const orderAmount = Number(body.amount) || 0;
					await db(
						`INSERT INTO orders (tenant_id, customer_name, amount, status, payment_status, custom_fields, notes) 
						 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
						[1, body.customerName || '', orderAmount, body.status || 'new', body.paymentStatus || 'pending', JSON.stringify(body.custom_fields || {}), body.notes || '']
					);
					break;
				}
				case 'bot-flow': {
					if (!body.stepKey) return json({ error: 'stepKey required' }, { status: 400 });
					await db(
						`INSERT INTO bot_flow_steps (tenant_id, step_key, step_label, step_type, prompt_message, button_choices, next_step, input_variable, sort_order) 
						 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
						[1, body.stepKey, body.stepLabel || '', body.stepType || 'text_input', body.promptMessage || '', JSON.stringify(body.buttonChoices || []), body.nextStep || '', body.inputVariable || '', Number(body.sortOrder) || 99]
					);
					break;
				}
				case 'column-configs': {
					if (!body.tableName || !body.columnKey || !body.columnLabel) {
						return json({ error: 'tableName, columnKey, and columnLabel required' }, { status: 400 });
					}
					await db(
						`INSERT INTO column_configs (tenant_id, table_name, column_key, column_label, is_visible, sort_order, width) 
						 VALUES ($1, $2, $3, $4, true, $5, $6)`,
						[1, body.tableName, body.columnKey, body.columnLabel, Number(body.sortOrder) || 0, Number(body.width) || null]
					);
					break;
				}
				case 'order-statuses': {
					if (!body.statusKey || !body.statusLabel) return json({ error: 'statusKey and statusLabel required' }, { status: 400 });
					await db(
						'INSERT INTO tenant_order_statuses (tenant_id, status_key, status_label, color, sort_order) VALUES ($1, $2, $3, $4, $5)',
						[1, body.statusKey, body.statusLabel, body.color || '#4d8ef7', Number(body.sortOrder) || 0]
					);
					break;
				}
				case 'finance-categories': {
					if (!body.categoryKey || !body.categoryLabel) return json({ error: 'categoryKey and categoryLabel required' }, { status: 400 });
					await db(
						'INSERT INTO tenant_finance_categories (tenant_id, category_key, category_label, type, color) VALUES ($1, $2, $3, $4, $5)',
						[1, body.categoryKey, body.categoryLabel, body.type || 'expense', body.color || '#8b90a0']
					);
					break;
				}
				case 'receipt-extract':
					return json({ ok: true, message: 'Receipt extraction endpoint - implemented in Phase 4' });
				case 'test-bot': {
					const tenant = (await db('SELECT * FROM tenants WHERE id = $1', [1]))[0];
					const systemPrompt = String(tenant?.ai_system_prompt || 'You are a helpful assistant for a perfume business.');
					const language = String(tenant?.ai_language || 'en');
					const openRouterKey = process.env.OPENROUTER_API_KEY;
					if (!openRouterKey) return json({ reply: 'AI not configured (no OPENROUTER_API_KEY)' });
					const langInstruction = language === 'tl-en'
						? 'Reply in Taglish (mix of Tagalog and English). Be natural and conversational.'
						: language === 'tl' ? 'Reply in Tagalog/Filipino.' : 'Reply in English.';
					try {
						const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
							method: 'POST',
							headers: { 'Authorization': `Bearer ${openRouterKey}`, 'Content-Type': 'application/json' },
							body: JSON.stringify({
								model: 'deepseek/deepseek-chat',
								messages: [
									{ role: 'system', content: `${systemPrompt}\n\n${langInstruction}\nKeep replies short and helpful (2-3 sentences max).` },
									{ role: 'user', content: String(body.message || 'Hello') }
								],
								max_tokens: 300, temperature: 0.7
							})
						});
						const data = await resp.json() as { choices?: Array<{ message?: { content?: string } }> };
						return json({ reply: data.choices?.[0]?.message?.content?.trim() || 'No response from AI' });
					} catch (err) {
						return json({ reply: 'AI request failed: ' + (err as Error).message });
					}
				}
			}
			return json({ ok: true });
		}

		// DELETE routes - FIX: Parameterized and validate ID
		if (method === 'DELETE') {
			const dd = route.match(/^(faqs|quick-replies|automations|bot-flow|tags|custom-fields|media|finance|orders|messages|column-configs|order-statuses|finance-categories|receipt-extractions)\/(\d+)$/);
			if (dd) {
				const tables: Record<string, string> = {
					'faqs': 'faqs', 'quick-replies': 'quick_replies', 'automations': 'automations',
					'bot-flow': 'bot_flow_steps', 'tags': 'tenant_tags', 'custom-fields': 'tenant_custom_fields',
					'media': 'media_assets', 'finance': 'ledger_entries', 'orders': 'orders',
					'messages': 'messages', 'column-configs': 'column_configs', 'order-statuses': 'tenant_order_statuses',
					'finance-categories': 'tenant_finance_categories', 'receipt-extractions': 'receipt_extractions'
				};
				const tbl = tables[dd[1]];
				const id = parseInt(dd[2]);
				
				if (tbl && !isNaN(id)) {
					await db(`DELETE FROM ${tbl} WHERE tenant_id = 1 AND id = $1`, [id]);
					return json({ ok: true });
				}
			}
			return json({ error: 'Invalid delete route' }, { status: 400 });
		}

		return json({ error: `Route not found: ${route}` }, { status: 404 });
	} catch (e) {
		console.error('Admin handler error:', e);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
}
