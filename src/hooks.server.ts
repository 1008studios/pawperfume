import type { Handle, HandleServerError } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// CORS headers for API routes
	if (event.url.pathname.startsWith('/api/')) {
		const origin = event.request.headers.get('origin') || '';
		const allowedOrigins = [
			'https://pawperfume.vercel.app',
			'https://www.pawperfume.com',
		];

		if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
			event.setHeaders({
				'Access-Control-Allow-Origin': origin || '*',
				'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization',
				'Access-Control-Max-Age': '86400',
			});
		}

		// Handle preflight
		if (event.request.method === 'OPTIONS') {
			return new Response(null, { status: 204 });
		}
	}

	// CSP headers
	event.setHeaders({
		'Content-Security-Policy':
			"default-src 'self'; " +
			"script-src 'self' 'unsafe-inline'; " +
			"style-src 'self' 'unsafe-inline' https://rsms.me; " +
			"font-src 'self' https://rsms.me data:; " +
			"img-src 'self' data: https: blob:; " +
			"connect-src 'self' https://graph.facebook.com https://openrouter.ai https://generativelanguage.googleapis.com; " +
			"frame-ancestors 'none';",
		'X-Content-Type-Options': 'nosniff',
		'X-Frame-Options': 'DENY',
		'Referrer-Policy': 'strict-origin-when-cross-origin',
		'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
	});

	const start = Date.now();
	const response = await resolve(event);

	// Add request timing for API routes
	if (event.url.pathname.startsWith('/api/')) {
		response.headers.set('X-Response-Time', `${Date.now() - start}ms`);
	}

	return response;
};

export const handleError: HandleServerError = ({ error, event }) => {
	const id = event.url.pathname;
	console.error(`[${new Date().toISOString()}] Error on ${id}:`, error);

	return {
		message: 'Something went wrong on our end. Try refreshing the page.',
	};
};
