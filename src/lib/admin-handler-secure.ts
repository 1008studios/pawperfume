import { getDb } from '$lib/db';
import { getAdminPassword, createSession, validateSession, checkLoginRateLimit, recordLoginAttempt, clearLoginAttempts } from '$lib/auth';
import { json } from '@sveltejs/kit';
import { extractReceiptData } from '$lib/bot-engine';

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
		let authorized = false;
		
		// Check session token
		if (validateSession(token, clientIp)) {
			authorized = true;
		}
		
		// Legacy: base64-encoded password
		if (!authorized) {
			try {
				const decoded = Buffer.from(token, 'base64').toString();
				if (decoded === pass) authorized = true;
			} catch {}
		}
		
		// Legacy: raw password (will be phased out)
		if (!authorized && token === pass) {
			authorized = true;
		}
		
		if (!authorized) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
	}

	try {
		switch (route) {
			case 'login': {
				if (method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });
				
				const rateCheck = checkLoginRateLimit(clientIp);
				if (!rateCheck.allowed) {
					return json({ 
						error: `Too many login attempts. Try again in ${Math.ceil((rateCheck.retryAfter || 0) / 60)} minutes.` 
					}, { status: 429 });
				}
				
				if (!body.password || typeof body.password !== 'string') {
					return json({ error: 'Password required' }, { status: 400 });
				}
				
				if (body.password === pass) {
					clearLoginAttempts(clientIp);
					const sessionToken = createSession(clientIp);
					return json({ ok: true, token: sessionToken });
				}
				
				recordLoginAttempt(clientIp);
				return json({ error: 'Invalid password' }, { status: 401 });
			}

			case 'status':
				if (method !== 'GET') return json({ error: 'Method not allowed' }, { status: 405 });
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
				if (method !== 'GET') return json({ error: 'Method not allowed' }, { status: 405 });
				// FIX: Use parameterized query
				return json((await db("SELECT * FROM tenants WHERE slug = $1", ['default']))[0] || {});

			case 'conversations':
				if (method !== 'GET') return json({ error: 'Method not allowed' }, { status: 405 });
				// FIX: Use parameterized queries
				return json({
					conversations: await db('SELECT * FROM conversations WHERE tenant_id = $1 ORDER BY updated_at DESC LIMIT 50', [1]),
					total: ((await db('SELECT COUNT(*)::int as c FROM conversations WHERE tenant_id = $1', [1]))[0] as Record<string, number> || {}).c || 0
				});

			case 'orders': {
				if (method !== 'GET' && method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });
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
				if (method !== 'GET' && method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });
				if (method === 'POST') break;
				return json(await db('SELECT * FROM automations WHERE tenant_id = $1', [1]));
				
			case 'finance':
				if (method !== 'GET' && method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });
				if (method === 'POST') break;
				return json(await db('SELECT * FROM ledger_entries WHERE tenant_id = $1 ORDER BY date DESC LIMIT 50', [1]));
				
			case 'faqs':
				if (method !== 'GET' && method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });
				if (method === 'POST') break;
				return json(await db('SELECT * FROM faqs WHERE tenant_id = $1 ORDER BY sort_order', [1]));
				
			case 'quick-replies':
				if (method !== 'GET' && method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });
				if (method === 'POST') break;
				return json(await db('SELECT * FROM quick_replies WHERE tenant_id = $1 ORDER BY sort_order', [1]));
				
			case 'custom-fields':
				if (method !== 'GET' && method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });
				if (method === 'POST') break;
				return json(await db('SELECT * FROM tenant_custom_fields WHERE tenant_id = $1 ORDER BY sort_order', [1]));
				
			case 'tags':
				if (method !== 'GET' && method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });
				if (method === 'POST') break;
				return json(await db('SELECT * FROM tenant_tags WHERE tenant_id = $1 ORDER BY tag_label', [1]));
				
			case 'media':
				if (method !== 'GET' && method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });
				if (method === 'POST') break;
				return json(await db('SELECT * FROM media_assets WHERE tenant_id = $1', [1]));
				
			case 'bot-flow':
				if (method !== 'GET' && method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });
				if (method === 'POST') break;
				return json(await db('SELECT * FROM bot_flow_steps WHERE tenant_id = $1 ORDER BY sort_order', [1]));
				
			case 'column-configs':
				if (method !== 'GET' && method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });
				if (method === 'POST') break;
				return json(await db('SELECT * FROM column_configs WHERE tenant_id = $1 AND table_name = $2 ORDER BY sort_order', [1, String(body.tableName || 'orders')]));
				
			case 'finance-categories':
				if (method !== 'GET' && method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });
				if (method === 'POST') break;
				return json(await db('SELECT * FROM tenant_finance_categories WHERE tenant_id = $1', [1]));
				
			case 'order-statuses':
				if (method !== 'GET' && method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });
				if (method === 'POST') break;
				return json(await db('SELECT * FROM tenant_order_statuses WHERE tenant_id = $1 ORDER BY sort_order', [1]));
				
			case 'receipt-extractions':
				if (method !== 'GET') return json({ error: 'Method not allowed' }, { status: 405 });
				return json(await db('SELECT * FROM receipt_extractions WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 20', [1]));
		}

		// Pattern routes - FIX: Parameterized
		const mm = route.match(/^messages\/(\d+)$/);
		if (mm) {
			if (method !== 'GET') return json({ error: 'Method not allowed' }, { status: 405 });
			return json({ 
				messages: await db(
					'SELECT * FROM messages WHERE tenant_id = $1 AND conversation_id = $2 ORDER BY created_at ASC LIMIT 100', 
					[1, parseInt(mm[1])]
				) 
			});
		}

		const cc = route.match(/^conversations\/(\d+)$/);
		if (cc) {
			if (method === 'GET') {
				return json((await db('SELECT * FROM conversations WHERE tenant_id = $1 AND id = $2', [1, parseInt(cc[1])]))[0] || {});
			} else if (method === 'PUT') {
				const id = parseInt(cc[1]);
				if (isNaN(id)) return json({ error: 'Invalid ID' }, { status: 400 });
				const sets: string[] = [];
				const vals: unknown[] = [];
				let n = 1;
				if (body.status !== undefined) { sets.push(`status = $${n++}`); vals.push(body.status); }
				if (body.notes !== undefined) { sets.push(`notes = $${n++}`); vals.push(body.notes); }
				if (body.tags !== undefined) { 
					sets.push(`tags = $${n++}`); 
					vals.push(typeof body.tags === 'string' ? body.tags : JSON.stringify(body.tags)); 
				}
				if (body.custom_fields !== undefined) { 
					sets.push(`custom_fields = $${n++}`); 
					vals.push(typeof body.custom_fields === 'string' ? body.custom_fields : JSON.stringify(body.custom_fields)); 
				}
				if (body.is_bot_enabled !== undefined) { 
					sets.push(`is_bot_enabled = $${n++}`); 
					vals.push(!!body.is_bot_enabled); 
				}
				if (sets.length) {
					sets.push('updated_at = NOW()');
					vals.push(id);
					await db(`UPDATE conversations SET ${sets.join(', ')} WHERE tenant_id = 1 AND id = $${n}`, vals);
				}
				return json({ ok: true });
			} else {
				return json({ error: 'Method not allowed' }, { status: 405 });
			}
		}

		const osMatch = route.match(/^order-statuses\/(\d+)$/);
		if (osMatch && method === 'PUT') {
			const id = parseInt(osMatch[1]);
			if (isNaN(id)) return json({ error: 'Invalid ID' }, { status: 400 });
			const sets: string[] = [];
			const vals: unknown[] = [];
			let n = 1;
			if (body.statusKey !== undefined) { sets.push(`status_key = $${n++}`); vals.push(body.statusKey); }
			if (body.status_key !== undefined) { sets.push(`status_key = $${n++}`); vals.push(body.status_key); }
			if (body.statusLabel !== undefined) { sets.push(`status_label = $${n++}`); vals.push(body.statusLabel); }
			if (body.status_label !== undefined) { sets.push(`status_label = $${n++}`); vals.push(body.status_label); }
			if (body.color !== undefined) { sets.push(`color = $${n++}`); vals.push(body.color); }
			if (body.sortOrder !== undefined) { sets.push(`sort_order = $${n++}`); vals.push(Number(body.sortOrder)); }
			if (body.sort_order !== undefined) { sets.push(`sort_order = $${n++}`); vals.push(Number(body.sort_order)); }
			if (sets.length) {
				vals.push(id);
				await db(`UPDATE tenant_order_statuses SET ${sets.join(', ')} WHERE tenant_id = 1 AND id = $${n}`, vals);
			}
			return json({ ok: true });
		}

		const fcMatch = route.match(/^finance-categories\/(\d+)$/);
		if (fcMatch && method === 'PUT') {
			const id = parseInt(fcMatch[1]);
			if (isNaN(id)) return json({ error: 'Invalid ID' }, { status: 400 });
			const sets: string[] = [];
			const vals: unknown[] = [];
			let n = 1;
			if (body.categoryKey !== undefined) { sets.push(`category_key = $${n++}`); vals.push(body.categoryKey); }
			if (body.category_key !== undefined) { sets.push(`category_key = $${n++}`); vals.push(body.category_key); }
			if (body.categoryLabel !== undefined) { sets.push(`category_label = $${n++}`); vals.push(body.categoryLabel); }
			if (body.category_label !== undefined) { sets.push(`category_label = $${n++}`); vals.push(body.category_label); }
			if (body.type !== undefined) { sets.push(`type = $${n++}`); vals.push(body.type); }
			if (body.color !== undefined) { sets.push(`color = $${n++}`); vals.push(body.color); }
			if (sets.length) {
				vals.push(id);
				await db(`UPDATE tenant_finance_categories SET ${sets.join(', ')} WHERE tenant_id = 1 AND id = $${n}`, vals);
			}
			return json({ ok: true });
		}

		const reMatch = route.match(/^receipt-extractions\/(\d+)$/);
		if (reMatch && method === 'PUT') {
			const id = parseInt(reMatch[1]);
			if (isNaN(id)) return json({ error: 'Invalid ID' }, { status: 400 });
			const sets: string[] = [];
			const vals: unknown[] = [];
			let n = 1;
			if (body.status !== undefined) { sets.push(`status = $${n++}`); vals.push(body.status); }
			if (body.orderId !== undefined) { sets.push(`order_id = $${n++}`); vals.push(body.orderId ? Number(body.orderId) : null); }
			if (body.order_id !== undefined) { sets.push(`order_id = $${n++}`); vals.push(body.order_id ? Number(body.order_id) : null); }
			if (body.extractedData !== undefined) { 
				sets.push(`extracted_data = $${n++}`); 
				vals.push(typeof body.extractedData === 'string' ? body.extractedData : JSON.stringify(body.extractedData)); 
			}
			if (body.extracted_data !== undefined) { 
				sets.push(`extracted_data = $${n++}`); 
				vals.push(typeof body.extracted_data === 'string' ? body.extracted_data : JSON.stringify(body.extracted_data)); 
			}
			if (sets.length) {
				vals.push(id);
				await db(`UPDATE receipt_extractions SET ${sets.join(', ')} WHERE tenant_id = 1 AND id = $${n}`, vals);
			}
			return json({ ok: true });
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

		const bfMatch = route.match(/^bot-flow\/(\d+)$/);
		if (bfMatch && method === 'PUT') {
			const stepId = parseInt(bfMatch[1]);
			if (isNaN(stepId)) return json({ error: 'Invalid step ID' }, { status: 400 });
			
			const sets: string[] = [];
			const vals: unknown[] = [];
			let n = 1;
			const fieldMap: Record<string, string> = {
				stepKey: 'step_key', step_key: 'step_key',
				stepLabel: 'step_label', step_label: 'step_label',
				stepType: 'step_type', step_type: 'step_type',
				promptMessage: 'prompt_message', prompt_message: 'prompt_message',
				nextStep: 'next_step', next_step: 'next_step',
				inputVariable: 'input_variable', input_variable: 'input_variable',
				sortOrder: 'sort_order', sort_order: 'sort_order',
				buttonChoices: 'button_choices', button_choices: 'button_choices'
			};
			
			for (const [bodyKey, dbCol] of Object.entries(fieldMap)) {
				if (body[bodyKey] !== undefined) {
					sets.push(`${dbCol} = $${n++}`);
					vals.push(dbCol === 'button_choices' ? (typeof body[bodyKey] === 'string' ? body[bodyKey] : JSON.stringify(body[bodyKey])) : body[bodyKey]);
				}
			}
			
			if (sets.length) {
				vals.push(stepId);
				await db(`UPDATE bot_flow_steps SET ${sets.join(', ')} WHERE tenant_id = 1 AND id = $${n}`, vals);
			}
			return json({ ok: true });
		}

		const cfMatch = route.match(/^custom-fields\/(\d+)$/);
		if (cfMatch && method === 'PUT') {
			const id = parseInt(cfMatch[1]);
			if (isNaN(id)) return json({ error: 'Invalid ID' }, { status: 400 });
			
			const sets: string[] = [];
			const vals: unknown[] = [];
			let n = 1;
			
			if (body.field_key !== undefined) { sets.push(`field_key = $${n++}`); vals.push(body.field_key); }
			if (body.field_label !== undefined) { sets.push(`field_label = $${n++}`); vals.push(body.field_label); }
			if (body.field_type !== undefined) { sets.push(`field_type = $${n++}`); vals.push(body.field_type); }
			if (body.field_options !== undefined) { 
				sets.push(`field_options = $${n++}`); 
				vals.push(typeof body.field_options === 'string' ? body.field_options : JSON.stringify(body.field_options)); 
			}
			if (body.sort_order !== undefined) { sets.push(`sort_order = $${n++}`); vals.push(Number(body.sort_order)); }
			
			if (sets.length) {
				vals.push(id);
				await db(`UPDATE tenant_custom_fields SET ${sets.join(', ')} WHERE tenant_id = 1 AND id = $${n}`, vals);
			}
			return json({ ok: true });
		}

		const faqMatch = route.match(/^faqs\/(\d+)$/);
		if (faqMatch && method === 'PUT') {
			const id = parseInt(faqMatch[1]);
			if (isNaN(id)) return json({ error: 'Invalid ID' }, { status: 400 });
			const sets: string[] = [];
			const vals: unknown[] = [];
			let n = 1;
			if (body.question !== undefined) { sets.push(`question = $${n++}`); vals.push(body.question); }
			if (body.answer !== undefined) { sets.push(`answer = $${n++}`); vals.push(body.answer); }
			if (body.keywords !== undefined) { sets.push(`keywords = $${n++}`); vals.push(body.keywords); }
			if (body.category !== undefined) { sets.push(`category = $${n++}`); vals.push(body.category); }
			if (body.sort_order !== undefined) { sets.push(`sort_order = $${n++}`); vals.push(Number(body.sort_order)); }
			if (sets.length) {
				vals.push(id);
				await db(`UPDATE faqs SET ${sets.join(', ')} WHERE tenant_id = 1 AND id = $${n}`, vals);
			}
			return json({ ok: true });
		}

		const qrMatch = route.match(/^quick-replies\/(\d+)$/);
		if (qrMatch && method === 'PUT') {
			const id = parseInt(qrMatch[1]);
			if (isNaN(id)) return json({ error: 'Invalid ID' }, { status: 400 });
			const sets: string[] = [];
			const vals: unknown[] = [];
			let n = 1;
			if (body.label !== undefined) { sets.push(`label = $${n++}`); vals.push(body.label); }
			if (body.message !== undefined) { sets.push(`message = $${n++}`); vals.push(body.message); }
			if (body.sort_order !== undefined) { sets.push(`sort_order = $${n++}`); vals.push(Number(body.sort_order)); }
			if (sets.length) {
				vals.push(id);
				await db(`UPDATE quick_replies SET ${sets.join(', ')} WHERE tenant_id = 1 AND id = $${n}`, vals);
			}
			return json({ ok: true });
		}

		const autMatch = route.match(/^automations\/(\d+)$/);
		if (autMatch && method === 'PUT') {
			const id = parseInt(autMatch[1]);
			if (isNaN(id)) return json({ error: 'Invalid ID' }, { status: 400 });
			const sets: string[] = [];
			const vals: unknown[] = [];
			let n = 1;
			if (body.name !== undefined) { sets.push(`name = $${n++}`); vals.push(body.name); }
			if (body.trigger_type !== undefined) { sets.push(`trigger_type = $${n++}`); vals.push(body.trigger_type); }
			if (body.trigger_value !== undefined) { sets.push(`trigger_value = $${n++}`); vals.push(body.trigger_value); }
			if (body.steps !== undefined) { 
				sets.push(`steps = $${n++}`); 
				vals.push(typeof body.steps === 'string' ? body.steps : JSON.stringify(body.steps)); 
			}
			if (body.is_active !== undefined) { sets.push(`is_active = $${n++}`); vals.push(!!body.is_active); }
			if (sets.length) {
				vals.push(id);
				await db(`UPDATE automations SET ${sets.join(', ')} WHERE tenant_id = 1 AND id = $${n}`, vals);
			}
			return json({ ok: true });
		}

		const tagMatch = route.match(/^tags\/(\d+)$/);
		if (tagMatch && method === 'PUT') {
			const id = parseInt(tagMatch[1]);
			if (isNaN(id)) return json({ error: 'Invalid ID' }, { status: 400 });
			const sets: string[] = [];
			const vals: unknown[] = [];
			let n = 1;
			if (body.tagKey !== undefined) { sets.push(`tag_key = $${n++}`); vals.push(body.tagKey); }
			if (body.tag_key !== undefined) { sets.push(`tag_key = $${n++}`); vals.push(body.tag_key); }
			if (body.tagLabel !== undefined) { sets.push(`tag_label = $${n++}`); vals.push(body.tagLabel); }
			if (body.tag_label !== undefined) { sets.push(`tag_label = $${n++}`); vals.push(body.tag_label); }
			if (body.color !== undefined) { sets.push(`color = $${n++}`); vals.push(body.color); }
			if (sets.length) {
				vals.push(id);
				await db(`UPDATE tenant_tags SET ${sets.join(', ')} WHERE tenant_id = 1 AND id = $${n}`, vals);
			}
			return json({ ok: true });
		}

		const finMatch = route.match(/^finance\/(\d+)$/);
		if (finMatch && method === 'PUT') {
			const id = parseInt(finMatch[1]);
			if (isNaN(id)) return json({ error: 'Invalid ID' }, { status: 400 });
			const sets: string[] = [];
			const vals: unknown[] = [];
			let n = 1;
			if (body.date !== undefined) { sets.push(`date = $${n++}`); vals.push(body.date); }
			if (body.description !== undefined) { sets.push(`description = $${n++}`); vals.push(body.description); }
			if (body.category !== undefined) { sets.push(`category = $${n++}`); vals.push(body.category); }
			if (body.amount !== undefined) {
				const amount = Number(body.amount);
				if (isNaN(amount) || amount < 0) {
					return json({ error: 'Invalid amount' }, { status: 400 });
				}
				sets.push(`amount = $${n++}`);
				vals.push(amount);
			}
			if (body.type !== undefined) {
				if (body.type !== 'income' && body.type !== 'expense') {
					return json({ error: 'Invalid type' }, { status: 400 });
				}
				sets.push(`type = $${n++}`);
				vals.push(body.type);
			}
			if (sets.length) {
				vals.push(id);
				await db(`UPDATE ledger_entries SET ${sets.join(', ')} WHERE tenant_id = 1 AND id = $${n}`, vals);
			}
			return json({ ok: true });
		}

		const medMatch = route.match(/^media\/(\d+)$/);
		if (medMatch && method === 'PUT') {
			const id = parseInt(medMatch[1]);
			if (isNaN(id)) return json({ error: 'Invalid ID' }, { status: 400 });
			const sets: string[] = [];
			const vals: unknown[] = [];
			let n = 1;
			if (body.category !== undefined) { sets.push(`category = $${n++}`); vals.push(body.category); }
			if (body.filename !== undefined) { sets.push(`filename = $${n++}`); vals.push(body.filename); }
			if (body.url !== undefined) { sets.push(`url = $${n++}`); vals.push(body.url); }
			if (sets.length) {
				vals.push(id);
				await db(`UPDATE media_assets SET ${sets.join(', ')} WHERE tenant_id = 1 AND id = $${n}`, vals);
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
				case 'receipt-extract': {
					const { imageUrl, mediaUrl } = body;
					const url = String(imageUrl || mediaUrl || '');

					if (!url) {
						return json({ error: 'No image URL provided' }, { status: 400 });
					}

					// Extract data using AI
					const extracted = await extractReceiptData(url);

					if (!extracted) {
						return json({ error: 'Failed to extract receipt data' }, { status: 500 });
					}

					// Save extraction record
					const extractions = await db(
						`INSERT INTO receipt_extractions (tenant_id, media_url, extracted_data, status) 
						 VALUES ($1, $2, $3, $4) 
						 RETURNING *`,
						[1, url, JSON.stringify(extracted), 'extracted']
					);

					const extraction = extractions[0];

					// Create order from extracted data
					const customerName = String(extracted.customer_name || 'Receipt Customer');
					const totalAmount = Number(extracted.total_amount) || 0;
					const customFields = extracted;

					const orders = await db(
						`INSERT INTO orders (tenant_id, customer_name, amount, status, payment_status, custom_fields, notes) 
						 VALUES ($1, $2, $3, $4, $5, $6, $7) 
						 RETURNING *`,
						[1, customerName, totalAmount, 'new', extracted.payment_method ? 'paid' : 'pending', JSON.stringify(customFields), 'Extracted from receipt']
					);

					const order = orders[0];

					// Link extraction to order
					await db(
						`UPDATE receipt_extractions SET order_id = $1, status = $2 WHERE id = $3`,
						[order.id, 'confirmed', extraction.id]
					);

					return json({ 
						ok: true, 
						extraction, 
						order,
						message: 'Receipt extracted and order created successfully' 
					});
				}
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
