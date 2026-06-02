// Date and time utility functions

export function formatDate(date: Date | string, format: 'short' | 'medium' | 'long' | 'full' = 'medium'): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	
	const formats = {
		short: { month: 'numeric', day: 'numeric', year: '2-digit' },
		medium: { month: 'short', day: 'numeric', year: 'numeric' },
		long: { month: 'long', day: 'numeric', year: 'numeric' },
		full: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
	};

	return d.toLocaleDateString('en-US', formats[format] as Intl.DateTimeFormatOptions);
}

export function formatTime(date: Date | string, format: '12h' | '24h' = '12h'): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	
	return d.toLocaleTimeString('en-US', {
		hour: 'numeric',
		minute: '2-digit',
		hour12: format === '12h'
	});
}

export function formatDateTime(date: Date | string, dateFormat: 'short' | 'medium' | 'long' = 'medium', timeFormat: '12h' | '24h' = '12h'): string {
	return `${formatDate(date, dateFormat)} at ${formatTime(date, timeFormat)}`;
}

export function formatRelativeTime(date: Date | string): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	const now = new Date();
	const diffMs = now.getTime() - d.getTime();
	const diffSecs = Math.floor(diffMs / 1000);
	const diffMins = Math.floor(diffSecs / 60);
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);
	const diffWeeks = Math.floor(diffDays / 7);
	const diffMonths = Math.floor(diffDays / 30);
	const diffYears = Math.floor(diffDays / 365);

	if (diffSecs < 60) {
		return 'just now';
	} else if (diffMins < 60) {
		return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
	} else if (diffHours < 24) {
		return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
	} else if (diffDays < 7) {
		return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
	} else if (diffWeeks < 4) {
		return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
	} else if (diffMonths < 12) {
		return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`;
	} else {
		return `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`;
	}
}

export function isToday(date: Date | string): boolean {
	const d = typeof date === 'string' ? new Date(date) : date;
	const today = new Date();
	
	return d.getDate() === today.getDate() &&
		d.getMonth() === today.getMonth() &&
		d.getFullYear() === today.getFullYear();
}

export function isYesterday(date: Date | string): boolean {
	const d = typeof date === 'string' ? new Date(date) : date;
	const yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);
	
	return d.getDate() === yesterday.getDate() &&
		d.getMonth() === yesterday.getMonth() &&
		d.getFullYear() === yesterday.getFullYear();
}

export function isThisWeek(date: Date | string): boolean {
	const d = typeof date === 'string' ? new Date(date) : date;
	const now = new Date();
	const startOfWeek = new Date(now);
	startOfWeek.setDate(now.getDate() - now.getDay());
	startOfWeek.setHours(0, 0, 0, 0);
	
	return d >= startOfWeek;
}

export function isThisMonth(date: Date | string): boolean {
	const d = typeof date === 'string' ? new Date(date) : date;
	const now = new Date();
	
	return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export function addDays(date: Date | string, days: number): Date {
	const d = typeof date === 'string' ? new Date(date) : new Date(date);
	d.setDate(d.getDate() + days);
	return d;
}

export function addMonths(date: Date | string, months: number): Date {
	const d = typeof date === 'string' ? new Date(date) : new Date(date);
	d.setMonth(d.getMonth() + months);
	return d;
}

export function addYears(date: Date | string, years: number): Date {
	const d = typeof date === 'string' ? new Date(date) : new Date(date);
	d.setFullYear(d.getFullYear() + years);
	return d;
}

export function startOfDay(date: Date | string): Date {
	const d = typeof date === 'string' ? new Date(date) : new Date(date);
	d.setHours(0, 0, 0, 0);
	return d;
}

export function endOfDay(date: Date | string): Date {
	const d = typeof date === 'string' ? new Date(date) : new Date(date);
	d.setHours(23, 59, 59, 999);
	return d;
}

export function startOfMonth(date: Date | string): Date {
	const d = typeof date === 'string' ? new Date(date) : new Date(date);
	d.setDate(1);
	d.setHours(0, 0, 0, 0);
	return d;
}

export function endOfMonth(date: Date | string): Date {
	const d = typeof date === 'string' ? new Date(date) : new Date(date);
	d.setMonth(d.getMonth() + 1, 0);
	d.setHours(23, 59, 59, 999);
	return d;
}

export function getDaysInMonth(date: Date | string): number {
	const d = typeof date === 'string' ? new Date(date) : new Date(date);
	return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function isWeekend(date: Date | string): boolean {
	const d = typeof date === 'string' ? new Date(date) : date;
	const day = d.getDay();
	return day === 0 || day === 6;
}

export function getWeekNumber(date: Date | string): number {
	const d = typeof date === 'string' ? new Date(date) : new Date(date);
	const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
	const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
	return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

export function getTimeDifference(start: Date | string, end: Date | string): {
	days: number;
	hours: number;
	minutes: number;
	seconds: number;
} {
	const startDate = typeof start === 'string' ? new Date(start) : start;
	const endDate = typeof end === 'string' ? new Date(end) : end;
	
	const diffMs = endDate.getTime() - startDate.getTime();
	const diffSecs = Math.floor(diffMs / 1000);
	const diffMins = Math.floor(diffSecs / 60);
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);

	return {
		days: diffDays,
		hours: diffHours % 24,
		minutes: diffMins % 60,
		seconds: diffSecs % 60
	};
}

export function formatDuration(ms: number): string {
	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) {
		return `${days}d ${hours % 24}h`;
	} else if (hours > 0) {
		return `${hours}h ${minutes % 60}m`;
	} else if (minutes > 0) {
		return `${minutes}m ${seconds % 60}s`;
	} else {
		return `${seconds}s`;
	}
}

export function isDateInRange(date: Date | string, start: Date | string, end: Date | string): boolean {
	const d = typeof date === 'string' ? new Date(date) : date;
	const startDate = typeof start === 'string' ? new Date(start) : start;
	const endDate = typeof end === 'string' ? new Date(end) : end;
	
	return d >= startDate && d <= endDate;
}

export function getAge(birthDate: Date | string): number {
	const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
	const today = new Date();
	let age = today.getFullYear() - birth.getFullYear();
	const monthDiff = today.getMonth() - birth.getMonth();
	
	if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
		age--;
	}
	
	return age;
}
