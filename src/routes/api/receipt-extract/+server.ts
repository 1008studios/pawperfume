import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/db';
import { extractReceiptData } from '$lib/bot-engine';

export const POST: RequestHandler = async ({ request }) => {
	const db = await getDb();
	if (!db) return json({ error: 'Database not connected' }, { status: 500 });

	try {
		const body = await request.json();
		const { imageUrl, mediaUrl } = body;
		const url = imageUrl || mediaUrl;

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

	} catch (err) {
		console.error('Receipt extraction error:', err);
		return json({ error: (err as Error).message }, { status: 500 });
	}
};
