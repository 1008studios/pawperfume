// Keyboard shortcuts manager

interface Shortcut {
	key: string;
	ctrl?: boolean;
	shift?: boolean;
	alt?: boolean;
	meta?: boolean;
	handler: () => void;
	description?: string;
}

class KeyboardShortcuts {
	private shortcuts: Map<string, Shortcut> = new Map();
	private enabled: boolean = true;

	constructor() {
		if (typeof window !== 'undefined') {
			window.addEventListener('keydown', this.handleKeyDown.bind(this));
		}
	}

	private getShortcutKey(e: KeyboardEvent): string {
		const parts: string[] = [];
		if (e.ctrlKey || e.metaKey) parts.push('ctrl');
		if (e.shiftKey) parts.push('shift');
		if (e.altKey) parts.push('alt');
		parts.push(e.key.toLowerCase());
		return parts.join('+');
	}

	private handleKeyDown(e: KeyboardEvent) {
		if (!this.enabled) return;

		// Don't trigger shortcuts when typing in inputs
		const target = e.target as HTMLElement;
		if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
			return;
		}

		const key = this.getShortcutKey(e);
		const shortcut = this.shortcuts.get(key);

		if (shortcut) {
			e.preventDefault();
			shortcut.handler();
		}
	}

	register(shortcut: Shortcut) {
		const parts: string[] = [];
		if (shortcut.ctrl || shortcut.meta) parts.push('ctrl');
		if (shortcut.shift) parts.push('shift');
		if (shortcut.alt) parts.push('alt');
		parts.push(shortcut.key.toLowerCase());
		const key = parts.join('+');

		this.shortcuts.set(key, shortcut);
	}

	unregister(key: string) {
		this.shortcuts.delete(key.toLowerCase());
	}

	enable() {
		this.enabled = true;
	}

	disable() {
		this.enabled = false;
	}

	getAll(): Shortcut[] {
		return Array.from(this.shortcuts.values());
	}

	destroy() {
		if (typeof window !== 'undefined') {
			window.removeEventListener('keydown', this.handleKeyDown.bind(this));
		}
		this.shortcuts.clear();
	}
}

// Singleton instance
export const keyboardShortcuts = new KeyboardShortcuts();

// Svelte action for easy use
export function shortcut(node: HTMLElement, shortcut: Omit<Shortcut, 'handler'> & { handler: () => void }) {
	keyboardShortcuts.register(shortcut);

	return {
		update(newShortcut: Omit<Shortcut, 'handler'> & { handler: () => void }) {
			keyboardShortcuts.unregister(shortcut.key);
			keyboardShortcuts.register(newShortcut);
		},
		destroy() {
			keyboardShortcuts.unregister(shortcut.key);
		}
	};
}

// Common shortcuts preset
export const commonShortcuts = {
	// Navigation
	goToDashboard: { key: '1', ctrl: true, description: 'Go to Dashboard' },
	goToOrders: { key: '2', ctrl: true, description: 'Go to Orders' },
	goToChats: { key: '3', ctrl: true, description: 'Go to Chats' },
	goToFinance: { key: '4', ctrl: true, description: 'Go to Finance' },
	goToSettings: { key: '5', ctrl: true, description: 'Go to Settings' },

	// Actions
	newOrder: { key: 'n', ctrl: true, description: 'Create New Order' },
	newChat: { key: 'n', ctrl: true, shift: true, description: 'Start New Chat' },
	search: { key: 'k', ctrl: true, description: 'Open Search' },
	commandPalette: { key: 'k', ctrl: true, shift: true, description: 'Open Command Palette' },

	// UI
	toggleSidebar: { key: 'b', ctrl: true, description: 'Toggle Sidebar' },
	toggleTheme: { key: 'd', ctrl: true, shift: true, description: 'Toggle Dark Mode' },

	// Lists
	selectAll: { key: 'a', ctrl: true, description: 'Select All' },
	refresh: { key: 'r', ctrl: true, description: 'Refresh' },
	export: { key: 'e', ctrl: true, description: 'Export' },

	// Modals
	closeModal: { key: 'Escape', description: 'Close Modal' },
	confirm: { key: 'Enter', ctrl: true, description: 'Confirm' },
};
