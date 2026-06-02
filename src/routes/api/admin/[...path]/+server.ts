import type { RequestHandler } from './$types';
import { handleAdmin } from '$lib/admin-handler-secure';

export const GET: RequestHandler = async (event) => {
	return handleAdmin(event.url.pathname, 'GET', event.request, event.request.headers);
};

export const POST: RequestHandler = async (event) => {
	return handleAdmin(event.url.pathname, 'POST', event.request, event.request.headers);
};

export const PUT: RequestHandler = async (event) => {
	return handleAdmin(event.url.pathname, 'PUT', event.request, event.request.headers);
};

export const DELETE: RequestHandler = async (event) => {
	return handleAdmin(event.url.pathname, 'DELETE', event.request, event.request.headers);
};
