// Internationalization (i18n) support

export interface TranslationDictionary {
	[key: string]: string | TranslationDictionary;
}

export interface Locale {
	code: string;
	name: string;
	direction: 'ltr' | 'rtl';
	translations: TranslationDictionary;
}

class I18n {
	private locales: Map<string, Locale> = new Map();
	private currentLocale: string = 'en';
	private fallbackLocale: string = 'en';

	constructor() {
		// Load saved locale from storage
		if (typeof window !== 'undefined') {
			const saved = localStorage.getItem('locale');
			if (saved) {
				this.currentLocale = saved;
			}
		}
	}

	registerLocale(locale: Locale) {
		this.locales.set(locale.code, locale);
	}

	setLocale(code: string) {
		if (!this.locales.has(code)) {
			console.warn(`Locale "${code}" not registered`);
			return;
		}

		this.currentLocale = code;
		
		if (typeof window !== 'undefined') {
			localStorage.setItem('locale', code);
			document.documentElement.lang = code;
			document.documentElement.dir = this.locales.get(code)!.direction;
		}
	}

	getLocale(): string {
		return this.currentLocale;
	}

	getAvailableLocales(): Locale[] {
		return Array.from(this.locales.values());
	}

	t(key: string, params?: Record<string, string | number>): string {
		const locale = this.locales.get(this.currentLocale);
		const fallback = this.locales.get(this.fallbackLocale);

		let translation = this.getNestedValue(locale?.translations, key);
		
		// Fallback to default locale
		if (!translation && fallback) {
			translation = this.getNestedValue(fallback.translations, key);
		}

		// Fallback to key itself
		if (!translation) {
			return key;
		}

		// Replace parameters
		if (params) {
			Object.entries(params).forEach(([param, value]) => {
				translation = translation.replace(new RegExp(`{{${param}}}`, 'g'), String(value));
			});
		}

		return translation;
	}

	private getNestedValue(obj: TranslationDictionary | undefined, path: string): string {
		if (!obj) return '';

		const keys = path.split('.');
		let current: any = obj;

		for (const key of keys) {
			if (typeof current !== 'object' || current === null) {
				return '';
			}
			current = current[key];
		}

		return typeof current === 'string' ? current : '';
	}

	// Pluralization support
	pluralize(key: string, count: number, params?: Record<string, string | number>): string {
		const suffix = count === 1 ? 'one' : count === 0 ? 'zero' : 'other';
		const pluralKey = `${key}.${suffix}`;
		
		return this.t(pluralKey, { ...params, count });
	}

	// Date formatting
	formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
		const dateObj = typeof date === 'string' ? new Date(date) : date;
		return dateObj.toLocaleDateString(this.currentLocale, options);
	}

	// Time formatting
	formatTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
		const dateObj = typeof date === 'string' ? new Date(date) : date;
		return dateObj.toLocaleTimeString(this.currentLocale, options);
	}

	// DateTime formatting
	formatDateTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
		const dateObj = typeof date === 'string' ? new Date(date) : date;
		return dateObj.toLocaleString(this.currentLocale, options);
	}

	// Number formatting
	formatNumber(number: number, options?: Intl.NumberFormatOptions): string {
		return number.toLocaleString(this.currentLocale, options);
	}

	// Currency formatting
	formatCurrency(amount: number, currency: string = 'USD'): string {
		return amount.toLocaleString(this.currentLocale, {
			style: 'currency',
			currency
		});
	}
}

// Singleton instance
export const i18n = new I18n();

// Helper function for templates
export function t(key: string, params?: Record<string, string | number>): string {
	return i18n.t(key, params);
}

// Svelte store integration
import { writable, derived } from 'svelte/store';

export const locale = writable(i18n.getLocale());

locale.subscribe(value => {
	i18n.setLocale(value);
});

export const translate = derived(locale, () => {
	return (key: string, params?: Record<string, string | number>) => i18n.t(key, params);
});

// Example usage:
/*
import { i18n } from '$lib/i18n';

// Register locales
i18n.registerLocale({
	code: 'en',
	name: 'English',
	direction: 'ltr',
	translations: {
		common: {
			welcome: 'Welcome, {{name}}!',
			save: 'Save',
			cancel: 'Cancel'
		},
		orders: {
			title: 'Orders',
			count: {
				zero: 'No orders',
				one: '{{count}} order',
				other: '{{count}} orders'
			}
		}
	}
});

i18n.registerLocale({
	code: 'fil',
	name: 'Filipino',
	direction: 'ltr',
	translations: {
		common: {
			welcome: 'Maligayang pagdating, {{name}}!',
			save: 'I-save',
			cancel: 'Kanselahin'
		},
		orders: {
			title: 'Mga Order',
			count: {
				zero: 'Walang order',
				one: '{{count}} order',
				other: '{{count}} na order'
			}
		}
	}
});

// Use in components
i18n.t('common.welcome', { name: 'Juan' }); // "Welcome, Juan!"
i18n.pluralize('orders.count', 5); // "5 orders"
i18n.setLocale('fil'); // Switch to Filipino
*/
