import { handleAdmin } from './admin-handler-secure';
import { getDb } from './db';

// Mock environment variables
process.env.DATABASE_URL = 'postgres://mock_user:mock_pass@mock_host/mock_db';
process.env.ADMIN_PASSWORD = ''; // No password for easy testing

// Intercept database calls
const originalFetch = globalThis.fetch;
let lastInterceptedQuery: any = null;

globalThis.fetch = async (input, init) => {
	const url = typeof input === 'string' ? input : (input as Request).url;
	if (url.includes('/sql')) {
		if (init && init.body) {
			const body = JSON.parse(init.body as string);
			lastInterceptedQuery = {
				query: body.query.trim().replace(/\s+/g, ' '),
				params: body.params
			};
		}
		// Return a mock row
		return new Response(JSON.stringify({
			rows: [{ id: 1, tenant_id: 1, name: 'Mock Record' }]
		}), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	}
	return originalFetch(input, init);
};

async function runTest() {
	// Initialize DB first to clear out the SELECT 1 health check query
	await getDb();
	
	const endpoints = [
		// Known SvelteKit GET/POST cases that might catch PUT mistakenly
		{ name: 'conversations', path: '/api/admin/conversations', body: { status: 'closed' } },
		{ name: 'conversations/1', path: '/api/admin/conversations/1', body: { status: 'closed' } },
		{ name: 'messages/1', path: '/api/admin/messages/1', body: { content: 'Updated' } },
		{ name: 'finance', path: '/api/admin/finance', body: { amount: 100 } },
		{ name: 'finance/1', path: '/api/admin/finance/1', body: { amount: 100 } },
		{ name: 'media', path: '/api/admin/media', body: { filename: 'test.jpg' } },
		{ name: 'media/1', path: '/api/admin/media/1', body: { filename: 'test.jpg' } },
		{ name: 'order-statuses', path: '/api/admin/order-statuses', body: { status_label: 'Pending' } },
		{ name: 'order-statuses/1', path: '/api/admin/order-statuses/1', body: { status_label: 'Pending' } },
		{ name: 'finance-categories', path: '/api/admin/finance-categories', body: { category_label: 'Refund' } },
		{ name: 'finance-categories/1', path: '/api/admin/finance-categories/1', body: { category_label: 'Refund' } },
		{ name: 'receipt-extractions', path: '/api/admin/receipt-extractions', body: { status: 'processed' } },
		{ name: 'receipt-extractions/1', path: '/api/admin/receipt-extractions/1', body: { status: 'processed' } },

		// Real intended PUT endpoints
		{ name: 'orders/1', path: '/api/admin/orders/1', body: { customer_name: 'Test Customer' } },
		{ name: 'tenants', path: '/api/admin/tenants', body: { brand_name: 'Test Brand' } },
		{ name: 'column-configs/1', path: '/api/admin/column-configs/1', body: { column_label: 'Test Col' } },
		{ name: 'bot-flow/1', path: '/api/admin/bot-flow/1', body: { stepLabel: 'Test Flow Step' } },
		{ name: 'custom-fields/1', path: '/api/admin/custom-fields/1', body: { field_label: 'Test Field' } },
		{ name: 'faqs/1', path: '/api/admin/faqs/1', body: { question: 'Test Q' } },
		{ name: 'quick-replies/1', path: '/api/admin/quick-replies/1', body: { label: 'Test QR' } },
		{ name: 'automations/1', path: '/api/admin/automations/1', body: { name: 'Test Auto' } },
		{ name: 'tags/1', path: '/api/admin/tags/1', body: { tagLabel: 'Test Tag' } },
	];

	console.log('--- STARTING PUT API ENDPOINTS VERIFICATION ---');
	console.log('Evaluating queries executed for each PUT request:\n');

	for (const ep of endpoints) {
		lastInterceptedQuery = null;
		try {
			const headers = new Headers();
			headers.set('content-type', 'application/json');
			
			const req = new Request(`http://localhost${ep.path}`, {
				method: 'PUT',
				headers: headers,
				body: JSON.stringify(ep.body)
			});

			const res = await handleAdmin(ep.path, 'PUT', req, headers);
			const status = res.status;
			const data = await res.json() as any;

			console.log(`Endpoint: PUT ${ep.path}`);
			if (status === 404) {
				console.log(`Result:   ❌ Route not found (404)`);
			} else {
				console.log(`Result:   HTTP status ${status}`);
				if (lastInterceptedQuery) {
					console.log(`SQL Sent: ${lastInterceptedQuery.query}`);
					console.log(`Params:   ${JSON.stringify(lastInterceptedQuery.params)}`);
					
					if (lastInterceptedQuery.query.startsWith('UPDATE')) {
						console.log(`Analysis: ✅ CORRECT (Triggers UPDATE statement)`);
					} else if (lastInterceptedQuery.query.startsWith('SELECT')) {
						console.log(`Analysis: ⚠️ BUG! (Leaks GET logic; triggers SELECT statement)`);
					} else if (lastInterceptedQuery.query.startsWith('INSERT')) {
						console.log(`Analysis: ⚠️ BUG! (Leaks POST logic; triggers INSERT statement)`);
					} else {
						console.log(`Analysis: ℹ️ Other query: ${lastInterceptedQuery.query}`);
					}
				} else {
					console.log(`SQL Sent: None`);
					console.log(`Response: ${JSON.stringify(data)}`);
				}
			}
			console.log('------------------------------------------------');
		} catch (e) {
			console.log(`Endpoint: PUT ${ep.path}`);
			console.log(`Result:   💥 ERROR: ${(e as Error).message}`);
			console.log('------------------------------------------------');
		}
	}
}

runTest();
