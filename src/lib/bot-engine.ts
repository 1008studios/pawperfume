type DbFn = (query: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

interface Conversation {
	id: number;
	sender_id: string;
	is_bot_enabled: boolean;
	[key: string]: unknown;
}

// Maximum recursion depth for bot flow processing
const MAX_FLOW_DEPTH = 10;
const MAX_MESSAGE_LENGTH = 2000; // Facebook limit

async function sendFacebookMessage(senderId: string, text: string): Promise<boolean> {
	const token = process.env.FB_PAGE_ACCESS_TOKEN;
	if (!token) {
		console.error('FB_PAGE_ACCESS_TOKEN not set');
		return false;
	}
	
	// Truncate message to Facebook limit
	const truncatedText = text.slice(0, MAX_MESSAGE_LENGTH);
	
	try {
		const resp = await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${token}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ 
				recipient: { id: senderId }, 
				message: { text: truncatedText }, 
				messaging_type: 'RESPONSE' 
			})
		});
		
		if (!resp.ok) {
			const error = await resp.json() as { error?: { message: string; code: number } };
			console.error('Facebook API error:', error);
			
			// Handle specific error codes
			if (error.error?.code === 10) {
				// Rate limited by Facebook
				console.error('Rate limited by Facebook');
				return false;
			}
			if (error.error?.code === 200 || error.error?.code === 100) {
				// User not found or not subscribed
				console.error('User not reachable:', senderId);
				return false;
			}
			
			return false;
		}
		
		return true;
	} catch (err) {
		console.error('Facebook send error:', err);
		return false;
	}
}

async function saveBotMessage(db: DbFn, convId: number, content: string): Promise<void> {
	// FIX: Parameterized query
	await db(
		'INSERT INTO messages (tenant_id, conversation_id, sender_type, content) VALUES ($1, $2, $3, $4)',
		[1, convId, 'bot', content]
	);
}

async function getAiResponse(prompt: string, systemPrompt: string, language: string): Promise<string | null> {
	// Try OpenRouter first
	const openRouterKey = process.env.OPENROUTER_API_KEY;
	if (openRouterKey) {
		try {
			const langInstruction = language === 'tl-en'
				? 'Reply in Taglish (mix of Tagalog and English). Be natural and conversational, like talking to a friend.'
				: language === 'tl'
					? 'Reply in Tagalog/Filipino.'
					: 'Reply in English.';

			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

			const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${openRouterKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					model: 'deepseek/deepseek-chat',
					messages: [
						{ 
							role: 'system', 
							content: `${systemPrompt}\n\n${langInstruction}\nKeep replies short and helpful (2-3 sentences max).` 
						},
						{ role: 'user', content: prompt }
					],
					max_tokens: 300,
					temperature: 0.7
				}),
				signal: controller.signal
			});
			
			clearTimeout(timeoutId);
			
			if (!resp.ok) {
				console.error('OpenRouter API error:', resp.status);
				return null;
			}
			
			const data = await resp.json() as { 
				choices?: Array<{ message?: { content?: string } }>;
				error?: { message: string };
			};
			
			if (data.error) {
				console.error('OpenRouter error:', data.error.message);
				return null;
			}
			
			if (data.choices?.[0]?.message?.content) {
				return data.choices[0].message.content.trim();
			}
		} catch (err) {
			if ((err as Error).name === 'AbortError') {
				console.error('OpenRouter timeout');
			} else {
				console.error('OpenRouter error:', err);
			}
		}
	}

	// Fallback: try Gemini
	const geminiKey = process.env.GEMINI_API_KEY;
	if (geminiKey) {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 10000);

			const resp = await fetch(
				`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiKey}`, 
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						contents: [{ parts: [{ text: `${systemPrompt}\n\nUser: ${prompt}` }] }]
					}),
					signal: controller.signal
				}
			);
			
			clearTimeout(timeoutId);
			
			if (!resp.ok) {
				console.error('Gemini API error:', resp.status);
				return null;
			}
			
			const data = await resp.json() as Record<string, unknown>;
			const candidates = data.candidates as Array<Record<string, unknown>> | undefined;
			const content = candidates?.[0]?.content as Record<string, unknown> | undefined;
			const parts = content?.parts as Array<Record<string, unknown>> | undefined;
			const text = parts?.[0]?.text as string | undefined;
			
			if (data.error) {
				console.error('Gemini error:', (data.error as Record<string, string>)?.message);
				return null;
			}
			
			if (text) {
				return text.trim();
			}
		} catch (err) {
			if ((err as Error).name === 'AbortError') {
				console.error('Gemini timeout');
			} else {
				console.error('Gemini error:', err);
			}
		}
	}

	return null;
}

async function matchFaq(db: DbFn, message: string): Promise<string | null> {
	// FIX: Parameterized query
	const faqs = await db('SELECT * FROM faqs WHERE tenant_id = $1 ORDER BY sort_order', [1]);
	const lower = message.toLowerCase();

	for (const faq of faqs) {
		const keywords = String(faq.keywords || '').toLowerCase().split(',').map(k => k.trim()).filter(Boolean);
		const questionWords = String(faq.question || '').toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);

		const allKeywords = [...keywords, ...questionWords];
		if (allKeywords.length === 0) continue;
		
		const matchCount = allKeywords.filter(kw => lower.includes(kw)).length;

		if (matchCount > 0 && matchCount >= Math.min(2, allKeywords.length)) {
			return String(faq.answer || '');
		}
	}
	return null;
}

async function matchAutomation(db: DbFn, message: string): Promise<string | null> {
	// FIX: Parameterized query
	const automations = await db('SELECT * FROM automations WHERE tenant_id = $1 AND is_active = true', [1]);
	const lower = message.toLowerCase();

	for (const auto of automations) {
		if (auto.trigger_type === 'keyword') {
			const triggerKeywords = String(auto.trigger_value || '').toLowerCase().split(',').map(k => k.trim());
			if (triggerKeywords.some(kw => kw && lower.includes(kw))) {
				const steps = auto.steps as Array<{ message?: string }>;
				if (steps?.[0]?.message) return steps[0].message;
			}
		}
	}
	return null;
}

async function processBotFlow(
	db: DbFn, 
	conv: Conversation, 
	message: string, 
	senderId: string,
	depth: number = 0
): Promise<boolean> {
	// Prevent infinite recursion
	if (depth >= MAX_FLOW_DEPTH) {
		console.error('Bot flow exceeded max depth:', { convId: conv.id, depth });
		return false;
	}
	
	// Check if user is in an active bot flow
	const states = await db(
		'SELECT * FROM bot_flow_state WHERE conversation_id = $1',
		[conv.id]
	);
	const state = states[0];

	if (state && !state.is_complete) {
		const currentStep = String(state.current_step || '');
		
		let collectedData: Record<string, string>;
		try {
			collectedData = typeof state.collected_data === 'string' 
				? JSON.parse(state.collected_data || '{}') 
				: (state.collected_data || {}) as Record<string, string>;
		} catch (e) {
			console.error('Invalid collected_data JSON:', e);
			collectedData = {};
		}

		// Get current step definition
		const steps = await db(
			'SELECT * FROM bot_flow_steps WHERE tenant_id = $1 ORDER BY sort_order',
			[1]
		);
		const step = steps.find((s: Record<string, unknown>) => s.step_key === currentStep);

		if (step) {
			// Collect input
			if (step.input_variable) {
				collectedData[String(step.input_variable)] = message;
			}

			// Move to next step
			const nextStep = step.next_step;
			if (nextStep) {
				const nextStepDef = steps.find((s: Record<string, unknown>) => s.step_key === nextStep);
				if (nextStepDef) {
					// FIX: Parameterized query
					await db(
						'UPDATE bot_flow_state SET current_step = $1, collected_data = $2 WHERE conversation_id = $3',
						[nextStep, JSON.stringify(collectedData), conv.id]
					);
					
					const promptMsg = String(nextStepDef.prompt_message || '');
					await saveBotMessage(db, conv.id, promptMsg);
					const sent = await sendFacebookMessage(senderId, promptMsg);
					
					if (!sent) {
						console.error('Failed to send bot flow message to:', senderId);
					}

					// If next step is auto, process it immediately with incremented depth
					if (nextStepDef.step_type === 'auto') {
						return processBotFlow(db, conv, '', senderId, depth + 1);
					}
					return true;
				} else {
					console.warn('Next step not found:', nextStep);
				}
			}

			// Flow complete - create order from collected data
			await db(
				'UPDATE bot_flow_state SET is_complete = true, completed_at = NOW() WHERE conversation_id = $1',
				[conv.id]
			);

			const customerName = collectedData.customer_name || '';
			const amountMatch = collectedData.bottle_size ? String(collectedData.bottle_size).match(/\d+/) : null;
			const amount = amountMatch ? parseInt(amountMatch[0]) : 0;

			if (customerName) {
				// FIX: Parameterized query
				await db(
					`INSERT INTO orders (tenant_id, conversation_id, customer_name, amount, status, custom_fields) 
					 VALUES ($1, $2, $3, $4, $5, $6)`,
					[1, conv.id, customerName, amount, 'new', JSON.stringify(collectedData)]
				);
			}

			return true;
		}
	}

	// Check if should start bot flow
	const lowerMessage = message.toLowerCase();
	if (message === 'GET_STARTED' || lowerMessage.includes('order') || lowerMessage.includes('buy')) {
		const steps = await db(
			'SELECT * FROM bot_flow_steps WHERE tenant_id = $1 ORDER BY sort_order',
			[1]
		);
		const firstStep = steps[0];

		if (firstStep) {
			// Initialize bot flow state - FIX: Parameterized
			await db(
				`INSERT INTO bot_flow_state (conversation_id, current_step, collected_data) 
				 VALUES ($1, $2, '{}') 
				 ON CONFLICT (conversation_id) 
				 DO UPDATE SET current_step = $2, collected_data = '{}', is_complete = false, started_at = NOW()`,
				[conv.id, String(firstStep.step_key)]
			);

			const promptMsg = String(firstStep.prompt_message || '');
			await saveBotMessage(db, conv.id, promptMsg);
			await sendFacebookMessage(senderId, promptMsg);

			if (firstStep.step_type === 'auto' && firstStep.next_step) {
				return processBotFlow(db, conv, '', senderId, depth + 1);
			}
			return true;
		}
	}

	return false;
}

export async function processIncomingMessage(db: DbFn, conv: Conversation, message: string, senderId: string): Promise<void> {
	// Validate inputs
	if (!message || !senderId || !conv?.id) {
		console.error('Invalid inputs to processIncomingMessage');
		return;
	}
	
	// Truncate message
	const truncatedMessage = message.slice(0, MAX_MESSAGE_LENGTH);

	// 1. Check for automation triggers
	try {
		const autoResponse = await matchAutomation(db, truncatedMessage);
		if (autoResponse) {
			await saveBotMessage(db, conv.id, autoResponse);
			await sendFacebookMessage(senderId, autoResponse);
			return;
		}
	} catch (err) {
		console.error('Automation matching error:', err);
	}

	// 2. Check if in active bot flow
	try {
		const handledByFlow = await processBotFlow(db, conv, truncatedMessage, senderId);
		if (handledByFlow) return;
	} catch (err) {
		console.error('Bot flow error:', err);
	}

	// 3. Match FAQ
	try {
		const faqAnswer = await matchFaq(db, truncatedMessage);
		if (faqAnswer) {
			await saveBotMessage(db, conv.id, faqAnswer);
			await sendFacebookMessage(senderId, faqAnswer);
			return;
		}
	} catch (err) {
		console.error('FAQ matching error:', err);
	}

	// 4. Get AI response
	try {
		// FIX: Parameterized query
		const tenant = (await db('SELECT * FROM tenants WHERE id = $1', [1]))[0];
		
		if (tenant?.ai_enabled) {
			const systemPrompt = String(tenant.ai_system_prompt || 'You are a helpful assistant for a perfume business.');
			const language = String(tenant.ai_language || 'en');

			// Get conversation history for context - FIX: Parameterized
			const history = await db(
				'SELECT sender_type, content FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 10',
				[conv.id]
			);
			const contextMessages = history.reverse().map(m => `${m.sender_type}: ${m.content}`).join('\n');
			const fullPrompt = `Recent conversation:\n${contextMessages}\n\nLatest message: ${truncatedMessage}`;

			const aiResponse = await getAiResponse(fullPrompt, systemPrompt, language);
			if (aiResponse) {
				await saveBotMessage(db, conv.id, aiResponse);
				await sendFacebookMessage(senderId, aiResponse);
				return;
			}
		}
	} catch (err) {
		console.error('AI response error:', err);
	}

	// 5. Default fallback
	const tenant = (await db('SELECT * FROM tenants WHERE id = $1', [1]))[0];
	const welcomeMsg = String(tenant?.brand_welcome_message || 'Thanks for your message! Our team will respond shortly. 🧴');
	await saveBotMessage(db, conv.id, welcomeMsg);
	await sendFacebookMessage(senderId, welcomeMsg);
}

// Receipt extraction using Gemini Vision
export async function extractReceiptData(imageUrl: string): Promise<Record<string, unknown> | null> {
	const geminiKey = process.env.GEMINI_API_KEY;
	if (!geminiKey) {
		console.error('GEMINI_API_KEY not set');
		return null;
	}

	// Validate URL
	try {
		new URL(imageUrl);
	} catch {
		console.error('Invalid image URL');
		return null;
	}

	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout for vision

		const resp = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, 
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					contents: [{
						parts: [
							{
								text: 'Extract order information from this receipt/image. Return JSON with: customer_name, items (array of {name, quantity, price}), total_amount, payment_method, date. If you cannot read something, use null. Be concise.'
							},
							{
								inline_data: {
									mime_type: 'image/jpeg',
									data: imageUrl
								}
							}
						]
					}]
				}),
				signal: controller.signal
			}
		);
		
		clearTimeout(timeoutId);

		if (!resp.ok) {
			console.error('Gemini Vision API error:', resp.status);
			return null;
		}

		const data = await resp.json() as Record<string, unknown>;
		const rCandidates = data.candidates as Array<Record<string, unknown>> | undefined;
		const rContent = rCandidates?.[0]?.content as Record<string, unknown> | undefined;
		const rParts = rContent?.parts as Array<Record<string, unknown>> | undefined;
		const rText = rParts?.[0]?.text as string | undefined;
		
		if (data.error) {
			console.error('Gemini Vision error:', (data.error as Record<string, string>)?.message);
			return null;
		}

		if (rText) {
			const jsonMatch = rText.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				try {
					return JSON.parse(jsonMatch[0]);
				} catch (e) {
					console.error('Failed to parse receipt JSON:', e);
				}
			}
		}
	} catch (err) {
		if ((err as Error).name === 'AbortError') {
			console.error('Receipt extraction timeout');
		} else {
			console.error('Receipt extraction error:', err);
		}
	}

	return null;
}
