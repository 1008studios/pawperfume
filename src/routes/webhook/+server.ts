import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/db';
import { processIncomingMessage } from '$lib/bot-engine';
import { createHmac } from 'crypto';

// Rate limiter for webhook
const webhookRateLimit = new Map<string, { count: number; resetAt: number }>();

function checkWebhookRateLimit(senderId: string): boolean {
	const limit = 30; // 30 messages per minute per sender
	const windowMs = 60000;
	const now = Date.now();
	const key = `webhook:${senderId}`;
	const entry = webhookRateLimit.get(key);
	
	if (!entry || now > entry.resetAt) {
		webhookRateLimit.set(key, { count: 1, resetAt: now + windowMs });
		return true;
	}
	
	if (entry.count >= limit) return false;
	entry.count++;
	return true;
}

/**
 * Validate Facebook App Secret signature
 * https://developers.facebook.com/docs/graph-api/webhooks/getting-started#security
 */
function validateFacebookSignature(payload: string, signature: string | null): boolean {
	const appSecret = process.env.FB_APP_SECRET;
	if (!appSecret) {
		console.warn('FB_APP_SECRET not configured - skipping signature validation');
		return true; // Allow in development, but warn
	}
	
	if (!signature) {
		console.error('No X-Hub-Signature-256 header');
		return false;
	}
	
	// signature format: sha256=xxxxx
	const [algo, receivedHash] = signature.split('=');
	if (algo !== 'sha256' || !receivedHash) {
		console.error('Invalid signature format');
		return false;
	}
	
	const expectedHash = createHmac('sha256', appSecret)
		.update(payload)
		.digest('hex');
	
	// Timing-safe comparison to prevent timing attacks
	if (receivedHash.length !== expectedHash.length) return false;
	
	let result = 0;
	for (let i = 0; i < receivedHash.length; i++) {
		result |= receivedHash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
	}
	
	return result === 0;
}

// GET: Facebook webhook verification
export const GET: RequestHandler = async ({ url }) => {
	const mode = url.searchParams.get('hub.mode');
	const token = url.searchParams.get('hub.verify_token');
	const challenge = url.searchParams.get('hub.challenge');
	
	if (mode === 'subscribe' && token === process.env.FB_VERIFY_TOKEN) {
		console.log('Webhook verified successfully');
		return new Response(challenge || '', {
			headers: { 'Content-Type': 'text/plain' }
		});
	}
	
	console.warn('Webhook verification failed:', { mode, tokenMatch: token === process.env.FB_VERIFY_TOKEN });
	return new Response('Forbidden', { status: 403 });
};

// POST: Facebook webhook messages
export const POST: RequestHandler = async ({ request }) => {
	// Get raw body for signature validation
	const rawBody = await request.text();
	
	// Validate Facebook signature
	const signature = request.headers.get('x-hub-signature-256');
	if (!validateFacebookSignature(rawBody, signature)) {
		console.error('Invalid webhook signature');
		return new Response('Unauthorized', { status: 401 });
	}
	
	try {
		const data = JSON.parse(rawBody);
		if (!data?.entry) return new Response('EVENT_RECEIVED');

		const db = await getDb();
		if (!db) return new Response('EVENT_RECEIVED');

		for (const entry of data.entry) {
			for (const ev of entry.messaging || []) {
				const senderId = ev.sender?.id;
				if (!senderId) continue;
				
				// Rate limit per sender
				if (!checkWebhookRateLimit(senderId)) {
					console.warn(`Rate limited sender: ${senderId}`);
					continue;
				}

				// Get or create conversation - FIX: Parameterized query
				let convs = await db(
					'SELECT * FROM conversations WHERE tenant_id = $1 AND sender_id = $2',
					[1, senderId]
				);
				
				if (!convs.length) {
					convs = await db(
						'INSERT INTO conversations (tenant_id, sender_id) VALUES ($1, $2) RETURNING *',
						[1, senderId]
					);
				}
				const conv = convs[0];

				// Handle text messages
				if (ev.message?.text) {
					// Validate message length (Facebook limit is 2000 chars)
					const messageText = String(ev.message.text).slice(0, 2000);
					
					await db(
						'INSERT INTO messages (tenant_id, conversation_id, sender_type, content) VALUES ($1, $2, $3, $4)',
						[1, conv.id, 'customer', messageText]
					);
					await db(
						'UPDATE conversations SET updated_at = NOW(), last_activity_at = NOW() WHERE id = $1',
						[conv.id]
					);

					// Process with bot engine
					if (conv.is_bot_enabled) {
						try {
							await processIncomingMessage(db, conv, messageText, senderId);
						} catch (botError) {
							console.error('Bot engine error:', botError);
							// Don't fail the webhook - just log the error
						}
					}
				}

				// Handle postbacks
				if (ev.postback?.payload === 'GET_STARTED') {
					try {
						await processIncomingMessage(db, conv, 'GET_STARTED', senderId);
					} catch (err) {
						console.error('Postback handling error:', err);
					}
				}

				// Handle image attachments (for receipt extraction)
				if (ev.message?.attachments) {
					for (const att of ev.message.attachments) {
						if (att.type === 'image' && att.payload?.url) {
							// Validate URL format
							try {
								new URL(att.payload.url);
							} catch {
								console.error('Invalid attachment URL');
								continue;
							}
							
							await db(
								`INSERT INTO messages (tenant_id, conversation_id, sender_type, message_type, media_url) 
								 VALUES ($1, $2, $3, $4, $5)`,
								[1, conv.id, 'customer', 'image', att.payload.url]
							);
							await db(
								'UPDATE conversations SET updated_at = NOW(), last_activity_at = NOW() WHERE id = $1',
								[conv.id]
							);
						}
					}
				}
			}
		}
	} catch (err) {
		console.error('Webhook error:', err);
		// Still return 200 to prevent Facebook retries
	}

	return new Response('EVENT_RECEIVED');
};
