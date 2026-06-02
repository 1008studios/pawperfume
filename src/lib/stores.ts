import { writable } from 'svelte/store';

export const theme = writable<'light' | 'dark'>('dark');
export const sidebarCollapsed = writable(false);
export const currentUser = writable<{ tenantId: number } | null>(null);

export interface Toast {
	id: string;
	message: string;
	type: 'success' | 'error' | 'info';
}

export const toasts = writable<Toast[]>([]);

export function showToast(message: string, type: Toast['type'] = 'success') {
	const id = Math.random().toString(36).slice(2);
	toasts.update(t => [...t, { id, message, type }]);
	setTimeout(() => {
		toasts.update(t => t.filter(x => x.id !== id));
	}, 4000);
}
