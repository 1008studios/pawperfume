// String utility functions

export function capitalize(str: string): string {
	if (!str) return '';
	return str.charAt(0).toUpperCase() + str.slice(1);
}

export function titleCase(str: string): string {
	if (!str) return '';
	return str.split(' ').map(word => capitalize(word)).join(' ');
}

export function camelCase(str: string): string {
	if (!str) return '';
	return str
		.replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
		.replace(/^[A-Z]/, chr => chr.toLowerCase());
}

export function snakeCase(str: string): string {
	if (!str) return '';
	return str
		.replace(/([A-Z])/g, '_$1')
		.toLowerCase()
		.replace(/^_/, '')
		.replace(/[^a-z0-9]+/g, '_');
}

export function kebabCase(str: string): string {
	if (!str) return '';
	return str
		.replace(/([A-Z])/g, '-$1')
		.toLowerCase()
		.replace(/^-/, '')
		.replace(/[^a-z0-9]+/g, '-');
}

export function truncate(str: string, length: number, suffix = '...'): string {
	if (!str || str.length <= length) return str;
	return str.substring(0, length - suffix.length) + suffix;
}

export function slugify(str: string): string {
	if (!str) return '';
	return str
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, '')
		.replace(/[\s_-]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export function escapeHtml(str: string): string {
	if (!str) return '';
	const map: Record<string, string> = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#039;'
	};
	return str.replace(/[&<>"']/g, char => map[char]);
}

export function stripHtml(str: string): string {
	if (!str) return '';
	return str.replace(/<[^>]*>/g, '');
}

export function extractEmails(str: string): string[] {
	if (!str) return [];
	const regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
	return str.match(regex) || [];
}

export function extractUrls(str: string): string[] {
	if (!str) return [];
	const regex = /https?:\/\/[^\s]+/g;
	return str.match(regex) || [];
}

export function extractHashtags(str: string): string[] {
	if (!str) return [];
	const regex = /#[a-zA-Z0-9_]+/g;
	return str.match(regex) || [];
}

export function extractMentions(str: string): string[] {
	if (!str) return [];
	const regex = /@[a-zA-Z0-9_]+/g;
	return str.match(regex) || [];
}

export function maskEmail(email: string): string {
	if (!email) return '';
	const [user, domain] = email.split('@');
	if (!domain) return email;
	const maskedUser = user.substring(0, 2) + '*'.repeat(Math.max(user.length - 2, 0));
	return `${maskedUser}@${domain}`;
}

export function maskPhone(phone: string): string {
	if (!phone) return '';
	const cleaned = phone.replace(/\D/g, '');
	if (cleaned.length < 4) return phone;
	return phone.replace(/\d(?=\d{4})/g, '*');
}

export function maskCard(card: string): string {
	if (!card) return '';
	const cleaned = card.replace(/\D/g, '');
	if (cleaned.length < 4) return card;
	return '•••• •••• •••• ' + cleaned.slice(-4);
}

export function pluralize(count: number, singular: string, plural?: string): string {
	return count === 1 ? singular : (plural || singular + 's');
}

export function wordCount(str: string): number {
	if (!str) return 0;
	return str.trim().split(/\s+/).length;
}

export function characterCount(str: string, excludeSpaces = false): number {
	if (!str) return 0;
	return excludeSpaces ? str.replace(/\s/g, '').length : str.length;
}

export function readingTime(str: string, wordsPerMinute = 200): number {
	const words = wordCount(str);
	return Math.ceil(words / wordsPerMinute);
}

export function highlight(str: string, query: string, className = 'highlight'): string {
	if (!str || !query) return str;
	const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
	return str.replace(regex, `<span class="${className}">$1</span>`);
}

export function escapeRegex(str: string): string {
	if (!str) return '';
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function generateRandomString(length: number = 16): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';
	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

export function generateUUID(): string {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
		const r = Math.random() * 16 | 0;
		const v = c === 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	});
}

export function reverseString(str: string): string {
	if (!str) return '';
	return str.split('').reverse().join('');
}

export function isPalindrome(str: string): boolean {
	if (!str) return false;
	const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, '');
	return cleaned === reverseString(cleaned);
}

export function containsEmoji(str: string): boolean {
	if (!str) return false;
	const emojiRegex = /[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{1F1E0}-\u{1F1FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]/u;
	return emojiRegex.test(str);
}

export function removeEmoji(str: string): string {
	if (!str) return '';
	const emojiRegex = /[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{1F1E0}-\u{1F1FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]/gu;
	return str.replace(emojiRegex, '');
}
