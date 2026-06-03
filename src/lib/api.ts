const API_BASE = '/api/admin';

function getToken(): string {
	return localStorage.getItem('pp_token') || '';
}

export function setToken(token: string) {
	localStorage.setItem('pp_token', token);
}

export function clearToken() {
	localStorage.removeItem('pp_token');
}

export function getTokenValue(): string {
	return getToken();
}

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
	const opts: RequestInit = {
		method,
		headers: {
			'Authorization': `Bearer ${getToken()}`,
			'Content-Type': 'application/json'
		}
	};
	if (body) opts.body = JSON.stringify(body);

	const r = await fetch(`${API_BASE}${path}`, opts);
	if (!r.ok) {
		const text = await r.text();
		throw new Error(text || `HTTP ${r.status}`);
	}
	return r.json() as Promise<T>;
}

export const api = {
	login: (password: string) => request<{ ok: boolean; token: string }>('/login', 'POST', { password }),
	status: () => request<{ ok: boolean; db: boolean; version: string }>('/status'),
	tenantConfig: () => request<Record<string, unknown>>('/tenant-config'),

	conversations: () => request<{ conversations: unknown[]; total: number }>('/conversations'),
	conversation: (id: number) => request<Record<string, unknown>>(`/conversations/${id}`),
	messages: (convId: number) => request<{ messages: unknown[] }>(`/messages/${convId}`),
	sendMessage: (senderId: string, text: string) => request<{ ok: boolean }>('/send-message', 'POST', { senderId, text }),

	orders: () => request<{ orders: unknown[]; custom_fields: unknown[]; order_statuses: unknown[]; column_configs: unknown[] }>('/orders'),
	createOrder: (data: unknown) => request<{ ok: boolean }>('/orders', 'POST', data),
	updateOrder: (id: number, data: unknown) => request<{ ok: boolean }>(`/orders/${id}`, 'PUT', data),
	deleteOrder: (id: number) => request<{ ok: boolean }>(`/orders/${id}`, 'DELETE'),

	finance: () => request<unknown[]>('/finance'),
	createFinance: (data: unknown) => request<{ ok: boolean }>('/finance', 'POST', data),
	updateFinance: (id: number, data: unknown) => request<{ ok: boolean }>(`/finance/${id}`, 'PUT', data),
	deleteFinance: (id: number) => request<{ ok: boolean }>(`/finance/${id}`, 'DELETE'),

	faqs: () => request<unknown[]>('/faqs'),
	createFaq: (data: unknown) => request<{ ok: boolean }>('/faqs', 'POST', data),
	updateFaq: (id: number, data: unknown) => request<{ ok: boolean }>(`/faqs/${id}`, 'PUT', data),
	deleteFaq: (id: number) => request<{ ok: boolean }>(`/faqs/${id}`, 'DELETE'),

	quickReplies: () => request<unknown[]>('/quick-replies'),
	createQuickReply: (data: unknown) => request<{ ok: boolean }>('/quick-replies', 'POST', data),
	updateQuickReply: (id: number, data: unknown) => request<{ ok: boolean }>(`/quick-replies/${id}`, 'PUT', data),
	deleteQuickReply: (id: number) => request<{ ok: boolean }>(`/quick-replies/${id}`, 'DELETE'),

	botFlow: () => request<unknown[]>('/bot-flow'),
	createBotFlowStep: (data: unknown) => request<{ ok: boolean }>('/bot-flow', 'POST', data),
	updateBotFlowStep: (id: number, data: unknown) => request<{ ok: boolean }>(`/bot-flow/${id}`, 'PUT', data),
	deleteBotFlowStep: (id: number) => request<{ ok: boolean }>(`/bot-flow/${id}`, 'DELETE'),

	// botFlowReorder: handled via updateBotFlowStep with sort_order

	automations: () => request<unknown[]>('/automations'),
	createAutomation: (data: unknown) => request<{ ok: boolean }>('/automations', 'POST', data),
	updateAutomation: (id: number, data: unknown) => request<{ ok: boolean }>(`/automations/${id}`, 'PUT', data),
	deleteAutomation: (id: number) => request<{ ok: boolean }>(`/automations/${id}`, 'DELETE'),

	tags: () => request<unknown[]>('/tags'),
	createTag: (data: unknown) => request<{ ok: boolean }>('/tags', 'POST', data),
	updateTag: (id: number, data: unknown) => request<{ ok: boolean }>(`/tags/${id}`, 'PUT', data),
	deleteTag: (id: number) => request<{ ok: boolean }>(`/tags/${id}`, 'DELETE'),

	media: () => request<unknown[]>('/media'),
	createMedia: (data: unknown) => request<{ ok: boolean }>('/media', 'POST', data),
	updateMedia: (id: number, data: unknown) => request<{ ok: boolean }>(`/media/${id}`, 'PUT', data),
	deleteMedia: (id: number) => request<{ ok: boolean }>(`/media/${id}`, 'DELETE'),

	customFields: () => request<unknown[]>('/custom-fields'),
	createCustomField: (data: unknown) => request<{ ok: boolean }>('/custom-fields', 'POST', data),
	deleteCustomField: (id: number) => request<{ ok: boolean }>(`/custom-fields/${id}`, 'DELETE'),

	updateTenant: (data: unknown) => request<{ ok: boolean }>('/tenants', 'PUT', data),

	receiptExtract: (imageUrl: string) => request<{ ok: boolean; extraction: unknown; order: unknown }>('/receipt-extract', 'POST', { imageUrl }),

	generic: <T>(path: string, method = 'GET', body?: unknown) => request<T>(path, method, body)
};

export function timeAgo(d: string | null | undefined): string {
	if (!d) return '';
	const s = (Date.now() - new Date(d).getTime()) / 1000;
	if (s < 60) return 'now';
	if (s < 3600) return Math.floor(s / 60) + 'm';
	if (s < 86400) return Math.floor(s / 3600) + 'h';
	return Math.floor(s / 86400) + 'd';
}

export function fmtNum(n: number | string | null | undefined): string {
	return Number(n || 0).toLocaleString();
}

export function fmtPeso(n: number | string | null | undefined): string {
	return '₱' + fmtNum(n);
}

export function csvEscape(s: unknown): string {
	const v = String(s || '');
	return v.includes(',') || v.includes('"') || v.includes('\n') ? '"' + v.replace(/"/g, '""') + '"' : v;
}

export { showToast } from '$lib/stores';

export function downloadCSV(headers: string[], rows: string[][], filename: string) {
	const csv = [headers.join(','), ...rows.map(r => r.map(csvEscape).join(','))].join('\n');
	const b = new Blob([csv], { type: 'text/csv' });
	const a = document.createElement('a');
	a.href = URL.createObjectURL(b);
	a.download = filename;
	a.click();
}
