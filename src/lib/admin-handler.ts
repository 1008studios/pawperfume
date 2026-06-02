import { getDb } from '$lib/db';
import { isAuthenticated, readBody, getAdminPassword } from '$lib/auth';
import { json } from '@sveltejs/kit';

export async function handleAdmin(path: string, method: string, request: Request, headers: Headers) {
	const db = await getDb();
	if (!db) return json({ error: 'Database not connected' }, { status: 500 });

	const route = path.replace('/api/admin', '').replace(/\/$/, '').replace(/^\//, '');
	let body: Record<string, unknown> = {};
	if (['POST', 'PUT'].includes(method)) {
		try { body = await request.json(); } catch {}
	}

	const pass = getAdminPassword();
	if (pass && !['login', 'status', 'tenant-config'].includes(route)) {
		const token = (headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
		if (token !== pass) return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const e = (s: unknown) => String(s || '').replace(/'/g, "''");

		switch (route) {
			case 'login':
				return body.password === pass
					? json({ ok: true, token: pass })
					: json({ error: 'Invalid password' }, { status: 401 });

			case 'status':
				return json({ ok: true, db: !!db, version: '3.0' });

			case 'send-message': {
				if (method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });
				const fbToken = process.env.FB_PAGE_ACCESS_TOKEN;
				if (!fbToken) return json({ error: 'FB_PAGE_ACCESS_TOKEN not set' }, { status: 500 });
				const fbResp = await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${fbToken}`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ recipient: { id: body.senderId }, message: { text: body.text }, messaging_type: 'RESPONSE' })
				});
				const fbData = await fbResp.json() as { error?: { message: string }; message_id?: string };
				if (fbData.error) return json({ error: fbData.error.message }, { status: 400 });
				await db(`INSERT INTO messages (tenant_id,conversation_id,sender_type,content) VALUES (1,(SELECT id FROM conversations WHERE sender_id='${e(body.senderId)}' LIMIT 1),'bot','${e(body.text)}')`);
				return json({ ok: true, fb_id: fbData.message_id });
			}

			case 'tenant-config':
				return json((await db("SELECT * FROM tenants WHERE slug='default'"))[0] || {});

			case 'conversations':
				return json({
					conversations: await db('SELECT * FROM conversations WHERE tenant_id=1 ORDER BY updated_at DESC LIMIT 50'),
					total: ((await db('SELECT COUNT(*)::int as c FROM conversations WHERE tenant_id=1'))[0] as Record<string, number> || {}).c || 0
				});

			case 'orders': {
				if (method === 'POST') break;
				const orders = await db('SELECT * FROM orders WHERE tenant_id=1 ORDER BY updated_at DESC LIMIT 50');
				const custom_fields = await db('SELECT * FROM tenant_custom_fields WHERE tenant_id=1 ORDER BY sort_order');
				const order_statuses = await db('SELECT * FROM tenant_order_statuses WHERE tenant_id=1 ORDER BY sort_order');
				const column_configs = await db("SELECT * FROM column_configs WHERE tenant_id=1 AND table_name='orders' ORDER BY sort_order");
				return json({ orders, custom_fields, order_statuses, column_configs });
			}

			case 'automations':
				if (method === 'POST') break;
				return json(await db('SELECT * FROM automations WHERE tenant_id=1'));
			case 'finance':
				if (method === 'POST') break;
				return json(await db('SELECT * FROM ledger_entries WHERE tenant_id=1 ORDER BY date DESC LIMIT 50'));
			case 'faqs':
				if (method === 'POST') break;
				return json(await db('SELECT * FROM faqs WHERE tenant_id=1 ORDER BY sort_order'));
			case 'quick-replies':
				if (method === 'POST') break;
				return json(await db('SELECT * FROM quick_replies WHERE tenant_id=1 ORDER BY sort_order'));
			case 'custom-fields':
				if (method === 'POST') break;
				return json(await db('SELECT * FROM tenant_custom_fields WHERE tenant_id=1 ORDER BY sort_order'));
			case 'tags':
				if (method === 'POST') break;
				return json(await db('SELECT * FROM tenant_tags WHERE tenant_id=1 ORDER BY tag_label'));
			case 'media':
				if (method === 'POST') break;
				return json(await db('SELECT * FROM media_assets WHERE tenant_id=1'));
			case 'bot-flow':
				if (method === 'POST') break;
				return json(await db('SELECT * FROM bot_flow_steps WHERE tenant_id=1 ORDER BY sort_order'));
			case 'column-configs':
				if (method === 'POST') break;
				return json(await db(`SELECT * FROM column_configs WHERE tenant_id=1 AND table_name='${e(body.tableName || 'orders')}' ORDER BY sort_order`));
			case 'finance-categories':
				if (method === 'POST') break;
				return json(await db('SELECT * FROM tenant_finance_categories WHERE tenant_id=1'));
			case 'order-statuses':
				if (method === 'POST') break;
				return json(await db('SELECT * FROM tenant_order_statuses WHERE tenant_id=1 ORDER BY sort_order'));
			case 'receipt-extractions':
				return json(await db('SELECT * FROM receipt_extractions WHERE tenant_id=1 ORDER BY created_at DESC LIMIT 20'));
		}

		// Pattern routes
		const mm = route.match(/^messages\/(\d+)$/);
		if (mm) return json({ messages: await db(`SELECT * FROM messages WHERE tenant_id=1 AND conversation_id=${mm[1]} ORDER BY created_at ASC LIMIT 100`) });

		const cc = route.match(/^conversations\/(\d+)$/);
		if (cc) return json((await db(`SELECT * FROM conversations WHERE tenant_id=1 AND id=${cc[1]}`))[0] || {});

		// PUT routes
		const oo = route.match(/^orders\/(\d+)$/);
		if (oo && method === 'PUT') {
			const sets: string[] = [];
			const vals: unknown[] = [];
			let n = 1;
			if (body.customer_name !== undefined) { sets.push(`customer_name=$${n++}`); vals.push(body.customer_name); }
			if (body.status !== undefined) { sets.push(`status=$${n++}`); vals.push(body.status); }
			if (body.amount !== undefined) { sets.push(`amount=$${n++}`); vals.push(body.amount); }
			if (body.payment_status !== undefined) { sets.push(`payment_status=$${n++}`); vals.push(body.payment_status); }
			if (body.custom_fields !== undefined) { sets.push(`custom_fields=$${n++}`); vals.push(JSON.stringify(body.custom_fields)); }
			if (body.notes !== undefined) { sets.push(`notes=$${n++}`); vals.push(body.notes); }
			if (sets.length) {
				sets.push('updated_at=NOW()');
				await db(`UPDATE orders SET ${sets.join(',')} WHERE tenant_id=1 AND id=${oo[1]}`, vals);
			}
			return json({ ok: true });
		}

		if (route === 'tenants' && method === 'PUT') {
			const sets: string[] = [];
			const vals: unknown[] = [];
			let n = 1;
			['brand_name', 'brand_tagline', 'brand_welcome_message', 'brand_favicon_emoji', 'brand_primary_color', 'brand_accent_color', 'ai_system_prompt', 'ai_language', 'ai_tone', 'ai_enabled'].forEach(k => {
				if (body[k] !== undefined) { sets.push(`${k}=$${n++}`); vals.push(body[k]); }
			});
			if (sets.length) {
				sets.push('updated_at=NOW()');
				await db(`UPDATE tenants SET ${sets.join(',')} WHERE id=1`, vals);
			}
			return json({ ok: true });
		}

		if (route.match(/^column-configs\/(\d+)$/) && method === 'PUT') {
			const id = route.match(/^column-configs\/(\d+)$/)?.[1];
			const sets: string[] = [];
			const vals: unknown[] = [];
			let n = 1;
			if (body.column_label !== undefined) { sets.push(`column_label=$${n++}`); vals.push(body.column_label); }
			if (body.is_visible !== undefined) { sets.push(`is_visible=$${n++}`); vals.push(body.is_visible); }
			if (body.sort_order !== undefined) { sets.push(`sort_order=$${n++}`); vals.push(body.sort_order); }
			if (body.width !== undefined) { sets.push(`width=$${n++}`); vals.push(body.width); }
			if (sets.length) await db(`UPDATE column_configs SET ${sets.join(',')} WHERE tenant_id=1 AND id=${id}`, vals);
			return json({ ok: true });
		}

		const bf = route.match(/^bot-flow\/(\d+)$/);
		if (bf && method === 'PUT') {
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
					sets.push(`${dbCol}=$${n++}`);
					vals.push(dbCol === 'button_choices' ? JSON.stringify(body[bodyKey]) : body[bodyKey]);
				}
			}
			if (sets.length) {
				await db(`UPDATE bot_flow_steps SET ${sets.join(',')} WHERE tenant_id=1 AND id=${bf[1]}`, vals);
			}
			return json({ ok: true });
		}

		// POST routes
		if (method === 'POST') {
			switch (route) {
				case 'faqs':
					await db(`INSERT INTO faqs (tenant_id,question,answer,keywords,category) VALUES (1,'${e(body.question)}','${e(body.answer)}','${e(body.keywords)}','${e(body.category || 'general')}')`);
					break;
				case 'quick-replies':
					await db(`INSERT INTO quick_replies (tenant_id,label,message) VALUES (1,'${e(body.label)}','${e(body.message)}')`);
					break;
				case 'automations':
					await db(`INSERT INTO automations (tenant_id,name,trigger_type,trigger_value,steps) VALUES (1,'${e(body.name)}','${e(body.trigger_type)}','${e(body.trigger_value)}','${e(JSON.stringify(body.steps || []))}')`);
					break;
				case 'custom-fields':
					await db(`INSERT INTO tenant_custom_fields (tenant_id,field_key,field_label,field_type,field_options,apply_to,sort_order) VALUES (1,'${e(body.fieldKey)}','${e(body.fieldLabel)}','${e(body.fieldType || 'text')}','${e(JSON.stringify(body.fieldOptions || []))}','${e(body.applyTo || 'orders')}',${Number(body.sortOrder) || 0})`);
					break;
				case 'tags':
					await db(`INSERT INTO tenant_tags (tenant_id,tag_key,tag_label,color) VALUES (1,'${e(body.tagKey)}','${e(body.tagLabel)}','${e(body.color || '#8b5cf6')}')`);
					break;
				case 'media':
					await db(`INSERT INTO media_assets (tenant_id,category,filename,url) VALUES (1,'${e(body.category || 'general')}','${e(body.filename || '')}','${e(body.url)}')`);
					break;
				case 'finance':
					await db(`INSERT INTO ledger_entries (tenant_id,date,description,category,amount,type) VALUES (1,'${e(body.date || new Date().toISOString().split('T')[0])}','${e(body.description)}','${e(body.category)}',${Number(body.amount) || 0},'${e(body.type || 'expense')}')`);
					break;
				case 'orders': {
					const cf = body.custom_fields ? `'${e(JSON.stringify(body.custom_fields))}'` : "'{}'";
					await db(`INSERT INTO orders (tenant_id,customer_name,amount,status,payment_status,custom_fields,notes) VALUES (1,'${e(body.customerName || '')}',${Number(body.amount) || 0},'${e(body.status || 'new')}','${e(body.paymentStatus || 'pending')}',${cf},'${e(body.notes || '')}')`);
					break;
				}
				case 'bot-flow':
					await db(`INSERT INTO bot_flow_steps (tenant_id,step_key,step_label,step_type,prompt_message,button_choices,next_step,input_variable,sort_order) VALUES (1,'${e(body.stepKey)}','${e(body.stepLabel)}','${e(body.stepType || 'text_input')}','${e(body.promptMessage || '')}','${e(JSON.stringify(body.buttonChoices || []))}','${e(body.nextStep || '')}','${e(body.inputVariable || '')}',${Number(body.sortOrder) || 99})`);
					break;
				case 'column-configs':
					await db(`INSERT INTO column_configs (tenant_id,table_name,column_key,column_label,is_visible,sort_order,width) VALUES (1,'${e(body.tableName)}','${e(body.columnKey)}','${e(body.columnLabel)}',true,${Number(body.sortOrder) || 0},${Number(body.width) || null})`);
					break;
				case 'order-statuses':
					await db(`INSERT INTO tenant_order_statuses (tenant_id,status_key,status_label,color,sort_order) VALUES (1,'${e(body.statusKey)}','${e(body.statusLabel)}','${e(body.color || '#4d8ef7')}',${Number(body.sortOrder) || 0})`);
					break;
				case 'finance-categories':
					await db(`INSERT INTO tenant_finance_categories (tenant_id,category_key,category_label,type,color) VALUES (1,'${e(body.categoryKey)}','${e(body.categoryLabel)}','${e(body.type || 'expense')}','${e(body.color || '#8b90a0')}')`);
					break;
				case 'receipt-extract':
					return json({ ok: true, message: 'Receipt extraction endpoint - implemented in Phase 4' });
				case 'test-bot': {
					const tenant = (await db("SELECT * FROM tenants WHERE id=1"))[0];
					const systemPrompt = String(tenant?.ai_system_prompt || 'You are a helpful assistant for a perfume business.');
					const language = String(tenant?.ai_language || 'en');
					const openRouterKey = process.env.OPENROUTER_API_KEY;
					if (!openRouterKey) return json({ reply: 'AI not configured (no OPENROUTER_API_KEY)' });
					const langInstruction = language === 'tl-en' ? 'Reply in Taglish (mix of Tagalog and English). Be natural and conversational.' : language === 'tl' ? 'Reply in Tagalog/Filipino.' : 'Reply in English.';
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

		// DELETE routes
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
				if (tbl) {
					await db(`DELETE FROM ${tbl} WHERE tenant_id=1 AND id=${dd[2]}`);
					return json({ ok: true });
				}
			}
		}

		return json({ error: `Route not found: ${route}` }, { status: 404 });
	} catch (e) {
		return json({ error: (e as Error).message }, { status: 500 });
	}
}
